"""API HTTP e dashboard della città."""

from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from .city.city import City

WEB = Path(__file__).resolve().parent.parent / "web"


class Control(BaseModel):
    action: str  # pause | resume | speed | end_day
    value: float | None = None


def create_app(city: City) -> FastAPI:
    app = FastAPI(title="La Città degli Agenti")

    @app.get("/")
    def index():
        return FileResponse(WEB / "index.html")

    @app.get("/ecosistema")
    def ecosystem():
        return FileResponse(WEB / "ecosistema.html")

    @app.get("/api/state")
    def state():
        with city.lock:
            p = city.prices
            n = city.cfg.cycle_days
            alive = [{**c.summary(p), "in_trial": c.in_trial(n), "days_to_judgment": c.days_to_judgment(n)}
                     for c in city.alive()]
            recent_dead = sorted((c for c in city.citizens.values() if not c.alive),
                                 key=lambda c: -(c.death_day or 0))[:40]
            eq = city.city_equity()
            return {
                "mode": city.cfg.mode, "broker": city.broker.describe(), "live": city.broker.is_live,
                "llm": city.reasoner is not None,
                "day": city.day, "tick": city.tick, "tick_in_day": city.tick_in_day,
                "day_ticks": city.cfg.day_ticks if city.cfg.mode == "sim" else None,
                "paused": city.paused, "speed": city.speed, "alert": city.alert,
                "equity": round(eq, 2), "treasury": round(city.treasury, 2),
                "reserve_floor": round(city.reserve_floor, 2), "initial": city.cfg.city_capital,
                "rules": {"cycle_days": city.cfg.cycle_days, "min_population": city.cfg.min_population,
                          "max_population": city.cfg.max_population, "profit_tax": city.cfg.profit_tax},
                "stats": city.stats, "blacklist": len(city.blacklist),
                "prices": {s: round(v, 6) for s, v in p.items()},
                "citizens": alive,
                "fallen": [c.summary(p) for c in recent_dead],
                "events": list(city.events)[:80],
                "trades": list(city.trades)[:80],
                "curve": list(city.curve)[-600:],
                "days": city.days[-30:],
            }

    @app.get("/api/citizen/{cid}")
    def citizen(cid: int):
        with city.lock:
            c = city.citizens.get(cid)
            if not c:
                raise HTTPException(404, "cittadino sconosciuto")
            d = c.summary(city.prices)
            d["in_trial"] = c.in_trial(city.cfg.cycle_days)
            d["cycle_days"] = city.cfg.cycle_days
            d["days_to_judgment"] = c.days_to_judgment(city.cfg.cycle_days)
            d["genome"] = c.genome.to_dict()
            d["curve"] = c.curve[-500:]
            d["last_decisions"] = c.last_decisions
            d["day_results"] = c.day_results
            d["parent"] = city.citizens[c.parent_id].name if c.parent_id in city.citizens else None
            d["children_named"] = [{"id": k, "name": city.citizens[k].name, "status": city.citizens[k].status}
                                   for k in c.children if k in city.citizens]
        d["trades_log"] = city.store.query(
            "SELECT tick, day, symbol, side, qty, price, fee, pnl, reason FROM trades WHERE citizen_id=? "
            "ORDER BY id DESC LIMIT 60", (cid,))
        d["decisions_log"] = [
            {**r, "payload": json.loads(r["payload"])} for r in city.store.query(
                "SELECT tick, day, symbol, rating, action, payload FROM decisions WHERE citizen_id=? "
                "ORDER BY id DESC LIMIT 15", (cid,))]
        return d

    @app.get("/api/tree")
    def tree():
        with city.lock:
            p = city.prices
            return [{"id": c.id, "name": c.name, "parent_id": c.parent_id, "status": c.status,
                     "generation": c.generation, "born_day": c.born_day,
                     "in_trial": c.in_trial(city.cfg.cycle_days), "death_day": c.death_day,
                     "life_pnl": round(c.equity(p) - c.capital_at_birth, 2) if c.alive else None,
                     "fingerprint": c.genome.fingerprint()} for c in city.citizens.values()]

    @app.get("/api/blacklist")
    def blacklist():
        return city.store.query("SELECT fingerprint, day, citizen_id FROM blacklist ORDER BY day DESC LIMIT 200")

    @app.post("/api/control")
    def control(cmd: Control):
        if cmd.action == "pause":
            city.paused = True
        elif cmd.action == "resume":
            city.paused = False
        elif cmd.action == "speed" and cmd.value:
            city.speed = max(0.25, min(20.0, cmd.value))
        elif cmd.action == "end_day":
            if city.cfg.mode != "sim":
                raise HTTPException(400, "chiudere il giorno a mano è permesso solo in simulazione")
            city.end_of_day()
        else:
            raise HTTPException(400, "azione sconosciuta")
        return {"ok": True, "paused": city.paused, "speed": city.speed}

    return app
