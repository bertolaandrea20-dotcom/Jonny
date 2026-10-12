import random
from datetime import datetime, timedelta, timezone

from bot import ledger as L
from bot.common import Match, load_config
from bot.model import LeagueModel, market_probs
from bot.selection import best_slip, leg_outcome
from bot.sources.football_data import parse_csv, season_code

NOW = datetime(2026, 10, 12, 8, tzinfo=timezone.utc)


def synthetic_league(seed=1):
    rnd = random.Random(seed)
    import numpy as np
    rng = np.random.default_rng(seed)
    strength = {f"T{i}": 0.6 + i * 0.08 for i in range(12)}
    matches = []
    d = NOW - timedelta(days=300)
    for rnd_i in range(3):
        for h in strength:
            for a in strength:
                if h == a:
                    continue
                d += timedelta(hours=7)
                hg = rng.poisson(1.45 * strength[h] / strength[a])
                ag = rng.poisson(1.15 * strength[a] / strength[h])
                matches.append(Match("I1", d - timedelta(days=200 * (2 - rnd_i)), h, a, int(hg), int(ag)))
    return matches, strength


def test_model_ranks_teams():
    matches, strength = synthetic_league()
    m = LeagueModel(matches, NOW)
    p = m.probabilities("T11", "T0")
    assert p["1"] > 0.7 and p["2"] < 0.1
    assert abs(p["1"] + p["X"] + p["2"] - 1) < 1e-9
    assert abs(p["O25"] + p["U25"] - 1) < 1e-9
    assert m.att[m.idx["T11"]] > m.att[m.idx["T0"]]


def test_market_probs_remove_margin():
    p = market_probs({"1": 1.5, "X": 4.0, "2": 6.5, "O25": 1.8, "U25": 2.0})
    assert abs(p["1"] + p["X"] + p["2"] - 1) < 1e-9
    assert p["1"] < 1 / 1.5


def leg(mid, pick, odds, prob):
    return {"match_id": mid, "league": "I1", "kickoff": "2026-10-12T18:00:00Z", "home": mid, "away": "x",
            "pick": pick, "market": "1X2", "odds": odds, "prob": prob}


def test_best_slip_respects_rules():
    cfg = load_config()
    cands = [leg("a", "1", 1.40, 0.75), leg("b", "1", 1.45, 0.72), leg("c", "1", 1.30, 0.80),
             leg("d", "1", 1.25, 0.70), leg("a", "O25", 1.50, 0.68)]
    s = best_slip(cands, cfg)
    assert s is not None
    assert 1.90 <= s["total_odds"] <= 2.30
    assert 2 <= len(s["legs"]) <= 3
    assert s["prob"] >= 0.5
    assert len({l["match_id"] for l in s["legs"]}) == len(s["legs"])
    # leg "d" has EV < 1 and must never be used
    assert all(l["match_id"] != "d" for l in s["legs"])


def test_no_slip_when_rules_fail():
    cfg = load_config()
    assert best_slip([leg("a", "1", 1.40, 0.60), leg("b", "1", 1.45, 0.62)], cfg) is None


def test_ledger_cycle():
    cfg = load_config()
    led = L.new_ledger(cfg, NOW)
    assert L.lives(led) == 10
    slip = {"legs": [leg("a", "1", 1.40, 0.75), leg("b", "U25", 1.45, 0.72)], "total_odds": 2.03, "prob": 0.54}
    L.place(led, slip, NOW)
    assert led["bankroll"] == 45 and L.equity(led) == 50
    L.settle(led, {"a": (2, 0)}, NOW)
    assert led["slips"][0]["status"] == "pending"
    L.settle(led, {"a": (2, 0), "b": (1, 1)}, NOW)
    assert led["slips"][0]["status"] == "won"
    assert led["bankroll"] == round(45 + 5 * 1.40 * 1.45, 2)
    slip2 = {"legs": [leg("c", "2", 1.40, 0.75), leg("d", "1", 1.45, 0.72)], "total_odds": 2.03, "prob": 0.54}
    L.place(led, slip2, NOW)
    L.settle(led, {"c": (1, 0)}, NOW)
    assert led["slips"][1]["status"] == "lost"
    st = L.stats(led)
    assert st["win_rate"] == 0.5 and st["slips_settled"] == 2


def test_eliminated_when_bankroll_gone():
    cfg = load_config()
    led = L.new_ledger(cfg, NOW)
    for i in range(10):
        L.place(led, {"legs": [leg(f"m{i}", "1", 1.4, 0.8), leg(f"n{i}", "1", 1.4, 0.8)], "total_odds": 1.96, "prob": 0.64}, NOW)
        L.settle(led, {f"m{i}": (0, 1)}, NOW)
    assert led["bankroll"] == 0 and led["status"] == "eliminato" and L.lives(led) == 0


def test_void_after_days():
    cfg = load_config()
    led = L.new_ledger(cfg, NOW)
    L.place(led, {"legs": [leg("a", "1", 1.4, 0.8), leg("b", "1", 1.45, 0.8)], "total_odds": 2.03, "prob": 0.64}, NOW)
    L.settle(led, {"a": (3, 1)}, NOW + timedelta(days=8))
    s = led["slips"][0]
    assert s["status"] == "won" and s["payout"] == 7.0


def test_leg_outcome():
    assert leg_outcome("X", 1, 1) and leg_outcome("O25", 2, 1) and leg_outcome("U25", 1, 1)
    assert not leg_outcome("2", 2, 1)


def test_parse_football_data_csv():
    csv = ("﻿Div,Date,Time,HomeTeam,AwayTeam,FTHG,FTAG,FTR,B365H,B365D,B365A,AvgH,AvgD,AvgA,Avg>2.5,Avg<2.5\n"
           "I1,18/10/2026,19:45,Inter,Roma,,,,1.6,4.0,5.5,1.58,4.1,5.6,1.9,1.95\n"
           "I1,11/10/2025,14:00,Milan,Lazio,2,1,H,1.9,3.5,4,1.88,3.6,4.1,1.8,2.0\n").encode()
    ms = parse_csv(csv)
    assert len(ms) == 2
    up, done = ms
    assert not up.played and up.odds["1"] == 1.58 and up.odds["O25"] == 1.9
    assert up.kickoff == datetime(2026, 10, 18, 18, 45, tzinfo=timezone.utc)  # BST -> UTC
    assert done.played and done.home_goals == 2
    assert season_code(NOW) == "2627"


def test_play_leagues_limits_slip():
    cfg = load_config()
    cands = [leg("a", "1", 1.40, 0.75), leg("b", "1", 1.45, 0.72)]
    cands[1]["league"] = "E0"
    cfg["slip"]["play_leagues"] = ["I1"]
    assert best_slip(cands, cfg) is None
    cfg["slip"]["play_leagues"] = ["I1", "E0"]
    assert best_slip(cands, cfg) is not None


def test_daily_slip_falls_back_to_proposal():
    from bot.selection import daily_slip
    cfg = load_config()
    weak = [leg("a", "1", 1.40, 0.66), leg("b", "1", 1.45, 0.64)]  # EV < 1: no strict slip
    cfg["slip"]["always_play"] = False
    assert daily_slip(weak, cfg) is None
    cfg["slip"]["always_play"] = True
    s = daily_slip(weak, cfg)
    assert s["tier"] == "proposta" and 1.90 <= s["total_odds"] <= 2.30
    strong = [leg("a", "1", 1.40, 0.75), leg("b", "1", 1.45, 0.72)]
    assert daily_slip(strong, cfg)["tier"] == "valore"
