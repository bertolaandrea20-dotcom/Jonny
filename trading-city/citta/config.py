"""Configurazione letta da variabili d'ambiente (o da un file .env)."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

LIVE_PHRASE = "CAPISCO CHE POSSO PERDERE DENARO REALE"


def _load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def _env(name: str, default: str) -> str:
    return os.environ.get(name, default) or default


@dataclass
class Config:
    mode: str = "sim"
    data_source: str = "synthetic"
    symbols: list[str] = field(default_factory=list)
    broker: str = "paper"
    ccxt_exchange: str = "kraken"
    ccxt_api_key: str = ""
    ccxt_api_secret: str = ""
    ibkr_host: str = "127.0.0.1"
    ibkr_port: int = 7497
    ibkr_client_id: int = 17
    live_confirm: str = ""
    max_order_eur: float = 50.0

    city_capital: float = 10_000.0
    treasury_share: float = 0.30
    initial_citizens: int = 12
    min_population: int = 6
    max_population: int = 64
    cycle_days: int = 3
    profit_tax: float = 0.10
    min_citizen_capital: float = 50.0
    fee_rate: float = 0.0026  # commissione taker tipica (Kraken ~0.26%)

    # disciplina di trading (0 = disattivata)
    deliberate_every: int = 3  # ogni quanti tick un agente ragiona su ogni suo strumento
    min_hold_hours: int = 0  # tenuta minima prima di vendere per un segnale (lo stop resta attivo)
    trend_filter_hours: int = 0  # compra solo se il prezzo è sopra la sua media di N ore
    min_order_eur: float = 0.0  # ordini più piccoli non valgono le commissioni
    min_entry_threshold: float = 0.0  # pavimenti applicati al DNA di ogni nuovo agente
    min_stop_loss: float = 0.0
    min_take_profit: float = 0.0
    bar_hours: int = 1  # durata delle candele su cui ragionano gli agenti (24 = giornaliere)
    judge_vs_market: bool = False  # sopravvive chi batte i suoi mercati, non solo chi chiude in positivo

    day_ticks: int = 48
    tick_seconds: float = 0.5
    live_tick_seconds: float = 900.0

    llm_mode: str = "rules"
    claude_model: str = "claude-opus-5-5"
    llm_max_calls_per_day: int = 200

    db_path: str = "city.db"
    port: int = 8000
    seed: int | None = None

    @property
    def live_enabled(self) -> bool:
        return self.mode == "live" and self.live_confirm == LIVE_PHRASE

    @classmethod
    def from_env(cls, env_file: str | Path | None = ".env") -> "Config":
        if env_file:
            _load_dotenv(Path(env_file))
        symbols = _env("SYMBOLS", "BTC/EUR,ETH/EUR,SOL/EUR,ENI.MI,ISP.MI,UCG.MI,STLAM.MI,RACE.MI")
        seed = os.environ.get("SEED")
        return cls(
            mode=_env("CITY_MODE", "sim"),
            data_source=_env("DATA_SOURCE", "synthetic"),
            symbols=[s.strip() for s in symbols.split(",") if s.strip()],
            broker=_env("BROKER", "paper"),
            ccxt_exchange=_env("CCXT_EXCHANGE", "kraken"),
            ccxt_api_key=_env("CCXT_API_KEY", ""),
            ccxt_api_secret=_env("CCXT_API_SECRET", ""),
            ibkr_host=_env("IBKR_HOST", "127.0.0.1"),
            ibkr_port=int(_env("IBKR_PORT", "7497")),
            ibkr_client_id=int(_env("IBKR_CLIENT_ID", "17")),
            live_confirm=_env("LIVE_CONFIRM", ""),
            max_order_eur=float(_env("MAX_ORDER_EUR", "50")),
            city_capital=float(_env("CITY_CAPITAL_EUR", "10000")),
            treasury_share=float(_env("TREASURY_SHARE", "0.30")),
            initial_citizens=int(_env("INITIAL_CITIZENS", "12")),
            min_population=int(_env("MIN_POPULATION", "6")),
            max_population=int(_env("MAX_POPULATION", "64")),
            cycle_days=int(_env("CYCLE_DAYS", _env("TRIAL_DAYS", "3"))),
            profit_tax=float(_env("PROFIT_TAX", "0.10")),
            min_citizen_capital=float(_env("MIN_CITIZEN_CAPITAL", "50")),
            fee_rate=float(_env("FEE_RATE", "0.0026")),
            deliberate_every=int(_env("DELIBERATE_EVERY", "3")),
            min_hold_hours=int(_env("MIN_HOLD_HOURS", "0")),
            trend_filter_hours=int(_env("TREND_FILTER_HOURS", "0")),
            min_order_eur=float(_env("MIN_ORDER_EUR", "0")),
            min_entry_threshold=float(_env("MIN_ENTRY_THRESHOLD", "0")),
            min_stop_loss=float(_env("MIN_STOP_LOSS", "0")),
            min_take_profit=float(_env("MIN_TAKE_PROFIT", "0")),
            bar_hours=int(_env("BAR_HOURS", "1")),
            judge_vs_market=_env("JUDGE_VS_MARKET", "0").lower() in ("1", "true", "si", "sì", "yes"),
            day_ticks=int(_env("DAY_TICKS", "48")),
            tick_seconds=float(_env("TICK_SECONDS", "0.5")),
            live_tick_seconds=float(_env("LIVE_TICK_SECONDS", "900")),
            llm_mode=_env("LLM_MODE", "rules"),
            claude_model=_env("CLAUDE_MODEL", "claude-opus-5-5"),
            llm_max_calls_per_day=int(_env("LLM_MAX_CALLS_PER_DAY", "200")),
            db_path=_env("DB_PATH", "city.db"),
            port=int(_env("PORT", "8000")),
            seed=int(seed) if seed else None,
        )
