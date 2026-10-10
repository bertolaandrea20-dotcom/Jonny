"""Configurazione: config.yaml per i parametri, .env per i segreti (mai nel repo)."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

import yaml


@dataclass
class MarketCfg:
    symbols: list[str] = field(default_factory=lambda: ["BTCUSDT", "ETHUSDT", "SOLUSDT"])
    interval: str = "1h"


@dataclass
class CostsCfg:
    fee_bps: float = 10.0            # commissione per lato
    slippage_bps: float = 5.0        # slippage stimato per lato
    funding_apr_pct: float = 10.0    # costo annuo di leva/short sul capitale preso a prestito

    @property
    def roundtrip_bps(self) -> float:
        return 2 * (self.fee_bps + self.slippage_bps)


@dataclass
class GenomeCfg:
    max_leverage: float = 2.0        # limite ESMA per CFD crypto ai clienti retail in UE
    allow_short: bool = True
    mutation_scale: float = 0.15     # ampiezza delle mutazioni (frazione dell'intervallo del gene)
    families: list[str] = field(default_factory=lambda: [
        "trend_ma", "breakout", "rsi_revert", "bollinger", "momentum"])
    use_kronos: bool = False         # gene filtro Kronos (richiede la cache delle previsioni)
    use_bias: bool = False           # gene filtro TradingAgents (richiede bias_cache.json)


@dataclass
class EcosystemCfg:
    initial_capital: float = 100.0   # capitale reale totale (tesoreria iniziale)
    agent_allocation: float = 20.0   # capitale reale dato a un agente quando viene promosso
    founders: int = 16               # agenti iniziali (tutti in incubazione)
    max_agents: int = 30
    min_agents: int = 8              # sotto questa soglia nascono nuovi agenti casuali
    epoch_bars: int = 168            # durata di un'epoca (168 x 1h = 1 settimana)
    incubation_epochs: int = 2       # epoche in shadow (soldi finti) prima della promozione
    survival_window: int = 4         # sopravvive solo se il PnL sulle ultime N epoche è > 0
    min_age_epochs: int = 2          # periodo di grazia prima del giudizio
    death_drawdown_pct: float = 20.0 # muore subito se perde oltre questa % dal capitale ricevuto
    split_return_pct: float = 5.0    # si sdoppia se guadagna almeno questa % nella finestra
    min_trades_to_split: int = 3     # niente sdoppiamento senza abbastanza trade
    child_starts_funded: bool = False  # i figli partono in incubazione (consigliato)
    # Prova sul passato alla nascita: il DNA viene simulato sulle candele PRIMA della nascita.
    # Nasce solo se lì era profittevole (0 = prova disattivata).
    prior_test_bars: int = 0
    prior_min_return_pct: float = 2.0
    prior_max_drawdown_pct: float = 15.0
    prior_max_trades_per_week: float = 7.0   # limita il giro d'affari (le fee pesano)
    spawn_attempts: int = 30          # tentativi per trovare un DNA casuale che superi la prova
    seed: int = 42


@dataclass
class Secrets:
    broker_api_key: str = ""
    broker_api_secret: str = ""
    confirm_live: bool = False


@dataclass
class Config:
    mode: str = "paper"              # paper | live (live richiede anche CONFIRM_LIVE=yes nel .env)
    broker: str = "paper"            # paper | ccxt | ibkr
    market: MarketCfg = field(default_factory=MarketCfg)
    costs: CostsCfg = field(default_factory=CostsCfg)
    genome: GenomeCfg = field(default_factory=GenomeCfg)
    ecosystem: EcosystemCfg = field(default_factory=EcosystemCfg)
    kronos_cache_dir: str = "data/kronos"
    # cache del filtro TradingAgents per simbolo, stesso formato di kronos-sol-bot/bias_cache.json
    bias_cache_files: dict = field(default_factory=dict)
    state_dir: str = "state"
    secrets: Secrets = field(default_factory=Secrets)


def _build(cls, data):
    data = data or {}
    unknown = set(data) - set(cls.__dataclass_fields__)
    if unknown:
        raise ValueError(f"Chiavi sconosciute in {cls.__name__}: {sorted(unknown)}")
    return cls(**data)


def load_config(path: str | os.PathLike = "config.yaml") -> Config:
    try:
        from dotenv import load_dotenv
        load_dotenv(".env")
    except ImportError:
        pass
    raw = (yaml.safe_load(Path(path).read_text()) if Path(path).exists() else None) or {}
    cfg = Config(
        mode=raw.get("mode", "paper"),
        broker=raw.get("broker", "paper"),
        market=_build(MarketCfg, raw.get("market")),
        costs=_build(CostsCfg, raw.get("costs")),
        genome=_build(GenomeCfg, raw.get("genome")),
        ecosystem=_build(EcosystemCfg, raw.get("ecosystem")),
        kronos_cache_dir=raw.get("kronos_cache_dir", "data/kronos"),
        bias_cache_files=raw.get("bias_cache_files") or {},
        state_dir=raw.get("state_dir", "state"),
        secrets=Secrets(
            broker_api_key=os.getenv("BROKER_API_KEY", ""),
            broker_api_secret=os.getenv("BROKER_API_SECRET", ""),
            confirm_live=os.getenv("CONFIRM_LIVE", "no").lower() == "yes",
        ),
    )
    validate(cfg)
    return cfg


def validate(cfg: Config) -> None:
    if cfg.mode not in ("paper", "live"):
        raise ValueError("mode deve essere 'paper' o 'live'")
    if cfg.broker not in ("paper", "ccxt", "ibkr"):
        raise ValueError("broker deve essere 'paper', 'ccxt' o 'ibkr'")
    if cfg.genome.max_leverage < 1:
        raise ValueError("genome.max_leverage deve essere >= 1")
    e = cfg.ecosystem
    if not 0 < e.agent_allocation <= e.initial_capital:
        raise ValueError("ecosystem.agent_allocation deve stare in (0, initial_capital]")
    if e.min_agents > e.max_agents or e.founders > e.max_agents:
        raise ValueError("min_agents e founders non possono superare max_agents")
    if cfg.mode == "live":
        # Doppia sicurezza: il live richiede config E variabile d'ambiente esplicita.
        if not cfg.secrets.confirm_live:
            raise RuntimeError("mode=live richiede CONFIRM_LIVE=yes nel .env")
        if cfg.broker == "paper":
            raise RuntimeError("mode=live richiede un broker reale (ccxt o ibkr)")
