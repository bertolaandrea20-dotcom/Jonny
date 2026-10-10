import numpy as np
import pandas as pd
import pytest

from backtest.run_backtest import run_backtest
from bot.config import Config, StrategyCfg, load_config
from bot.engine import Engine
from bot.executor import PaperExecutor
from bot.forecaster import BaselineForecaster, Forecast, KronosForecaster
from bot.risk import RiskManager
from bot.state import BotState, Position
from bot.strategy import decide, intrabar_exit

S = StrategyCfg()   # TP +60bps, SL -40bps


def pos(entry=100.0) -> Position:
    return Position(entry_price=entry, qty_sol=1, cost_usd=entry, entry_time="2026-01-01T00:00:00+00:00")


@pytest.mark.parametrize("o,h,l,expected", [
    (100.0, 100.3, 99.8, None),                           # nessun livello toccato
    (100.0, 100.1, 99.5, (99.6, "stop loss intrabar")),   # SL al livello
    (100.0, 100.7, 99.9, (100.6, "take profit intrabar")),
    (100.0, 100.7, 99.5, (99.6, "stop loss intrabar")),   # entrambi: si assume lo SL
    (99.0, 99.2, 98.8, (99.0, "stop loss intrabar")),     # gap sotto lo SL: esce all'apertura
    (101.0, 101.2, 100.9, (101.0, "take profit intrabar")),
])
def test_intrabar_exit(o, h, l, expected):
    hit = intrabar_exit(pos(), o, h, l, S)
    if expected is None:
        assert hit is None
    else:
        assert hit[0] == pytest.approx(expected[0]) and hit[1] == expected[1]


def _engine(cfg, tmp_path):
    st = BotState.fresh(200)
    return Engine(cfg, st, BaselineForecaster(cfg.forecaster, "5m"), PaperExecutor(cfg),
                  RiskManager(cfg.risk, str(tmp_path / "STOP")))


def test_check_stops_closes_and_respects_flag(cfg, tmp_path):
    t = pd.Timestamp("2026-01-01 00:05", tz="UTC")
    eng = _engine(cfg, tmp_path)
    eng.state.position = pos()
    ev = eng.check_stops(100.0, 100.1, 99.0, t)
    assert ev.kind == "CLOSE" and eng.state.position is None
    assert eng.trades[-1]["exit_reason"] == "stop loss intrabar"
    assert eng.trades[-1]["exit_time"] == t.isoformat()

    cfg.strategy.intrabar_stops = False
    eng = _engine(cfg, tmp_path)
    eng.state.position = pos()
    assert eng.check_stops(100.0, 100.1, 99.0, t) is None and eng.state.position


def test_backtest_catches_wick_that_closes_miss(cfg, ohlcv):
    """Una candela con un minimo che buca lo stop ma chiude sopra: solo l'intrabar la vede."""
    df = ohlcv.copy()
    r0 = run_backtest(cfg, df, verbose=False)
    first = r0["_trades"].iloc[0]
    i = int(df.index[df["timestamps"] == pd.Timestamp(first["entry_time"])][0]) + 1
    df.loc[i, "low"] = first["entry_price"] * 0.99          # wick -100bps
    df.loc[i, "high"] = max(df.loc[i, "high"], df.loc[i, "open"])
    r = run_backtest(cfg, df, verbose=False)
    t = r["_trades"].iloc[0]
    assert t["exit_reason"] == "stop loss intrabar"
    assert t["exit_time"] == df["timestamps"].iloc[i].isoformat()
    # Uscita al livello di stop meno lo slippage
    sl = first["entry_price"] * (1 - cfg.strategy.stop_loss_bps / 1e4)
    assert t["exit_price"] == pytest.approx(sl * (1 - cfg.costs.slippage_bps / 1e4), rel=1e-6)

    cfg.strategy.intrabar_stops = False
    assert run_backtest(cfg, df, verbose=False)["_trades"].iloc[0]["exit_reason"] != "stop loss intrabar"


def test_backtest_step_still_checks_stops_every_bar(cfg, ohlcv):
    r = run_backtest(cfg, ohlcv, step=3, verbose=False)
    assert r["trade"] > 0
    assert (r["_trades"]["exit_reason"].str.contains("intrabar")).any()
    assert len(r["_curve"]) == len(ohlcv) - cfg.forecaster.context_bars


def test_force_close_uses_given_time_in_backtest(cfg, ohlcv):
    t = run_backtest(cfg, ohlcv, verbose=False)["_trades"]
    assert pd.Timestamp(t["exit_time"].iloc[-1]) <= ohlcv["timestamps"].iloc[-1]


def test_mark_to_market_equals_liquidation(cfg, tmp_path):
    eng = _engine(cfg, tmp_path)
    fill = eng.executor.buy(100, 150)
    eng.state.position = Position(fill.price, fill.qty_sol, fill.usd, "t")
    sell = eng.executor.sell(fill.qty_sol, 151)
    assert eng.mark_to_market(151) == pytest.approx(200 - 100 + sell.usd)


# ---------- filtro di confidenza ----------

def fc(exp_bps, samples_bps=(), last=100.0):
    pred = last * (1 + exp_bps / 1e4)
    return Forecast(last, pred, [pred], [last * (1 + b / 1e4) for b in samples_bps])


def test_up_fraction():
    assert fc(50, [80, 60, -10, 30]).up_fraction == 0.75
    assert fc(50).up_fraction == 1.0 and fc(-5).up_fraction == 0.0


