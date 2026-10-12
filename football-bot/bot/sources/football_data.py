"""football-data.co.uk: results + bookmaker odds for the domestic leagues (no API key).

Historical:  https://www.football-data.co.uk/mmz4281/{season}/{code}.csv
Upcoming:    https://www.football-data.co.uk/fixtures.csv  (all leagues, with odds)
Kick-off times on the site are UK local time.
"""
import csv
import io
import os
import time
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import requests

from ..common import CACHE_DIR, Match

BASE = "https://www.football-data.co.uk"
UK = ZoneInfo("Europe/London")
HEADERS = {"User-Agent": "Mozilla/5.0 (football-bot; research)"}

# Average-market columns, falling back to Bet365 when averages are missing.
ODDS_COLUMNS = {
    "1": ["AvgH", "BbAvH", "B365H"],
    "X": ["AvgD", "BbAvD", "B365D"],
    "2": ["AvgA", "BbAvA", "B365A"],
    "O25": ["Avg>2.5", "BbAv>2.5", "B365>2.5"],
    "U25": ["Avg<2.5", "BbAv<2.5", "B365<2.5"],
}


def season_code(dt):
    start = dt.year if dt.month >= 7 else dt.year - 1
    return f"{start % 100:02d}{(start + 1) % 100:02d}"


def previous_seasons(dt, n):
    start = dt.year if dt.month >= 7 else dt.year - 1
    return [f"{(s) % 100:02d}{(s + 1) % 100:02d}" for s in range(start - n + 1, start + 1)]


def _fetch(url, cache_name, max_age_hours):
    os.makedirs(CACHE_DIR, exist_ok=True)
    path = os.path.join(CACHE_DIR, cache_name)
    if os.path.exists(path) and time.time() - os.path.getmtime(path) < max_age_hours * 3600:
        with open(path, "rb") as f:
            return f.read()
    last_err = None
    for attempt in range(4):
        try:
            r = requests.get(url, headers=HEADERS, timeout=30)
            if r.status_code == 404:
                return b""
            r.raise_for_status()
            with open(path, "wb") as f:
                f.write(r.content)
            return r.content
        except requests.RequestException as e:
            last_err = e
            time.sleep(2 ** (attempt + 1))
    raise RuntimeError(f"download fallito {url}: {last_err}")


def _num(row, cols):
    for c in cols:
        v = (row.get(c) or "").strip()
        if v:
            try:
                x = float(v)
                if x > 1.0:
                    return x
            except ValueError:
                pass
    return None


def _kickoff(date_s, time_s):
    date_s = date_s.strip()
    fmt = "%d/%m/%Y" if len(date_s.split("/")[-1]) == 4 else "%d/%m/%y"
    d = datetime.strptime(date_s, fmt)
    hh, mm = 15, 0
    if time_s and ":" in time_s:
        hh, mm = (int(x) for x in time_s.strip().split(":")[:2])
    return d.replace(hour=hh, minute=mm, tzinfo=UK).astimezone(timezone.utc)


def parse_csv(content, league_filter=None):
    text = content.decode("utf-8-sig", errors="replace")
    out = []
    for row in csv.DictReader(io.StringIO(text)):
        div = (row.get("Div") or "").strip()
        if not div or (league_filter and div not in league_filter):
            continue
        home, away = (row.get("HomeTeam") or "").strip(), (row.get("AwayTeam") or "").strip()
        if not home or not away or not row.get("Date"):
            continue
        try:
            ko = _kickoff(row["Date"], row.get("Time"))
        except ValueError:
            continue
        hg, ag = (row.get("FTHG") or "").strip(), (row.get("FTAG") or "").strip()
        odds = {k: v for k, cols in ODDS_COLUMNS.items() if (v := _num(row, cols))}
        out.append(Match(
            league=div, kickoff=ko, home=home, away=away,
            home_goals=int(float(hg)) if hg else None,
            away_goals=int(float(ag)) if ag else None,
            odds=odds,
        ))
    return out


def load_history(league, seasons, current_max_age_hours=6):
    matches = []
    current = seasons[-1]
    for s in seasons:
        age = current_max_age_hours if s == current else 24 * 365
        content = _fetch(f"{BASE}/mmz4281/{s}/{league}.csv", f"{league}_{s}.csv", age)
        if content:
            matches.extend(m for m in parse_csv(content) if m.played)
    matches.sort(key=lambda m: m.kickoff)
    return matches


def load_fixtures(leagues):
    content = _fetch(f"{BASE}/fixtures.csv", "fixtures.csv", 3)
    return [m for m in parse_csv(content, set(leagues)) if not m.played]
