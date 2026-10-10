"""Loop principale del bot. Avvio: `python -m bot.main --config config.yaml`."""
from __future__ import annotations

import argparse
import logging
import time

import pandas as pd

from .bias import BiasFilter
from .config import load_config
from .data import fetch_klines, fetch_price, interval_to_timedelta
from .engine import Engine
from .executor import make_executor
from .forecaster import make_forecaster
from .risk import RiskManager
from .state import load_state, save_state
from .telegram_ui import Telegram

log = logging.getLogger("bot")


def seconds_to_next_bar(interval: str, buffer_s: float = 3.0) -> float:
    step = interval_to_timedelta(interval).total_seconds()
    now = time.time()
    return step - (now % step) + buffer_s


def status_text(engine: Engine, price: float | None) -> str:
    st = engine.state
    mtm = engine.mark_to_market(price) if price else st.equity_usd
    pos = "nessuna"
    if st.position:
        p = st.position
        pos = f"{p.qty_sol:.4f} SOL @ {p.entry_price:.3f} ({p.bars_held} barre)"
    wr = (st.winning_trades / st.closed_trades * 100) if st.closed_trades else 0
    flags = "⛔ FERMATO: " + st.halt_reason if st.halted else ("⏸ in pausa" if st.paused else "▶️ attivo")
    return (f"Stato: {flags}\nModalità: {engine.cfg.mode}\nEquity: ${mtm:.2f} "
            f"(realizzata ${st.equity_usd:.2f})\nPosizione: {pos}\n"
            f"Trade oggi: {st.trades_today} | Chiusi: {st.closed_trades} | Win rate: {wr:.0f}%\n"
            f"Fee totali: ${st.total_fees_usd:.2f}\n"
            f"Filtro giornaliero: {st.extra.get('bias', 'n/d') if engine.bias_filter else 'disattivato'}")


def handle_commands(tg: Telegram, engine: Engine, price: float | None) -> None:
    st = engine.state
    for cmd in tg.poll_commands():
        if cmd in ("/status", "/pnl", "/help"):
            tg.send(status_text(engine, price))
        elif cmd == "/pause":
            st.paused = True
            tg.send("⏸ Pausa: nessuna nuova apertura. Le uscite restano attive.")
        elif cmd == "/resume":
            st.paused = False
            tg.send("▶️ Ripreso.")
        elif cmd == "/stop":
            if st.position:
                # Prima della prima candela non c'è ancora un prezzo: lo leggiamo ora.
                ev = engine.force_close(price or fetch_price(engine.cfg.market.symbol),
                                        "stop manuale")
                tg.send(ev.text)
            st.halted, st.halt_reason = True, "stop manuale da Telegram"
            tg.send("⛔ Bot fermato. Per ripartire: imposta halted=false in state.json e riavvia.")


def run(config_path: str) -> None:
    cfg = load_config(config_path)
    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
                        handlers=[logging.FileHandler(cfg.log_file), logging.StreamHandler()])

    state = load_state(cfg.state_file, cfg.risk.starting_equity_usd)
    bias_filter = BiasFilter(cfg.bias) if cfg.bias.enabled else None
    engine = Engine(cfg, state, make_forecaster(cfg.forecaster, cfg.market.interval),
                    make_executor(cfg), RiskManager(cfg.risk), trades_file=cfg.trades_file,
                    bias_filter=bias_filter)
    tg = Telegram(cfg.secrets.telegram_token, cfg.secrets.telegram_chat_id, cfg.telegram_enabled)
    tg.send(f"🤖 Bot avviato in modalità {cfg.mode.upper()} su {cfg.market.symbol} "
            f"{cfg.market.interval}\n{status_text(engine, None)}")

    last_price: float | None = None
    while True:
        try:
            # Polling comandi frequente mentre si aspetta la candela successiva.
            wait = seconds_to_next_bar(cfg.market.interval)
            end = time.time() + wait
            while time.time() < end:
                handle_commands(tg, engine, last_price)
                if bias_filter:
                    # Calcolo del bias (lento: minuti) durante l'attesa, non a candela chiusa.
                    # Dopo il primo calcolo del giorno è solo una lettura dalla cache.
                    bias, fresh = bias_filter.bias_for(pd.Timestamp.now(tz="UTC"))
                    if fresh:
                        tg.send(f"📅 Filtro giornaliero TradingAgents: bias {bias.upper()} "
                                f"(policy {cfg.bias.policy})")
                if state.position and cfg.strategy.intrabar_stops:
                    # Stop loss / take profit sul prezzo corrente, senza aspettare la candela.
                    p = fetch_price(cfg.market.symbol)
                    last_price = p
                    ev = engine.check_stops(p, p, p, pd.Timestamp.now(tz="UTC"))
                    if ev:
                        log.info(ev.text)
                        tg.send(ev.text)
                save_state(state, cfg.state_file)
                time.sleep(min(5, max(0, end - time.time())))

            df = fetch_klines(cfg.market.symbol, cfg.market.interval,
                              limit=cfg.forecaster.context_bars + 5)
            last_price = float(df["close"].iloc[-1])
            for ev in engine.on_bar(df):
                log.info(ev.text)
                if ev.kind in ("OPEN", "CLOSE", "HALT"):
                    tg.send(ev.text)
            state.consecutive_errors = 0
        except KeyboardInterrupt:
            tg.send("Bot interrotto manualmente (Ctrl+C).")
            break
        except Exception as e:  # noqa: BLE001 — il bot non deve morire su un errore singolo
            state.consecutive_errors += 1
            log.exception("Errore nel loop")
            tg.send(f"⚠️ Errore ({state.consecutive_errors}): {e}")
            if state.consecutive_errors >= cfg.risk.max_consecutive_errors:
                state.halted = True
                state.halt_reason = f"{state.consecutive_errors} errori consecutivi"
                tg.send(f"⛔ BOT FERMATO: {state.halt_reason}")
            time.sleep(10)
        finally:
            save_state(state, cfg.state_file)


def main() -> None:
    ap = argparse.ArgumentParser(description="Kronos SOL trading bot")
    ap.add_argument("--config", default="config.yaml")
    run(ap.parse_args().config)


if __name__ == "__main__":
    main()
