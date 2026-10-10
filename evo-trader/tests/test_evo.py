import numpy as np
import pandas as pd
import pytest

from evo.agent import Agent
from evo.config import Config, CostsCfg, GenomeCfg, validate
from evo.ecosystem import Ecosystem
from evo.genome import FAMILY_GENES, RISK_GENES, Genome, mutate, random_genome
from evo.signals import signal


def market(n=3000, seed=1, drift=0.0, vol=0.01, symbols=("AAA", "BBB")):
    rng = np.random.default_rng(seed)
    ts = pd.date_range("2026-01-01", periods=n, freq="1h", tz="UTC")
    out = {}
    for k, s in enumerate(symbols):
        c = 100 * np.exp(np.cumsum(rng.normal(drift, vol, n)))
        o = np.concatenate([[c[0]], c[:-1]])
        spread = np.abs(rng.normal(0, vol / 2, n)) * c
        out[s] = pd.DataFrame({"timestamps": ts, "open": o, "high": np.maximum(o, c) + spread,
                               "low": np.minimum(o, c) - spread, "close": c,
                               "volume": 1.0, "amount": c})
    return out


def genome(**kw):
    base = dict(family="trend_ma", params={"fast": 5, "slow": 20}, stop_loss=0.05,
                take_profit=0.10, leverage=1.0, allow_short=False, symbol="AAA")
    base.update(kw)
    return Genome(**base)


# ---------------------------------------------------------------- DNA
def test_random_and_mutated_genomes_respect_bounds():
    rng = np.random.default_rng(0)
    cfg = GenomeCfg(max_leverage=2.0, allow_short=False)
    g = random_genome(rng, cfg, ["AAA"])
    for _ in range(300):
        g = mutate(g, rng, cfg, ["AAA"])
        for k, v in g.params.items():
            lo, hi, _ = FAMILY_GENES[g.family][k]
            assert lo <= v <= hi
        assert RISK_GENES["stop_loss"][0] <= g.stop_loss <= RISK_GENES["stop_loss"][1]
        assert 1.0 <= g.leverage <= 2.0
        assert not g.allow_short
        if g.family == "trend_ma":
            assert g.params["fast"] < g.params["slow"]
    assert g.generation == 300 and g.parent_id is not None


def test_no_leverage_when_max_is_one():
    rng = np.random.default_rng(0)
    cfg = GenomeCfg(max_leverage=1.0)
    g = random_genome(rng, cfg, ["AAA"])
    assert g.leverage == 1.0 and mutate(g, rng, cfg, ["AAA"]).leverage == 1.0


# ---------------------------------------------------------------- segnali
@pytest.mark.parametrize("family,params", [
    ("trend_ma", {"fast": 5, "slow": 30}), ("breakout", {"entry": 20, "exit": 10}),
    ("rsi_revert", {"period": 14, "low": 30, "high": 70}), ("bollinger", {"period": 20, "k": 2.0}),
    ("momentum", {"lookback": 24, "threshold": 0.01})])
def test_signals_do_not_look_ahead(family, params):
    m = market(800)["AAA"]
    g = genome(family=family, params=params, allow_short=True)
    full = signal(g, m)
    cut = 500
    future_changed = m.copy()
    future_changed.loc[cut + 1:, ["open", "high", "low", "close"]] *= 1.5
    assert np.array_equal(full[:cut + 1], signal(g, future_changed)[:cut + 1])
    assert set(np.unique(full)) <= {-1.0, 0.0, 1.0}


def test_filters_only_block():
    m = market(400)["AAA"]
    g = genome(kronos_min_bps=50.0, bias_filter=True, allow_short=True)
    raw = signal(genome(allow_short=True), m)
    kr = np.full(len(m), 100.0)
    kr[::2] = 0.0
    bias = np.array(["bearish"] * len(m), dtype=object)
    f = signal(g, m, kr, bias)
    assert np.all((f == 0) | (f == raw))         # mai una posizione che il segnale base non aveva
    assert not np.any(f > 0)                      # bias bearish: niente long


# ---------------------------------------------------------------- conto
COSTS = CostsCfg(fee_bps=10, slippage_bps=5, funding_apr_pct=0)


def test_round_trip_at_flat_price_costs_fees_and_slippage():
    a = Agent(genome(), cash=100, allocation=100)
    a.step(1, 100, 100, 100, 100, "t1", COSTS, 0)       # apre long
    a.step(0, 100, 100, 100, 100, "t2", COSTS, 0)       # chiude
    assert a.position is None and len(a.trades) == 1
    assert a.cash == pytest.approx(100 - 0.30, abs=0.01)   # ~2 x (10 + 5) bps


