"""Il grafo di ragionamento di un cittadino, ricalcato su TradingAgents:

    Analisti (Market, Social, News, Fundamentals)
        → Bull ⇄ Bear (debate_rounds)
        → Research Manager (rating a 5 livelli)
        → Trader (proposta d'ordine)
        → Aggressive → Conservative → Neutral (risk_rounds)
        → Portfolio Manager (decisione finale)
"""

from __future__ import annotations

from ..genome import Genome
from ..market import indicators as ind
from ..market.data import MarketFeed
from .analysts import fundamentals_analyst, market_analyst, news_analyst, sentiment_analyst
from .base import Decision, Step
from .debate import run_debate
from .risk import portfolio_manager, risk_debate
from .trader import trader


def deliberate(sym: str, feed: MarketFeed, g: Genome, held_qty: float, avg_cost: float,
               day_drawdown: float, reasoner=None) -> Decision:
    closes = feed.closes(sym, 160)
    price = feed.price(sym)
    reports = [
        market_analyst(sym, closes, g),
        sentiment_analyst(sym, feed.social(sym), g),
        news_analyst(sym, feed.news(sym), feed.tick, g),
        fundamentals_analyst(sym, feed.fundamentals(sym), g),
    ]
    research, score = run_debate(sym, reports, g)
    rating = research[-1].data["rating"]
    t_step, action, frac = trader(sym, price, rating, score, held_qty, avg_cost, g)
    risk_steps, props = risk_debate(sym, action, frac, ind.volatility(closes), day_drawdown, g)
    pm_step, final_rating, final_action, final_frac = portfolio_manager(sym, action, score, props, g)

    used_llm = False
    if reasoner is not None and action != "hold":
        out = reasoner.portfolio_manager(
            symbol=sym, price=f"{price:.6g}",
            position=f"{held_qty:.6g} a {avg_cost:.6g}" if held_qty > 0 else "nessuna",
            genome=g.describe(),
            analysts="\n".join(f"- {r.agent} ({r.signal:+.2f}): {r.text}" for r in reports),
            research="\n".join(f"- {s.agent}: {s.text}" for s in research),
            trader=t_step.text,
            risk="\n".join(f"- {s.agent}: {s.text}" for s in risk_steps),
        )
        if out:
            used_llm = True
            final_rating, text = out
            pm_step = Step("Portfolio Manager", "decisione", text, score, final_frac, {"llm": True})
            if final_rating in ("Hold",):
                final_action, final_frac = "hold", 0.0
            elif final_rating in ("Buy", "Overweight") and held_qty <= 0:
                final_action = "buy"
                final_frac = final_frac or g.position_size
            elif final_rating in ("Sell", "Underweight") and held_qty > 0:
                final_action = "sell"
                final_frac = 1.0 if final_rating == "Sell" else 0.5
            else:
                final_action, final_frac = "hold", 0.0

    return Decision(
        symbol=sym, tick=feed.tick, price=price, rating=final_rating, action=final_action,
        fraction=final_frac, score=score, stop_loss=g.stop_loss, take_profit=g.take_profit,
        steps=[*reports, *research, t_step, *risk_steps, pm_step], llm=used_llm,
    )
