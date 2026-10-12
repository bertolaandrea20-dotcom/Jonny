import json
import os
from dataclasses import dataclass, field
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data")
CACHE_DIR = os.path.join(ROOT, ".cache")


def load_config(path=None):
    with open(path or os.path.join(ROOT, "config.json"), encoding="utf-8") as f:
        return json.load(f)


def read_json(name, default):
    path = os.path.join(DATA_DIR, name)
    if not os.path.exists(path):
        return default
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def write_json(name, obj):
    os.makedirs(DATA_DIR, exist_ok=True)
    path = os.path.join(DATA_DIR, name)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)


def utcnow():
    return datetime.now(timezone.utc)


def iso(dt):
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_iso(s):
    return datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)


@dataclass
class Match:
    """A played match (for fitting/settlement) or an upcoming fixture (goals None)."""
    league: str
    kickoff: datetime
    home: str
    away: str
    home_goals: int | None = None
    away_goals: int | None = None
    # Market odds keyed by outcome: "1", "X", "2", "O25", "U25"
    odds: dict = field(default_factory=dict)
    # Probabilities supplied by the source itself (e.g. market-only competitions)
    source_probs: dict | None = None

    @property
    def id(self):
        return f"{self.league}|{self.kickoff.strftime('%Y-%m-%d')}|{self.home}|{self.away}"

    @property
    def played(self):
        return self.home_goals is not None and self.away_goals is not None
