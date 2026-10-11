"""Interfaccia comune dei broker.

La città tiene la contabilità di ogni cittadino (sotto-conti virtuali); il
broker esegue gli ordini e restituisce il prezzo effettivo di esecuzione.
Solo posizioni lunghe (niente vendite allo scoperto): è il modo più semplice
e accessibile per un privato in Italia, sia su crypto spot che su azioni/ETF.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Fill:
    symbol: str
    side: str  # "buy" | "sell"
    qty: float
    price: float
    fee: float
    venue: str
    order_id: str = ""


class BrokerError(RuntimeError):
    pass


class Broker:
    name = "base"
    is_live = False

    def execute(self, symbol: str, side: str, qty: float, ref_price: float) -> Fill:
        raise NotImplementedError

    def describe(self) -> str:
        return self.name
