"""L'ecosistema: una popolazione di agenti che sopravvive solo se fa profitto.

Regole (tutte in config.ecosystem):
- Ogni agente nasce in INCUBAZIONE (shadow): opera con soldi finti sugli stessi prezzi reali.
- Dopo `incubation_epochs`, se ha fatto profitto viene PROMOSSO: riceve `agent_allocation`
  di capitale reale dalla tesoreria. Se non ha fatto profitto muore.
- Un agente finanziato SOPRAVVIVE solo se il PnL sulle ultime `survival_window` epoche è > 0.
  Muore subito se perde più di `death_drawdown_pct` dal capitale ricevuto.
  Quando muore, il suo capitale torna in tesoreria.
- Un agente che guadagna almeno `split_return_pct` nella finestra (con abbastanza trade)
  si SDOPPIA: nasce un figlio con DNA mutato, che parte in incubazione.
- Se la popolazione scende sotto `min_agents` nascono agenti casuali (nuova diversità).

Le decisioni di sopravvivenza usano solo il passato: ogni epoca è out-of-sample per gli agenti.
"""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path

import numpy as np
import pandas as pd

from .agent import Agent
from .config import Config
from .data import bars_per_year
from .genome import Genome, mutate, random_genome
from .signals import signal


@dataclass
class EpochRecord:
    epoch: int
    time: str
    portfolio: float          # tesoreria + equity degli agenti finanziati (soldi veri)
    treasury: float
    funded: int
    shadow: int
    births: int
    deaths: int
    promotions: int


