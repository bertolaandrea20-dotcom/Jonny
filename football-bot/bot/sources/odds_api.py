"""The Odds API (https://the-odds-api.com) for the UEFA cups. Needs ODDS_API_KEY.

Free plan: 500 credits/month. One odds call = markets x regions credits (here 2),
one scores call = 2 credits. The bot only asks for scores when cup legs are pending.
"""
import os
from datetime import datetime, timezone

import requests

from ..common import Match

BASE = "https://api.the-odds-api.com/v4"


def api_key():
    return os.environ.get("ODDS_API_KEY", "").strip()


def _devig(odds):
    inv = {k: 1.0 / v for k, v in odds.items()}
    s = sum(inv.values())
    return {k: v / s for k, v in inv.items()}


def load_fixtures(league, sport_key):
    key = api_key()
    if not key:
        return [], "ODDS_API_KEY mancante"
    r = requests.get(f"{BASE}/sports/{sport_key}/odds", params={
        "apiKey": key, "regions": "eu", "markets": "h2h,totals", "oddsFormat": "decimal",
    }, timeout=30)
    if r.status_code != 200:
        return [], f"HTTP {r.status_code}"
    out = []
    for ev in r.json():
        h2h = {"1": [], "X": [], "2": []}
        tot = {"O25": [], "U25": []}
        for bk in ev.get("bookmakers", []):
            for mk in bk.get("markets", []):
                if mk["key"] == "h2h":
                    for o in mk["outcomes"]:
                        k = "1" if o["name"] == ev["home_team"] else "2" if o["name"] == ev["away_team"] else "X"
                        h2h[k].append(o["price"])
                elif mk["key"] == "totals":
                    for o in mk["outcomes"]:
                        if abs(o.get("point", 0) - 2.5) < 1e-9:
                            tot["O25" if o["name"] == "Over" else "U25"].append(o["price"])
        odds = {k: sum(v) / len(v) for k, v in {**h2h, **tot}.items() if v}
        probs = {}
        if all(k in odds for k in ("1", "X", "2")):
            probs.update(_devig({k: odds[k] for k in ("1", "X", "2")}))
        if "O25" in odds and "U25" in odds:
            probs.update(_devig({k: odds[k] for k in ("O25", "U25")}))
        out.append(Match(
            league=league,
            kickoff=datetime.strptime(ev["commence_time"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc),
            home=ev["home_team"], away=ev["away_team"], odds=odds, source_probs=probs,
        ))
    return out, f"ok ({r.headers.get('x-requests-remaining', '?')} crediti rimasti)"


def load_results(league, sport_key, days_from=3):
    key = api_key()
    if not key:
        return []
    r = requests.get(f"{BASE}/sports/{sport_key}/scores",
                     params={"apiKey": key, "daysFrom": days_from}, timeout=30)
    if r.status_code != 200:
        return []
    out = []
    for ev in r.json():
        if not ev.get("completed") or not ev.get("scores"):
            continue
        sc = {s["name"]: int(s["score"]) for s in ev["scores"]}
        out.append(Match(
            league=league,
            kickoff=datetime.strptime(ev["commence_time"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc),
            home=ev["home_team"], away=ev["away_team"],
            home_goals=sc.get(ev["home_team"]), away_goals=sc.get(ev["away_team"]),
        ))
    return out