def test_min_up_fraction_blocks_low_agreement():
    s = StrategyCfg(min_up_fraction=0.8)
    from bot.config import CostsCfg
    c = CostsCfg()
    # Media +50bps trainata da un campione estremo, ma solo 2/5 al rialzo: niente ingresso
    assert decide(fc(50, [300, 20, -10, -20, -40]), None, 100, s, c).action == "HOLD"
    assert decide(fc(50, [70, 60, 50, 40, -20]), None, 100, s, c).action == "BUY"
    assert decide(fc(50, [300, 20, -10, -20, -40]), None, 100, StrategyCfg(), c).action == "BUY"


def test_min_up_fraction_validated(tmp_path):
    p = tmp_path / "c.yaml"
    p.write_text("strategy:\n  min_up_fraction: 1.5\n")
    with pytest.raises(ValueError):
        load_config(str(p), env_file=str(tmp_path / "none.env"))


def test_empty_telegram_section(tmp_path):
    p = tmp_path / "c.yaml"
    p.write_text("telegram:\n")
    assert load_config(str(p), env_file=str(tmp_path / "none.env")).telegram_enabled


# ---------- wrapper Kronos (predictor finto con la stessa interfaccia di generate) ----------

class FakePredictor:
    """Imita KronosPredictor.generate: input normalizzato (B, L, 6), output (B, pred_len, 6)."""
    clip = 5

    def __init__(self, sample_offsets):
        self.offsets = np.asarray(sample_offsets, dtype=np.float32)
        self.calls = []

    def generate(self, x, x_stamp, y_stamp, pred_len, T, top_k, top_p, sample_count, verbose):
        self.calls.append(dict(x=x, x_stamp=x_stamp, y_stamp=y_stamp, pred_len=pred_len,
                               sample_count=sample_count, verbose=verbose))
        last = x[:, -1:, :]                                    # ultimo valore normalizzato
        out = np.repeat(last, pred_len, axis=1).copy()
        out[:, :, 3] += self.offsets[:, None]                  # offset diverso per campione
        return out


def test_kronos_wrapper_returns_samples(cfg, ohlcv):
    cfg.forecaster.sample_count = 4
    cfg.forecaster.horizon_bars = 6
    fake = FakePredictor([0.5, 0.2, -0.1, 0.3])   # in deviazioni standard del close
    kf = KronosForecaster(cfg.forecaster, "5m", predictor=fake)
    f = kf.forecast(ohlcv)

    call = fake.calls[0]
    assert call["x"].shape == (4, cfg.forecaster.context_bars, 6)
    assert call["y_stamp"].shape == (4, 6, 5) and call["sample_count"] == 1
    assert call["verbose"] is False
    # Feature temporali come calc_time_stamps: minuto, ora, giorno settimana, giorno, mese
    last_ts = ohlcv["timestamps"].iloc[-1]
    nxt = last_ts + pd.Timedelta(minutes=5)
    assert list(call["y_stamp"][0, 0]) == [nxt.minute, nxt.hour, nxt.weekday(), nxt.day, nxt.month]

    closes = ohlcv["close"].tail(cfg.forecaster.context_bars).to_numpy(dtype=np.float32)
    std = closes.std()
    assert len(f.sample_closes) == 4 and f.up_fraction == 0.75
    assert f.last_close == pytest.approx(ohlcv["close"].iloc[-1])
    assert f.pred_close == pytest.approx(f.last_close + 0.225 * std, rel=1e-4)  # media offset
    assert f.sample_closes[0] == pytest.approx(f.last_close + 0.5 * std, rel=1e-4)


def test_fetch_history_period_and_context():
    from bot.data import fetch_history
    from tests.conftest import synthetic_ohlcv
    full = synthetic_ohlcv(5000)
    calls = []

    def fake_fetch(symbol, interval, limit, end_time_ms):
        calls.append(end_time_ms)
        d = full
        if end_time_ms is not None:
            d = d[d["timestamps"] <= pd.Timestamp(end_time_ms, unit="ms", tz="UTC")]
        return d.tail(limit).reset_index(drop=True)

    end = pd.Timestamp("2026-01-10", tz="UTC")
    df = fetch_history("SOLUSDT", "5m", days=2, end=end, extra_bars=100, fetch=fake_fetch)
    assert len(df) == 2 * 288 + 100
    assert df["timestamps"].iloc[-1] < end
    assert df["timestamps"].is_monotonic_increasing and df["timestamps"].is_unique


def test_kronos_wrapper_puts_modules_in_eval_mode(cfg, tmp_path, monkeypatch):
    # Repo Kronos finto: from_pretrained restituisce moduli in training, come quello vero.
    pkg = tmp_path / "model"
    pkg.mkdir()
    (pkg / "__init__.py").write_text(
        "class _Mod:\n"
        "    training = True\n"
        "    @classmethod\n"
        "    def from_pretrained(cls, name):\n"
        "        return cls()\n"
        "    def eval(self):\n"
        "        self.training = False\n"
        "        return self\n"
        "class Kronos(_Mod): pass\n"
        "class KronosTokenizer(_Mod): pass\n"
        "class KronosPredictor:\n"
        "    def __init__(self, model, tokenizer, device=None, max_context=512):\n"
        "        self.model, self.tokenizer = model, tokenizer\n")
    import sys
    monkeypatch.delitem(sys.modules, "model", raising=False)
    monkeypatch.setattr(sys, "path", list(sys.path))
    cfg.forecaster.kronos_repo_path = str(tmp_path)
    kf = KronosForecaster(cfg.forecaster, "5m")
    assert kf.predictor.model.training is False
    assert kf.predictor.tokenizer.training is False
