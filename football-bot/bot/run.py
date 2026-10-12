"""Entry point.

    python -m bot.run daily      settle finished slips, analyse upcoming matches, place the day's slip
    python -m bot.run backtest   replay the rules on past seasons (honest estimate of win rate)
"""
import argparse
import os
import shutil
import sys
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from . import ledger as L
from .analysis import candidate_legs, fit
from .common import ROOT, DATA_DIR, iso, load_config, read_json, utcnow, write_json
from .selection import best_slip, eligible_legs
from .sources import api_football, football_data, odds_api

ROME = ZoneInfo("Europe/Rome")


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def settle_pending(ledger, cfg, now, status):
    pending = [l for s in ledger["slips"] if s["status"] == "pending" for l in s["legs"] if l["status"] == "pending"]
    if not pending:
        return []
    results = {}
    for league in sorted({l["league"] for l in pending}):
        lc = cfg["leagues"][league]
        try:
            if lc["source"] == "football-data":
                ms = football_data.load_history(league, [football_data.season_code(now)], current_max_age_hours=1)
            else:
                ms = odds_api.load_results(league, lc["sport_key"])
            results.update({m.id: (m.home_goals, m.away_goals) for m in ms if m.played})
        except Exception as e:  # keep going: the leg simply stays pending
            status[f"risultati {league}"] = f"errore: {e}"
    done = L.settle(ledger, results, now, cfg["timing"]["void_after_days"])
    for s in done:
        log(f"chiusa {s['id']}: {s['status']} ({s.get('payout', 0)}€)")
    return done


def gather_candidates(cfg, now, status):
    t = cfg["timing"]
    lo, hi = now + timedelta(hours=t["min_hours_before_kickoff"]), now + timedelta(hours=t["max_hours_ahead"])
    domestic = [k for k, v in cfg["leagues"].items() if v["source"] == "football-data"]
    fixtures = []
    try:
        fixtures = [f for f in football_data.load_fixtures(domestic) if lo <= f.kickoff <= hi]
        status["football-data.co.uk"] = f"ok ({len(fixtures)} partite nella finestra)"
    except Exception as e:
        status["football-data.co.uk"] = f"errore: {e}"

    legs = []
    seasons = football_data.previous_seasons(now, cfg["model"]["history_seasons"])
    for league in sorted({f.league for f in fixtures}):
        try:
            model = fit(football_data.load_history(league, seasons), now, cfg)
        except Exception as e:
            status[f"storico {league}"] = f"errore: {e}"
            model = None
        for f in (x for x in fixtures if x.league == league):
            legs.extend(candidate_legs(f, cfg, model))

    for league, lc in cfg["leagues"].items():
        if lc["source"] != "odds-api":
            continue
        try:
            cups, msg = odds_api.load_fixtures(league, lc["sport_key"])
            cups = [f for f in cups if lo <= f.kickoff <= hi]
            status[f"the-odds-api {league}"] = msg
            for f in cups:
                legs.extend(candidate_legs(f, cfg, None))
        except Exception as e:
            status[f"the-odds-api {league}"] = f"errore: {e}"
    return legs


def attach_absences(legs, cfg, status):
    """Absences only for legs that already pass the rules (saves API calls)."""
    if not api_football.api_key():
        status["api-football (assenti)"] = "API_FOOTBALL_KEY mancante: regola assenti non applicata"
        return {}
    wanted = {(l["league"], l["kickoff"][:10]) for l in eligible_legs(legs, cfg)}
    absences = {}
    for league, day in sorted(wanted):
        found, msg = api_football.load_absences(league, datetime.strptime(day, "%Y-%m-%d"))
        status[f"api-football {league} {day}"] = msg
        for team, players in found.items():
            absences[team] = players
    for l in legs:
        home_abs = api_football.absences_for(absences, l["home"])
        away_abs = api_football.absences_for(absences, l["away"])
        l["absences"] = {"home": home_abs, "away": away_abs}
        backed = home_abs if l["pick"] == "1" else away_abs if l["pick"] == "2" else None
        l["backed_absences"] = len(backed) if backed is not None else None
    return absences


def daily(args):
    cfg = load_config()
    now = utcnow()
    status = {}
    ledger = read_json("ledger.json", None) or L.new_ledger(cfg, now)

    settle_pending(ledger, cfg, now, status)

    legs = gather_candidates(cfg, now, status)
    attach_absences(legs, cfg, status)

    today = now.astimezone(ROME).date().isoformat()
    placed_today = [s for s in ledger["slips"]
                    if L.parse_iso(s["created_at"]).astimezone(ROME).date().isoformat() == today]
    in_play = {l["match_id"] for s in ledger["slips"] if s["status"] == "pending" for l in s["legs"]}
    decision, slip = None, None
    if ledger["status"] == "eliminato" or not L.can_play(ledger):
        decision = "Bankroll esaurito: niente più vite. Il bot è eliminato."
    elif len(placed_today) >= cfg["slip"]["max_slips_per_day"]:
        decision = f"Limite di {cfg['slip']['max_slips_per_day']} schedina/e al giorno già raggiunto."
    else:
        slip = best_slip(legs, cfg, exclude_matches=in_play)
        if slip:
            entry = L.place(ledger, slip, now)
            decision = f"Giocata {entry['id']}: {len(slip['legs'])} eventi @ {slip['total_odds']} (prob. stimata {slip['prob']:.0%})."
        else:
            decision = "Nessuna combinazione rispetta tutte le regole: oggi non si gioca (nessuna giocata forzata)."
    log(decision)

    elig = {(l["match_id"], l["pick"]) for l in eligible_legs(legs, cfg)}
    for l in legs:
        l["eligible"] = (l["match_id"], l["pick"]) in elig
    legs.sort(key=lambda l: (not l["eligible"], -l["prob"]))
    write_json("ledger.json", ledger)
    write_json("latest.json", {
        "run_at": iso(now),
        "decision": decision,
        "sources": status,
        "candidates": legs[:120],
        "n_candidates": len(legs),
        "n_eligible": len(elig),
        "stats": L.stats(ledger),
        "equity": L.equity(ledger),
    })
    shutil.copy(os.path.join(ROOT, "config.json"), os.path.join(DATA_DIR, "config.json"))


def main():
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("daily")
    b = sub.add_parser("backtest")
    b.add_argument("--seasons", type=int, default=2, help="stagioni completate da rigiocare")
    args = p.parse_args()
    if args.cmd == "daily":
        daily(args)
    else:
        from .backtest import run_backtest
        run_backtest(args)


if __name__ == "__main__":
    main()
