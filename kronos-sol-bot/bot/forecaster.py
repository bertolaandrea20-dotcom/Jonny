"""Previsori: Kronos (il modello vero) e un baseline semplice per confronto nel backtest.

Se Kronos non batte il baseline nel backtest al netto dei costi, non va usato con soldi veri.
"""
from __future__ import annotations

import sys
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import pandas as pd

from .config import ForecasterCfg
from .data import interval_to_timedelta


@dataclass
class Forecast:
    last_close: float
    pred_close: float          # close previsto all'orizzonte
    pred_path: list[float]     # close previsti barra per barra
    sample_closes: list[float] = field(default_factory=list)  # close finale di ogni campione

    @property
    def expected_return_bps(self) -> float:
        return (self.pred_close / self.last_close - 1) * 1e4

    @property
    def up_fraction(self) -> float:
        """Quota di campioni che prevede un rialzo all'orizzonte (1.0 se non ci sono campioni)."""
        if not self.sample_closes:
            return 1.0 if self.pred_close > self.last_close else 0.0
        return sum(c > self.last_close for c in self.sample_closes) / len(self.sample_closes)


class BaseForecaster:
    def __init__(self, cfg: ForecasterCfg, interval: str):
        self.cfg = cfg
        self.interval = interval

    def forecast(self, df: pd.DataFrame) -> Forecast:
        raise NotImplementedError


class BaselineForecaster(BaseForecaster):
    """Momentum: proietta il rendimento medio recente sull'orizzonte."""

    def forecast(self, df: pd.DataFrame) -> Forecast:
        closes = df["close"].to_numpy()
        k = self.cfg.baseline_lookback
        rets = np.diff(np.log(closes[-(k + 1):]))
        mu = float(rets.mean()) if len(rets) else 0.0
        h = self.cfg.horizon_bars
        last = float(closes[-1])
        path = [last * float(np.exp(mu * (i + 1))) for i in range(h)]
        return Forecast(last_close=last, pred_close=path[-1], pred_path=path)


PRICE_COLS = ["open", "high", "low", "close", "volume", "amount"]


class KronosForecaster(BaseForecaster):
    """Wrapper attorno a KronosPredictor del repo shiyu-coder/Kronos.

    Il repo non è un pacchetto pip: va clonato in `kronos_repo_path`
    (vedi README) e viene aggiunto al sys.path qui.

    `KronosPredictor.predict` restituisce solo la MEDIA dei campioni, quindi qui si replica
    la sua normalizzazione e si chiama `generate` con un campione per riga del batch:
    stesso costo, ma si ottengono i singoli percorsi (serve al filtro di confidenza).
    La media dei percorsi coincide con l'output di `predict` (la denormalizzazione è lineare).
    Verificato sul repo Kronos al commit 67b630e (aprile 2026).
    """

    def __init__(self, cfg: ForecasterCfg, interval: str, predictor=None):
        super().__init__(cfg, interval)
        self.step = interval_to_timedelta(interval)
        if predictor is not None:   # iniezione per i test
            self.predictor = predictor
            return
        repo = Path(cfg.kronos_repo_path).resolve()
        if not (repo / "model").exists():
            raise FileNotFoundError(
                f"Repo Kronos non trovato in {repo}. Esegui: "
                f"git clone https://github.com/shiyu-coder/Kronos {cfg.kronos_repo_path}")
        sys.path.insert(0, str(repo))
        from model import Kronos, KronosPredictor, KronosTokenizer  # type: ignore

        tokenizer = KronosTokenizer.from_pretrained(cfg.tokenizer)
        model = Kronos.from_pretrained(cfg.model)
        if cfg.seed is not None:
            import torch
            torch.manual_seed(cfg.seed)  # campionamento riproducibile nei backtest
        self.predictor = KronosPredictor(model, tokenizer, device=cfg.device,
                                         max_context=cfg.max_context)

    @staticmethod
    def _time_features(ts: pd.Series) -> np.ndarray:
        # Stesse feature di calc_time_stamps in Kronos (model/kronos.py).
        return np.stack([ts.dt.minute, ts.dt.hour, ts.dt.weekday, ts.dt.day, ts.dt.month],
                        axis=1).astype(np.float32)

    def forecast(self, df: pd.DataFrame) -> Forecast:
        ctx = df.tail(self.cfg.context_bars).reset_index(drop=True)
        x = ctx[PRICE_COLS].to_numpy(dtype=np.float32)
        if np.isnan(x).any():
            raise ValueError("Candele con valori NaN: impossibile prevedere")
        # Kronos vuole timestamp naive: togliamo il fuso (tutto è UTC).
        x_ts = ctx["timestamps"].dt.tz_localize(None)
        y_ts = pd.Series(pd.date_range(x_ts.iloc[-1] + self.step,
                                       periods=self.cfg.horizon_bars, freq=self.step))
        clip = getattr(self.predictor, "clip", 5)
        mean, std = x.mean(axis=0), x.std(axis=0)
        xn = np.clip((x - mean) / (std + 1e-5), -clip, clip)

        n = max(1, self.cfg.sample_count)
        preds = self.predictor.generate(
            np.repeat(xn[None], n, axis=0),
            np.repeat(self._time_features(x_ts)[None], n, axis=0),
            np.repeat(self._time_features(y_ts)[None], n, axis=0),
            self.cfg.horizon_bars, self.cfg.temperature, 0, self.cfg.top_p, 1, False)
        closes = np.asarray(preds)[:, :, 3] * (std[3] + 1e-5) + mean[3]  # (campioni, orizzonte)
        path = [float(v) for v in closes.mean(axis=0)]
        return Forecast(last_close=float(ctx["close"].iloc[-1]), pred_close=path[-1],
                        pred_path=path, sample_closes=[float(c) for c in closes[:, -1]])


def make_forecaster(cfg: ForecasterCfg, interval: str) -> BaseForecaster:
    if cfg.type == "kronos":
        return KronosForecaster(cfg, interval)
    if cfg.type == "baseline":
        return BaselineForecaster(cfg, interval)
    raise ValueError(f"forecaster.type sconosciuto: {cfg.type}")
