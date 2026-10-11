"""Backtest della città su dati storici.

    python backtest.py --start 2025-10-01 --end 2026-10-01
    python backtest.py --symbols BTC/EUR,ETH/EUR,SOL/EUR --start 2024-01-01 --end 2025-01-01 --seed 7
    python backtest.py --demo-days 120          # storico sintetico, per provare lo strumento senza rete

Ogni ora storica è un tick, ogni giorno (mezzanotte UTC) c'è il giudizio. Le
regole sono le stesse della città dal vivo. Alla fine scrive ``report.html``
(apribile nel browser, con la vista dell'ecosistema giorno per giorno) e
``report.json``.
"""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path

import numpy as np

from citta.brokers.paper import PaperBroker
from citta.city.city import City
from citta.city.storage import Storage
from citta.config import Config
from citta.market.history import HistoricalFeed, align, get_history, synthetic_history

SURNAMES = ["Rossi", "Esposito", "Bianchi", "Romano", "Colombo", "Ricci", "Marino", "Greco", "Bruno", "Gallo",
            "Conti", "De Luca", "Mancini", "Costa", "Giordano", "Rizzo", "Lombardi", "Moretti", "Barbieri",
            "Fontana", "Santoro", "Mariani", "Rinaldi", "Caruso", "Ferrara", "Galli", "Martini", "Leone",
            "Longo", "Gentile", "Martinelli", "Vitale"]
WEB = Path(__file__).resolve().parent / "web"


def family_name(i: int) -> str:
    base = SURNAMES[i % len(SURNAMES)]
    return base if i < len(SURNAMES) else f"{base} {i // len(SURNAMES) + 1}"


def run(cfg: Config, feed: HistoricalFeed, source: str, symbols: list[str]) -> dict:
    city = City(cfg, feed=feed, broker=PaperBroker(cfg.fee_rate, seed=cfg.seed), storage=Storage(":memory:"))
    start_px = {s: feed.price(s) for s in symbols}
    days, fam_index = [], {}

    def fam(lin: int) -> int:
        if lin not in fam_index:
            fam_index[lin] = len(fam_index)
        return fam_index[lin]

    def snapshot(date: str, info: dict | None) -> None:
        p = city.prices
        bench = cfg.city_capital * float(np.mean([p[s] / start_px[s] for s in symbols]))
        agents = [[c.id, fam(c.lineage), c.parent_id or 0, round(c.equity(p), 2),
                   int(c.in_trial(cfg.trial_days)), c.days_survived, c.generation]
                  for c in city.alive()]
        days.append({"date": date, "equity": round(city.city_equity(), 2), "treasury": round(city.treasury, 2),
                     "bench": round(bench, 2), "survivors": info["survivors"] if info else 0,
                     "dead": info["dead"] if info else 0,
                     "born": city.stats["born"], "agents": agents})

    snapshot(feed.now().date().isoformat(), None)
    while not feed.done and feed.remaining_days > 0:
        day = city.day
        city.step()
        if city.day != day:
            snapshot(feed.now().date().isoformat(), city.days[-1])

    p = city.prices
    fams = {}
    for c in city.citizens.values():
        f = fams.setdefault(fam(c.lineage), {"id": fam(c.lineage), "name": family_name(fam(c.lineage)),
                                             "founded": c.born_day, "members": 0, "generations": 0,
                                             "founder": c.genome.describe() if c.parent_id is None else ""})
        f["members"] += 1
        f["generations"] = max(f["generations"], c.generation)
        if c.parent_id is None and not f["founder"]:
            f["founder"] = c.genome.describe()
    for f in fams.values():
        pops = [sum(1 for a in d["agents"] if a[1] == f["id"]) for d in days]
        f["peak"] = max(pops)
        f["alive"] = pops[-1]
        alive_days = [i for i, n in enumerate(pops) if n]
        f["extinct_day"] = None if pops[-1] or not alive_days else alive_days[-1] + 1
        f["capital"] = round(sum(a[3] for a in days[-1]["agents"] if a[1] == f["id"]), 2)

    best = sorted(city.alive(), key=lambda c: -(c.equity(p) - c.capital_at_birth) / c.capital_at_birth)[:8]
    eq = np.array([d["equity"] for d in days])
    peak = np.maximum.accumulate(eq)
    trades = city.store.query("SELECT COUNT(*) n, COALESCE(SUM(fee),0) fees FROM trades")[0]
    bench_eq = np.array([d["bench"] for d in days])
    return {
        "source": source, "symbols": symbols, "start": days[0]["date"], "end": days[-1]["date"],
        "rules": {"trial_days": cfg.trial_days, "min_population": cfg.min_population,
                  "max_population": cfg.max_population, "profit_tax": cfg.profit_tax,
                  "treasury_share": cfg.treasury_share, "fee_rate": cfg.fee_rate, "capital": cfg.city_capital,
                  "seed": cfg.seed},
        "summary": {
            "return": round(eq[-1] / cfg.city_capital - 1, 4),
            "bench_return": round(bench_eq[-1] / cfg.city_capital - 1, 4),
            "max_drawdown": round(float(np.min(eq / peak - 1)), 4),
            "bench_max_drawdown": round(float(np.min(bench_eq / np.maximum.accumulate(bench_eq) - 1)), 4),
            "days": len(days) - 1, "born": city.stats["born"], "dead": city.stats["dead"],
            "splits": city.stats["splits"], "founded": city.stats["founded"], "blacklist": len(city.blacklist),
            "families": len(fams), "families_alive": sum(1 for f in fams.values() if f["alive"]),
            "trades": trades["n"], "fees": round(trades["fees"], 2), "population": len(city.alive()),
        },
        "days": days,
        "families": sorted(fams.values(), key=lambda f: (-f["alive"], -f["peak"])),
        "best": [{"name": c.name, "family": family_name(fam(c.lineage)), "generation": c.generation,
                  "life_return": round((c.equity(p) - c.capital_at_birth) / c.capital_at_birth, 4),
                  "judgments": c.days_survived, "carattere": c.genome.describe(),
                  "symbols": c.genome.symbols, "genome": c.genome.to_dict()} for c in best],
    }


