"""Walk-forward replay of the fixed rules on completed seasons of the domestic leagues.

For every calendar day the model is fitted only on matches played *before* that day,
the slip is chosen with the pre-match average odds, then settled with the real result.
Several model/market blend weights are replayed so the dashboard shows which one held up.
"""
import copy
import sys
from collections import defaultdict
from datetime import timedelta
from zoneinfo import ZoneInfo

from .analysis import candidate_legs, fit
from .common import iso, load_config, utcnow, write_json
from .selection import daily_slip, leg_outcome
from .sources import football_data

ROME = ZoneInfo("Europe/Rome")
WEIGHTS = [0.0, 0.25, 0.5, 0.75, 1.0]


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def replay(days, models_by_day, cfg, weight):
    cfg = copy.deepcopy(cfg)
    cfg["model"]["blend_model_weight"] = weight
    stake, start = cfg["bankroll"]["stake"], cfg["bankroll"]["start"]
    bank, curve, slips = start, [], []
    eliminated_on = None
    calib = defaultdict(lambda: [0, 0, 0.0])  # bucket -> [n, wins, sum_p]
    for day, fixtures in days:
        legs = []
        for f in fixtures:
            legs.extend(candidate_legs(f, cfg, models_by_day[(f.league, day)]))
        for l in legs:
            f = next(x for x in fixtures if x.id == l["match_id"])
            hit = leg_outcome(l["pick"], f.home_goals, f.away_goals)
            b = min(int(l["prob"] * 10), 9)
            calib[b][0] += 1; calib[b][1] += hit; calib[b][2] += l["prob"]
        slip = daily_slip(legs, cfg)
        if not slip:
            continue
        results = {f.id: f for f in fixtures}
        won = all(leg_outcome(l["pick"], results[l["match_id"]].home_goals, results[l["match_id"]].away_goals)
                  for l in slip["legs"])
        bank += stake * slip["total_odds"] - stake if won else -stake
        if bank < stake and eliminated_on is None:
            eliminated_on = day
        curve.append({"t": day, "bankroll": round(bank, 2)})
        slips.append({
            "day": day, "won": won, "odds": slip["total_odds"], "prob": slip["prob"], "tier": slip["tier"],
            "legs": [f"{l['home']}-{l['away']} {l['pick']} @{l['odds']}" for l in slip["legs"]],
        })
    n, w = len(slips), sum(s["won"] for s in slips)
    return {
        "weight": weight,
        "slips": n,
        "won": w,
        "win_rate": w / n if n else None,
        "avg_odds": sum(s["odds"] for s in slips) / n if n else None,
        "avg_pred_prob": sum(s["prob"] for s in slips) / n if n else None,
        "profit": round(bank - start, 2),
        "by_tier": {t: {"slips": len(x), "won": sum(s["won"] for s in x),
                        "win_rate": sum(s["won"] for s in x) / len(x) if x else None}
                    for t in ("valore", "proposta") for x in [[s for s in slips if s["tier"] == t]]},
        "roi": (bank - start) / (n * stake) if n else None,
        "eliminated_on": eliminated_on,
        "curve": curve,
        "last_slips": slips[-15:],
        "calibration": [
            {"bucket": f"{b * 10}-{b * 10 + 10}%", "n": v[0], "pred": v[2] / v[0], "real": v[1] / v[0]}
            for b, v in sorted(calib.items()) if v[0] >= 30
        ],
    }


def prepare(cfg, n_test_seasons, now):
    """Walk-forward inputs: matches grouped by day and a model per (league, day) fitted
    only on matches played before that day."""
    hist_n = cfg["model"]["history_seasons"]
    all_seasons = football_data.previous_seasons(now, hist_n + n_test_seasons + 1)[:-1]  # skip current season
    test_seasons = all_seasons[-n_test_seasons:]
    leagues = [k for k, v in cfg["leagues"].items() if v["source"] == "football-data"]
    log(f"stagioni {test_seasons}, leghe {leagues}")

    by_day = defaultdict(list)
    models_by_day = {}
    for league in leagues:
        hist = football_data.load_history(league, all_seasons, current_max_age_hours=24 * 30)
        test = [m for m in hist if football_data.season_code(m.kickoff) in test_seasons and m.odds]
        log(f"{league}: {len(hist)} partite, {len(test)} da rigiocare")
        cache_week, model = None, None
        for m in test:
            day = m.kickoff.astimezone(ROME).date().isoformat()
            if (league, day) not in models_by_day:
                week = m.kickoff.isocalendar()[:2]
                if week != cache_week:  # refit weekly, always on data strictly before the match day
                    cutoff = m.kickoff.astimezone(ROME).replace(hour=0, minute=0)
                    model, cache_week = fit(hist, cutoff, cfg), week
                models_by_day[(league, day)] = model
            by_day[day].append(m)
    return sorted(by_day.items()), models_by_day, test_seasons, leagues


def run_backtest(args):
    cfg = load_config()
    now = utcnow()
    days, models_by_day, test_seasons, leagues = prepare(cfg, args.seasons, now)

    variants = [replay(days, models_by_day, cfg, w) for w in WEIGHTS]
    for v in variants:
        log(f"peso modello {v['weight']}: {v['slips']} schedine, win rate "
            f"{(v['win_rate'] or 0):.1%}, profitto {v['profit']}€")
    write_json("backtest.json", {
        "run_at": iso(now),
        "seasons": test_seasons,
        "leagues": leagues,
        "configured_weight": cfg["model"]["blend_model_weight"],
        "variants": variants,
    })
