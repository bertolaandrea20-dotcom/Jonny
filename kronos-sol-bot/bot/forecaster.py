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

        # from_pretrained lascia i moduli in modalità training: senza eval() il dropout resta
        # attivo in inferenza (previsioni più rumorose e attention ~3x più lenta su CPU).
        tokenizer = KronosTokenizer.from_pretrained(cfg.tokenizer).eval()
        model = Kronos.from_pretrained(cfg.model).eval()
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
        return self.forecast_many([df])[0]

    def forecast_many(self, dfs: list[pd.DataFrame]) -> list[Forecast]:
        """Previsioni per più finestre in una sola chiamata al modello (più veloce su CPU,
        usato per precalcolare le previsioni dei backtest). Ogni finestra è normalizzata
        per conto suo, esattamente come in `forecast`."""
        n = max(1, self.cfg.sample_count)
        xs, x_stamps, y_stamps, stats, last = [], [], [], [], []
        clip = getattr(self.predictor, "clip", 5)
        for df in dfs:
            ctx = df.tail(self.cfg.context_bars).reset_index(drop=True)
            x = ctx[PRICE_COLS].to_numpy(dtype=np.float32)
            if np.isnan(x).any():
                raise ValueError("Candele con valori NaN: impossibile prevedere")
            # Kronos vuole timestamp naive: togliamo il fuso (tutto è UTC).
            x_ts = ctx["timestamps"].dt.tz_localize(None)
            y_ts = pd.Series(pd.date_range(x_ts.iloc[-1] + self.step,
                                           periods=self.cfg.horizon_bars, freq=self.step))
            mean, std = x.mean(axis=0), x.std(axis=0)
            xn = np.clip((x - mean) / (std + 1e-5), -clip, clip)
            xs.append(np.repeat(xn[None], n, axis=0))
            x_stamps.append(np.repeat(self._time_features(x_ts)[None], n, axis=0))
            y_stamps.append(np.repeat(self._time_features(y_ts)[None], n, axis=0))
            stats.append((mean[3], std[3]))
            last.append(float(ctx["close"].iloc[-1]))
        if len({len(x[0]) for x in xs}) > 1:
            raise ValueError("forecast_many: le finestre devono avere la stessa lunghezza")

        preds = np.asarray(self.predictor.generate(
            np.concatenate(xs), np.concatenate(x_stamps), np.concatenate(y_stamps),
            self.cfg.horizon_bars, self.cfg.temperature, 0, self.cfg.top_p, 1, False))
        out = []
        for k, ((m, sd), lc) in enumerate(zip(stats, last)):
            closes = preds[k * n:(k + 1) * n, :, 3] * (sd + 1e-5) + m  # (campioni, orizzonte)
            path = [float(v) for v in closes.mean(axis=0)]
            out.append(Forecast(last_close=lc, pred_close=path[-1], pred_path=path,
                                sample_closes=[float(c) for c in closes[:, -1]]))
        return out


def make_forecaster(cfg: ForecasterCfg, interval: str) -> BaseForecaster:
    if cfg.type == "kronos":
        return KronosForecaster(cfg, interval)
    if cfg.type == "baseline":
        return BaselineForecaster(cfg, interval)
    raise ValueError(f"forecaster.type sconosciuto: {cfg.type}")
