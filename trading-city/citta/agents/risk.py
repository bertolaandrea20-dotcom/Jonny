"""Team del rischio (Aggressive, Conservative, Neutral) e Portfolio Manager."""

from __future__ import annotations

from ..genome import Genome
from .base import Step, score_to_rating


def risk_debate(sym: str, action: str, frac: float, vol: float, drawdown: float,
                g: Genome) -> tuple[list[Step], dict]:
    steps: list[Step] = []
    hot = vol > 0.012
    props = {"aggressive": frac, "conservative": frac, "neutral": frac}
    for rnd in range(1, g.risk_rounds + 1):
        if action == "buy":
            props["aggressive"] = min(0.9, frac * 1.5)
            props["conservative"] = frac * (0.4 if hot or drawdown < -0.02 else 0.7)
            props["neutral"] = (props["aggressive"] + props["conservative"]) / 2
            a = f"Round {rnd}. L'occasione c'è: alziamo la quota al {props['aggressive']:.0%}. Chi non rischia non sopravvive al giudizio di domani."
            c = (f"Round {rnd}. Volatilità {vol:.2%} per periodo{' (alta)' if hot else ''}, drawdown del giorno {drawdown:+.2%}. "
                 f"Scendiamo al {props['conservative']:.0%}: chi perde muore, e non torna.")
            n = f"Round {rnd}. Via di mezzo: {props['neutral']:.0%}, con lo stop a -{g.stop_loss:.1%} a proteggerci."
        elif action == "sell":
            props["aggressive"] = frac
            props["conservative"] = 1.0
            props["neutral"] = max(frac, 0.75)
            a = f"Round {rnd}. Vendere sì, ma solo la parte proposta ({frac:.0%}): il rimbalzo potrebbe arrivare."
            c = f"Round {rnd}. Chiudiamo tutto: in perdita a fine giornata significa morte."
            n = f"Round {rnd}. Proposta intermedia: vendiamo il {props['neutral']:.0%}."
        else:
            a = f"Round {rnd}. Restare fermi costa: senza profitto domani non sopravviviamo."
            c = f"Round {rnd}. Nessun segnale chiaro: stare fermi è la scelta più sicura."
            n = f"Round {rnd}. Concordo con l'attesa, ma restiamo pronti a entrare."
        steps += [Step("Aggressive Analyst", "rischio", a, 0, props["aggressive"]),
                   Step("Conservative Analyst", "rischio", c, 0, props["conservative"]),
                   Step("Neutral Analyst", "rischio", n, 0, props["neutral"])]
    return steps, props


def portfolio_manager(sym: str, action: str, score: float, props: dict, g: Genome) -> tuple[Step, str, str, float]:
    ra = g.risk_appetite
    if action == "hold":
        rating = score_to_rating(score, g.entry_threshold)
        if rating in ("Buy", "Overweight", "Sell", "Underweight"):
            rating = "Hold"
        txt = f"Rating: Hold. Executive Summary: nessun ordine su {sym}. Il punteggio {score:+.3f} non supera le soglie operative."
        return Step("Portfolio Manager", "decisione", txt, score, 0.0), rating, "hold", 0.0
    if ra >= 0.5:
        w = (ra - 0.5) * 2
        final = w * props["aggressive"] + (1 - w) * props["neutral"]
        side = "Aggressive"
    else:
        w = (0.5 - ra) * 2
        final = w * props["conservative"] + (1 - w) * props["neutral"]
        side = "Conservative"
    if action == "buy":
        rating = "Buy" if score >= g.entry_threshold * 1.6 else "Overweight"
    else:
        rating = "Sell" if final >= 0.99 else "Underweight"
    txt = (f"Rating: {rating}. Executive Summary: {'acquisto' if action == 'buy' else 'vendita'} su {sym}, "
           f"quota {final:.0%}. Investment Thesis: punteggio {score:+.3f}; con appetito al rischio {ra:.2f} "
           f"pende verso l'analista {side}, mediato dal Neutral.")
    return Step("Portfolio Manager", "decisione", txt, score, final), rating, action, final
