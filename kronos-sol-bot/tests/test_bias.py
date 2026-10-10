import pandas as pd
import pytest

from backtest.run_backtest import run_backtest
from bot.bias import BiasCache, BiasFilter, parse_decision
from bot.config import BiasCfg


@pytest.mark.parametrize("text,expected", [
    ("BUY", "bullish"),
    ("Final decision: **SELL**", "bearish"),
    ("We considered buying but the final rating is HOLD", "neutral"),
    ("Rating: Overweight", "bullish"),
    ("Rating: UNDERWEIGHT", "bearish"),
    ("FINAL TRANSACTION PROPOSAL: **BUY**", "bullish"),
])
def test_parse_decision(text, expected):
    assert parse_decision(text) == expected


def test_parse_decision_unknown():
    with pytest.raises(ValueError):
        parse_decision("nessuna indicazione")


class FakeRunner:
    def __init__(self, bias="bearish", fail=False):
        self.bias, self.fail, self.calls = bias, fail, []

    def run(self, analysis_date):
        self.calls.append(analysis_date)
        if self.fail:
            raise RuntimeError("LLM giù")
        return self.bias, self.bias.upper()


def bcfg(tmp_path, **kw):
    return BiasCfg(enabled=True, cache_file=str(tmp_path / "bias.json"), **kw)


def test_computes_once_per_day_with_previous_day_analysis(tmp_path):
    runner = FakeRunner("bullish")
    f = BiasFilter(bcfg(tmp_path), runner=runner)
    t = pd.Timestamp("2026-10-10 09:00", tz="UTC")
    assert f.bias_for(t) == ("bullish", True)
    assert f.bias_for(t + pd.Timedelta(hours=3)) == ("bullish", False)
    assert runner.calls == ["2026-10-09"]   # anti look-ahead: analisi del giorno prima


def test_before_refresh_hour_uses_previous_day(tmp_path):
    cfg = bcfg(tmp_path, refresh_hour_utc=6)
    BiasCache(cfg.cache_file).set("2026-10-09", "bearish")
    f = BiasFilter(cfg, allow_compute=False)
    assert f.bias_for(pd.Timestamp("2026-10-10 03:00", tz="UTC"))[0] == "bearish"


def test_failure_uses_fallback_and_caches(tmp_path):
    runner = FakeRunner(fail=True)
    f = BiasFilter(bcfg(tmp_path, fallback="bearish"), runner=runner)
    t = pd.Timestamp("2026-10-10 09:00", tz="UTC")
    assert f.bias_for(t)[0] == "bearish"
    f.bias_for(t)
    assert len(runner.calls) == 1           # nessun retry costoso a ogni candela


def test_policies(tmp_path):
    f = BiasFilter(bcfg(tmp_path, policy="block_bearish"), allow_compute=False)
    assert f.allows_open("neutral")[0] and not f.allows_open("bearish")[0]
    f = BiasFilter(bcfg(tmp_path, policy="only_bullish"), allow_compute=False)
    assert f.allows_open("bullish")[0] and not f.allows_open("neutral")[0]


def test_backtest_bearish_blocks_all_opens(cfg, ohlcv, tmp_path):
    cfg.bias = bcfg(tmp_path)
    cache = BiasCache(cfg.bias.cache_file)
    for d in pd.date_range("2025-12-31", "2026-01-10"):
        cache.set(d.date().isoformat(), "bearish")
    r = run_backtest(cfg, ohlcv, verbose=False, use_bias=True)
    assert r["trade"] == 0 and r["aperture_bloccate"] > 0
    assert r["giorni_con_bias"].split("/")[0] == r["giorni_con_bias"].split("/")[1]


def test_backtest_bearish_exit(cfg, ohlcv, tmp_path):
    cfg.bias = bcfg(tmp_path, exit_on_bearish=True)
    cache = BiasCache(cfg.bias.cache_file)
    days = pd.date_range("2025-12-31", "2026-01-10")
    for i, d in enumerate(days):
        cache.set(d.date().isoformat(), "bullish" if i % 2 else "bearish")
    r = run_backtest(cfg, ohlcv, verbose=False, use_bias=True)
    assert r["trade"] > 0
    assert r["aperture_bloccate"] > 0
