# Stato del backtest — non eseguito

**Data controllo:** 2026-10-11 (sessione cloud Claude Code)

Il backtest su prezzi storici reali **non è stato lanciato**: la verifica di rete del punto 1 è fallita per entrambe le sorgenti dati. Come richiesto, non sono stati usati dati sintetici o inventati.

| Host | Richiesta di prova | Codice HTTP | Risposta |
|---|---|---|---|
| `api.binance.com` | `/api/v3/time` | **451** | "Service unavailable from a restricted location according to 'b. Eligibility' in https://www.binance.com/en/terms" |
| `query1.finance.yahoo.com` | `/v8/finance/chart/ENI.MI?interval=1h&range=5d` | **429** | "Edge: Too Many Requests" |

## Interpretazione

- **Binance (451)**: blocco geografico. L'IP di uscita del container cloud si trova in una giurisdizione che Binance esclude. Non è un problema del proxy (che inoltra la richiesta correttamente) né del codice. Riprovare dallo stesso ambiente non servirà.
- **Yahoo Finance (429)**: limite di richieste. Yahoo limita spesso gli IP condivisi dei data center. Il blocco potrebbe essere temporaneo, ma non c'è garanzia.

## Come sbloccare

1. Lanciare il backtest **in locale** (da una connessione domestica, in un paese dove Binance è disponibile):
   ```bash
   cd trading-city
   pip install -r requirements.txt ccxt yfinance
   for N in 1 2 3 4 5; do
     python backtest.py --start 2025-10-01 --end 2026-10-01 --seed $N --out backtest-results --env none
   done
   ```
   Poi fare commit di `backtest-results/*.html`, `*.json` e del riepilogo.
2. In alternativa, si può adattare il caricatore crypto a un exchange raggiungibile dal cloud (via ccxt, per esempio `binanceus`, `kraken` o `bybit`). Bisogna prima verificare che l'host risponda 200. Questo cambierebbe però la sorgente dei prezzi rispetto a quella richiesta.
