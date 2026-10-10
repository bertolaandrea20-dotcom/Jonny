# Backtest Kronos vs baseline — 3 periodi da 30 giorni (ottobre 2026)

Prima voce della Fase 1 in CLAUDE.md. Solo backtest in modalità paper: nessun run live, nessuno swap.

## Impostazioni

- SOL/USDT, candele 5m da Binance (mirror `data-api.binance.vision`, `BINANCE_API_BASE`), 30 giorni + 400 candele di contesto
- `config.example.yaml` con `seed: 42`; Kronos-small su CPU, 5 campioni, orizzonte 6 barre, `--step 3`
- Costi: fee 5 bps + slippage 10 bps per lato (0,30% a giro); capitale 200 $, 50% per trade
- Varianti: Kronos e baseline, ciascuno con `min_up_fraction` 0 e 0.8
- Kronos con `.eval()` (fix in `bot/forecaster.py`: prima il dropout restava attivo in inferenza)

| Periodo | `--end` | Finestra (UTC) |
|---|---|---|
| Laterale | 2026-08-18 | 2026-07-19 → 2026-08-17 |
| Rialzo | 2026-09-07 | 2026-08-08 → 2026-09-06 |
| Ribasso | 2026-06-09 | 2026-05-10 → 2026-06-08 |

Riproduzione: `python -m backtest.run_periods <nome> <end> backtest_results` (circa 2,5 h per periodo su 4 core CPU).
La variante 0.8 riusa le previsioni Kronos della variante 0: con seed fisso e una previsione per step
la sequenza è identica, quindi il risultato coincide con un run separato.

## Risultati

| Periodo | Variante | Rendimento | Buy & hold | Max DD | Trade | Win rate | Fee |
|---|---|---|---|---|---|---|---|
| Laterale | Kronos 0 | −2,90% | +0,66% | 3,13% | 30 | 30,0% | 2,95 $ |
| Laterale | Kronos 0.8 | −2,90% | +0,66% | 3,13% | 30 | 30,0% | 2,95 $ |
| Laterale | Baseline 0 / 0.8 | −3,91% | +0,66% | 4,07% | 26 | 19,2% | 2,56 $ |
| Rialzo | Kronos 0 | −6,64% | +44,59% | 6,84% | 53 | 30,2% | 5,12 $ |
| Rialzo | Kronos 0.8 | −6,36% | +44,59% | 6,56% | 52 | 30,8% | 5,04 $ |
| Rialzo | Baseline 0 / 0.8 | −10,17% ⛔ | +44,59% | 10,17% | 84 | 31,0% | 8,03 $ |
| Ribasso | Kronos 0 | −9,99% ⛔ | −28,14% | 10,28% | 78 | 28,2% | 7,42 $ |
| Ribasso | Kronos 0.8 | −9,99% ⛔ | −28,14% | 10,28% | 78 | 28,2% | 7,42 $ |
| Ribasso | Baseline 0 / 0.8 | −9,80% ⛔ | −28,14% | 10,11% | 62 | 24,2% | 5,93 $ |

⛔ = bot fermato dal risk manager per drawdown massimo (10%).

## Analisi

- **Kronos non batte il buy & hold né guadagna in nessun periodo.** Perde in tutti e tre, anche nel
  rialzo del +45%. Nel ribasso perde meno del buy & hold solo perché sta quasi sempre in USDC ed è
  stato fermato dal limite di drawdown: non è un segnale di bravura.
- **Kronos batte il baseline** in laterale e rialzo, pareggia nel ribasso: un segnale debole.
- **Margine lordo quasi nullo**: PnL medio per trade da −0,20% a −0,27% dopo i costi, cioè circa
  +0,03 / +0,10% prima dei costi, contro 0,30% di costi a giro.
- **Struttura TP/SL sfavorevole**: con TP 0,60% e SL 0,40%, al netto dei costi un trade vincente
  rende +0,30% e uno perdente perde −0,70%, quindi il pareggio richiede un win rate del 70%;
  quello osservato è 28–31%. Le uscite più frequenti sono stop loss e tempo massimo.
- **`min_up_fraction` 0.8 è quasi ininfluente** con 5 campioni: quando la media supera la soglia di
  ingresso (+45 bps) quasi sempre ≥4/5 campioni sono al rialzo (52 casi su 54 al 100% nel laterale).

## Conclusione

Con questa configurazione (5m, orizzonte 30 min, TP/SL 60/40 bps) la strategia **non supera il
criterio per passare al paper trading**. Il problema è la strategia, non il codice. Prossimi
esperimenti suggeriti, sempre con backtest su più periodi e walk-forward:

1. Timeframe 1h (orizzonte 12–24 h): movimenti grandi rispetto ai costi, meno trade
2. TP/SL con rapporto più favorevole (es. SL 1%, TP 2–3%)
3. Misurare i costi reali su Jupiter in paper (lo slippage stimato potrebbe essere prudente)
4. Usare Kronos come filtro di uscita su una posizione di base, invece che per entrare e uscire spesso
5. Leva o short solo dopo una strategia profittevole senza leva
