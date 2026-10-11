"""Ordini reali su Interactive Brokers (IBKR Ireland serve i clienti italiani).

Richiede TWS o IB Gateway in esecuzione (porta 7497 = conto paper di IBKR,
7496 = conto reale). Simboli: ``ENI.MI`` → ENI su Borsa Italiana (BVME) in EUR;
``AAPL`` → SMART/USD.
"""

from __future__ import annotations

from .base import Broker, BrokerError, Fill


class IBKRBroker(Broker):
    is_live = True

    def __init__(self, host: str, port: int, client_id: int, max_order_eur: float):
        from ib_insync import IB

        self.name = f"ibkr:{port}"
        self.max_order_eur = max_order_eur
        self.ib = IB()
        self.ib.connect(host, port, clientId=client_id, timeout=15)

    def _contract(self, symbol: str):
        from ib_insync import Crypto, Stock

        if "/" in symbol:
            base, quote = symbol.split("/")
            return Crypto(base, "PAXOS", quote)
        if symbol.endswith(".MI"):
            return Stock(symbol[:-3], "BVME", "EUR")
        return Stock(symbol, "SMART", "USD")

    def execute(self, symbol: str, side: str, qty: float, ref_price: float) -> Fill:
        from ib_insync import MarketOrder

        if qty * ref_price > self.max_order_eur:
            qty = self.max_order_eur / ref_price
        qty = int(qty) if "/" not in symbol else round(qty, 6)
        if qty <= 0:
            raise BrokerError("quantità troppo piccola per un ordine IBKR (azioni intere)")
        contract = self._contract(symbol)
        self.ib.qualifyContracts(contract)
        trade = self.ib.placeOrder(contract, MarketOrder(side.upper(), qty))
        self.ib.sleep(2)
        price = trade.orderStatus.avgFillPrice or ref_price
        filled = trade.orderStatus.filled or qty
        fee = sum(f.commissionReport.commission or 0 for f in trade.fills)
        return Fill(symbol, side, float(filled), float(price), float(fee), self.name, str(trade.order.orderId))

    def describe(self) -> str:
        return f"Interactive Brokers {self.name} — ORDINI REALI (max {self.max_order_eur:.0f} € per ordine)"