def main() -> None:
    ap = argparse.ArgumentParser(description="Backtest della Città degli Agenti")
    ap.add_argument("--symbols", default="BTC/EUR,ETH/EUR,SOL/EUR,ENI.MI,ISP.MI,UCG.MI,STLAM.MI,RACE.MI")
    ap.add_argument("--start", default="2025-10-01")
    ap.add_argument("--end", default="2026-10-01")
    ap.add_argument("--data-dir", default="data")
    ap.add_argument("--exchange", default="binance", help="exchange ccxt da cui scaricare lo storico crypto")
    ap.add_argument("--refresh", action="store_true", help="riscarica i dati anche se sono già in cache")
    ap.add_argument("--demo-days", type=int, default=0, help="usa N giorni di storico SINTETICO (prova senza rete)")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--out", default="reports")
    ap.add_argument("--env", default=".env")
    args = ap.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    symbols = [s.strip() for s in args.symbols.split(",") if s.strip()]
    if args.demo_days:
        hist = synthetic_history(symbols, args.demo_days, seed=args.seed)
        source = f"DATI SINTETICI ({args.demo_days} giorni): prova dello strumento, non è un risultato di mercato"
    else:
        hist = get_history(symbols, args.start, args.end, args.data_dir, args.exchange, args.refresh)
        source = f"storico orario reale: crypto da {args.exchange}, azioni da Yahoo Finance"
    grid, prices = align(hist)

    cfg = Config.from_env(args.env)
    cfg.mode, cfg.symbols, cfg.seed, cfg.day_ticks, cfg.llm_mode = "sim", symbols, args.seed, 24, "rules"
    feed = HistoricalFeed(grid, prices)
    report = run(cfg, feed, source, symbols)

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    name = f"backtest_{report['start']}_{report['end']}_seed{args.seed}"
    (out / f"{name}.json").write_text(json.dumps(report), encoding="utf-8")
    html = (WEB / "backtest_template.html").read_text(encoding="utf-8")
    (out / f"{name}.html").write_text(html.replace("/*__REPORT__*/null", json.dumps(report)), encoding="utf-8")

    s = report["summary"]
    print(f"\n{report['start']} → {report['end']} · {source}")
    print(f"Città: {s['return']:+.2%} (max drawdown {s['max_drawdown']:.2%}) · "
          f"buy & hold: {s['bench_return']:+.2%} (max drawdown {s['bench_max_drawdown']:.2%})")
    print(f"{s['days']} giorni · {s['born']} nati · {s['dead']} morti · {s['families']} famiglie, "
          f"{s['families_alive']} ancora vive · {s['trades']} trade · commissioni {s['fees']:.2f} €")
    print(f"Report: {out / (name + '.html')}")


if __name__ == "__main__":
    main()
