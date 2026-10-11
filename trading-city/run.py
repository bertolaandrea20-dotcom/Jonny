"""Avvia la città e la dashboard:  python run.py  →  http://localhost:8000"""

from __future__ import annotations

import argparse
import logging

import uvicorn

from citta.city.city import City
from citta.config import LIVE_PHRASE, Config
from citta.server import create_app


def main() -> None:
    ap = argparse.ArgumentParser(description="La Città degli Agenti")
    ap.add_argument("--env", default=".env", help="file di configurazione")
    ap.add_argument("--port", type=int)
    ap.add_argument("--headless-days", type=int, default=0,
                    help="simula N giorni senza dashboard e stampa il riepilogo")
    args = ap.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    cfg = Config.from_env(args.env)
    if cfg.mode == "live" and not cfg.live_enabled:
        print(f"\n⚠  CITY_MODE=live ma LIVE_CONFIRM non contiene la frase richiesta:\n   {LIVE_PHRASE}\n"
              "   Proseguo in paper trading.\n")
    city = City(cfg)

    if args.headless_days:
        for _ in range(args.headless_days * cfg.day_ticks):
            city.step()
        for d in city.days:
            print(d)
        print(city.stats)
        return

    city.start()
    uvicorn.run(create_app(city), host="0.0.0.0", port=args.port or cfg.port, log_level="warning")


if __name__ == "__main__":
    main()
