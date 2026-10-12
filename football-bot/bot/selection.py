"""Fixed rules that turn candidate legs into a 2-3 leg slip at total odds ~2.0."""
from itertools import combinations
from math import prod

PICK_LABELS = {"1": "1", "X": "X", "2": "2", "O25": "Over 2.5", "U25": "Under 2.5"}
MARKET_OF = {"1": "1X2", "X": "1X2", "2": "1X2", "O25": "OU25", "U25": "OU25"}


def eligible_legs(candidates, rules):
    """Each candidate: dict with match_id, pick, odds, prob (+ info). Applies leg rules."""
    leg = rules["leg"]
    out = []
    for c in candidates:
        if MARKET_OF[c["pick"]] not in leg["markets"]:
            continue
        if not (leg["min_odds"] <= c["odds"] <= leg["max_odds"]):
            continue
        if c["prob"] < leg["min_prob"] or c["prob"] * c["odds"] < leg["min_ev"]:
            continue
        if c.get("backed_absences") is not None and c["backed_absences"] >= leg["max_absences_backed_team"]:
            continue
        out.append(c)
    return out


def best_slip(candidates, rules, exclude_matches=(), top_n=30):
    """Highest-probability combination that satisfies every slip rule, or None."""
    slip_r = rules["slip"]
    legs = [c for c in eligible_legs(candidates, rules) if c["match_id"] not in exclude_matches]
    if slip_r.get("one_leg_per_match", True):
        best = {}
        for c in legs:
            if c["match_id"] not in best or c["prob"] > best[c["match_id"]]["prob"]:
                best[c["match_id"]] = c
        legs = list(best.values())
    legs = sorted(legs, key=lambda c: c["prob"], reverse=True)[:top_n]

    winner, winner_key = None, None
    for size in range(slip_r["min_legs"], slip_r["max_legs"] + 1):
        for combo in combinations(legs, size):
            if len({c["match_id"] for c in combo}) < size:
                continue
            odds = prod(c["odds"] for c in combo)
            if not (slip_r["min_total_odds"] <= odds <= slip_r["max_total_odds"]):
                continue
            p = prod(c["prob"] for c in combo)
            if p < slip_r["min_slip_prob"]:
                continue
            # most likely slip first; fewer legs, then higher EV on ties
            key = (round(p, 4), -size, round(p * odds, 4))
            if winner_key is None or key > winner_key:
                winner, winner_key = combo, key
    if not winner:
        return None
    return {
        "legs": list(winner),
        "total_odds": round(prod(c["odds"] for c in winner), 3),
        "prob": round(prod(c["prob"] for c in winner), 4),
    }


def leg_outcome(pick, home_goals, away_goals):
    if pick == "1":
        return home_goals > away_goals
    if pick == "X":
        return home_goals == away_goals
    if pick == "2":
        return home_goals < away_goals
    if pick == "O25":
        return home_goals + away_goals >= 3
    if pick == "U25":
        return home_goals + away_goals <= 2
    raise ValueError(pick)
