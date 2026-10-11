import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import random

from fastapi.testclient import TestClient

from citta.agents.pipeline import deliberate
from citta.city.city import City
from citta.config import Config
from citta.genome import Genome, mutate, random_genome
from citta.market.data import SyntheticFeed
from citta.server import create_app

SYMS = ["BTC/EUR", "ETH/EUR", "ENI.MI", "ISP.MI"]


def make_city(seed=1, **over):
    cfg = Config(symbols=SYMS, db_path=":memory:", seed=seed, day_ticks=24, initial_citizens=8,
                 min_population=4, max_population=30)
    for k, v in over.items():
        setattr(cfg, k, v)
    return City(cfg)


def test_pipeline_follows_tradingagents_graph():
    feed = SyntheticFeed(SYMS, seed=2)
    g = random_genome(random.Random(3), SYMS)
    d = deliberate("BTC/EUR", feed, g, 0.0, 0.0, 0.0)
    agents = [s.agent for s in d.steps]
    assert agents[:4] == ["Market Analyst", "Social Analyst", "News Analyst", "Fundamentals Analyst"]
    assert agents.count("Bull Researcher") == g.debate_rounds
    assert "Research Manager" in agents and "Trader" in agents
    assert agents.count("Conservative Analyst") == g.risk_rounds
    assert agents[-1] == "Portfolio Manager"
    assert d.rating in ("Buy", "Overweight", "Hold", "Underweight", "Sell")


def _day(city):
    for _ in range(city.cfg.day_ticks):
        city.step()


def test_judgment_every_cycle():
    city = make_city()
    n = city.cfg.cycle_days
    for _ in range(n - 1):  # la prova: nessun giudizio
        _day(city)
        assert city.stats["dead"] == 0 and city.stats["splits"] == 0
    _day(city)  # fine del primo ciclo: giudizio sui 3 giorni
    assert city.stats["dead"] + city.stats["splits"] > 0
    for c in city.citizens.values():
        if c.status == "dead":
            assert c.genome.fingerprint() in city.blacklist and c.cash == 0 and not c.positions
        if c.parent_id is not None:
            assert city.citizens[c.parent_id].days_survived == 1
            assert c.in_trial(n)
    after = (city.stats["dead"], city.stats["splits"])
    for _ in range(n - 1):  # a metà ciclo nessuno viene giudicato
        _day(city)
        assert (city.stats["dead"], city.stats["splits"]) == after
    _day(city)
    assert (city.stats["dead"], city.stats["splits"]) != after


def test_judgment_looks_at_whole_cycle():
    city = make_city(seed=8)
    c = city.alive()[0]
    for _ in range(city.cfg.cycle_days - 1):
        _day(city)
    # simuliamo: ottimo ciclo nel complesso anche se l'ultimo giorno è negativo
    c.equity_cycle_start = c.equity(city.prices) - 50
    c.equity_day_start = c.equity(city.prices) + 5
    for _ in range(city.cfg.day_ticks - 1):
        city.feed.step()
    city.end_of_day()
    assert c.alive and c.days_survived == 1


def test_newborns_get_their_own_trial():
    city = make_city(seed=3)
    for _ in range(24 * (city.cfg.cycle_days + 5)):
        city.step()
    children = [c for c in city.citizens.values() if c.parent_id is not None]
    assert children
    for c in children:
        if c.status == "dead":
            assert c.days_lived >= city.cfg.cycle_days and c.days_lived % city.cfg.cycle_days == 0


def test_blacklisted_strategies_never_reborn():
    city = make_city(seed=5)
    for _ in range(24 * 4):
        city.step()
    dead = [c for c in city.citizens.values() if c.status == "dead"]
    assert dead
    for c in city.citizens.values():
        # al momento della nascita, nessun morto (fino a quel giorno) aveva una strategia simile
        # (nel giudizio le morti precedono le nascite, e gli id crescono nel tempo)
        banned = [d.genome for d in dead if d.id < c.id and d.death_day <= c.born_day]
        assert all(c.genome.distance(b) >= 0.05 for b in banned), c.name


