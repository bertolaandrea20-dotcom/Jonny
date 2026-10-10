# Evo Trader — ecosistema di agenti di trading che sopravvivono solo se fanno profitto

Una popolazione di agenti, ognuno con il suo "DNA" di strategia e rischio, opera sugli stessi
mercati. **Chi fa profitto sopravvive e si sdoppia** (il figlio ha il DNA mutato), **chi non fa
profitto muore** e il suo capitale torna in tesoreria.

> ⚠️ Software sperimentale, non è consulenza finanziaria. I primi risultati storici sono
> negativi (vedi [docs/risultati_2026-10.md](docs/risultati_2026-10.md)): oggi serve per
> ricerca e paper trading, **non per soldi veri**.

## Bot Kraken per capitale piccolo (100-200 €)

Con poco capitale l'ecosistema di agenti perde (vedi [docs/](docs/)); la strategia che ha
retto meglio sui dati 2019-2026 è più semplice: **un paniere di 10 crypto, ogni moneta con
1/10 del capitale, comprata quando il prezzo sta sopra la sua media di 50 giorni e venduta
quando scende sotto**. Controllo ogni 4 ore, circa un trade al giorno sull'intero paniere.

```bash
pip install ccxt
cp config.kraken.example.yaml config.yaml
python -m evo.trend                 # simulazione sui prezzi reali di Kraken (nessuna chiave)
```

Per i soldi veri (solo dopo qualche settimana di simulazione):
1. Su Kraken crea una chiave API con permessi **solo** "Query funds" e "Create & modify
   orders" — **mai** "Withdraw funds".
2. Nel `.env`: `KRAKEN_API_KEY=...`, `KRAKEN_API_SECRET=...`, `CONFIRM_LIVE=yes`.
3. In `config.yaml`: `mode: live`, `broker: kraken`, `trend.capital` = quanto vuoi rischiare.

Il bot usa solo `trend.capital` e vende solo le quantità comprate da lui; un file `STOP`
nella cartella fa vendere tutto e blocca gli acquisti. Ordini limite "maker" (commissione
più bassa) con ripiego a mercato dopo 2 minuti.

**Non è una garanzia**: nel periodo testato il filtro ha comunque perso fino al 60-75% nei
crolli e le monete sono scelte tra le sopravvissute (risultati gonfiati). Molti trade al
giorno con le commissioni di Kraken portano quasi sempre a perdere (−51% / −94% nel test).

## Da dove viene

