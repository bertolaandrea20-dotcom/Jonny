from bot.config import CostsCfg, RiskCfg, StrategyCfg
from bot.forecaster import Forecast
from bot.risk import RiskManager
from bot.state import BotState, Position
from bot.strategy import decide

S, C = StrategyCfg(), CostsCfg()   # costi roundtrip 30bps, soglia ingresso 45bps


def fc(exp_bps: float, last: float = 100.0) -> Forecast:
    pred = last * (1 + exp_bps / 1e4)
    return Forecast(last, pred, [pred])


def pos(entry=100.0, bars=0) -> Position:
    return Position(entry_price=entry, qty_sol=1, cost_usd=entry, entry_time="t", bars_held=bars)


def test_buy_only_above_costs_plus_edge():
    assert decide(fc(50), None, 100, S, C).action == "BUY"
    assert decide(fc(40), None, 100, S, C).action == "HOLD"


def test_exits():
    assert decide(fc(0), pos(), 100.7, S, C).reason.startswith("take profit")
    assert decide(fc(0), pos(), 99.5, S, C).reason.startswith("stop loss")
    assert decide(fc(10), pos(bars=12), 100.1, S, C).reason.startswith("tempo")
    assert decide(fc(-10), pos(), 100.1, S, C).reason.startswith("previsione")
    assert decide(fc(10), pos(), 100.1, S, C).action == "HOLD"


def test_risk_limits(tmp_path):
    rm = RiskManager(RiskCfg(), kill_switch_path=str(tmp_path / "STOP"))
    st = BotState.fresh(200)
    assert rm.can_open(st)[0]

    st.trades_today = 20
    assert not rm.can_open(st)[0]
    st.trades_today = 0

    st.equity_usd = 193  # -3.5% nel giorno
    assert "perdita giornaliera" in rm.can_open(st)[1]
    st.equity_usd = 200

    (tmp_path / "STOP").write_text("")
    assert "kill switch" in rm.can_open(st)[1]


def test_drawdown_halts():
    rm = RiskManager(RiskCfg())
    st = BotState.fresh(200)
    st.equity_usd = 179
    rm.update_after_close(st)
    assert st.halted
