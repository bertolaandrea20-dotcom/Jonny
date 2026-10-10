# Istruzioni per Claude Code

Progetto: ecosistema evolutivo di agenti di trading (vedi README.md). Gli agenti sopravvivono
solo se fanno profitto, si sdoppiano se guadagnano, muoiono se non guadagnano.

## Regole non negoziabili

- **Mai** rendere `live` il default né aggirare la doppia conferma (`mode: live` + `CONFIRM_LIVE=yes`).
- **Mai** leggere, stampare, loggare o committare `.env` o chiavi del broker.
- **Mai** inviare ordini reali senza che l'utente lo chieda esplicitamente in quel momento.
- Gli agenti in incubazione (shadow) non muovono mai soldi veri: il capitale reale passa solo
  da tesoreria ad agenti promossi e ritorna in tesoreria quando muoiono.
- Le decisioni di vita (nascita, promozione, morte, sdoppiamento) usano solo dati passati.
- Simulazione storica e bot paper usano lo stesso `Ecosystem`/`Agent`: non duplicare la logica.
- Kronos e TradingAgents possono solo bloccare posizioni, mai aprirle. La simulazione legge
  solo le loro cache: niente chiamate a modelli o LLM.
- Non lanciare `kronos_cache` su periodi lunghi (ore di CPU) né calcoli di TradingAgents
  (costo API LLM) senza chiedere all'utente.
- Ogni modifica a regole, conto o segnali va accompagnata da test; `pytest -q` deve passare.
- Valutare sempre su più semi (`--seeds 5`) e confrontare con il buy & hold; non ottimizzare
  i parametri sullo stesso periodo su cui si giudica.

## Comandi

```bash
pytest -q
python -m evo.evolve --start 2025-06-17 --end 2026-10-01 --seeds 5
python -m evo.paper --once
```