| Repository | Cosa usa Evo Trader |
|---|---|
| [awesome-systematic-trading](https://github.com/wangzhe3224/awesome-systematic-trading) | Le famiglie di strategia del DNA (trend following, breakout di Donchian, mean reversion RSI e Bollinger, momentum) e l'API broker: ib_insync, oggi `ib_async`, per Interactive Brokers |
| [Kronos](https://github.com/shiyu-coder/Kronos) | Gene opzionale "filtro Kronos": l'agente apre solo se il modello prevede un movimento nella sua direzione (cache precalcolata con `evo.kronos_cache`) |
| [TradingAgents](https://github.com/TauricResearch/TradingAgents) | Gene opzionale "filtro bias": niente long nei giorni bearish, niente short in quelli bullish (stessa cache giornaliera di `kronos-sol-bot`) |

Kronos e TradingAgents possono solo **bloccare** posizioni, mai aprirne.

## Come vive un agente

```
nascita ──► prova sul passato (60 giorni prima della nascita: deve essere in profitto)
              │ fallita → scartato, non opera mai
              ▼
         incubazione (2 settimane con soldi FINTI sui prezzi reali)
              │ senza profitto → muore
              ▼
         promosso: riceve capitale VERO dalla tesoreria (20 $)
              │ PnL delle ultime 4 settimane ≤ 0, o -20% dal capitale ricevuto → muore,
              │ il capitale torna in tesoreria
              ▼
         +5% nella finestra con almeno 3 trade → si sdoppia: nasce un figlio mutato
         (il figlio rifà prova sul passato e incubazione)
```

Il DNA contiene: famiglia e parametri della strategia, stop loss, take profit, **leva**
(con limite per strumento), short sì/no, lo strumento su cui opera (uno qualsiasi
dell'universo configurato), filtri Kronos/TradingAgents.

## Uso

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp config.example.yaml config.yaml
pytest -q

# Simulazione storica (walk-forward) con 5 semi diversi per misurare la robustezza
python -m evo.evolve --start 2025-06-17 --end 2026-10-01 --seeds 5

# Bot automatico in paper trading sui prezzi reali (stato in state/ecosystem.json)
python -m evo.paper
```

Universo: qualsiasi lista di strumenti `fonte:simbolo` in `market.instruments`
(`yahoo:` azioni, ETF, indici, forex, materie prime; `binance:` crypto; `csv:` dati esportati
dal broker), anche mescolati: ogni strumento segue i propri orari di mercato.
Se `api.binance.com` non è raggiungibile: `export BINANCE_API_BASE=https://data-api.binance.vision`.

Output della simulazione in `results/seed_N/`: `history.csv` (portafoglio per epoca),
`lineage.csv` (albero genealogico con DNA e causa di morte), `trades.csv`, `summary.json`.

## Trading automatico su Interactive Brokers

Il bot somma le posizioni di tutti gli agenti finanziati in un'unica **esposizione netta per
strumento**, la confronta con le posizioni reali sul conto e invia solo gli ordini di differenza
(a mercato, validi in giornata, in pezzi interi). Usa **solo** `initial_capital`, mai il resto
del conto.

### 1. Prima sul conto demo (obbligatorio)

1. Apri un conto IBKR e attiva il **paper trading account** (gratuito, dal Client Portal).
2. Installa **IB Gateway** (consigliato per un bot 24/7) o TWS, accedi con l'utente *paper*.
   In Configure → Settings → API: abilita "ActiveX and Socket Clients", porta **4002**,
   aggiungi 127.0.0.1 tra gli IP fidati.
3. `pip install ib_async`
4. In `config.yaml`: `mode: paper`, `broker: ibkr`, `ibkr.port: 4002`.
5. `python -m evo.paper` — gli ordini arrivano sul conto demo. Lascialo girare settimane.

### 2. Conto reale (solo dopo il demo, importi piccoli)

- `mode: live`, `ibkr.port: 4001`, nel `.env` `CONFIRM_LIVE=yes`. Il bot rifiuta combinazioni
  incoerenti (es. mode paper sulla porta del conto reale) e non parte se il conto vale meno di
  `initial_capital`.
- Usa un **conto o sotto-conto dedicato**: sugli strumenti dell'universo il bot considera sue
  tutte le posizioni che trova.
- **Freni di emergenza**: crea un file `STOP` nella cartella → il bot può solo ridurre le
  posizioni. Tetti in config: `max_order_value` per ordine, `max_gross_exposure` sul totale.

### Cose da sapere in Italia

- **Strumenti**: gli ETF americani (SPY, QQQ…) non hanno il KID UE e non si possono comprare
  da retail: l'universo di esempio usa ETF UCITS, azioni europee ed ETC.
- **Capitale**: IBKR ha una commissione minima per ordine e si comprano pezzi interi. Con
  100 € quasi ogni ordine costa più dell'1% e molti strumenti costano più di 20 €: vedi la
  simulazione in [docs/](docs/). Servono alcune migliaia di euro perché i costi pesino poco.
- **Leva**: con un conto margin, entro i limiti ESMA per i retail (configurabili per strumento).
- **Tasse**: IBKR è un broker estero in regime **dichiarativo**: plusvalenze, interessi e
  dividendi vanno dichiarati da te (quadri RT/RM/RW). Con molti trade serve un registro
  completo: parlane con un commercialista prima di partire.

## Struttura

| File | Cosa fa |
|---|---|
| `evo/config.py` | Config + doppia conferma per il live |
| `evo/genome.py` | DNA, nascita casuale, mutazione |
| `evo/signals.py` | Segnali delle 5 famiglie + filtri Kronos/TradingAgents (senza look-ahead) |
| `evo/agent.py` | Conto dell'agente: fee, slippage, leva, short, funding, SL/TP intrabar, liquidazione |
| `evo/ecosystem.py` | Regole di vita: prova sul passato, incubazione, promozione, morte, sdoppiamento |
| `evo/evolve.py` | Simulazione storica multi-seme |
| `evo/paper.py` | Bot automatico a ogni candela chiusa, riparte dallo stato salvato |
| `evo/brokers.py` | Esposizione netta per strumento, PaperBroker, IBKRBroker (ordini di differenza, tetti, kill switch) |
| `evo/data.py` | Fonti dati `binance:`, `yahoo:`, `csv:`, selezione automatica dei più scambiati |
| `evo/kronos_cache.py` | Precalcolo delle previsioni Kronos per il gene filtro |
| `evo/trend.py` | Bot di trend su paniere (Kraken o simulazione), ordini maker con ripiego a mercato |
| `evo/rules.py` | Regole di riferimento a basso turnover per confronto |
