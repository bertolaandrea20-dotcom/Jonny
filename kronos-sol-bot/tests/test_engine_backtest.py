import json

from backtest.run_backtest import run_backtest
from bot.engine import Engine
from bot.executor import PaperExecutor
from bot.forecaster import BaselineForecaster
from bot.risk import RiskManager
from bot.state import BotState, load_state, save_state


def test_paper_fill_costs(cfg):
    ex = PaperExecutor(cfg)
    b = ex.buy(100, 150)
    s = ex.sell(b.qty_sol, 150)
    # A prezzo invariato si perde esattamente il costo roundtrip (~30bps)
    loss_bps = (1 - s.usd / b.usd) * 1e4
    assert 29 < loss_bps < 31


def test_engine_processes_each_bar_once(cfg, ohlcv, tmp_path):
    st = BotState.fresh(200)
    eng = Engine(cfg, st, BaselineForecaster(cfg.forecaster, "5m"), PaperExecutor(cfg),
                 RiskManager(cfg.risk, str(tmp_path / "STOP")))
    window = ohlcv.iloc[:150]
    eng.on_bar(window)
    assert eng.on_bar(window) == []


def test_backtest_runs_and_accounts(cfg, ohlcv):
    r = run_backtest(cfg, ohlcv, step=1, verbose=False)
    assert r["trade"] > 0
    t = r["_trades"]
    # L'equity finale = iniziale + somma dei PnL dei trade
    assert abs(r["equity_finale_usd"] - (200 + t["pnl_usd"].sum())) < 0.05
    assert r["fee_totali_usd"] > 0


def test_state_roundtrip(tmp_path):
    from bot.state import Position
    st = BotState.fresh(200)
    st.position = Position(150, 0.5, 75, "2026-01-01T00:00:00+00:00", 3)
    p = tmp_path / "s.json"
    save_state(st, str(p))
    back = load_state(str(p), 999)
    assert back.position.qty_sol == 0.5 and back.equity_usd == 200
    json.loads(p.read_text())
