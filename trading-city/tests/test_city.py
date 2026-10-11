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


def test_losers_die_and_are_blacklisted_winners_split():
    city = make_city()
    for _ in range(24):
        city.step()
    assert city.day == 2
    dead = [c for c in city.citizens.values() if c.status == "dead"]
    for c in dead:
        assert c.genome.fingerprint() in city.blacklist
        assert c.cash == 0 and not c.positions
    for c in city.citizens.values():
        if c.parent_id is not None:
            assert city.citizens[c.parent_id].day_results[-1] > 0  # solo chi guadagna si riproduce


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
    for day in range(6):
        for c in city.alive():  # catastrofe: ogni cittadino perde metà del capitale
            c.equity_day_start = c.equity(city.prices) * 2 + 1
        city.end_of_day()
        assert len(city.alive()) >= city.cfg.min_population
        assert city.treasury > 0


def test_lifespan_is_respected():
    city = make_city(seed=4)
    for _ in range(24 * 6):
        city.step()
    for c in city.alive():
        assert c.days_survived < city.cfg.lifespan_days


def test_money_is_conserved_without_fees():
    city = make_city(seed=11, fee_rate=0.0)
    city.broker.fee_rate = 0.0
    city.broker.slippage = 0.0
    start = city.city_equity()
    city.end_of_day()  # nessun trade: tutti a zero → tutti muoiono, il guardiano rifonda
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
