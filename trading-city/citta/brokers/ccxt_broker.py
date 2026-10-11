"""Ordini reali su exchange crypto tramite ccxt.

Default: Kraken (licenza MiCA in UE, operativo dall'Italia, coppie in EUR).
Funziona con qualsiasi exchange supportato da ccxt (es. ``bitstamp``,
``bitpanda``, ``bitvavo``, ``coinbase``) cambiando ``CCXT_EXCHANGE``.
"""

from __future__ import annotations

from .base import Broker, BrokerError, Fill


class CCXTBroker(Broker):
    is_live = True

    def __init__(self, exchange: str, api_key: str, secret: str, max_order_eur: float):
        import ccxt

        if not api_key or not secret:
            raise BrokerError("CCXT_API_KEY e CCXT_API_SECRET sono obbligatorie per il trading reale")
        self.name = f"ccxt:{exchange}"
        self.max_order_eur = max_order_eur
        self.ex = getattr(ccxt, exchange)({"apiKey": api_key, "secret": secret, "enableRateLimit": True})
        self.ex.load_markets()

    def execute(self, symbol: str, side: str, qty: float, ref_price: float) -> Fill:
        if "/" not in symbol:
            raise BrokerError(f"{symbol} non è una coppia crypto: usa IBKR per azioni/ETF")
        notional = qty * ref_price
        if notional > self.max_order_eur:
            qty = self.max_order_eur / ref_price
        qty = float(self.ex.amount_to_precision(symbol, qty))
        market = self.ex.market(symbol)
        min_amt = (market.get("limits", {}).get("amount", {}) or {}).get("min") or 0
        if qty <= 0 or qty < min_amt:
            raise BrokerError(f"quantità {qty} sotto il minimo dell'exchange ({min_amt})")
        order = self.ex.create_order(symbol, "market", side, qty)
        price = order.get("average") or order.get("price") or ref_price
        filled = order.get("filled") or qty
        fee = (order.get("fee") or {}).get("cost") or price * filled * 0.0026
        return Fill(symbol, side, float(filled), float(price), float(fee), self.name, str(order.get("id", "")))

    def describe(self) -> str:
        return f"{self.name} — ORDINI REALI (max {self.max_order_eur:.0f} € per ordine)"
