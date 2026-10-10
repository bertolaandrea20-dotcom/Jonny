# Evo Trader — ecosistema di agenti di trading che sopravvivono solo se fanno profitto

Una popolazione di agenti, ognuno con il suo "DNA" di strategia e rischio, opera sugli stessi
mercati. **Chi fa profitto sopravvive e si sdoppia** (il figlio ha il DNA mutato), **chi non fa
profitto muore** e il suo capitale torna in tesoreria.

> ⚠️ Software sperimentale, non è consulenza finanziaria. I primi risultati storici sono
> negativi (vedi [docs/risultati_2026-10.md](docs/risultati_2026-10.md)): oggi serve per
> ricerca e paper trading, **non per soldi veri**.

## Da dove viene

| Repository | Cosa usa Evo Trader |
|---|---|
| [awesome-systematic-trading](https://github.com/wangzhe3224/awesome-systematic-trading) | Le famiglie di strategia del DNA (trend following, breakout di Donchian, mean reversion RSI e Bollinger, momentum) e le API broker di riferimento (ib_insync per IBKR, ccxt per gli exchange crypto) |
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

Il DNA contiene: famiglia e parametri della strategia, stop loss, take profit, **leva (fino a 2x)**,
short sì/no, mercato (BTC, ETH, SOL), filtri Kronos/TradingAgents.

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

Se `api.binance.com` non è raggiungibile: `export BINANCE_API_BASE=https://data-api.binance.vision`.

Output della simulazione in `results/seed_N/`: `history.csv` (portafoglio per epoca),
`lineage.csv` (albero genealogico con DNA e causa di morte), `trades.csv`, `summary.json`.

## Broker in Italia

Il bot calcola un'unica **esposizione netta per simbolo** (somma degli agenti finanziati) e la
manda al broker. Oggi esiste solo `PaperBroker`: il live è bloccato finché non si sceglie e
si testa un adapter.

| Opzione | Leva retail | Note |
|---|---|---|
| **Interactive Brokers** (`ib_async`) | Sì, limiti ESMA | Regolamentato, molto usato in Italia, conto paper gratuito. Consigliato |
| Exchange crypto con licenza UE (`ccxt`, es. Kraken) | Limitata/assente per il retail | Verificare quali derivati sono offerti ai residenti in Italia |
| MetaTrader 5 con broker UE | CFD crypto max 2:1 | Libreria Python solo su Windows |

Il live richiede **doppia conferma**: `mode: live` in `config.yaml` **e** `CONFIRM_LIVE=yes` nel `.env`.
Tasse: in Italia le plusvalenze crypto sono tassate e con molti trade serve un registro
completo — da verificare con un commercialista.

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
| `evo/brokers.py` | Esposizione netta per simbolo, PaperBroker |
| `evo/kronos_cache.py` | Precalcolo delle previsioni Kronos per il gene filtro |
