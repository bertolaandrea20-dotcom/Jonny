"""League-mix study: which combination of leagues (and model weight / markets) gives the
highest slip win rate, checked honestly.

The mix is chosen on the older seasons (train) and then measured on the most recent
season it has never seen (test). Picking the best of hundreds of mixes on the same data
always looks good by luck, so only the test column says whether a mix really works.
Ranking uses the Wilson lower bound of the win rate, which penalises small samples.
"""
import copy
import math
import sys
from collections import defaultdict
from itertools import combinations

from .analysis import candidate_legs
from .backtest import prepare
from .common import iso, load_config, utcnow, write_json
from .selection import best_slip, eligible_legs, leg_outcome

WEIGHTS = [0.5, 0.75, 1.0]
MARKET_SETS = {"tutti": {"1X2", "OU25"}, "solo 1X2": {"1X2"}, "solo Over/Under": {"OU25"}}
MIN_TRAIN_SLIPS = 30


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def wilson_low(wins, n, z=1.64):
    if n == 0:
        return 0.0
    p = wins / n
    d = 1 + z * z / n
    c = p + z * z / (2 * n)
    m = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return (c - m) / d


def eligible_by_day(days, models_by_day, cfg, weight):
    """{day: [eligible legs with 'hit']} for one model weight, all markets."""
    c = copy.deepcopy(cfg)
    c["model"]["blend_model_weight"] = weight
    c["leg"]["markets"] = ["1X2", "OU25"]
    out = {}
    for day, fixtures in days:
        by_id = {f.id: f for f in fixtures}
        legs = []
        for f in fixtures:
            legs.extend(candidate_legs(f, c, models_by_day[(f.league, day)]))
        legs = eligible_legs(legs, c)
        for l in legs:
            f = by_id[l["match_id"]]
            l["hit"] = leg_outcome(l["pick"], f.home_goals, f.away_goals)
        if legs:
            out[day] = legs
    return out


def simulate(elig, days, leagues, markets, cfg, stake, odds_cap=None):
    n = w = 0
    bank = 0.0
    for day in days:
        legs = [l for l in elig.get(day, ()) if l["league"] in leagues and l["market"] in markets]
        if len(legs) < cfg["slip"]["min_legs"]:
            continue
        slip = best_slip(legs, cfg)
        if not slip:
            continue
        won = all(l["hit"] for l in slip["legs"])
        n += 1
        w += won
        bank += stake * (slip["total_odds"] - 1) if won else -stake
    return {"slips": n, "won": w, "win_rate": w / n if n else None,
            "profit": round(bank, 2), "wilson": wilson_low(w, n)}


def league_leg_stats(elig_by_period, leagues):
    """Per league, per period: how often an eligible single event actually won."""
    out = {}
    for lg in leagues:
        row = {}
        for period, elig in elig_by_period.items():
            legs = [l for ls in elig.values() for l in ls if l["league"] == lg]
            n = len(legs)
            hits = sum(l["hit"] for l in legs)
            row[period] = {
                "legs": n,
                "hit_rate": hits / n if n else None,
                "pred": sum(l["prob"] for l in legs) / n if n else None,
                "roi": sum((l["odds"] - 1) if l["hit"] else -1 for l in legs) / n if n else None,
            }
        out[lg] = row
    return out


def run_study(args):
    cfg = load_config()
    cfg["slip"]["play_leagues"] = None  # the study chooses the leagues itself
    now = utcnow()
    days, models_by_day, seasons, leagues = prepare(cfg, args.seasons, now)
    train_seasons, test_season = seasons[:-1], seasons[-1]
    from .sources.football_data import season_code
    from datetime import date
    def season_of(day):
        return season_code(date.fromisoformat(day))
    train_days = [d for d, _ in days if season_of(d) in train_seasons]
    test_days = [d for d, _ in days if season_of(d) == test_season]
    stake = cfg["bankroll"]["stake"]

    subsets = [frozenset(c) for k in range(1, len(leagues) + 1) for c in combinations(leagues, k)]
    log(f"{len(subsets)} combinazioni di campionati x {len(WEIGHTS)} pesi x {len(MARKET_SETS)} mercati")

    results = []
    per_league = None
    for w in WEIGHTS:
        elig = eligible_by_day(days, models_by_day, cfg, w)
        if w == cfg["model"]["blend_model_weight"] or (per_league is None and w == WEIGHTS[-1]):
            per_league = {"weight": w, "stats": league_leg_stats(
                {"train": {d: v for d, v in elig.items() if d in set(train_days)},
                 "test": {d: v for d, v in elig.items() if d in set(test_days)}}, leagues)}
        for mname, mset in MARKET_SETS.items():
            for sub in subsets:
                tr = simulate(elig, train_days, sub, mset, cfg, stake)
                if tr["slips"] < MIN_TRAIN_SLIPS:
                    continue
                results.append({"weight": w, "markets": mname, "leagues": sorted(sub), "train": tr})
        log(f"peso {w}: {len(results)} configurazioni valide finora")

    results.sort(key=lambda r: (r["train"]["wilson"], r["train"]["slips"]), reverse=True)
    top = results[:15]
    # Test only the shortlisted mixes, plus the all-league baselines, on the unseen season.
    elig_cache = {}
    def test_of(r):
        if r["weight"] not in elig_cache:
            elig_cache[r["weight"]] = eligible_by_day(days, models_by_day, cfg, r["weight"])
        return simulate(elig_cache[r["weight"]], test_days, set(r["leagues"]), MARKET_SETS[r["markets"]], cfg, stake)
    for r in top:
        r["test"] = test_of(r)
    baselines = []
    for w in WEIGHTS:
        b = {"weight": w, "markets": "tutti", "leagues": leagues}
        b["train"] = simulate(elig_cache.get(w) or eligible_by_day(days, models_by_day, cfg, w),
                              train_days, set(leagues), MARKET_SETS["tutti"], cfg, stake)
        b["test"] = test_of(b)
        baselines.append(b)

    for r in top[:5]:
        log(f"{r['weight']} {r['markets']} {r['leagues']}: train {r['train']['win_rate']:.1%} su "
            f"{r['train']['slips']}, test {(r['test']['win_rate'] or 0):.1%} su {r['test']['slips']}")
    write_json("study.json", {
        "run_at": iso(now),
        "train_seasons": train_seasons,
        "test_season": test_season,
        "n_configs": len(results),
        "min_train_slips": MIN_TRAIN_SLIPS,
        "top": top,
        "baselines": baselines,
        "per_league": per_league,
    })
