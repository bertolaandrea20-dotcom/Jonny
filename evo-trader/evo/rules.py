"""Regole semplici di riferimento, con gli stessi costi del bot: servono a capire se
l'ecosistema aggiunge qualcosa rispetto a strategie note e a basso turnover.

Ogni strumento ha una "quota" fissa del capitale (stesso peso per tutti): la quota è investita
quando la regola dice long, altrimenti resta in contanti. Segnale al close, esecuzione
all'apertura successiva, fee + slippage su ogni cambio, nessun look-ahead.

  python -m evo.rules --start 2018-01-01 --end 2026-10-01 --from 2019-01-01
"""
from __future__ import annotations

import argparse

import numpy as np
import pandas as pd

from .config import load_config
from .data import load_market

RULES = {
    "buy_and_hold": lambda c: np.ones(len(c)),
    "sopra_SMA50": lambda c: (c > c.rolling(50).mean()).astype(float).to_numpy(),
    "sopra_SMA100": lambda c: (c > c.rolling(100).mean()).astype(float).to_numpy(),
    "sopra_SMA200": lambda c: (c > c.rolling(200).mean()).astype(float).to_numpy(),
    "incrocio_SMA20_100": lambda c: (c.rolling(20).mean() > c.rolling(100).mean()).astype(float).to_numpy(),
    "momentum_90g": lambda c: (c / c.shift(90) > 1).astype(float).to_numpy(),
}


def sleeve(df: pd.DataFrame, rule, start: pd.Timestamp, side_cost: float) -> pd.Series:
    """Equity (1 = capitale iniziale della quota) di una quota su uno strumento."""
    c = df["close"].astype(float).reset_index(drop=True)
    o = df["open"].astype(float).to_numpy()
    sig = np.nan_to_num(rule(c))
    ts = df["timestamps"].reset_index(drop=True)
    eq, units, cash, out, trades = 1.0, 0.0, 1.0, [], 0
    for i in range(1, len(c)):
        if ts[i] < start:
            continue
        want = sig[i - 1]                                   # deciso al close di ieri
        if want and units == 0:
            units = cash * (1 - side_cost) / o[i]
            cash, trades = 0.0, trades + 1
        elif not want and units > 0:
            cash, units, trades = units * o[i] * (1 - side_cost), 0.0, trades + 1
        eq = cash + units * c[i]
        out.append((ts[i], eq))
    s = pd.Series(dict(out), dtype=float)
    s.attrs["trades"] = trades
    return s


def evaluate(market: dict[str, pd.DataFrame], start: str, side_cost: float) -> pd.DataFrame:
    st = pd.Timestamp(start, tz="UTC")
    rows = []
    for name, rule in RULES.items():
        sleeves = [sleeve(d, rule, st, side_cost) for d in market.values()]
        idx = sorted(set().union(*(s.index for s in sleeves)))
        # quota in contanti finché lo strumento non ha dati, poi segue la sua equity
        port = pd.concat([s.reindex(idx).ffill().fillna(1.0) for s in sleeves], axis=1).mean(axis=1)
        years = (idx[-1] - idx[0]).days / 365.25
        dd = (1 - port / port.cummax()).max() * 100
        yearly = port.groupby(port.index.year).agg(lambda x: x.iloc[-1]).pct_change()
        yearly.iloc[0] = port.groupby(port.index.year).agg(lambda x: x.iloc[-1]).iloc[0] - 1
        rows.append({
            "regola": name,
            "rendimento_totale_pct": round((port.iloc[-1] - 1) * 100, 1),
            "annuo_pct": round((port.iloc[-1] ** (1 / years) - 1) * 100, 1),
            "max_drawdown_pct": round(dd, 1),
            "trade_per_anno": round(sum(s.attrs["trades"] for s in sleeves) / years, 1),
            "anni_in_perdita": int((yearly < 0).sum()), "anni": len(yearly),
            **{f"{y}": round(v * 100, 1) for y, v in yearly.items()},
        })
    return pd.DataFrame(rows)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="config.yaml")
    ap.add_argument("--start", required=True, help="inizio dati (incluso il periodo per gli indicatori)")
    ap.add_argument("--from", dest="from_", required=True, help="inizio della valutazione")
    ap.add_argument("--end", required=True)
    args = ap.parse_args()
    cfg = load_config(args.config)
    market = load_market(cfg.market.universe(), cfg.market.interval, args.start, args.end,
                         default_source=cfg.market.default_source)
    c = cfg.costs
    side = (c.fee_bps + c.slippage_bps) / 1e4
    if c.min_fee:
        print(f"  nota: min_fee {c.min_fee} ignorata qui (le quote sono in percentuale)")
    pd.set_option("display.width", 250)
    print(evaluate(market, args.from_, side).to_string(index=False))


if __name__ == "__main__":
    main()
