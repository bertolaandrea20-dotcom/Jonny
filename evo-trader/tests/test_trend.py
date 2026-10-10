import json

import numpy as np
import pandas as pd
import pytest

from evo.config import Config, validate
from evo.trend import Fill, KrakenExchange, PaperExchange, cycle, trend_signal


def bars(closes, start="2026-01-01", freq="4h"):
    ts = pd.date_range(start, periods=len(closes), freq=freq, tz="UTC")
    c = np.asarray(closes, float)
    return pd.DataFrame({"timestamps": ts, "open": c, "high": c, "low": c, "close": c, "volume": 1.0})


def cfg(**kw):
    c = Config(strategy="trend")
    c.trend.instruments = ["kraken:AAA/EUR", "kraken:BBB/EUR"]
    c.trend.capital = 200.0
    c.trend.sma_days = 2                     # 12 candele da 4h
    c.costs.fee_bps, c.costs.slippage_bps = 25, 0
    for k, v in kw.items():
        setattr(c.trend, k, v)
    return c


def test_signal_uses_sma_in_days():
    up = bars(list(range(1, 30)))
    down = bars(list(range(30, 1, -1)))
    assert trend_signal(up, "4h", 2) is True and trend_signal(down, "4h", 2) is False
    assert trend_signal(bars([1, 2, 3]), "4h", 2) is None          # storia insufficiente


def test_cycle_buys_above_and_sells_below_the_average(tmp_path):
    c = cfg()
    state = tmp_path / "s.json"
    ex = PaperExchange(25, 0)
    up = bars(np.linspace(10, 20, 30))
    flat = bars(np.full(30, 10.0))
    ev = cycle(c, state, ex, {"kraken:AAA/EUR": up, "kraken:BBB/EUR": flat}, str(tmp_path / "STOP"))
    s = json.loads(state.read_text())["sleeves"]
    assert any("COMPRA" in e and "AAA" in e for e in ev)
    assert s[0]["qty"] == pytest.approx(99.75 / 20) and s[0]["cash"] == pytest.approx(0)
    assert s[1]["qty"] == 0 and s[1]["cash"] == 100            # piatto: non sopra la media
    # stessa candela: nessuna nuova azione
    assert cycle(c, state, ex, {"kraken:AAA/EUR": up, "kraken:BBB/EUR": flat}) == []
    down = bars(list(np.linspace(10, 20, 30)) + list(np.linspace(19, 12, 8)))
    ev = cycle(c, state, ex, {"kraken:AAA/EUR": down, "kraken:BBB/EUR": bars(np.full(38, 10.0))},
               str(tmp_path / "STOP"))
    s = json.loads(state.read_text())["sleeves"]
    assert any("VENDE" in e for e in ev) and s[0]["qty"] == 0
    assert s[0]["cash"] == pytest.approx(99.75 / 20 * 12 * (1 - 0.0025))


def test_stop_file_only_sells(tmp_path):
    c = cfg()
    state = tmp_path / "s.json"
    stop = tmp_path / "STOP"
    stop.write_text("")
    up = bars(np.linspace(10, 20, 30))
    ev = cycle(c, state, PaperExchange(25, 0), {"kraken:AAA/EUR": up, "kraken:BBB/EUR": up}, str(stop))
    assert not any("COMPRA" in e for e in ev)


def test_bot_never_spends_more_than_its_capital(tmp_path):
    c = cfg()
    state = tmp_path / "s.json"
    up = bars(np.linspace(10, 20, 30))
    cycle(c, state, PaperExchange(25, 0), {"kraken:AAA/EUR": up, "kraken:BBB/EUR": up})
    s = json.loads(state.read_text())["sleeves"]
    spent = sum(100 - x["cash"] for x in s)
    assert spent <= c.trend.capital + 1e-9


class FakeCcxt:
    """Imita ccxt.kraken: l'ordine limite non viene eseguito, quello a mercato sì."""

    def __init__(self, free=None):
        self.markets = {"AAA/EUR": {"limits": {"amount": {"min": 0.1}, "cost": {"min": 0.45}}}}
        self.calls, self.free = [], free or {}
        self.orders = {}

    def load_markets(self):
        return self.markets

    def amount_to_precision(self, s, q):
        return f"{q:.8f}"

    def fetch_order_book(self, s, limit=5):
        return {"bids": [[9.9, 1]], "asks": [[10.1, 1]]}

    def create_order(self, s, typ, side, qty, px=None, params=None):
        self.calls.append((typ, side, qty, px, params))
        oid = str(len(self.calls))
        if typ == "limit":
            self.orders[oid] = {"id": oid, "status": "open", "filled": 0.0, "cost": 0.0, "fee": {}}
        else:
            self.orders[oid] = {"id": oid, "status": "closed", "filled": qty, "cost": qty * 10,
                                "fee": {"cost": qty * 10 * 0.004, "currency": "EUR"}}
        return self.orders[oid]

    def create_market_buy_order_with_cost(self, s, cost):
        self.calls.append(("market_cost", "buy", cost))
        oid = str(len(self.calls))
        self.orders[oid] = {"id": oid, "status": "closed", "filled": cost / 10, "cost": cost,
                            "fee": {"cost": cost * 0.004, "currency": "EUR"}}
        return self.orders[oid]

    def fetch_order(self, oid, s):
        return self.orders[oid]

    def cancel_order(self, oid, s):
        self.calls.append(("cancel", oid))
        self.orders[oid]["status"] = "canceled"

    def fetch_balance(self):
        return {"free": self.free}


def test_kraken_tries_maker_then_falls_back_to_market():
    c = cfg()
    c.trend.maker_wait_s = 20
    fake = FakeCcxt()
    k = KrakenExchange(c, ex=fake, sleep=lambda s: None)
    f = k.buy("AAA/EUR", 100.0, 10.0)
    kinds = [x[0] for x in fake.calls]
    assert kinds == ["limit", "cancel", "market_cost"]
    assert fake.calls[0][4] == {"postOnly": True} and fake.calls[0][3] == 9.9   # al miglior bid
    assert 0 < f.cost + f.fee <= 100.0


def test_kraken_sells_only_what_is_really_on_the_account():
    c = cfg(order_mode="market")
    fake = FakeCcxt(free={"AAA": 3.0})
    f = KrakenExchange(c, ex=fake, sleep=lambda s: None).sell("AAA/EUR", 5.0, 10.0)
    assert fake.calls == [("market", "sell", 3.0, None, None)] and f.qty == 3.0


def test_live_kraken_requires_keys_and_confirmation():
    c = cfg()
    c.mode, c.broker = "live", "kraken"
    with pytest.raises(RuntimeError):
        validate(c)                                   # manca CONFIRM_LIVE
    c.secrets.confirm_live = True
    with pytest.raises(RuntimeError):
        validate(c)                                   # mancano le chiavi
    c.secrets.broker_api_key, c.secrets.broker_api_secret = "k", "s"
    validate(c)
