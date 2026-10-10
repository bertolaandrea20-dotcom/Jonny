import numpy as np
import pandas as pd
import pytest

from bot.config import Config


def synthetic_ohlcv(n: int = 1500, seed: int = 7, drift: float = 0.0, vol: float = 0.002) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    rets = rng.normal(drift, vol, n)
    close = 150 * np.exp(np.cumsum(rets))
    open_ = np.concatenate([[close[0]], close[:-1]])
    spread = np.abs(rng.normal(0, vol / 2, n)) * close
    high = np.maximum(open_, close) + spread
    low = np.minimum(open_, close) - spread
    volume = rng.uniform(1000, 5000, n)
    ts = pd.date_range("2026-01-01", periods=n, freq="5min", tz="UTC")
    return pd.DataFrame({"timestamps": ts, "open": open_, "high": high, "low": low,
                         "close": close, "volume": volume, "amount": volume * close})


@pytest.fixture
def cfg() -> Config:
    c = Config()
    c.forecaster.type = "baseline"
    c.forecaster.context_bars = 100
    return c


@pytest.fixture
def ohlcv() -> pd.DataFrame:
    return synthetic_ohlcv()
