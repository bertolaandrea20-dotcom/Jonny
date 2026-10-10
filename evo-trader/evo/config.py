"""Configurazione: config.yaml per i parametri, .env per i segreti (mai nel repo)."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

import yaml


@dataclass
class MarketCfg:
    # Universo di strumenti nel formato fonte:simbolo (vedi evo/data.py). Qualsiasi mix è
    # ammesso: crypto, azioni, ETF, indici, forex, materie prime, CSV esportati dal broker.
    instruments: list[str] = field(default_factory=lambda: [
        "binance:BTCUSDT", "binance:ETHUSDT", "yahoo:SPY", "yahoo:GLD", "yahoo:EURUSD=X"])
    default_source: str = "binance"
    interval: str = "4h"
    # Selezione automatica: aggiunge i `top` strumenti più scambiati della fonte (0 = spenta).
    auto_top: int = 0
    auto_source: str = "binance"
    auto_quote: str = "USDT"
    min_history_bars: int = 500       # strumenti con meno storia vengono esclusi

    def universe(self) -> list[str]:
        from .data import binance_top_symbols, split_instrument
        names = [f"{src}:{sym}" for src, sym in
                 (split_instrument(i, self.default_source) for i in self.instruments)]
        if self.auto_top > 0:
            if self.auto_source != "binance":
                raise ValueError("auto_top è disponibile solo per la fonte binance")
            names += [n for n in binance_top_symbols(self.auto_quote, self.auto_top) if n not in names]
        return names


@dataclass
class CostsCfg:
    fee_bps: float = 10.0            # commissione per lato
    slippage_bps: float = 5.0        # slippage stimato per lato
    funding_apr_pct: float = 10.0    # costo annuo di leva/short sul capitale preso a prestito
    min_fee: float = 0.0             # commissione minima per ordine (es. IBKR sulle borse europee)
    # Costi diversi per fonte o strumento, es. {"yahoo": {"fee_bps": 5}, "binance:BTCUSDT": {...}}
    overrides: dict = field(default_factory=dict)

    @property
    def roundtrip_bps(self) -> float:
        return 2 * (self.fee_bps + self.slippage_bps)

    def fee(self, notional: float) -> float:
        return max(abs(notional) * self.fee_bps / 1e4, self.min_fee)

    def for_instrument(self, instrument: str) -> "CostsCfg":
        src = instrument.split(":", 1)[0]
        o = {**self.overrides.get(src, {}), **self.overrides.get(instrument, {})}
        if not o:
            return self
        base = {k: getattr(self, k) for k in ("fee_bps", "slippage_bps", "funding_apr_pct", "min_fee")}
        return CostsCfg(**{**base, **o})


@dataclass
class GenomeCfg:
    max_leverage: float = 2.0        # leva massima del DNA (limite ESMA retail per le crypto: 2)
    # Leva massima per fonte o strumento (limiti ESMA retail: crypto 2, azioni 5, indici 20,
    # forex principali 30), es. {"yahoo": 5, "yahoo:EURUSD=X": 30}. Vale il limite più basso.
    max_leverage_by_instrument: dict = field(default_factory=dict)
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
class IBKRCfg:
    host: str = "127.0.0.1"
    port: int = 4002                 # IB Gateway: 4002 conto DEMO, 4001 conto REALE (TWS: 7497 / 7496)
    client_id: int = 17
    account: str = ""                # vuoto = l'unico conto collegato
    base_currency: str = "EUR"       # valuta in cui ragiona il bot (initial_capital)
    # Strumento del bot -> contratto IBKR, es.
    # "yahoo:ENI.MI": {secType: STK, symbol: ENI, exchange: BVME, currency: EUR}
    contracts: dict = field(default_factory=dict)
    min_order_value: float = 5.0     # ordini più piccoli vengono saltati
    max_order_value: float = 0.0     # tetto per singolo ordine (0 = initial_capital)
    max_gross_exposure: float = 2.0  # esposizione lorda massima = N x initial_capital

    LIVE_PORTS = (4001, 7496)
    DEMO_PORTS = (4002, 7497)


@dataclass
class Secrets:
    broker_api_key: str = ""
    broker_api_secret: str = ""
    confirm_live: bool = False


@dataclass
class Config:
    mode: str = "paper"              # paper | live (live richiede anche CONFIRM_LIVE=yes nel .env)
    broker: str = "paper"            # paper (solo simulazione) | ibkr (Interactive Brokers)
    market: MarketCfg = field(default_factory=MarketCfg)
    costs: CostsCfg = field(default_factory=CostsCfg)
    genome: GenomeCfg = field(default_factory=GenomeCfg)
    ecosystem: EcosystemCfg = field(default_factory=EcosystemCfg)
    kronos_cache_dir: str = "data/kronos"
    # cache del filtro TradingAgents per simbolo, stesso formato di kronos-sol-bot/bias_cache.json
    bias_cache_files: dict = field(default_factory=dict)
    state_dir: str = "state"
    ibkr: IBKRCfg = field(default_factory=IBKRCfg)
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
        ibkr=_build(IBKRCfg, raw.get("ibkr")),
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
    if cfg.broker not in ("paper", "ibkr"):
        raise ValueError("broker deve essere 'paper' o 'ibkr'")
    if cfg.genome.max_leverage < 1:
        raise ValueError("genome.max_leverage deve essere >= 1")
    e = cfg.ecosystem
    if not 0 < e.agent_allocation <= e.initial_capital:
        raise ValueError("ecosystem.agent_allocation deve stare in (0, initial_capital]")
    if e.min_agents > e.max_agents or e.founders > e.max_agents:
        raise ValueError("min_agents e founders non possono superare max_agents")
    if cfg.broker == "ibkr":
        port = cfg.ibkr.port
        if cfg.mode == "paper" and port in IBKRCfg.LIVE_PORTS:
            raise RuntimeError(f"mode=paper ma la porta {port} è quella del conto REALE: usa 4002 (demo)")
        if cfg.mode == "live" and port in IBKRCfg.DEMO_PORTS:
            raise RuntimeError(f"mode=live ma la porta {port} è quella del conto DEMO")
    if cfg.mode == "live":
        # Doppia sicurezza: il live richiede config E variabile d'ambiente esplicita.
        if not cfg.secrets.confirm_live:
            raise RuntimeError("mode=live richiede CONFIRM_LIVE=yes nel .env")
        if cfg.broker == "paper":
            raise RuntimeError("mode=live richiede un broker reale (ibkr)")
