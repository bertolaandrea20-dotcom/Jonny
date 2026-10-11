"""La Città: popolazione, tesoreria, orologio e leggi di sopravvivenza.

Leggi della città
-----------------
1. Ogni giorno, a fine giornata, ogni cittadino viene giudicato sul proprio
   risultato del giorno (valore del portafoglio ai prezzi correnti).
2. In profitto → sopravvive, versa una tassa sul profitto alla tesoreria e si
   sdoppia: un figlio con il genoma leggermente mutato riceve metà del suo
   portafoglio.
3. In perdita (o fermo a zero) → muore. Le sue posizioni vengono chiuse, il
   capitale torna alla tesoreria e il suo genoma finisce in lista nera:
   né lui né strategie troppo simili possono più nascere.
4. Nessuno vive più di ``LIFESPAN_DAYS`` giorni: al termine, se ha guadagnato,
   si divide in due eredi e va in pensione.
5. La città non può morire: la tesoreria non va mai a zero e, se la
   popolazione scende sotto ``MIN_POPULATION``, il Guardiano fonda nuovi
   cittadini (incroci dei sopravvissuti migliori o genomi nuovi, mai in lista nera).
"""

from __future__ import annotations

import logging
import random
import threading
import time
from collections import deque
from datetime import datetime
from zoneinfo import ZoneInfo

from ..agents.llm import make_reasoner
from ..agents.pipeline import deliberate
from ..brokers.base import BrokerError
from ..brokers.factory import make_broker
from ..config import Config
from ..genome import Genome, citizen_name, crossover, mutate, random_genome
from ..market.data import make_feed
from .citizen import Citizen, Position
from .storage import Storage

log = logging.getLogger(__name__)
ROME = ZoneInfo("Europe/Rome")
BLACKLIST_RADIUS = 0.05
DELIBERATE_EVERY = 3
EPS = 1e-6


