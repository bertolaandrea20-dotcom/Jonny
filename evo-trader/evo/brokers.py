"""Collegamento al broker.

Il broker vede UN solo portafoglio: l'esposizione netta per strumento sommata su tutti gli
agenti finanziati (gli agenti in incubazione non muovono mai soldi veri). A ogni ciclo il bot
confronta l'esposizione desiderata con le posizioni reali e invia solo gli ordini di differenza.

- PaperBroker: nessun ordine, conta solo la simulazione degli agenti.
- IBKRBroker: Interactive Brokers tramite IB Gateway/TWS (libreria ib_async). Con mode paper
  si collega al conto DEMO (porta 4002), con mode live al conto REALE (porta 4001, richiede
  anche CONFIRM_LIVE=yes nel .env).

Usa un conto (o sotto-conto) dedicato al bot: sugli strumenti dell'universo il bot considera
sue tutte le posizioni che trova.
"""
from __future__ import annotations

import math
from pathlib import Path

from .config import Config
from .ecosystem import Ecosystem

KILL_SWITCH_FILE = "STOP"   # se esiste, il bot può solo ridurre le posizioni, mai aumentarle


def target_exposure(eco: Ecosystem, i: int) -> dict[str, float]:
    """Esposizione netta desiderata per strumento, nella valuta del bot (+ long, - short)."""
    out = {s: 0.0 for s in eco.symbols}
    for a in eco.agents:
        if a.status != "funded" or a.position is None:
            continue
        p = a.position
        out[a.genome.symbol] += p.side * p.qty * eco.ohlc[a.genome.symbol]["mark"][i]
    return out


class PaperBroker:
    name = "paper"

    def sync(self, exposure: dict[str, float], prices: dict[str, float],
             tradable: set[str]) -> list[str]:
        return [f"{s}: {v:+.2f}" for s, v in exposure.items() if abs(v) > 0.01]


def _round_lot(qty: float, lot: float) -> float:
    """Arrotonda verso zero al lotto minimo (azioni: 1 pezzo)."""
    n = math.floor(abs(qty) / lot + 1e-9)
    return math.copysign(round(n * lot, 10), qty) if n else 0.0


class IBKRBroker:
    name = "ibkr"

    def __init__(self, cfg: Config, ib=None, kill_switch: str = KILL_SWITCH_FILE):
        self.cfg, self.icfg = cfg, cfg.ibkr
        self.ib = ib
        self.kill_switch = kill_switch
        self._contracts: dict = {}

    # ---------------------------------------------------------------- connessione
    def connect(self) -> None:
        if self.ib is None:
            from ib_async import IB  # import qui: serve solo con broker ibkr
            self.ib = IB()
        if not self.ib.isConnected():
            self.ib.connect(self.icfg.host, self.icfg.port, clientId=self.icfg.client_id,
                            account=self.icfg.account)

    def contract(self, instrument: str):
        if instrument not in self._contracts:
            spec = dict(self.icfg.contracts.get(instrument) or {})
            if not spec:
                raise KeyError(f"Manca il contratto IBKR per {instrument} (ibkr.contracts nel config)")
            spec.pop("lot", None)
            from ib_async import Contract
            q = self.ib.qualifyContracts(Contract(**spec))
            if not q:
                raise KeyError(f"IBKR non riconosce il contratto di {instrument}: {spec}")
            self._contracts[instrument] = q[0]
        return self._contracts[instrument]

    def lot(self, instrument: str) -> float:
        spec = self.icfg.contracts.get(instrument) or {}
        return float(spec.get("lot", 1.0))

    def positions(self) -> dict[int, float]:
        acct = self.icfg.account
        return {p.contract.conId: float(p.position) for p in self.ib.positions()
                if not acct or p.account == acct}

    def net_liquidation(self) -> float | None:
        for v in self.ib.accountSummary(self.icfg.account):
            if v.tag == "NetLiquidation" and v.currency == self.icfg.base_currency:
                return float(v.value)
        return None

    def fx_to_base(self, currency: str) -> float:
        """Quante unità di valuta base vale 1 unità di `currency`."""
        base = self.icfg.base_currency
        if currency == base:
            return 1.0
        from ib_async import Forex
        t = self.ib.reqTickers(Forex(base + currency))[0]
        px = t.marketPrice()
        if not px or math.isnan(px):
            px = t.close
        if not px or math.isnan(px):
            raise RuntimeError(f"Cambio {base}/{currency} non disponibile")
        return 1.0 / px

    # ---------------------------------------------------------------- ordini
    def plan(self, exposure: dict[str, float], prices: dict[str, float],
             tradable: set[str]) -> list[tuple[str, object, float, float]]:
        """Ordini necessari: (strumento, contratto, quantità con segno, controvalore)."""
        cap = self.cfg.ecosystem.initial_capital
        gross = sum(abs(v) for v in exposure.values())
        limit = self.icfg.max_gross_exposure * cap
        scale = min(1.0, limit / gross) if gross > 0 else 1.0   # tetto all'esposizione totale
        max_order = self.icfg.max_order_value or cap
        stop = Path(self.kill_switch).exists()
        held = self.positions()
        orders = []
        for inst, value in exposure.items():
            if inst not in tradable or inst not in prices:
                continue                      # mercato chiuso o prezzo assente: si riprova dopo
            c = self.contract(inst)
            unit = prices[inst] * self.fx_to_base(c.currency)
            target = _round_lot(value * scale / unit, self.lot(inst))
            current = held.get(c.conId, 0.0)
            if stop and abs(target) > abs(current):
                target = current              # kill switch: solo riduzioni
            diff = target - current
            if diff and abs(diff) * unit > max_order:
                diff = _round_lot(math.copysign(max_order / unit, diff), self.lot(inst))
            if not diff or abs(diff) * unit < self.icfg.min_order_value:
                continue
            orders.append((inst, c, diff, abs(diff) * unit))
        return orders

    def sync(self, exposure: dict[str, float], prices: dict[str, float],
             tradable: set[str]) -> list[str]:
        from ib_async import MarketOrder
        self.connect()
        msgs = []
        for inst, c, diff, value in self.plan(exposure, prices, tradable):
            order = MarketOrder("BUY" if diff > 0 else "SELL", abs(diff), tif="DAY")
            self.ib.placeOrder(c, order)
            msgs.append(f"ORDINE {order.action} {abs(diff):g} {inst} (~{value:.2f} "
                        f"{self.icfg.base_currency})")
        nl = self.net_liquidation()
        if nl is not None:
            msgs.append(f"Conto IBKR: valore netto {nl:.2f} {self.icfg.base_currency}")
        return msgs


def make_broker(cfg: Config, ib=None):
    if cfg.broker == "ibkr":
        return IBKRBroker(cfg, ib=ib)
    if cfg.broker == "paper":
        return PaperBroker()
    raise NotImplementedError(f"Broker '{cfg.broker}' non ancora integrato (disponibili: paper, ibkr)")
