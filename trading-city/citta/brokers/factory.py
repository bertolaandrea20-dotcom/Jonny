from __future__ import annotations

import logging

from .base import Broker
from .paper import PaperBroker

log = logging.getLogger(__name__)


def make_broker(cfg) -> Broker:
    if cfg.mode != "live" or cfg.broker == "paper":
        return PaperBroker(cfg.fee_rate, seed=cfg.seed)
    if not cfg.live_enabled:
        log.warning("CITY_MODE=live ma LIVE_CONFIRM non è corretto: resto in paper trading")
        return PaperBroker(cfg.fee_rate, seed=cfg.seed)
    if cfg.broker == "ccxt":
        from .ccxt_broker import CCXTBroker

        return CCXTBroker(cfg.ccxt_exchange, cfg.ccxt_api_key, cfg.ccxt_api_secret, cfg.max_order_eur)
    if cfg.broker == "ibkr":
        from .ibkr import IBKRBroker

        return IBKRBroker(cfg.ibkr_host, cfg.ibkr_port, cfg.ibkr_client_id, cfg.max_order_eur)
    raise ValueError(f"broker sconosciuto: {cfg.broker}")