def test_stop_loss_is_pessimistic_and_locks_reentry():
    a = Agent(genome(stop_loss=0.05, take_profit=0.05), cash=100, allocation=100)
    a.step(1, 100, 106, 94, 100, "t1", COSTS, 0)        # tocca sia SL sia TP: vince lo SL
    assert a.trades[-1]["reason"] == "stop loss" and a.trades[-1]["pnl"] < 0
    a.step(1, 100, 100, 100, 100, "t2", COSTS, 0)       # stesso segnale: non rientra
    assert a.position is None
    a.step(0, 100, 100, 100, 100, "t3", COSTS, 0)
    a.step(1, 100, 100, 100, 100, "t4", COSTS, 0)       # il segnale è cambiato: rientra
    assert a.position is not None


def test_short_with_leverage_profits_on_drop_and_pays_funding():
    a = Agent(genome(allow_short=True, leverage=2.0, stop_loss=0.10, take_profit=0.30),
              cash=100, allocation=100)
    a.step(-1, 100, 100, 100, 100, "t1", COSTS, 0.001)
    assert a.position.side == -1 and a.position.notional == pytest.approx(200)
    assert a.cash == pytest.approx(100 - 0.2 - 0.2)     # fee 10bps su 200 + funding su 200
    assert a.equity(90) > a.equity(100)
    a.step(0, 90, 90, 90, 90, "t2", COSTS, 0)
    assert a.trades[-1]["pnl"] > 15                     # ~ +20$ meno i costi


def test_leveraged_long_gets_liquidated_before_wider_stop():
    a = Agent(genome(leverage=2.0, stop_loss=0.10), cash=100, allocation=100)
    a.step(1, 100, 100, 100, 100, "t1", COSTS, 0)
    a.genome.stop_loss = 0.5                            # stop più lontano della liquidazione
    a.step(1, 100, 100, 70, 80, "t2", COSTS, 0)
    assert a.trades[-1]["reason"] == "liquidazione"
    assert a.cash < 60


# ---------------------------------------------------------------- ecosistema
def eco_cfg(**kw):
    c = Config()
    c.costs = COSTS
    for k, v in kw.items():
        setattr(c.ecosystem, k, v)
    return c


def real_capital(eco, i):
    return eco.treasury + sum(a.equity(eco.ohlc[a.genome.symbol]["close"][i])
                              for a in eco.agents if a.status == "funded")


def test_capital_is_conserved_and_shadow_money_is_never_real():
    m = market(3000)
    cfg = eco_cfg(initial_capital=100, agent_allocation=20, founders=10, epoch_bars=100)
    eco = Ecosystem(cfg, m)
    start = 300
    eco.run(start, start + 100)
    # Dopo la prima epoca nessuno è promosso (incubazione): tesoreria intatta.
    assert eco.treasury == pytest.approx(100)
    eco.run(start + 100)
    last = len(eco.ts) - 1
    assert eco.history[-1].portfolio == pytest.approx(real_capital(eco, last), abs=1e-3)
    funded_ever = [a for a in eco.all_agents() if a.funded_epoch is not None]
    # Il capitale reale cambia solo per i trade degli agenti finanziati.
    pnl_real = sum(a.cash - a.allocation for a in eco.graveyard if a.funded_epoch is not None)
    assert len(funded_ever) <= 100 // 20 + len([a for a in eco.graveyard if a.funded_epoch is not None])
    assert eco.treasury <= 100 + max(pnl_real, 0) + 1e-6
    assert len(eco.agents) >= cfg.ecosystem.min_agents


def test_unprofitable_agents_die_and_profitable_ones_split():
    # Mercato in salita costante: i long sopravvivono e si sdoppiano, gli short muoiono.
    n = 2000
    ts = pd.date_range("2026-01-01", periods=n, freq="1h", tz="UTC")
    c = 100 * np.exp(np.linspace(0, 1.0, n))
    df = pd.DataFrame({"timestamps": ts, "open": c, "high": c * 1.001, "low": c * 0.999,
                       "close": c, "volume": 1.0, "amount": c})
    cfg = eco_cfg(initial_capital=100, agent_allocation=20, founders=0, min_agents=0,
                  epoch_bars=100, split_return_pct=1.0, min_trades_to_split=0)
    eco = Ecosystem(cfg, {"AAA": df})
    winner = eco._spawn(genome(family="momentum", params={"lookback": 10, "threshold": 0.0},
                               take_profit=0.30))
    loser = eco._spawn(genome(family="momentum", params={"lookback": 10, "threshold": 0.0},
                              allow_short=True, symbol="AAA"))
    loser.genome.family = "trend_ma"
    loser.genome.params = {"fast": 50, "slow": 20}      # incrocio invertito: sempre short in salita
    loser.genome.allow_short = True
    eco.run(300, 1200)
    assert loser.status == "dead"
    assert winner.status == "funded"
    assert any(a.genome.parent_id == winner.genome.id for a in eco.all_agents())


