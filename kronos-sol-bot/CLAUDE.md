# Istruzioni per Claude Code

Progetto: bot di trading intraday SOL/USDC su Solana guidato dalle previsioni di Kronos
(github.com/shiyu-coder/Kronos). Leggi README.md per l'architettura.

## Regole non negoziabili

- **Mai** rendere `live` il default, né aggirare la doppia conferma (`mode: live` + `CONFIRM_LIVE=yes`).
- **Mai** leggere, stampare, loggare o committare `.env` o la chiave privata.
- **Mai** eseguire il bot in live o fare swap reali senza che l'utente lo chieda esplicitamente in quel momento.
- Le decisioni di trading le prende codice deterministico (`strategy.py` + `risk.py`), non un LLM a runtime.
- Le uscite (SELL) non devono mai essere bloccate dal risk manager.
- Ogni modifica a strategia/rischio/esecuzione va accompagnata da test, e `pytest -q` deve passare.
- Backtest e bot live devono usare lo stesso `Engine`: non duplicare la logica.
- Il filtro TradingAgents (`bot/bias.py`) può solo bloccare aperture o forzare uscite, mai aprire trade.
- Il backtest non deve mai chiamare gli LLM: legge solo `bias_cache.json`.
- Non lanciare `precompute_bias` su molti giorni senza chiedere all'utente: ha un costo in API LLM.

## Comandi

```bash
pytest -q
python -m backtest.run_backtest --days 30 --compare --step 3
python -m bot.main --config config.yaml
```

## Roadmap

### Fase 1 — Validazione (ora)
- [x] Verificata l'API di Kronos (commit 67b630e): `predict` media i campioni internamente,
      quindi `bot/forecaster.py` replica la normalizzazione e chiama `generate` con un campione
      per riga del batch. Da riverificare se si aggiorna `vendor/Kronos`.
- [x] Backtest Kronos vs baseline su almeno 3 periodi diversi da 30 giorni
      (`docs/backtest_2026-10.md`: Kronos perde in tutti e 3, batte solo il baseline; strategia da rivedere)
- [ ] Provare timeframe 1m / 5m / 15m e orizzonti diversi
- [x] Stop loss/take profit intrabar (high/low nel backtest, prezzo ogni 5s nel live)
- [x] Filtro di confidenza sui campioni Kronos (`strategy.min_up_fraction`)
- [ ] Testare `KronosForecaster` con i pesi veri (i test usano un predictor finto)
- [ ] Walk-forward per i parametri: ottimizza su un periodo, valuta sul successivo

- [ ] Filtro TradingAgents: installare in `vendor/TradingAgents`, verificare il formato
      reale della decisione finale (BUY/HOLD/SELL o scala a 5 livelli) e che `parse_decision` lo legga
- [ ] Precalcolare il bias su un periodo breve (es. 7 giorni) e misurare costo e tempo per run
- [ ] Backtest `--bias both`: tenere il filtro solo se migliora in modo consistente

### Fase 2 — Paper trading
- [ ] Deploy su VPS con systemd
- [ ] Report giornaliero automatico su Telegram
- [ ] Confronto settimanale paper vs backtest sullo stesso periodo

### Fase 3 — Live minimo
- [ ] Verificare endpoint e parametri Jupiter sulla doc attuale (https://dev.jup.ag)
- [ ] Riconciliare la quantità con il saldo on-chain dopo ogni swap
- [ ] Al riavvio, verificare che la posizione in `state.json` corrisponda al wallet
- [ ] Test end-to-end con swap da pochi dollari

### Più avanti (opzionale)
- [ ] Adapter MetaTrader 5 per azioni/CFD (libreria Python MT5, solo Windows)
- [ ] Più coppie in parallelo
