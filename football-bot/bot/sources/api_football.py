"""API-Football (https://www.api-football.com) for absences: injured and suspended
players per fixture. Needs API_FOOTBALL_KEY. Optional: without it the absence rule is skipped.

Note: the free plan may not cover the current season; the bot reports the API's error
message on the dashboard instead of failing.
"""
import os
import unicodedata
from difflib import SequenceMatcher

import requests

BASE = "https://v3.football.api-sports.io"
LEAGUE_IDS = {
    "I1": 135, "I2": 136, "E0": 39, "SP1": 140, "F1": 61, "D1": 78,
    "N1": 88, "B1": 144, "T1": 203, "UCL": 2, "UEL": 3, "UECL": 848,
}


def api_key():
    return os.environ.get("API_FOOTBALL_KEY", "").strip()


def _norm(name):
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower()
    for junk in (" fc", "fc ", " cf", "ac ", " ac", "ssc ", "as ", "1. ", " calcio", " sk", "afc "):
        s = s.replace(junk, " ")
    return " ".join(s.split())


def same_team(a, b):
    a, b = _norm(a), _norm(b)
    return a == b or a in b or b in a or SequenceMatcher(None, a, b).ratio() >= 0.8


def season_year(dt):
    return dt.year if dt.month >= 7 else dt.year - 1


def load_absences(league, date):
    """Return ({team_name: [ {player, reason} ]}, status_message) for fixtures on `date`."""
    key = api_key()
    if not key or league not in LEAGUE_IDS:
        return {}, "API_FOOTBALL_KEY mancante"
    r = requests.get(f"{BASE}/injuries", headers={"x-apisports-key": key}, params={
        "league": LEAGUE_IDS[league], "season": season_year(date), "date": date.strftime("%Y-%m-%d"),
    }, timeout=30)
    if r.status_code != 200:
        return {}, f"HTTP {r.status_code}"
    body = r.json()
    if body.get("errors"):
        return {}, f"errore API: {body['errors']}"
    out = {}
    for item in body.get("response", []):
        team = item["team"]["name"]
        out.setdefault(team, []).append({
            "player": item["player"]["name"],
            "reason": item["player"].get("reason") or item["player"].get("type") or "",
        })
    return out, "ok"


def absences_for(absences, team):
    for name, players in absences.items():
        if same_team(name, team):
            return players
    return []
