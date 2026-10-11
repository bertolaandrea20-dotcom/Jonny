"""Il Trader trasforma il piano del Research Manager in una proposta d'ordine."""

from __future__ import annotations

from ..genome import Genome
from .base import Step


def trader(sym: str, price: float, rating: str, score: float, held_qty: float,
           avg_cost: float, g: Genome) -> tuple[Step, str, float]:
    if held_qty <= 0:
        if rating in ("Buy", "Overweight"):
            frac = g.position_size * (1.0 if rating == "Buy" else 0.6)
            txt = (f"Propongo ACQUISTO di {sym} a ~{price:.4g} con {frac:.0%} del mio capitale. "
                   f"Stop loss -{g.stop_loss:.1%}, take profit +{g.take_profit:.1%}.")
            return Step("Trader", "trader", txt, score, frac, {"azione": "buy", "quota": frac}), "buy", frac
        return Step("Trader", "trader", f"Nessuna posizione su {sym} e rating {rating}: resto fuori.", score, 0,
                    {"azione": "hold"}), "hold", 0.0
    pnl = price / avg_cost - 1 if avg_cost else 0.0
    if rating == "Sell" or score <= g.exit_threshold:
        txt = f"Ho {held_qty:.6g} {sym} ({pnl:+.2%}). Rating {rating}, punteggio {score:+.2f} ≤ uscita {g.exit_threshold:.2f}: VENDO tutto."
        return Step("Trader", "trader", txt, score, 1.0, {"azione": "sell", "quota": 1.0}), "sell", 1.0
    if rating == "Underweight":
        txt = f"Ho {held_qty:.6g} {sym} ({pnl:+.2%}). Rating Underweight: alleggerisco del 50%."
        return Step("Trader", "trader", txt, score, 0.5, {"azione": "sell", "quota": 0.5}), "sell", 0.5
    txt = f"Tengo la posizione su {sym} ({pnl:+.2%}): il quadro non giustifica cambiamenti."
    return Step("Trader", "trader", txt, score, 0, {"azione": "hold"}), "hold", 0.0
