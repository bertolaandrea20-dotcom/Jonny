# Kronos SOL Bot

Bot di trading intraday su **Solana (SOL/USDC)** che usa le previsioni di
[Kronos](https://github.com/shiyu-coder/Kronos) per decidere quando entrare e uscire,
esegue gli swap tramite **Jupiter** e si controlla da **Telegram**.

> ⚠️ Software sperimentale. Non è consulenza finanziaria. Il trading ad alta frequenza
> con piccolo capitale è molto difficile da rendere profittevole: le commissioni e lo
> slippage pesano su ogni trade. Usa solo soldi che puoi permetterti di perdere.

## Come funziona

```
Binance (candele 5m) ──► Kronos (previsione 30 min) ──► Strategia (BUY/SELL/HOLD)
                                                              │
                         Telegram ◄── notifiche ── Risk manager (limiti, kill switch)
                                                              │
                                     Paper (simulato)  oppure  Jupiter (swap reali)
```

- **Solo spot long**: il bot o detiene SOL o sta in USDC. Niente leva, niente short.
- **Entra** solo se il rendimento previsto supera i costi del giro completo + un margine.
- **Esce** per take profit, stop loss, tempo massimo o previsione girata. Con
  `intrabar_stops: true` stop loss e take profit vengono controllati sul prezzo ogni 5 secondi
  nel live e su high/low di ogni candela nel backtest.
- **Filtro di confidenza** (opzionale, `min_up_fraction`): entra solo se una quota minima dei
  campioni Kronos prevede un rialzo.
- **Lo stesso motore** (`bot/engine.py`) gira nel backtest, in paper e in live: quello che
  vedi nel backtest è la stessa logica che userà il bot.

## Struttura

| File | Cosa fa |
|---|---|
| `bot/config.py` | Carica `config.yaml` + segreti da `.env`, blocca il live senza doppia conferma |
| `bot/data.py` | Scarica candele OHLCV da Binance (pubblico, senza chiavi) |
| `bot/forecaster.py` | Wrapper Kronos + previsore baseline per confronto |
| `bot/strategy.py` | Regole di ingresso/uscita |
| `bot/risk.py` | Dimensione posizione, limiti giornalieri, drawdown, kill switch |
| `bot/executor.py` | Fill simulati (paper) e swap reali Jupiter (live) |
| `bot/engine.py` | Unisce tutto: una chiamata per ogni candela chiusa |
| `bot/telegram_ui.py` | Notifiche e comandi `/status /pause /resume /stop` |
| `bot/bias.py` | Filtro giornaliero TradingAgents con cache |
| `bot/main.py` | Loop 24/7 |
| `backtest/run_backtest.py` | Backtest walk-forward, confronto Kronos vs baseline, con/senza filtro |
| `backtest/precompute_bias.py` | Precalcola il bias storico per il backtest |

## Setup

Serve Python 3.10+ (Kronos lo richiede).

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Kronos non è un pacchetto pip: si clona nella cartella vendor
git clone https://github.com/shiyu-coder/Kronos vendor/Kronos
pip install -r vendor/Kronos/requirements.txt

cp config.example.yaml config.yaml
cp .env.example .env
pytest -q
```

I pesi del modello vengono scaricati automaticamente da Hugging Face al primo avvio.

## Le tre fasi (non saltarle)

### 1. Backtest

```bash
# Confronta Kronos con il baseline su 30 giorni di SOL 5m
python -m backtest.run_backtest --days 30 --compare --step 3
```

Kronos su CPU è lento: `--step 3` interroga il modello ogni 3 candele. Con una GPU
(`device: cuda`) puoi usare `--step 1`.

**Criterio per andare avanti**: Kronos deve battere sia il baseline sia il buy & hold,
al netto dei costi, su più periodi diversi (mercato in salita, in discesa, laterale).
Se non succede, il problema è la strategia, non il codice: si cambiano parametri,
timeframe o regole e si ripete. Attenzione a non ottimizzare troppo su un solo periodo.

### 2. Paper trading (almeno 2-4 settimane)

```bash
python -m bot.main --config config.yaml     # mode: paper
```

Prezzi reali, soldi finti. Confronta i risultati con quelli del backtest sullo stesso periodo.

### 3. Live (importi minimi)

1. Crea un **wallet nuovo dedicato** (non il tuo Phantom principale), mettici poco capitale
   + 0,05 SOL per le fee. Puoi importarne la chiave in Phantom solo per guardarlo.
2. Usa un RPC serio (Helius, QuickNode, Triton): quello pubblico è inaffidabile.
3. **Verifica gli endpoint Jupiter** sulla documentazione attuale (https://dev.jup.ag) e
   testa `JupiterExecutor` con uno swap da pochi dollari.
4. In `config.yaml` metti `mode: live`, in `.env` metti `CONFIRM_LIVE=yes`.

## Filtro giornaliero TradingAgents (opzionale)

[TradingAgents](https://github.com/TauricResearch/TradingAgents) è un sistema di agenti LLM
(analisti, ricercatori rialzisti e ribassisti, trader, risk manager) che analizza notizie,
sentiment, macro e tecnica. È troppo lento e costoso per decidere ogni 5 minuti, quindi lo
usiamo **una volta al giorno** per dare un orientamento: `bullish`, `neutral` o `bearish`.

- Il bias **non apre mai trade**: può solo bloccare le aperture di Kronos
  (`policy: block_bearish` o `only_bullish`) e, se vuoi, chiudere la posizione nei giorni
  bearish (`exit_on_bearish: true`).
- **Anti look-ahead**: il bias del giorno D usa l'analisi con data D-1.
- Il risultato viene salvato in `bias_cache.json`: un solo run al giorno, anche dopo riavvii.
- Se TradingAgents fallisce, si usa `fallback` (`neutral` oppure `bearish` per essere prudenti).
- Nel bot live il calcolo avviene nell'attesa tra una candela e l'altra.

Setup:

```bash
git clone https://github.com/TauricResearch/TradingAgents vendor/TradingAgents
pip install ./vendor/TradingAgents
# chiave del provider LLM nel .env, poi in config.yaml: bias.enabled: true
```

Backtest con il filtro (il backtest legge solo la cache, non chiama mai gli LLM):

```bash
# 1. Precalcola il bias per il periodo (COSTA: un run completo di TradingAgents per giorno)
python -m backtest.precompute_bias --start 2026-09-01 --end 2026-09-30

# 2. Confronta lo stesso periodo con e senza filtro
python -m backtest.run_backtest --days 30 --step 3 --bias both
```

Il filtro va tenuto solo se migliora rendimento o drawdown **in modo consistente** su più
periodi. Con pochi giorni di storico il confronto è statisticamente debole.

## Sicurezza

- Crea un file `STOP` nella cartella del bot per bloccare nuove aperture.
- `/stop` da Telegram chiude la posizione e ferma il bot.
- Il bot si ferma da solo con: perdita giornaliera oltre il limite, drawdown massimo,
  troppi errori consecutivi.
- Prima di ogni swap live, il prezzo di Jupiter viene confrontato con il feed: se devia
  troppo, il trade viene annullato.
- `.env` e `config.yaml` sono nel `.gitignore`. Non condividere mai la chiave privata.

## Deploy 24/7

Un VPS economico basta (2 vCPU, 4 GB RAM per Kronos-small su CPU con candele 5m).
Esempio con systemd:

```ini
[Unit]
Description=Kronos SOL Bot
After=network-online.target

[Service]
WorkingDirectory=/home/bot/kronos-sol-bot
ExecStart=/home/bot/kronos-sol-bot/.venv/bin/python -m bot.main --config config.yaml
Restart=on-failure
RestartSec=30

[Install]
WantedBy=multi-user.target
```

## Limiti noti

- `JupiterExecutor` non è ancora testato contro la mainnet.
- Nel backtest, se una candela tocca sia stop loss sia take profit, si assume lo stop
  (con solo OHLC non si sa quale sia arrivato prima): stima prudente.
- Le fee di rete Solana e la priority fee non sono incluse in `costs`: con ordini piccoli pesano
  qualche bps per lato.
- Il feed prezzi è Binance; lo swap avviene su DEX, quindi c'è una piccola differenza di prezzo.
- Dopo uno swap live la quantità non viene ancora riconciliata con il saldo on-chain.