# ---------------------------------------------------------------- sicurezza
def test_live_requires_double_confirmation():
    c = Config(mode="live", broker="ibkr")
    c.ibkr.port = 4001
    with pytest.raises(RuntimeError):
        validate(c)
    c.secrets.confirm_live = True
    validate(c)
    c.broker = "paper"
    with pytest.raises(RuntimeError):
        validate(c)


def test_paper_bot_restarts_from_state_and_matches_one_shot_simulation(tmp_path, monkeypatch):
    import evo.paper as paper
    m = market(1400, seed=3)
    cfg = eco_cfg(initial_capital=100, agent_allocation=20, founders=8, epoch_bars=50,
                  prior_test_bars=200, prior_min_return_pct=-100, prior_max_drawdown_pct=100,
                  prior_max_trades_per_week=1e9)
    cfg.market.instruments = list(m)
    monkeypatch.setattr(paper, "load_recent",
                        lambda c, now, inst: {s: d[d["timestamps"] <= now].reset_index(drop=True)
                                              for s, d in m.items()})
    ts = m["AAA"]["timestamps"]
    first, last = 600, 900
    state = tmp_path / "eco.json"
    for i in range(first, last + 1):                       # un ciclo (= un riavvio) per candela
        paper.cycle(cfg, state, now=ts.iloc[i])

    eco = Ecosystem(cfg, {s: d.iloc[:last + 1].reset_index(drop=True) for s, d in m.items()})
    bars = 0
    for i in range(first, last + 1):
        if bars == 0:
            eco.start_epoch_at(i)
        eco.step_bar(i)
        bars += 1
        if bars == cfg.ecosystem.epoch_bars:
            eco.end_epoch_at(i)
            bars = 0
    saved = __import__("json").loads(state.read_text())
    assert saved["treasury"] == pytest.approx(eco.treasury)
    assert [a["genome"]["id"] for a in saved["agents"]] == [a.genome.id for a in eco.agents]
    assert [a["cash"] for a in saved["agents"]] == pytest.approx([a.cash for a in eco.agents])
    assert len(saved["history"]) == len(eco.history) == 6


def test_daily_kronos_forecast_is_forward_filled_only(tmp_path):
    import pickle
    from evo.sources import EVERY_KEY, kronos_path, load_kronos
    ts = pd.Series(pd.date_range("2026-01-01", periods=12, freq="4h", tz="UTC"))
    cache = {EVERY_KEY: "daily", ts[5].isoformat(): 80.0, ts[11].isoformat(): -40.0}
    p = kronos_path(str(tmp_path), "binance:AAA", "4h")
    p.write_bytes(pickle.dumps(cache))
    k = load_kronos(str(tmp_path), "binance:AAA", "4h", ts)
    assert np.all(np.isnan(k[:5]))                 # prima della prima previsione: nulla
    assert np.all(k[5:11] == 80.0) and k[11] == -40.0


# ---------------------------------------------------------------- universo generale
def test_instruments_with_different_trading_hours():
    """Una crypto 24/7 e un'azione aperta solo nei giorni feriali nello stesso ecosistema."""
    m = market(2000, seed=5, symbols=("binance:CRYPTO", "yahoo:STOCK"))
    stock = m["yahoo:STOCK"]
    m["yahoo:STOCK"] = stock[stock["timestamps"].dt.weekday < 5].reset_index(drop=True)
    cfg = eco_cfg(founders=0, min_agents=0, epoch_bars=100)
    cfg.costs.funding_apr_pct = 10.0
    eco = Ecosystem(cfg, m)
    assert len(eco.ts) == 2000                      # linea comune = unione degli orari
    a = eco._spawn(genome(symbol="yahoo:STOCK", leverage=2.0, family="momentum",
                          params={"lookback": 5, "threshold": 0.0}, stop_loss=0.5, take_profit=0.9))
    weekend = np.where(eco.ts.dt.weekday >= 5)[0]
    weekend = weekend[weekend > 400]
    a_before = None
    for i in range(300, weekend[0]):
        eco.step_bar(i)
    a_before = (a.cash, a.position)
    for i in weekend[:10]:
        eco.step_bar(i)                             # mercato chiuso: l'agente non fa nulla
    assert (a.cash, a.position) == a_before
    # Il primo giorno dopo il weekend paga il funding di tutte le ore trascorse.
    monday = next(i for i in range(weekend[0], len(eco.ts)) if eco.valid["yahoo:STOCK"][i])
    assert eco.dt_years["yahoo:STOCK"][monday] > 1.9 / 365    # da venerdì sera a lunedì
    assert eco.portfolio_value(weekend[0]) == pytest.approx(eco.portfolio_value(weekend[5]))