class Ecosystem:
    def __init__(self, cfg: Config, market: dict[str, pd.DataFrame],
                 kronos: dict[str, np.ndarray] | None = None,
                 bias: dict[str, np.ndarray] | None = None):
        self.cfg = cfg
        self.e = cfg.ecosystem
        self.market = market
        self.symbols = list(market)
        # Linea del tempo comune = unione degli orari di tutti gli strumenti. Ogni strumento
        # ha candele solo nei suoi orari (NaN altrove): un agente opera solo quando il suo
        # mercato ha una candela, e viene valutato all'ultimo prezzo noto.
        self.ts = pd.Series(sorted(set().union(*(set(d["timestamps"]) for d in market.values()))))
        index = pd.Index(self.ts)
        self.ohlc, self.valid, self.pos, self.dt_years = {}, {}, {}, {}
        step_years = 1 / bars_per_year(cfg.market.interval)
        for sym, d in market.items():
            pos = index.get_indexer(d["timestamps"])
            self.pos[sym] = pos
            arrs = {}
            for k in ("open", "high", "low", "close"):
                a = np.full(len(self.ts), np.nan)
                a[pos] = d[k].to_numpy(float)
                arrs[k] = a
            self.valid[sym] = ~np.isnan(arrs["close"])
            arrs["mark"] = pd.Series(arrs["close"]).ffill().bfill().to_numpy()
            self.ohlc[sym] = arrs
            # Anni trascorsi dalla candela precedente dello stesso strumento (per il funding:
            # una posizione tenuta di notte o nel weekend paga anche quelle ore).
            dt = np.full(len(self.ts), step_years)
            gaps = d["timestamps"].diff().dt.total_seconds().to_numpy() / (365 * 86400)
            dt[pos[1:]] = gaps[1:]
            self.dt_years[sym] = dt
        self.costs = {sym: cfg.costs.for_instrument(sym) for sym in self.symbols}
        self.kronos = kronos or {}
        self.bias = bias or {}
        self.rng = np.random.default_rng(self.e.seed)
        self.treasury = self.e.initial_capital
        self.agents: list[Agent] = []
        self.graveyard: list[Agent] = []
        self.history: list[EpochRecord] = []
        self.epoch = 0
        self._signals: dict[str, np.ndarray] = {}
        self._last_split: dict[str, int] = {}
        self._counts = {"births": 0, "deaths": 0, "promotions": 0}
        self._judging = False
        self._bar = 0                   # candela corrente (per la prova sul passato)
        self.stillborn = 0              # DNA scartati dalla prova sul passato
        self._founders_pending = self.e.founders

    # ---------------------------------------------------------------- nascita / morte
    def _spawn(self, g: Genome, funded: bool = False) -> Agent:
        alloc = self.e.agent_allocation
        # Chi nasce durante il giudizio di fine epoca inizia a operare dall'epoca successiva.
        born = self.epoch + 1 if self._judging else self.epoch
        a = Agent(genome=g, allocation=alloc, cash=alloc, born_epoch=born)
        if funded and self.treasury >= alloc:
            self.treasury -= alloc
            a.status, a.funded_epoch = "funded", self.epoch
        self.agents.append(a)
        self._counts["births"] += 1
        return a

    def leverage_cap(self, symbol: str) -> float:
        caps = self.cfg.genome.max_leverage_by_instrument
        src = symbol.split(":", 1)[0]
        return min(self.cfg.genome.max_leverage, caps.get(src, np.inf), caps.get(symbol, np.inf))

    def _fit(self, g: Genome) -> Genome:
        g.leverage = float(min(g.leverage, self.leverage_cap(g.symbol)))
        return g

    def _step_agent(self, a: Agent, i: int) -> None:
        sym = a.genome.symbol
        if not self.valid[sym][i]:
            return                       # mercato chiuso per questo strumento
        o, c = self.ohlc[sym], self.costs[sym]
        a.step(self.signal_of(a)[i], o["open"][i], o["high"][i], o["low"][i], o["close"][i],
               self.ts.iloc[i], c, c.funding_apr_pct / 100 * self.dt_years[sym][i])

    def prior_test(self, g: Genome) -> bool:
        """Simula il DNA sulle `prior_test_bars` candele prima della candela corrente."""
        n = self.e.prior_test_bars
        if n <= 0:
            return True
        i1 = self._bar
        i0 = max(1, i1 - n)
        if i1 - i0 < n // 2:
            return False
        a = Agent(genome=g, allocation=100.0, cash=100.0)
        mark = self.ohlc[g.symbol]["mark"]
        peak, max_dd = 100.0, 0.0
        for i in range(i0, i1):
            self._step_agent(a, i)
            eq = a.equity(mark[i])
            peak = max(peak, eq)
            max_dd = max(max_dd, (1 - eq / peak) * 100)
        ret = a.equity(mark[i1 - 1]) - 100.0
        weeks = (i1 - i0) / max(1, self.e.epoch_bars)
        return (ret >= self.e.prior_min_return_pct and max_dd <= self.e.prior_max_drawdown_pct
                and len(a.trades) / weeks <= self.e.prior_max_trades_per_week)

    def _spawn_random(self) -> Agent | None:
        for _ in range(max(1, self.e.spawn_attempts)):
            g = self._fit(random_genome(self.rng, self.cfg.genome, self.symbols))
            if self.prior_test(g):
                return self._spawn(g)
            self.stillborn += 1
            self._signals.pop(g.id, None)
        return None

    def _kill(self, a: Agent, i: int, reason: str) -> None:
        sym = a.genome.symbol
        a.liquidate(self.ohlc[sym]["mark"][i], self.costs[sym], self.ts.iloc[i], "morte")
        if a.status == "funded":
            self.treasury += a.cash
        a.status, a.death_reason = "dead", reason
        a.died_epoch = self.epoch
        self.graveyard.append(a)
        self._signals.pop(a.genome.id, None)
        self._counts["deaths"] += 1

    def _promote(self, a: Agent) -> None:
        # Da soldi finti a soldi veri: si riparte da flat con l'allocazione reale.
        self.treasury -= self.e.agent_allocation
        a.status, a.funded_epoch = "funded", self.epoch
        a.position, a.lock_side = None, 0.0
        a.allocation = a.cash = self.e.agent_allocation
        self._counts["promotions"] += 1

    # ---------------------------------------------------------------- segnali
    def signal_of(self, a: Agent) -> np.ndarray:
        return self.signal_of_genome(a.genome)

    def signal_of_genome(self, g: Genome) -> np.ndarray:
        """Per ogni candela della linea comune: il segnale all'ultima candela CHIUSA dello
        strumento prima di questa (è quello su cui si opera all'apertura)."""
        if g.id not in self._signals:
            own = signal(g, self.market[g.symbol], self.kronos.get(g.symbol), self.bias.get(g.symbol))
            full = np.full(len(self.ts), np.nan)
            full[self.pos[g.symbol]] = own
            self._signals[g.id] = pd.Series(full).ffill().shift(1).fillna(0.0).to_numpy()
        return self._signals[g.id]

    # ---------------------------------------------------------------- simulazione
    def portfolio_value(self, i: int) -> float:
        return self.treasury + sum(a.equity(self.ohlc[a.genome.symbol]["mark"][i])
                                   for a in self.agents if a.status == "funded")

    def step_bar(self, i: int) -> None:
        for a in self.agents:
            self._step_agent(a, i)

    def run_epoch(self, start: int) -> int:
        """Simula un'epoca a partire dalla candela `start`, poi giudica. Ritorna la prossima candela."""
        end = min(start + self.e.epoch_bars, len(self.ts))
        self.start_epoch_at(start)          # i fondatori nascono all'inizio della simulazione
        for i in range(start, end):
            self.step_bar(i)
        self.end_epoch_at(end - 1)
        return end

    def judge(self, i: int) -> None:
        e = self.e
        self._counts = {"births": 0, "deaths": 0, "promotions": 0}
        self._judging = True
        self._bar = i + 1
        for a in list(self.agents):
            price = self.ohlc[a.genome.symbol]["mark"][i]
            age = self.epoch - a.born_epoch + 1
            if (1 - a.equity(price) / a.allocation) * 100 >= e.death_drawdown_pct:
                self._kill(a, i, f"perdita oltre {e.death_drawdown_pct:.0f}%")
            elif a.status == "shadow" and age >= e.incubation_epochs:
                pnl = a.window_pnl(e.incubation_epochs)
                if pnl <= 0:          # conta anche la posizione aperta (valutata al prezzo attuale)
                    self._kill(a, i, "incubazione senza profitto")
                elif self.treasury >= e.agent_allocation:
                    self._promote(a)
            elif a.status == "funded" and self._funded_age(a) >= e.min_age_epochs:
                if a.window_pnl(self._window(a)) <= 0:
                    self._kill(a, i, "nessun profitto nella finestra")
        self.agents = [a for a in self.agents if a.status != "dead"]

        # Sdoppiamento dei vincenti (i più redditizi per primi, finché c'è posto).
        def window_ret(a: Agent) -> float:
            return a.window_pnl(self._window(a)) / a.allocation * 100
        for a in sorted(self.agents, key=window_ret, reverse=True):
            if len(self.agents) >= e.max_agents:
                break
            recent = self.epoch - self._last_split.get(a.genome.id, -10**9) < e.survival_window
            if (not recent and window_ret(a) >= e.split_return_pct
                    and a.window_trades(self._window(a)) >= e.min_trades_to_split):
                child = self._fit(mutate(a.genome, self.rng, self.cfg.genome, self.symbols))
                if self.prior_test(child):
                    self._spawn(child, funded=e.child_starts_funded)
                else:
                    self.stillborn += 1
                    self._signals.pop(child.id, None)
                self._last_split[a.genome.id] = self.epoch
        for _ in range(max(0, e.min_agents - len(self.agents))):
            self._spawn_random()

        funded = sum(a.status == "funded" for a in self.agents)
        self.history.append(EpochRecord(
            epoch=self.epoch, time=str(self.ts.iloc[i]), portfolio=round(self.portfolio_value(i), 4),
            treasury=round(self.treasury, 4), funded=funded, shadow=len(self.agents) - funded,
            **self._counts))
        self._judging = False
        self.epoch += 1

    def _funded_age(self, a: Agent) -> int:
        """Epoche intere giocate con soldi veri (la promozione avviene a fine epoca)."""
        return self.epoch - a.funded_epoch

    def _window(self, a: Agent) -> int:
        """Finestra di giudizio: per i finanziati conta solo il periodo con soldi veri."""
        if a.status == "funded":
            return max(1, min(self.e.survival_window, self._funded_age(a)))
        return self.e.survival_window

    def run(self, start: int, end: int | None = None) -> None:
        end = len(self.ts) if end is None else end
        i = start
        while i < end:
            i = self.run_epoch(i)

    # ---------------------------------------------------------------- report / stato
    def all_agents(self) -> list[Agent]:
        return self.graveyard + self.agents

    def lineage(self) -> pd.DataFrame:
        rows = []
        for a in self.all_agents():
            g = a.genome
            rows.append({
                "id": g.id, "parent": g.parent_id, "generation": g.generation,
                "status": a.status, "born_epoch": a.born_epoch,
                "funded_epoch": a.funded_epoch, "death": a.death_reason,
                "trades": len(a.trades), "pnl_totale": round(sum(a.epoch_pnl), 4),
                "fee": round(a.fees_paid, 4), "dna": g.describe(),
            })
        return pd.DataFrame(rows)

    def start_epoch_at(self, i: int) -> None:
        self._bar = i
        while self._founders_pending > 0:
            self._founders_pending -= 1
            self._spawn_random()
        for a in self.agents:
            a.start_epoch(self.ohlc[a.genome.symbol]["mark"][i - 1])

    def end_epoch_at(self, i: int) -> None:
        for a in self.agents:
            a.end_epoch(self.ohlc[a.genome.symbol]["mark"][i])
        self.judge(i)

    def restore(self, state: dict) -> None:
        """Ricarica agenti, tesoreria e storia da save_state (bot paper/live dopo un riavvio)."""
        from .agent import Position
        self.epoch, self.treasury = state["epoch"], state["treasury"]
        self._founders_pending = 0
        if state.get("rng"):
            self.rng.bit_generator.state = state["rng"]
        self._last_split = dict(state.get("last_split", {}))
        self.history = [EpochRecord(**h) for h in state.get("history", [])]
        self.agents = []
        for d in state["agents"]:
            a = Agent(genome=Genome.from_dict(d["genome"]), status=d["status"],
                      allocation=d["allocation"], cash=d["cash"], born_epoch=d["born_epoch"],
                      funded_epoch=d["funded_epoch"], lock_side=d["lock_side"])
            a.epoch_pnl, a.epoch_trades = list(d["epoch_pnl"]), list(d["epoch_trades"])
            a._epoch_start_equity = d.get("epoch_start_equity", a.cash)
            a._epoch_trade_count = d.get("epoch_trade_count", 0)
            if d["position"]:
                a.position = Position(**d["position"])
                a._entry_time, a._entry_fee = d.get("entry_time", ""), d.get("entry_fee", 0.0)
            self.agents.append(a)

    def save_state(self, path: str, extra: dict | None = None) -> None:
        state = {
            **(extra or {}),
            "epoch": self.epoch, "treasury": self.treasury,
            "rng": self.rng.bit_generator.state, "last_split": self._last_split,
            "agents": [{"genome": a.genome.to_dict(), "status": a.status, "allocation": a.allocation,
                        "cash": a.cash, "born_epoch": a.born_epoch, "funded_epoch": a.funded_epoch,
                        "epoch_pnl": a.epoch_pnl, "epoch_trades": a.epoch_trades,
                        "position": asdict(a.position) if a.position else None,
                        "entry_time": str(getattr(a, "_entry_time", "")),
                        "entry_fee": getattr(a, "_entry_fee", 0.0),
                        "epoch_start_equity": a._epoch_start_equity,
                        "epoch_trade_count": a._epoch_trade_count,
                        "lock_side": a.lock_side} for a in self.agents],
            "history": [asdict(h) for h in self.history],
        }
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        tmp = f"{path}.tmp"
        Path(tmp).write_text(json.dumps(state, indent=1, default=str))
        Path(tmp).replace(path)
