"""Bull Researcher, Bear Researcher e Research Manager.

Come in TradingAgents, i due ricercatori si alternano per ``debate_rounds``
round: ognuno costruisce la propria tesi dai rapporti degli analisti e
risponde al punto più forte dell'avversario. Il Research Manager pesa il
dibattito con i pesi del genoma ed emette un rating a 5 livelli.
"""

from __future__ import annotations

from ..genome import Genome
from .base import RATING_IT, Step, score_to_rating

WEIGHT_OF = {"Market Analyst": "w_market", "Social Analyst": "w_sentiment",
             "News Analyst": "w_news", "Fundamentals Analyst": "w_fundamentals"}


def _strength(r: Step, g: Genome) -> float:
    return getattr(g, WEIGHT_OF[r.agent]) * r.signal * r.confidence


def run_debate(sym: str, reports: list[Step], g: Genome) -> tuple[list[Step], float]:
    bull_pts = sorted([r for r in reports if r.signal > 0.02], key=lambda r: -_strength(r, g))
    bear_pts = sorted([r for r in reports if r.signal < -0.02], key=lambda r: _strength(r, g))
    bull_force = sum(_strength(r, g) for r in bull_pts)
    bear_force = -sum(_strength(r, g) for r in bear_pts)
    steps: list[Step] = []
    for rnd in range(1, g.debate_rounds + 1):
        # Bull
        if bull_pts:
            lead = bull_pts[0]
            txt = f"Round {rnd}. Tesi rialzista su {sym}: il {lead.agent} dice «{lead.text[:140]}»."
            if len(bull_pts) > 1:
                txt += f" Lo conferma anche il {bull_pts[1].agent} ({bull_pts[1].signal:+.2f})."
            if rnd > 1 and bear_pts:
                txt += f" Al Bear rispondo: il segnale del {bear_pts[0].agent} è debole ({bear_pts[0].signal:+.2f}) e già nel prezzo."
        else:
            txt = f"Round {rnd}. Ammetto che non trovo argomenti rialzisti solidi su {sym}."
        steps.append(Step("Bull Researcher", "ricerca", txt, bull_force, min(1.0, bull_force)))
        bull_force *= 1.05  # la convinzione cresce se il dibattito continua
        # Bear
        if bear_pts:
            lead = bear_pts[0]
            txt = f"Round {rnd}. Tesi ribassista su {sym}: il {lead.agent} segnala «{lead.text[:140]}»."
            if len(bear_pts) > 1:
                txt += f" E il {bear_pts[1].agent} va nella stessa direzione ({bear_pts[1].signal:+.2f})."
            if bull_pts:
                txt += f" Il Bull sopravvaluta il {bull_pts[0].agent}: un solo indicatore non fa una tesi."
        else:
            txt = f"Round {rnd}. Non vedo rischi specifici su {sym} oltre alla normale volatilità."
        steps.append(Step("Bear Researcher", "ricerca", txt, -bear_force, min(1.0, bear_force)))
        bear_force *= 1.05

    wsum = sum(getattr(g, WEIGHT_OF[r.agent]) * max(r.confidence, 0.05) for r in reports) or 1.0
    score = sum(getattr(g, WEIGHT_OF[r.agent]) * r.signal * r.confidence for r in reports) / wsum
    rating = score_to_rating(score, g.entry_threshold)
    winner = "Bull" if score > 0 else "Bear" if score < 0 else "nessuno"
    plan = (f"Pesati gli analisti (mercato {g.w_market:.2f}, sentiment {g.w_sentiment:.2f}, "
            f"news {g.w_news:.2f}, fondamentali {g.w_fundamentals:.2f}) il punteggio è {score:+.3f}: "
            f"vince il {winner}. Soglia d'ingresso {g.entry_threshold:.2f}. "
            f"Rating: {rating} ({RATING_IT[rating]}).")
    steps.append(Step("Research Manager", "ricerca", plan, score, min(1.0, abs(score) * 2),
                      {"rating": rating, "score": round(score, 4)}))
    return steps, score