def test_leverage_and_costs_can_differ_per_instrument():
    cfg = eco_cfg()
    cfg.genome.max_leverage = 5.0
    cfg.genome.max_leverage_by_instrument = {"binance": 2.0, "yahoo:EURUSD=X": 30.0}
    cfg.costs.overrides = {"yahoo": {"fee_bps": 2.0}}
    m = market(500, symbols=("binance:BTCUSDT", "yahoo:SPY", "yahoo:EURUSD=X"))
    eco = Ecosystem(cfg, m)
    assert eco.leverage_cap("binance:BTCUSDT") == 2.0
    assert eco.leverage_cap("yahoo:SPY") == 5.0
    assert eco.leverage_cap("yahoo:EURUSD=X") == 5.0      # vale il limite più basso
    assert eco._fit(genome(symbol="binance:BTCUSDT", leverage=4.0)).leverage == 2.0
    assert eco.costs["yahoo:SPY"].fee_bps == 2.0 and eco.costs["binance:BTCUSDT"].fee_bps == 10.0


def test_yahoo_parser_and_resample_to_4h():
    from evo.data import parse_yahoo, resample
    t0 = int(pd.Timestamp("2026-03-02 08:00", tz="UTC").timestamp())
    js = {"chart": {"result": [{"timestamp": [t0 + 3600 * k for k in range(8)],
                                "indicators": {"quote": [{
                                    "open": [1, 2, 3, 4, 5, 6, 7, 8], "high": [2, 3, 4, 9, 6, 7, 8, 9],
                                    "low": [0.5, 1, 2, 3, 4, 5, 6, None], "close": [2, 3, 4, 5, 6, 7, 8, 9],
                                    "volume": [10, 10, 10, 10, 10, 10, 10, None]}]}}]}}
    df = parse_yahoo(js)
    assert len(df) == 7                                   # candela incompleta scartata
    r = resample(df, "4h")
    assert list(r["open"]) == [1, 5] and list(r["high"]) == [9, 8] and list(r["close"]) == [5, 8]


def test_universe_normalizes_names():
    from evo.config import MarketCfg
    m = MarketCfg(instruments=["BTCUSDT", "yahoo:ENI.MI"], default_source="binance")
    assert m.universe() == ["binance:BTCUSDT", "yahoo:ENI.MI"]


def test_minimum_fee_per_order_hurts_small_orders():
    costs = CostsCfg(fee_bps=5, slippage_bps=0, funding_apr_pct=0, min_fee=1.25)
    small = Agent(genome(), cash=20, allocation=20)
    small.step(1, 100, 100, 100, 100, "t1", costs, 0)
    small.step(0, 100, 100, 100, 100, "t2", costs, 0)
    assert small.cash == pytest.approx(20 - 2.5)          # 2 x 1,25 € = 12,5% di 20 €
    big = Agent(genome(), cash=5000, allocation=5000)
    big.step(1, 100, 100, 100, 100, "t1", costs, 0)
    big.step(0, 100, 100, 100, 100, "t2", costs, 0)
    assert big.cash == pytest.approx(5000 - 5.0)          # 2 x 0,05% = 0,1%


# ---------------------------------------------------------------- IBKR (con un IB finto)
class FakeContract:
    def __init__(self, conId, currency):
        self.conId, self.currency = conId, currency


