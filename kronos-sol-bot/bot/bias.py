"""Filtro giornaliero di orientamento (bias) basato su TradingAgents.

Una volta al giorno TradingAgents (github.com/TauricResearch/TradingAgents) analizza
notizie, sentiment, macro e tecnica su SOL e restituisce una decisione. La traduciamo in:
  bullish | neutral | bearish
e la usiamo SOLO per permettere o bloccare le aperture del bot Kronos.
I trade restano eseguiti dalle regole fisse di strategy.py.

Anti look-ahead: il bias del giorno D è calcolato con data di analisi D-1
(cioè con le informazioni disponibili a fine giornata precedente).
"""
from __future__ import annotations

import json
import logging
import os
import re
import sys
from datetime import date, timedelta
from pathlib import Path

import pandas as pd

from .config import BiasCfg

log = logging.getLogger(__name__)

BULLISH, NEUTRAL, BEARISH = "bullish", "neutral", "bearish"
VALID = {BULLISH, NEUTRAL, BEARISH}

# Supporta sia BUY/HOLD/SELL sia la scala a 5 livelli (Buy/Overweight/Hold/Underweight/Sell).
_KEYWORDS = {
    "UNDERWEIGHT": BEARISH, "OVERWEIGHT": BULLISH,
    "STRONG BUY": BULLISH, "STRONG SELL": BEARISH,
    "BUY": BULLISH, "SELL": BEARISH, "HOLD": NEUTRAL,
}
_PATTERN = re.compile(r"\b(" + "|".join(sorted(_KEYWORDS, key=len, reverse=True)) + r")\b")


def parse_decision(decision) -> str:
    """Converte l'output di TradingAgents in bullish/neutral/bearish.

    Usa l'ULTIMA parola chiave trovata (la conclusione finale del testo).
    """
    text = str(decision).upper()
    matches = _PATTERN.findall(text)
    if not matches:
        raise ValueError(f"Decisione TradingAgents non riconosciuta: {text[:200]!r}")
    return _KEYWORDS[matches[-1]]


class BiasCache:
    """Cache su file JSON: {"2026-10-10": {"bias": "bullish", "raw": "..."}}."""

    def __init__(self, path: str):
        self.path = Path(path)
        self.data: dict = json.loads(self.path.read_text()) if self.path.exists() else {}

    def get(self, day: str) -> str | None:
        entry = self.data.get(day)
        return entry["bias"] if entry else None

    def set(self, day: str, bias: str, raw: str = "") -> None:
        self.data[day] = {"bias": bias, "raw": raw[:2000]}
        tmp = f"{self.path}.tmp"
        Path(tmp).write_text(json.dumps(self.data, indent=2, ensure_ascii=False))
        os.replace(tmp, self.path)


class TradingAgentsRunner:
    """Esegue TradingAgents per una data. Costoso: decine di chiamate LLM a ogni run."""

    def __init__(self, cfg: BiasCfg):
        repo = Path(cfg.tradingagents_repo_path).resolve()
        if repo.exists():
            sys.path.insert(0, str(repo))
        try:
            from tradingagents.default_config import DEFAULT_CONFIG  # type: ignore
            from tradingagents.graph.trading_graph import TradingAgentsGraph  # type: ignore
        except ImportError as e:
            raise ImportError(
                "TradingAgents non installato. Esegui: git clone "
                "https://github.com/TauricResearch/TradingAgents vendor/TradingAgents && "
                "pip install ./vendor/TradingAgents") from e
        config = DEFAULT_CONFIG.copy()
        # I valori vuoti nel config.yaml non sovrascrivono i default di TradingAgents.
        config.update({k: v for k, v in (cfg.tradingagents_config or {}).items()
                       if v not in ("", None)})
        self.graph = TradingAgentsGraph(debug=False, config=config)
        self.ticker = cfg.ticker

    def run(self, analysis_date: str) -> tuple[str, str]:
        _, decision = self.graph.propagate(self.ticker, analysis_date)
        return parse_decision(decision), str(decision)


class BiasFilter:
    """Fornisce il bias del giorno e decide se un'apertura è permessa.

    allow_compute=False: usa solo la cache (backtest), mai chiamate LLM.
    """

    def __init__(self, cfg: BiasCfg, allow_compute: bool = True, runner=None):
        self.cfg = cfg
        self.cache = BiasCache(cfg.cache_file)
        self.allow_compute = allow_compute
        self._runner = runner
        self._last_error: str = ""

    @staticmethod
    def analysis_date_for(day: date) -> str:
        return (day - timedelta(days=1)).isoformat()

    def _get_runner(self):
        if self._runner is None:
            self._runner = TradingAgentsRunner(self.cfg)
        return self._runner

    def bias_for(self, now: pd.Timestamp) -> tuple[str, bool]:
        """Ritorna (bias, nuovo_calcolo). Ricalcola al massimo una volta al giorno."""
        day = now.date()
        # Prima dell'ora di aggiornamento si usa ancora il bias del giorno precedente.
        if now.hour < self.cfg.refresh_hour_utc:
            day = day - timedelta(days=1)
        key = day.isoformat()
        cached = self.cache.get(key)
        if cached:
            return cached, False
        if not self.allow_compute:
            return self.cfg.fallback, False
        try:
            bias, raw = self._get_runner().run(self.analysis_date_for(day))
            self.cache.set(key, bias, raw)
            log.info("Bias %s per %s (analisi del %s)", bias, key, self.analysis_date_for(day))
            return bias, True
        except Exception as e:  # noqa: BLE001
            self._last_error = str(e)
            log.exception("TradingAgents fallito, uso fallback=%s", self.cfg.fallback)
            # Salviamo il fallback per non ripetere chiamate costose a ogni candela.
            self.cache.set(key, self.cfg.fallback, f"ERRORE: {e}")
            return self.cfg.fallback, True

    def allows_open(self, bias: str) -> tuple[bool, str]:
        if self.cfg.policy == "only_bullish" and bias != BULLISH:
            return False, f"filtro giornaliero: bias {bias}, policy only_bullish"
        if self.cfg.policy == "block_bearish" and bias == BEARISH:
            return False, "filtro giornaliero: bias bearish"
        return True, "ok"

    def forces_exit(self, bias: str) -> bool:
        return self.cfg.exit_on_bearish and bias == BEARISH
