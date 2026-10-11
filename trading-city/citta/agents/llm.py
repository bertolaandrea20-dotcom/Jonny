"""Ragionamento opzionale con Claude per il Portfolio Manager.

Con ``LLM_MODE=claude`` il Portfolio Manager riceve i rapporti degli analisti,
il dibattito Bull/Bear e quello sul rischio (come nel prompt di TradingAgents)
e scrive la decisione finale. Il rating viene letto dalla riga ``Rating: X``;
se manca o la chiamata fallisce, resta la decisione a regole.
Le chiamate hanno un budget giornaliero per tenere sotto controllo i costi.
"""

from __future__ import annotations

import logging
import re

from .base import RATINGS

log = logging.getLogger(__name__)
_RATING_RE = re.compile(r"rating\W*[:\-–—]\s*\**\s*(\w+)", re.IGNORECASE)

PM_PROMPT = """Sei il Portfolio Manager di un agente di trading nella "Città degli Agenti".
Regola della città: a fine giornata chi è in profitto sopravvive e si sdoppia, chi è in perdita muore per sempre.
Strumento: {symbol} — prezzo {price}. Posizione attuale: {position}.
Carattere dell'agente: {genome}.

Scala di rating (usane esattamente una): Buy, Overweight, Hold, Underweight, Sell.
Se non hai una posizione, Underweight/Sell significano restare fuori.

Rapporti degli analisti:
{analysts}

Dibattito Bull/Bear e piano del Research Manager:
{research}

Proposta del Trader:
{trader}

Dibattito sul rischio:
{risk}

Pesa le tesi sul merito, scegli la più forte e dimensiona la convinzione. Scegli Hold solo se le prove sono davvero in equilibrio.
Rispondi in italiano, in meno di 120 parole, con queste sezioni in quest'ordine:
- **Rating**: uno tra Buy / Overweight / Hold / Underweight / Sell
- **Executive Summary**: la decisione e come eseguirla
- **Investment Thesis**: le prove decisive e cosa ti farebbe cambiare idea"""


class ClaudeReasoner:
    def __init__(self, model: str, max_calls_per_day: int):
        import anthropic

        self._anthropic = anthropic
        self.client = anthropic.Anthropic()
        self.model = model
        self.max_calls = max_calls_per_day
        self.calls_today = 0

    def new_day(self) -> None:
        self.calls_today = 0

    @property
    def available(self) -> bool:
        return self.calls_today < self.max_calls

    def portfolio_manager(self, **ctx) -> tuple[str, str] | None:
        if not self.available:
            return None
        self.calls_today += 1
        a = self._anthropic
        try:
            resp = self.client.beta.messages.create(
                model=self.model,
                max_tokens=4000,
                output_config={"effort": "low"},
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
                messages=[{"role": "user", "content": PM_PROMPT.format(**ctx)}],
            )
        except a.RateLimitError:
            log.warning("Claude: rate limit, uso il ragionamento a regole")
            return None
        except a.APIStatusError as exc:
            log.warning("Claude: errore API %s, uso il ragionamento a regole", exc.status_code)
            return None
        except a.APIConnectionError:
            log.warning("Claude: connessione non riuscita, uso il ragionamento a regole")
            return None
        if resp.stop_reason == "refusal":
            return None
        text = "".join(b.text for b in resp.content if b.type == "text").strip()
        m = _RATING_RE.search(text)
        if not m:
            return None
        rating = m.group(1).capitalize()
        return (rating, text) if rating in RATINGS else None


def make_reasoner(cfg):
    if cfg.llm_mode != "claude":
        return None
    try:
        return ClaudeReasoner(cfg.claude_model, cfg.llm_max_calls_per_day)
    except Exception as exc:  # pacchetto mancante o credenziali assenti
        log.warning("LLM_MODE=claude ma Claude non è disponibile (%s): uso le regole", exc)
        return None
