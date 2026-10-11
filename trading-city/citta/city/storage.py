"""Persistenza su SQLite: eventi, trade, decisioni complete, cittadini, lista nera."""

from __future__ import annotations

import json
import sqlite3
import threading
from datetime import datetime
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY, tick INT, day INT, kind TEXT, citizen_id INT, text TEXT);
CREATE TABLE IF NOT EXISTS trades (id INTEGER PRIMARY KEY, tick INT, day INT, citizen_id INT, symbol TEXT, side TEXT,
    qty REAL, price REAL, fee REAL, pnl REAL, reason TEXT, venue TEXT, order_id TEXT);
CREATE TABLE IF NOT EXISTS decisions (id INTEGER PRIMARY KEY, tick INT, day INT, citizen_id INT, symbol TEXT,
    rating TEXT, action TEXT, payload TEXT);
CREATE TABLE IF NOT EXISTS citizens (id INTEGER PRIMARY KEY, payload TEXT);
CREATE TABLE IF NOT EXISTS blacklist (fingerprint TEXT PRIMARY KEY, day INT, citizen_id INT, genome TEXT);
CREATE TABLE IF NOT EXISTS snapshots (tick INT PRIMARY KEY, day INT, equity REAL, treasury REAL, population INT);
CREATE INDEX IF NOT EXISTS dec_cit ON decisions(citizen_id);
CREATE INDEX IF NOT EXISTS tr_cit ON trades(citizen_id);
"""


class Storage:
    def __init__(self, path: str, fresh: bool = False):
        """``fresh`` cancella il database precedente; altrimenti lo archivia con data e ora."""
        old = Path(path)
        if path != ":memory:" and old.exists():
            if fresh:
                old.unlink()
            else:
                old.rename(old.with_name(f"{old.stem}-{datetime.now():%Y%m%d-%H%M%S}{old.suffix}"))
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.db.executescript(SCHEMA)
        self.lock = threading.Lock()

    def _exec(self, sql: str, args: tuple) -> None:
        with self.lock:
            self.db.execute(sql, args)

    def commit(self) -> None:
        with self.lock:
            self.db.commit()

    def event(self, tick, day, kind, citizen_id, text):
        self._exec("INSERT INTO events(tick,day,kind,citizen_id,text) VALUES (?,?,?,?,?)",
                   (tick, day, kind, citizen_id, text))

    def trade(self, t: dict):
        self._exec("INSERT INTO trades(tick,day,citizen_id,symbol,side,qty,price,fee,pnl,reason,venue,order_id) "
                   "VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                   (t["tick"], t["day"], t["citizen_id"], t["symbol"], t["side"], t["qty"], t["price"],
                    t["fee"], t.get("pnl"), t["reason"], t["venue"], t.get("order_id", "")))

    def decision(self, tick, day, citizen_id, d: dict):
        self._exec("INSERT INTO decisions(tick,day,citizen_id,symbol,rating,action,payload) VALUES (?,?,?,?,?,?,?)",
                   (tick, day, citizen_id, d["symbol"], d["rating"], d["action"], json.dumps(d)))

    def citizen(self, cid: int, payload: dict):
        self._exec("INSERT OR REPLACE INTO citizens(id,payload) VALUES (?,?)", (cid, json.dumps(payload)))

    def blacklist(self, fp, day, cid, genome: dict):
        self._exec("INSERT OR IGNORE INTO blacklist(fingerprint,day,citizen_id,genome) VALUES (?,?,?,?)",
                   (fp, day, cid, json.dumps(genome)))

    def snapshot(self, tick, day, equity, treasury, population):
        self._exec("INSERT OR REPLACE INTO snapshots VALUES (?,?,?,?,?)", (tick, day, equity, treasury, population))

    def query(self, sql: str, args: tuple = ()) -> list[dict]:
        with self.lock:
            cur = self.db.execute(sql, args)
            cols = [c[0] for c in cur.description]
            return [dict(zip(cols, r)) for r in cur.fetchall()]
