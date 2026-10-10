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
    c = Config(mode="live", broker="ccxt")
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
    cfg.market.symbols = list(m)
    monkeypatch.setattr(paper, "load_recent",
                        lambda c, now: {s: d[d["timestamps"] <= now].reset_index(drop=True)
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