class FakeIB:
    def __init__(self, positions=None):
        self.orders, self._pos = [], positions or {}
        self.contracts = {"yahoo:ENI.MI": FakeContract(1, "EUR"), "yahoo:SPY": FakeContract(2, "USD")}

    def isConnected(self):
        return True

    def qualifyContracts(self, c):
        return [self.contracts[{"ENI": "yahoo:ENI.MI", "SPY": "yahoo:SPY"}[c.symbol]]]

    def positions(self):
        from types import SimpleNamespace as NS
        return [NS(contract=NS(conId=k), position=v, account="") for k, v in self._pos.items()]

    def reqTickers(self, c):
        from types import SimpleNamespace as NS
        return [NS(marketPrice=lambda: 1.10, close=1.10)]          # 1 EUR = 1,10 USD

    def accountSummary(self, account=""):
        from types import SimpleNamespace as NS
        return [NS(tag="NetLiquidation", value="1000", currency="EUR")]

    def placeOrder(self, c, order):
        self.orders.append((c.conId, order.action, order.totalQuantity))


def ibkr_cfg(**kw):
    c = Config(broker="ibkr")
    c.ecosystem.initial_capital = 1000
    c.ibkr.contracts = {"yahoo:ENI.MI": {"secType": "STK", "symbol": "ENI", "exchange": "BVME",
                                         "currency": "EUR"},
                        "yahoo:SPY": {"secType": "STK", "symbol": "SPY", "exchange": "SMART",
                                      "currency": "USD"}}
    for k, v in kw.items():
        setattr(c.ibkr, k, v)
    return c


def test_ibkr_sends_only_the_difference_in_whole_shares(tmp_path):
    from evo.brokers import IBKRBroker
    ib = FakeIB(positions={1: 4})                                   # già 4 ENI in portafoglio
    b = IBKRBroker(ibkr_cfg(), ib=ib, kill_switch=str(tmp_path / "STOP"))
    msgs = b.sync({"yahoo:ENI.MI": 255.0, "yahoo:SPY": -330.0},
                  {"yahoo:ENI.MI": 25.0, "yahoo:SPY": 600.0}, {"yahoo:ENI.MI", "yahoo:SPY"})
    # ENI: 255/25 = 10,2 -> 10 pezzi, ne ho 4 -> compra 6. SPY: 330 EUR = 0,6 azioni -> 0.
    assert ib.orders == [(1, "BUY", 6.0)]
    assert any("valore netto 1000" in m for m in msgs)


def test_ibkr_converts_currency_and_skips_closed_markets(tmp_path):
    from evo.brokers import IBKRBroker
    ib = FakeIB()
    b = IBKRBroker(ibkr_cfg(), ib=ib, kill_switch=str(tmp_path / "STOP"))
    b.sync({"yahoo:SPY": 1100.0, "yahoo:ENI.MI": 100.0}, {"yahoo:SPY": 500.0, "yahoo:ENI.MI": 25.0},
           tradable={"yahoo:SPY"})
    # 500 USD = 454,5 EUR per azione: 1100 EUR -> 2 azioni
    assert ib.orders == [(2, "BUY", 2.0)]                         # ENI saltato: mercato chiuso


def test_ibkr_kill_switch_only_reduces_and_caps_apply(tmp_path):
    from evo.brokers import IBKRBroker
    stop = tmp_path / "STOP"
    stop.write_text("")
    ib = FakeIB(positions={1: 10})
    b = IBKRBroker(ibkr_cfg(), ib=ib, kill_switch=str(stop))
    b.sync({"yahoo:ENI.MI": 1000.0}, {"yahoo:ENI.MI": 25.0}, {"yahoo:ENI.MI"})
    assert ib.orders == []                                          # niente aumenti col file STOP
    b.sync({"yahoo:ENI.MI": 100.0}, {"yahoo:ENI.MI": 25.0}, {"yahoo:ENI.MI"})
    assert ib.orders == [(1, "SELL", 6.0)]                          # riduzioni consentite
    stop.unlink()
    ib.orders.clear()
    b2 = IBKRBroker(ibkr_cfg(max_gross_exposure=0.5, max_order_value=200), ib=FakeIB(),
                    kill_switch=str(stop))
    b2.sync({"yahoo:ENI.MI": 5000.0}, {"yahoo:ENI.MI": 25.0}, {"yahoo:ENI.MI"})
    assert b2.ib.orders == [(1, "BUY", 8.0)]                        # tetto di 200 EUR per ordine


def test_ibkr_ports_must_match_mode():
    c = ibkr_cfg(port=4001)
    with pytest.raises(RuntimeError):
        validate(c)                                                  # paper sul conto reale
    c = ibkr_cfg(port=4002)
    c.mode, c.secrets.confirm_live = "live", True
    with pytest.raises(RuntimeError):
        validate(c)                                                  # live sul conto demo