class City:
    def __init__(self, cfg: Config, feed=None, broker=None, storage: Storage | None = None):
        self.cfg = cfg
        self.rng = random.Random(cfg.seed)
        self.feed = feed or make_feed(cfg)
        self.broker = broker or make_broker(cfg)
        self.reasoner = make_reasoner(cfg)
        self.store = storage or Storage(cfg.db_path, fresh=(cfg.mode == "sim"))
        self.lock = threading.RLock()
        self.citizens: dict[int, Citizen] = {}
        self.next_id = 1
        self.blacklist: dict[str, Genome] = {}
        self.hall_of_fame: list[tuple[float, Genome]] = []
        self.treasury = cfg.city_capital * cfg.treasury_share
        self.reserve_floor = self.treasury * 0.5
        self.day = 1
        self.tick = 0
        self.tick_in_day = 0
        self.peak_equity = cfg.city_capital
        self.alert = False
        self.paused = False
        self.speed = 1.0
        self.events: deque[dict] = deque(maxlen=300)
        self.trades: deque[dict] = deque(maxlen=300)
        self.curve: deque[tuple[int, float, float, int]] = deque(maxlen=3000)
        self.days: list[dict] = []
        self.stats = {"born": 0, "dead": 0, "retired": 0, "splits": 0, "founded": 0}
        self._calendar_day = datetime.now(ROME).date()
        self._thread: threading.Thread | None = None
        self._stop = threading.Event()
        self._found_initial()

    # ── utilità ─────────────────────────────────────────────
    @property
    def prices(self) -> dict[str, float]:
        return {s: self.feed.price(s) for s in self.feed.symbols}

    def alive(self) -> list[Citizen]:
        return [c for c in self.citizens.values() if c.alive]

    def city_equity(self) -> float:
        p = self.prices
        return self.treasury + sum(c.equity(p) for c in self.alive())

    def _event(self, kind: str, text: str, cid: int | None = None) -> None:
        e = {"tick": self.tick, "day": self.day, "kind": kind, "citizen_id": cid, "text": text,
             "time": datetime.now(ROME).strftime("%H:%M:%S")}
        self.events.appendleft(e)
        self.store.event(self.tick, self.day, kind, cid, text)

    def _is_blacklisted(self, g: Genome) -> bool:
        if g.fingerprint() in self.blacklist:
            return True
        return any(g.distance(b) < BLACKLIST_RADIUS for b in self.blacklist.values())

    def _new_genome(self, parent: Genome | None = None) -> Genome:
        universe = self.feed.symbols
        for attempt in range(300):
            if parent is not None:
                g = mutate(parent, self.rng, universe, strength=0.12 + attempt * 0.01)
            elif self.hall_of_fame and self.rng.random() < 0.6:
                elite = [gg for _, gg in sorted(self.hall_of_fame, key=lambda x: -x[0])[:8]]
                a, b = self.rng.choice(elite), self.rng.choice(elite)
                g = mutate(crossover(a, b, self.rng), self.rng, universe)
            else:
                g = random_genome(self.rng, universe)
            if self.alert:
                g.position_size = max(0.05, g.position_size * 0.5)
            if not self._is_blacklisted(g):
                return g
        return random_genome(self.rng, universe)  # praticamente impossibile arrivare qui

    def _spawn(self, genome: Genome, cash: float, parent: Citizen | None, positions=None) -> Citizen:
        gen = parent.generation + 1 if parent else 1
        c = Citizen(
            id=self.next_id, name=citizen_name(self.rng, gen), genome=genome, generation=gen,
            parent_id=parent.id if parent else None, born_day=self.day, born_tick=self.tick,
            cash=cash, capital_at_birth=0.0, positions=positions or {},
        )
        self.next_id += 1
        eq = c.equity(self.prices)
        c.capital_at_birth = c.equity_day_start = eq
        c.curve.append((self.tick, round(eq, 2)))
        self.citizens[c.id] = c
        self.stats["born"] += 1
        if parent:
            parent.children.append(c.id)
        self._persist(c)
        return c

    def _persist(self, c: Citizen) -> None:
        d = c.summary(self.prices)
        d["genome"] = c.genome.to_dict()
        self.store.citizen(c.id, d)

    # ── fondazione ──────────────────────────────────────────
    def _found_initial(self) -> None:
        n = self.cfg.initial_citizens
        each = self.cfg.city_capital * (1 - self.cfg.treasury_share) / n
        for _ in range(n):
            c = self._spawn(self._new_genome(), each, None)
            self.stats["founded"] += 1
            self._event("nascita", f"{c.name} fonda la sua casa con {each:.0f} € — {c.genome.describe()}", c.id)
        self._event("città", f"La città nasce: {n} cittadini, tesoreria {self.treasury:.0f} €. "
                             f"Broker: {self.broker.describe()}.")
        self.store.commit()

    # ── esecuzione ordini ───────────────────────────────────
    def _trade(self, c: Citizen, sym: str, side: str, qty: float, price: float, reason: str) -> bool:
        if qty <= 0 or price != price or price <= 0:
            return False
        try:
            fill = self.broker.execute(sym, side, qty, price)
        except BrokerError as exc:
            self._event("errore", f"{c.name}: ordine {side} {sym} rifiutato — {exc}", c.id)
            return False
        except Exception as exc:  # rete, exchange giù…
            log.exception("ordine fallito")
            self._event("errore", f"{c.name}: ordine {side} {sym} fallito — {exc}", c.id)
            return False
        pos = c.positions.setdefault(sym, Position())
        pnl = None
        if side == "buy":
            cost = fill.qty * fill.price + fill.fee
            if cost > c.cash + EPS:
                return False
            c.cash -= cost
            pos.avg = (pos.avg * pos.qty + fill.qty * fill.price) / (pos.qty + fill.qty)
            pos.qty += fill.qty
            pos.opened_tick = self.tick
        else:
            q = min(fill.qty, pos.qty)
            c.cash += q * fill.price - fill.fee
            pnl = q * (fill.price - pos.avg) - fill.fee
            c.realized += pnl
            c.wins += pnl > 0
            pos.qty -= q
            if pos.qty <= 1e-12:
                c.positions.pop(sym, None)
        c.trades += 1
        c.fees += fill.fee
        t = {"tick": self.tick, "day": self.day, "citizen_id": c.id, "citizen": c.name, "symbol": sym,
             "side": side, "qty": fill.qty, "price": fill.price, "fee": fill.fee, "pnl": pnl,
             "reason": reason, "venue": fill.venue, "order_id": fill.order_id,
             "time": datetime.now(ROME).strftime("%H:%M:%S")}
        self.trades.appendleft(t)
        self.store.trade(t)
        return True

    def _liquidate(self, c: Citizen, reason: str) -> None:
        p = self.prices
        for sym, pos in list(c.positions.items()):
            if not self._trade(c, sym, "sell", pos.qty, p[sym], reason):
                # se l'ordine non passa (es. sotto il minimo), valorizziamo al prezzo corrente
                c.cash += pos.qty * p[sym]
                c.positions.pop(sym, None)

    # ── un tick ─────────────────────────────────────────────
    def step(self) -> None:
        with self.lock:
            self.feed.step()
            self.tick += 1
            self.tick_in_day += 1
            prices = self.prices
            for c in self.alive():
                self._protect(c, prices)
                if (self.tick + c.id) % DELIBERATE_EVERY == 0:
                    self._think(c, prices)
                eq = c.equity(prices)
                c.curve.append((self.tick, round(eq, 2)))
                if len(c.curve) > 1500:
                    c.curve = c.curve[-1000:]
            eq = self.city_equity()
            self.peak_equity = max(self.peak_equity, eq)
            self.curve.append((self.tick, round(eq, 2), round(self.treasury, 2), len(self.alive())))
            if self.tick % 5 == 0:
                self.store.snapshot(self.tick, self.day, eq, self.treasury, len(self.alive()))
            if self._day_over():
                self.end_of_day()
            if self.tick % 10 == 0:
                self.store.commit()

    def _day_over(self) -> bool:
        if self.cfg.mode == "sim":
            return self.tick_in_day >= self.cfg.day_ticks
        today = datetime.now(ROME).date()
        if today != self._calendar_day:
            self._calendar_day = today
            return True
        return False

    def _protect(self, c: Citizen, prices: dict) -> None:
        """Stop loss e take profit: scattano a ogni tick, senza dibattito."""
        for sym, pos in list(c.positions.items()):
            p = prices[sym]
            ch = p / pos.avg - 1
            if ch <= -c.genome.stop_loss:
                self._trade(c, sym, "sell", pos.qty, p, f"stop loss {ch:+.2%}")
            elif ch >= c.genome.take_profit:
                self._trade(c, sym, "sell", pos.qty, p, f"take profit {ch:+.2%}")

    def _think(self, c: Citizen, prices: dict) -> None:
        eq = c.equity(prices)
        dd = eq / c.equity_day_start - 1 if c.equity_day_start else 0.0
        for sym in c.genome.symbols:
            pos = c.held(sym)
            d = deliberate(sym, self.feed, c.genome, pos.qty, pos.avg, dd, self.reasoner)
            dd_dict = d.to_dict()
            c.last_decisions[sym] = dd_dict
            if d.action == "buy" and pos.qty <= 0:
                budget = min(c.cash, eq * d.fraction)
                qty = budget / (d.price * (1 + self.cfg.fee_rate * 2))
                if budget >= 1.0 and self._trade(c, sym, "buy", qty, d.price, f"{d.rating} (punteggio {d.score:+.2f})"):
                    self.store.decision(self.tick, self.day, c.id, dd_dict)
            elif d.action == "sell" and pos.qty > 0:
                if self._trade(c, sym, "sell", pos.qty * min(1.0, d.fraction), d.price,
                               f"{d.rating} (punteggio {d.score:+.2f})"):
                    self.store.decision(self.tick, self.day, c.id, dd_dict)

    # ── il giudizio ─────────────────────────────────────────
    def end_of_day(self) -> None:
        with self.lock:
            prices = self.prices
            judged = sorted(self.alive(), key=lambda c: -(c.equity(prices) / c.equity_day_start - 1))
            survivors, dead = [], []
            for c in judged:
                eq = c.equity(prices)
                pnl = eq - c.equity_day_start
                c.day_results.append(round(pnl, 2))
                if pnl > EPS:
                    survivors.append((c, pnl))
                else:
                    dead.append((c, pnl))

            for c, pnl in dead:
                self._kill(c, pnl)

            room = self.cfg.max_population - len(survivors)
            for c, pnl in survivors:
                tax = min(c.cash, pnl * self.cfg.profit_tax)
                c.cash -= tax
                self.treasury += tax
                c.days_survived += 1
                self.hall_of_fame.append((pnl / c.equity_day_start, c.genome))
                if c.days_survived >= self.cfg.lifespan_days:
                    room -= self._retire(c, pnl, max(0, room + 1))
                elif room > 0 and self._split(c, pnl):
                    room -= 1
                else:
                    self._event("sopravvive", f"{c.name} sopravvive (+{pnl:.2f} €) ma non si sdoppia "
                                              f"(città piena o capitale troppo piccolo)", c.id)
            self.hall_of_fame = sorted(self.hall_of_fame, key=lambda x: -x[0])[:40]

            self._guardian()
            eq = self.city_equity()
            summary = {"day": self.day, "survivors": len(survivors), "dead": len(dead),
                       "population": len(self.alive()), "equity": round(eq, 2), "treasury": round(self.treasury, 2)}
            self.days.append(summary)
            self._event("giudizio", f"Fine del giorno {self.day}: {len(survivors)} sopravvissuti, {len(dead)} morti. "
                                    f"Popolazione {summary['population']}, patrimonio {eq:.0f} €.")
            self.day += 1
            self.tick_in_day = 0
            if self.reasoner:
                self.reasoner.new_day()
            p = self.prices
            for c in self.alive():
                c.equity_day_start = c.equity(p)
                self._persist(c)
            self.store.commit()

    def _kill(self, c: Citizen, pnl: float) -> None:
        self._liquidate(c, "morte: chiusura posizioni")
        c.final_equity = c.cash
        self.treasury += c.cash
        c.cash = 0.0
        c.status = "dead"
        c.death_day = self.day
        c.death_cause = (f"in perdita a fine giorno {self.day} ({pnl:+.2f} €)" if pnl < -0.005
                         else f"nessun profitto nel giorno {self.day}: chi non guadagna non sopravvive")
        fp = c.genome.fingerprint()
        self.blacklist[fp] = c.genome
        self.store.blacklist(fp, self.day, c.id, c.genome.to_dict())
        self.stats["dead"] += 1
        self._event("morte", f"✝ {c.name} muore ({pnl:+.2f} €). La strategia {fp} è bandita per sempre.", c.id)
        self._persist(c)

    def _take_half(self, c: Citizen) -> tuple[float, dict[str, Position]]:
        cash = c.cash / 2
        c.cash -= cash
        pos = {}
        for s, p in c.positions.items():
            half = p.qty / 2
            p.qty -= half
            pos[s] = Position(half, p.avg, p.opened_tick)
        return cash, pos

    def _split(self, c: Citizen, pnl: float) -> bool:
        if c.equity(self.prices) / 2 < self.cfg.min_citizen_capital:
            return False
        cash, pos = self._take_half(c)
        child = self._spawn(self._new_genome(c.genome), cash, c, pos)
        self.stats["splits"] += 1
        self._event("sdoppiamento", f"{c.name} chiude il giorno a +{pnl:.2f} € e si sdoppia: nasce {child.name} "
                                    f"({child.genome.describe()})", child.id)
        return True

    def _retire(self, c: Citizen, pnl: float, room: int) -> int:
        """Fine vita naturale: il cittadino si divide in due eredi e va in pensione."""
        heirs = 2 if room >= 2 and c.equity(self.prices) / 2 >= self.cfg.min_citizen_capital else 1
        born = 0
        for i in range(heirs):
            if i == heirs - 1:
                cash, pos = c.cash, dict(c.positions)
                c.cash, c.positions = 0.0, {}
            else:
                cash, pos = self._take_half(c)
            h = self._spawn(self._new_genome(c.genome), cash, c, pos)
            born += 1
            self._event("eredità", f"{c.name} lascia in eredità a {h.name}", h.id)
        c.status = "retired"
        c.death_day = self.day
        c.final_equity = 0.0
        c.death_cause = f"pensione dopo {c.days_survived} giorni sempre in profitto"
        self.stats["retired"] += 1
        self._event("pensione", f"★ {c.name} ha vissuto {c.days_survived} giorni in profitto e va in pensione "
                                f"lasciando {born} {'erede' if born == 1 else 'eredi'}.", c.id)
        self._persist(c)
        return born - 1  # il pensionato libera il suo posto

    def _guardian(self) -> None:
        """La città non può morire."""
        eq = self.city_equity()
        dd = eq / self.peak_equity - 1
        was = self.alert
        self.alert = dd < -0.2
        if self.alert and not was:
            self._event("guardiano", f"⚠ Allerta: la città è a {dd:+.1%} dal massimo. I nuovi nati rischieranno metà.")
        elif was and not self.alert:
            self._event("guardiano", "Allerta rientrata.")

        base = self.cfg.city_capital * (1 - self.cfg.treasury_share) / self.cfg.initial_citizens
        alive = len(self.alive())
        missing = self.cfg.min_population - alive
        if missing > 0:
            spendable = self.treasury - self.reserve_floor
            if spendable >= missing * self.cfg.min_citizen_capital:
                each = min(spendable / missing, base)
            else:
                # emergenza: si attinge alla riserva, ma mai più di metà di ciò che resta
                each = self.treasury / (2 * missing)
                self._event("guardiano", "Emergenza: il Guardiano apre la riserva inviolabile.")
            self._found(missing, max(each, 0.0), "Il Guardiano fonda")
        # il capitale dei morti non resta fermo: l'eccesso di tesoreria finanzia nuovi cittadini
        target = self.city_equity() * self.cfg.treasury_share
        excess = self.treasury - max(target, self.reserve_floor)
        room = self.cfg.max_population - len(self.alive())
        n = min(room, int(excess // base))
        if n > 0:
            self._found(n, base, "La tesoreria finanzia")

    def _found(self, n: int, each: float, verb: str) -> None:
        for _ in range(n):
            self.treasury -= each
            c = self._spawn(self._new_genome(), each, None)
            self.stats["founded"] += 1
            self._event("fondazione", f"{verb} {c.name} con {each:.0f} € — {c.genome.describe()}", c.id)

    # ── ciclo di vita ───────────────────────────────────────
    def run_forever(self) -> None:
        while not self._stop.is_set():
            t0 = time.time()
            if not self.paused:
                try:
                    self.step()
                except Exception:
                    log.exception("errore nel tick")
            interval = self.cfg.tick_seconds / self.speed if self.cfg.mode == "sim" else self.cfg.live_tick_seconds
            self._stop.wait(max(0.0, interval - (time.time() - t0)))

    def start(self) -> None:
        if self._thread is None:
            self._thread = threading.Thread(target=self.run_forever, daemon=True, name="city")
            self._thread.start()

    def stop(self) -> None:
        self._stop.set()