def test_city_never_dies_even_if_everyone_loses():
    city = make_city(seed=9)
    for day in range(10):
        for c in city.alive():  # catastrofe: ogni cittadino risulta in perdita
            c.equity_cycle_start = c.equity_day_start = c.equity(city.prices) * 2 + 1
        city.end_of_day()
        assert len(city.alive()) >= city.cfg.min_population
        assert city.treasury > 0
    assert city.stats["dead"] > 0


def test_money_is_conserved_without_fees():
    city = make_city(seed=11, fee_rate=0.0)
    city.broker.fee_rate = 0.0
    city.broker.slippage = 0.0
    start = city.city_equity()
    for _ in range(city.cfg.cycle_days):  # nessun trade: tutti a zero → muoiono, il guardiano rifonda
        city.end_of_day()
    assert city.stats["dead"] > 0
    assert abs(city.city_equity() - start) < 1e-6


def test_mutation_stays_in_bounds():
    rng = random.Random(0)
    g = Genome(symbols=["BTC/EUR"])
    for _ in range(200):
        g = mutate(g, rng, SYMS, strength=0.5)
        assert 1 <= g.debate_rounds <= 3 and 0.05 <= g.position_size <= 0.6
        assert g.slow_ma > g.fast_ma and g.symbols


def test_api():
    city = make_city()
    for _ in range(10):
        city.step()
    client = TestClient(create_app(city))
    s = client.get("/api/state").json()
    assert s["citizens"] and s["mode"] == "sim"
    cid = s["citizens"][0]["id"]
    c = client.get(f"/api/citizen/{cid}").json()
    assert c["genome"]["symbols"]
    assert client.post("/api/control", json={"action": "end_day"}).json()["ok"]
    assert client.get("/api/tree").status_code == 200


def test_backtest_on_history_without_lookahead():
    from backtest import run
    from citta.market.history import HistoricalFeed, align, synthetic_history

    hist = synthetic_history(SYMS, days=8, seed=1)
    grid, prices = align(hist)
    feed = HistoricalFeed(grid, prices)
    assert feed.news("BTC/EUR") == [] and feed.fundamentals("ENI.MI") == {}
    i = feed.i
    assert len(feed.closes("BTC/EUR", 50)) == 50 and feed.closes("BTC/EUR", 50)[-1] == prices["BTC/EUR"][i]
    cfg = Config(symbols=SYMS, db_path=":memory:", seed=1, day_ticks=24, initial_citizens=8, min_population=4)
    rep = run(cfg, feed, "test", SYMS)
    assert rep["summary"]["days"] >= 5
    assert all(len(d["agents"]) >= 4 for d in rep["days"])
    assert rep["days"][0]["equity"] == cfg.city_capital or abs(rep["days"][0]["equity"] - cfg.city_capital) < 1


def test_timeframe_view_daily_closes():
    import numpy as np
    from citta.market.data import TimeframeView
    from citta.market.history import HistoricalFeed

    grid = np.arange(0, 3_600_000 * 24 * 20, 3_600_000, dtype=np.int64)
    feed = HistoricalFeed(grid, {"X": np.arange(len(grid), dtype=float)}, warmup=24 * 10)
    daily = TimeframeView(feed, 24).closes("X", 5)
    assert list(daily) == [feed.i - 24 * k for k in (4, 3, 2, 1, 0)]
    assert daily[-1] == feed.price("X")


def test_judge_vs_market_rewards_beating_own_markets():
    city = make_city(seed=2, judge_vs_market=True)
    c = city.alive()[0]
    for s in list(c.positions):
        c.positions.pop(s)
    c.genome.symbols = ["BTC/EUR"]
    for _ in range(city.cfg.cycle_days - 1):
        city.end_of_day()
    # il suo mercato è sceso del 10% e lui è rimasto in contanti: ha battuto il mercato
    c.cycle_start_prices = {"BTC/EUR": city.prices["BTC/EUR"] * 1.1}
    c.equity_cycle_start = c.equity(city.prices) + 1  # ha anche perso 1 €
    city.end_of_day()
    assert c.alive and c.days_survived == 1
