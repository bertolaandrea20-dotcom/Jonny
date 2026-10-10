"""Driver: backtest Kronos vs baseline (step 3, seed 42) su un periodo, min_up_fraction 0 e 0.8.

Usa backtest.run_backtest.run_backtest (stesso Engine del bot, mode paper).
Le previsioni Kronos sono memorizzate per timestamp: con seed fisso e una previsione per
step, la sequenza è identica tra le due varianti, quindi il secondo run le riusa.

Uso: python -m backtest.run_periods NOME END_YYYY-MM-DD OUT_DIR
(es. python -m backtest.run_periods laterale 2026-08-18 backtest_results)
"""
import copy
import json
import pickle
import sys
import time
from pathlib import Path

import pandas as pd

import backtest.run_backtest as rb
from bot.config import load_config
from bot.data import fetch_history
from bot.forecaster import make_forecaster

name, end, out = sys.argv[1], sys.argv[2], Path(sys.argv[3]) / sys.argv[1]
out.mkdir(parents=True, exist_ok=True)
STEP = 3

base = load_config("config.yaml")
base.mode = "paper"
assert base.forecaster.seed == 42
df = fetch_history(base.market.symbol, base.market.interval, 30,
                   end=pd.Timestamp(end, tz="UTC"), extra_bars=base.forecaster.context_bars)
df.to_csv(out / "candles.csv", index=False)
print(f"[{name}] {len(df)} candele dal {df['timestamps'].iloc[0]} al {df['timestamps'].iloc[-1]}",
      flush=True)


class Memo:
    def __init__(self, inner, cache):
        self.inner, self.cache, self.calls = inner, cache, 0

    def forecast(self, d):
        k = d["timestamps"].iloc[-1].isoformat()
        if k not in self.cache:
            self.cache[k] = self.inner.forecast(d)
            self.calls += 1
        return self.cache[k]


caches: dict[str, dict] = {"kronos": {}, "baseline": {}}
inner: dict[str, object] = {}


def memo_factory(fcfg, interval):
    if fcfg.type not in inner:   # Kronos caricato una volta sola: seed 42 al caricamento
        inner[fcfg.type] = make_forecaster(fcfg, interval)
    return Memo(inner[fcfg.type], caches[fcfg.type])


rb.make_forecaster = memo_factory

summary = []
for kind in ["kronos", "baseline"]:
    for muf in [0.0, 0.8]:
        c = copy.deepcopy(base)
        c.forecaster.type = kind
        c.strategy.min_up_fraction = muf
        tag = f"{kind}_muf{muf}"
        t0 = time.time()
        print(f"\n[{name}] ▶ {tag}, step={STEP}", flush=True)
        r = rb.run_backtest(c, df, step=STEP, verbose=True)
        r["variante"] = tag
        r["periodo"] = name
        r["min_up_fraction"] = muf
        r["secondi"] = round(time.time() - t0)
        rb.print_report(r)
        r["_trades"].to_csv(out / f"trades_{tag}.csv", index=False)
        pd.DataFrame(r["_curve"], columns=["timestamps", "equity"]).to_csv(
            out / f"equity_{tag}.csv", index=False)
        summary.append({k: v for k, v in r.items() if not k.startswith("_")})
        (out / "summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False))
    if kind == "kronos":
        with open(out / "kronos_forecasts.pkl", "wb") as f:
            pickle.dump(caches["kronos"], f)
print(f"[{name}] FATTO", flush=True)
