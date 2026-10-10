"""Caricamento configurazione: config.yaml per i parametri, .env per i segreti."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

import yaml

try:
    from dotenv import load_dotenv
except ImportError:  # python-dotenv opzionale nei test
    def load_dotenv(*_a, **_k):
        return False


@dataclass
class MarketCfg:
    symbol: str = "SOLUSDT"          # feed prezzi Binance (pubblico, nessuna chiave)
    interval: str = "5m"
    usdc_mint: str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    sol_mint: str = "So11111111111111111111111111111111111111112"


@dataclass
class ForecasterCfg:
    type: str = "kronos"             # kronos | baseline
    kronos_repo_path: str = "./vendor/Kronos"
    model: str = "NeoQuasar/Kronos-small"
    tokenizer: str = "NeoQuasar/Kronos-Tokenizer-base"
    device: str = "cpu"
    max_context: int = 512
    context_bars: int = 400
    horizon_bars: int = 6
    sample_count: int = 5
    temperature: float = 1.0
    top_p: float = 0.9
    seed: int | None = None          # fissa il campionamento di Kronos (backtest riproducibili)
    baseline_lookback: int = 12


@dataclass
class StrategyCfg:
    min_edge_bps: float = 15.0       # margine richiesto oltre i costi per entrare
    exit_edge_bps: float = -5.0      # esci se il rendimento previsto scende sotto
    take_profit_bps: float = 60.0
    stop_loss_bps: float = 40.0
    max_hold_bars: int = 12
    min_up_fraction: float = 0.0     # quota minima di campioni Kronos al rialzo per entrare (0 = off)
    intrabar_stops: bool = True      # SL/TP controllati dentro la candela (high/low, prezzo live)


@dataclass
class CostsCfg:
    fee_bps: float = 5.0             # fee pool/aggregatore per lato
    slippage_bps: float = 10.0       # slippage stimato per lato

    @property
    def roundtrip_bps(self) -> float:
        return 2 * (self.fee_bps + self.slippage_bps)


@dataclass
class RiskCfg:
    starting_equity_usd: float = 200.0
    position_fraction: float = 0.5
    min_order_usd: float = 10.0
    max_trades_per_day: int = 20
    daily_loss_limit_pct: float = 3.0
    max_drawdown_pct: float = 10.0
    max_consecutive_errors: int = 5
    min_sol_reserve: float = 0.02    # SOL lasciati sempre nel wallet per le fee


@dataclass
class JupiterCfg:
    quote_url: str = "https://lite-api.jup.ag/swap/v1/quote"
    swap_url: str = "https://lite-api.jup.ag/swap/v1/swap"
    slippage_bps: int = 30
    max_price_deviation_bps: float = 50.0  # quote Jupiter vs prezzo feed
    priority_fee_max_lamports: int = 200_000
    confirm_timeout_s: int = 60


@dataclass
class BiasCfg:
    enabled: bool = False
    ticker: str = "SOL-USD"                 # formato Yahoo Finance usato da TradingAgents
    policy: str = "block_bearish"           # block_bearish | only_bullish
    exit_on_bearish: bool = False           # chiudi la posizione se il bias diventa bearish
    refresh_hour_utc: int = 6               # ora (UTC) da cui vale il nuovo bias del giorno
    fallback: str = "neutral"               # bias se TradingAgents fallisce: neutral | bearish
    cache_file: str = "bias_cache.json"
    tradingagents_repo_path: str = "./vendor/TradingAgents"
    tradingagents_config: dict = field(default_factory=dict)  # unito a DEFAULT_CONFIG


@dataclass
class Secrets:
    rpc_url: str = ""
    private_key: str = ""
    telegram_token: str = ""
    telegram_chat_id: str = ""
    jupiter_api_key: str = ""
    confirm_live: bool = False


@dataclass
class Config:
    mode: str = "paper"              # paper | live
    market: MarketCfg = field(default_factory=MarketCfg)
    forecaster: ForecasterCfg = field(default_factory=ForecasterCfg)
    strategy: StrategyCfg = field(default_factory=StrategyCfg)
    costs: CostsCfg = field(default_factory=CostsCfg)
    risk: RiskCfg = field(default_factory=RiskCfg)
    jupiter: JupiterCfg = field(default_factory=JupiterCfg)
    bias: BiasCfg = field(default_factory=BiasCfg)
    telegram_enabled: bool = True
    state_file: str = "state.json"
    trades_file: str = "trades.csv"
    log_file: str = "bot.log"
    secrets: Secrets = field(default_factory=Secrets)

    @property
    def is_live(self) -> bool:
        return self.mode == "live"


def _build(cls, data: dict | None):
    data = data or {}
    known = {f for f in cls.__dataclass_fields__}
    unknown = set(data) - known
    if unknown:
        raise ValueError(f"Chiavi sconosciute in {cls.__name__}: {sorted(unknown)}")
    return cls(**data)


def load_config(path: str | os.PathLike = "config.yaml", env_file: str = ".env") -> Config:
    load_dotenv(env_file)
    raw = yaml.safe_load(Path(path).read_text()) if Path(path).exists() else {}
    raw = raw or {}
    cfg = Config(
        mode=raw.get("mode", "paper"),
        market=_build(MarketCfg, raw.get("market")),
        forecaster=_build(ForecasterCfg, raw.get("forecaster")),
        strategy=_build(StrategyCfg, raw.get("strategy")),
        costs=_build(CostsCfg, raw.get("costs")),
        risk=_build(RiskCfg, raw.get("risk")),
        jupiter=_build(JupiterCfg, raw.get("jupiter")),
        bias=_build(BiasCfg, raw.get("bias")),
        telegram_enabled=(raw.get("telegram") or {}).get("enabled", True),
        state_file=raw.get("state_file", "state.json"),
        trades_file=raw.get("trades_file", "trades.csv"),
        log_file=raw.get("log_file", "bot.log"),
        secrets=Secrets(
            rpc_url=os.getenv("SOLANA_RPC_URL", ""),
            private_key=os.getenv("SOLANA_PRIVATE_KEY", ""),
            telegram_token=os.getenv("TELEGRAM_BOT_TOKEN", ""),
            telegram_chat_id=os.getenv("TELEGRAM_CHAT_ID", ""),
            jupiter_api_key=os.getenv("JUPITER_API_KEY", ""),
            confirm_live=os.getenv("CONFIRM_LIVE", "no").lower() == "yes",
        ),
    )
    validate(cfg)
    return cfg


def validate(cfg: Config) -> None:
    if cfg.mode not in ("paper", "live"):
        raise ValueError("mode deve essere 'paper' o 'live'")
    if not 0 < cfg.risk.position_fraction <= 1:
        raise ValueError("risk.position_fraction deve stare in (0, 1]")
    if cfg.bias.policy not in ("block_bearish", "only_bullish"):
        raise ValueError("bias.policy deve essere 'block_bearish' o 'only_bullish'")
    if cfg.bias.fallback not in ("neutral", "bearish"):
        raise ValueError("bias.fallback deve essere 'neutral' o 'bearish'")
    if not 0 <= cfg.strategy.min_up_fraction <= 1:
        raise ValueError("strategy.min_up_fraction deve stare in [0, 1]")
    if cfg.forecaster.context_bars > cfg.forecaster.max_context:
        raise ValueError("forecaster.context_bars non può superare max_context del modello")
    if cfg.is_live:
        # Doppia sicurezza: il live richiede config E variabile d'ambiente esplicita.
        if not cfg.secrets.confirm_live:
            raise RuntimeError("mode=live richiede CONFIRM_LIVE=yes nel .env")
        if not cfg.secrets.private_key or not cfg.secrets.rpc_url:
            raise RuntimeError("mode=live richiede SOLANA_PRIVATE_KEY e SOLANA_RPC_URL")
