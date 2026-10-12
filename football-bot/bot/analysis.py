"""Turns fixtures + model into scored candidate legs."""
from .model import LeagueModel, blend, market_probs
from .selection import MARKET_OF


def candidate_legs(fixture, cfg, model=None):
    mcfg = cfg["model"]
    market_p = market_probs(fixture.odds)
    model_p = None
    if fixture.source_probs:
        probs = dict(fixture.source_probs)
        basis = "mercato"
    elif model is not None and model.knows(fixture.home, mcfg["min_team_matches"]) \
            and model.knows(fixture.away, mcfg["min_team_matches"]):
        model_p = model.probabilities(fixture.home, fixture.away)
        probs = blend(model_p, market_p, mcfg["blend_model_weight"])
        basis = "modello+mercato"
    else:
        probs = market_p
        basis = "mercato"
    legs = []
    for pick, odds in fixture.odds.items():
        if pick not in probs:
            continue
        legs.append({
            "match_id": fixture.id,
            "league": fixture.league,
            "kickoff": fixture.kickoff.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "home": fixture.home,
            "away": fixture.away,
            "pick": pick,
            "market": MARKET_OF[pick],
            "odds": round(odds, 3),
            "prob": round(probs[pick], 4),
            "model_prob": round(model_p[pick], 4) if model_p else None,
            "market_prob": round(market_p[pick], 4) if pick in market_p else None,
            "xg": [round(model_p["xg_home"], 2), round(model_p["xg_away"], 2)] if model_p else None,
            "basis": basis,
        })
    return legs


def fit(history, as_of, cfg):
    m = cfg["model"]
    return LeagueModel(history, as_of, half_life_days=m["half_life_days"],
                       shrinkage_matches=m["shrinkage_matches"], rho=m["dixon_coles_rho"])
