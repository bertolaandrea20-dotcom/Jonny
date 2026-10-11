"""Prepara i dati della dashboard del bot Kraken dai file che il bot salva a ogni controllo.

  python -m evo.dashboard                       # legge paper_run/, scrive dashboard/data.json
  python -m evo.dashboard --run paper_run --out dashboard

Legge solo `trend_paper.json` (posizioni) e `log.txt` (registro); non chiama exchange né modelli.
Scrive anche dashboard/index.html con i dati inclusi, così la pagina funziona anche da sola.
"""
from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

VALUE = re.compile(r"^(\S+ \S+): valore del bot ([\d.]+) € \(capitale iniziale ([\d.]+) €\)")
TRADE = re.compile(r"^(COMPRA|VENDE) ([\d.eE+-]+) (\S+) per ([\d.]+) € \((.*)\)")
RUN = re.compile(r"^=== (\S+)")
SEED_START, SEED_END = "<!--SEED-->", "<!--/SEED-->"


def parse_log(text: str) -> tuple[list[dict], list[dict], list[str]]:
    history, trades, pending, checks = [], [], [], []
    run_at = None
    for line in text.splitlines():
        line = line.strip()
        if m := RUN.match(line):
            run_at = m.group(1)
            checks.append(run_at)
        elif m := TRADE.match(line):
            pending.append({"side": "buy" if m.group(1) == "COMPRA" else "sell", "qty": float(m.group(2)),
                            "symbol": m.group(3), "eur": float(m.group(4)), "why": m.group(5), "run": run_at})
        elif m := VALUE.match(line):
            bar = m.group(1).replace(" ", "T")
            history.append({"bar": bar, "value": float(m.group(2))})
            for t in pending:
                t["bar"] = bar
            trades.extend(pending)
            pending = []
    dedup = {}
    for h in history:                 # una candela già vista da un controllo precedente
        dedup[h["bar"]] = h
    return list(dedup.values()), trades, checks


def build(run_dir: Path) -> dict:
    state = json.loads((run_dir / "trend_paper.json").read_text())
    log = (run_dir / "log.txt").read_text() if (run_dir / "log.txt").exists() else ""
    history, trades, checks = parse_log(log)
    sleeves = []
    for s in state["sleeves"]:
        sym = s["instrument"].split(":", 1)[-1]
        sleeves.append({"symbol": sym, "qty": s["qty"], "cash": round(s["cash"], 4),
                        "value": round(s.get("value", s["cash"]), 4), "trades": s["trades"],
                        "fees": round(s["fees"], 4), "in_position": s["qty"] > 0})
    cap0 = 200.0
    for line in log.splitlines():
        if mm := VALUE.match(line.strip()):
            cap0 = float(mm.group(3))
            break
    value = history[-1]["value"] if history else round(sum(s["value"] for s in sleeves), 2)
    return {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "last_check": checks[-1] if checks else None,
        "checks": len(checks),
        "last_bar": state.get("last_bar"),
        "capital": cap0,
        "value": value,
        "fees": round(sum(s["fees"] for s in sleeves), 4),
        "history": history,
        "trades": trades,
        "sleeves": sleeves,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--run", default="paper_run")
    ap.add_argument("--out", default="dashboard")
    args = ap.parse_args()
    data = build(Path(args.run))
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(data, ensure_ascii=False, indent=1)
    (out / "data.json").write_text(payload)
    tpl = (out / "template.html").read_text()
    a, b = tpl.index(SEED_START), tpl.index(SEED_END) + len(SEED_END)
    seed = f'{SEED_START}<script id="seed" type="application/json">{payload}</script>{SEED_END}'
    (out / "index.html").write_text(tpl[:a] + seed + tpl[b:])
    print(f"Dashboard: valore {data['value']} € su {data['capital']} €, {len(data['trades'])} trade, "
          f"{len(data['history'])} punti -> {out}/index.html")


if __name__ == "__main__":
    main()
