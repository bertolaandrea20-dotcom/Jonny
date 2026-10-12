"""Bankroll / lives bookkeeping. One life = one stake. Profit only if win rate > 50% at odds 2."""
from .common import iso, parse_iso
from .selection import leg_outcome


def new_ledger(cfg, now):
    b = cfg["bankroll"]
    return {
        "start": b["start"], "stake": b["stake"], "bankroll": b["start"],
        "status": "attivo", "created_at": iso(now), "slips": [],
        "history": [{"t": iso(now), "bankroll": b["start"], "event": "start"}],
    }


def lives(ledger):
    return int(ledger["bankroll"] // ledger["stake"] + 1e-9)


def stats(ledger):
    settled = [s for s in ledger["slips"] if s["status"] in ("won", "lost")]
    won = sum(s["status"] == "won" for s in settled)
    staked = sum(s["stake"] for s in settled)
    returned = sum(s.get("payout", 0) for s in settled)
    legs = [l for s in ledger["slips"] for l in s["legs"] if l.get("status") in ("won", "lost")]
    streak, kind = 0, None
    for s in reversed(settled):
        if kind is None:
            kind = s["status"]
        if s["status"] != kind:
            break
        streak += 1
    return {
        "slips_settled": len(settled),
        "slips_won": won,
        "slips_pending": sum(s["status"] == "pending" for s in ledger["slips"]),
        "win_rate": won / len(settled) if settled else None,
        "legs_won": sum(l["status"] == "won" for l in legs),
        "legs_settled": len(legs),
        "profit": round(equity(ledger) - ledger["start"], 2),
        "roi": (returned - staked) / staked if staked else None,
        "streak": {"kind": kind, "length": streak},
        "lives": lives(ledger),
    }


def equity(ledger):
    """Cash plus stakes still riding on pending slips."""
    return round(ledger["bankroll"] + sum(s["stake"] for s in ledger["slips"] if s["status"] == "pending"), 2)


def can_play(ledger):
    return ledger["bankroll"] + 1e-9 >= ledger["stake"]


def place(ledger, slip, now):
    stake = ledger["stake"]
    ledger["bankroll"] = round(ledger["bankroll"] - stake, 2)
    entry = {
        "id": f"S{len(ledger['slips']) + 1:04d}",
        "created_at": iso(now),
        "stake": stake,
        "total_odds": slip["total_odds"],
        "prob": slip["prob"],
        "status": "pending",
        "legs": [{**l, "status": "pending"} for l in slip["legs"]],
    }
    ledger["slips"].append(entry)
    return entry


def settle(ledger, results, now, void_after_days=7):
    """results: {match_id: (home_goals, away_goals)}. Returns list of slips settled now."""
    done = []
    for s in ledger["slips"]:
        if s["status"] != "pending":
            continue
        for l in s["legs"]:
            if l["status"] != "pending":
                continue
            if l["match_id"] in results:
                hg, ag = results[l["match_id"]]
                l["score"] = f"{hg}-{ag}"
                l["status"] = "won" if leg_outcome(l["pick"], hg, ag) else "lost"
            elif (now - parse_iso(l["kickoff"])).days >= void_after_days:
                l["status"] = "void"
        states = [l["status"] for l in s["legs"]]
        if "lost" in states:
            s["status"], s["payout"] = "lost", 0.0
        elif "pending" in states:
            continue
        elif all(x == "void" for x in states):
            s["status"], s["payout"] = "void", s["stake"]
        else:
            odds = 1.0
            for l in s["legs"]:
                if l["status"] == "won":
                    odds *= l["odds"]
            s["status"], s["payout"] = "won", round(s["stake"] * odds, 2)
        s["settled_at"] = iso(now)
        ledger["bankroll"] = round(ledger["bankroll"] + s["payout"], 2)
        ledger["history"].append({"t": iso(now), "bankroll": equity(ledger),
                                  "event": f"{s['id']} {'vinta' if s['status'] == 'won' else 'persa' if s['status'] == 'lost' else 'annullata'}"})
        done.append(s)
    pending = any(s["status"] == "pending" for s in ledger["slips"])
    ledger["status"] = "attivo" if can_play(ledger) or pending else "eliminato"
    return done
