# Taratura del backtest (dati reali)

Dati: prezzi orari reali. Crypto da Bitstamp (BTC, ETH, SOL in EUR); azioni da Yahoo Finance (ENI, Intesa, UniCredit, Stellantis, Ferrari). Commissioni 0,26% per lato.
Metodo: taratura su **ottobre 2025 – marzo 2026** (3 semi), verifica finale su **aprile – settembre 2026** (5 semi), un periodo mai usato per tarare.

## Diagnosi (configurazione base, taratura, seme 1)
| Voce | € |
|---|---|
| Commissioni (5.906 operazioni) | −1.729 |
| Uscite da stop loss (329) | −1.865 |
| Vendite forzate alla morte degli agenti | −649 |
| Vendite decise dal ragionamento | +893 |

## Taratura: ottobre 2025 – marzo 2026 (buy & hold −23,7%)
| Configurazione | Città (media 3 semi) | Operazioni | Commissioni € |
|---|---|---|---|
| base | −20,7% | 5.303 | 1.528 |
| stop ≥3%, obiettivo ≥5% | −21,1% | 4.967 | 1.412 |
| ragiona ogni 6 h, tiene ≥24 h | −20,2% | 4.119 | 1.212 |
| filtro tendenza 200 h | −8,4% | 2.593 | 686 |
| ordini ≥100 € | −12,9% | 2.520 | 1.074 |
| soglia ingresso ≥0,35 | −16,4% | 4.032 | 1.227 |
| T200 + O100 + S0,35 | −10,0% | 1.159 | 481 |
| T200 + O100 + S0,35 + lento | −4,9% | 914 | 360 |
| T200 + O250 + S0,35 | −4,2% | 360 | 237 |
| T500 + O100 + S0,35 | −6,8% | 999 | 475 |
| T200 + O250 + S0,35 + lento | −2,7% | 361 | 223 |
| T200 + O250 + S0,45 | −2,7% | 311 | 199 |
| T200 + O500 + S0,35 | −0,03% (quasi nessuna operazione) | 1 | 1 |

## Verifica: aprile – settembre 2026 (buy & hold +16,6%)
| Configurazione | Città (media 5 semi) | Intervallo | Operazioni | Commissioni € |
|---|---|---|---|---|
| base | −13,8% | −19,6% … −8,5% | 4.969 | 1.277 |
| T200 + O250 + S0,35 + lento | −3,2% | −4,7% … −1,9% | 397 | 269 |
| T200 + O250 + S0,45 | −1,3% | −3,0% … +2,0% | 342 | 191 |

## Conclusione
Le leve riducono molto le perdite (da −14/−21% a −1/−3%), ma nessuna configurazione è in profitto in modo stabile, nemmeno in un semestre in cui il mercato sale del 16,6%. Il ragionamento basato solo sui grafici orari, con selezione ogni 3 giorni, non mostra un vantaggio netto dopo le commissioni.

Parametri (env o `--set` in backtest.py): `TREND_FILTER_HOURS`, `MIN_ORDER_EUR`, `MIN_ENTRY_THRESHOLD`, `DELIBERATE_EVERY`, `MIN_HOLD_HOURS`, `MIN_STOP_LOSS`, `MIN_TAKE_PROFIT`.

---

# Secondo giro: candele giornaliere e giudizio rispetto al mercato

Novità nel motore:
- `BAR_HOURS=24` + `DELIBERATE_EVERY=24`: gli agenti ragionano su candele giornaliere, una volta al giorno (stop loss e obiettivi restano controllati ogni ora).
- `JUDGE_VS_MARKET=1`: al giudizio sopravvive chi, nei suoi 3 giorni, fa meglio dei mercati che segue presi in parti uguali (non basta chiudere in positivo, e perdere meno del mercato quando scende vale come vincere).
- Il backtest ora scarica lo storico anche prima della data di inizio, per scaldare gli indicatori: il primo giorno simulato coincide con `--start`. Per questo le cifre del primo giro non sono confrontabili al decimale.

Sigle: P = filtro tendenza 200 h + ordini ≥250 € + soglia 0,45 (la migliore del primo giro); D = candele giornaliere.

## Taratura: ottobre 2025 – marzo 2026 (buy & hold −21,0%), 3 semi
| Configurazione | Città | Intervallo | Operazioni | Commissioni € |
|---|---|---|---|---|
| P | −5,8% | −8,9% … −2,1% | 471 | 310 |
| P + vs mercato | −1,4% | −3,0% … +0,1% | 103 | 71 |
| D + P | −1,6% | −4,7% … −0,1% | 129 | 81 |
| D + P + vs mercato | −0,2% | −0,4% … 0,0% | 9 | 7 |
| D + vs mercato + T480 O250 S0,45 | +0,07% | −0,1% … +0,3% | 9 | 6 |
| D + vs mercato + T200 O100 S0,35 | −0,5% | −0,7% … −0,2% | 110 | 40 |
| solo vs mercato | −9,8% | −10,8% … −9,2% | 5.158 | 617 |

## Verifica: aprile – settembre 2026 (buy & hold +20,8%), 5 semi
| Configurazione | Città | Intervallo | Operazioni | Commissioni € |
|---|---|---|---|---|
| base | −11,9% | −15,6% … −8,9% | 5.714 | 1.287 |
| P | −2,9% | −6,5% … −0,4% | 560 | 351 |
| D + P | −0,8% | −2,5% … +0,3% | 121 | 72 |
| D + P + vs mercato | −0,01% | −0,2% … +0,1% | 8 | 7 |
| D + vs mercato + T480 O250 S0,45 | +0,11% | −0,2% … +0,6% | 9 | 8 |
| **D + vs mercato + T200 O100 S0,35** | **+0,35%** | −1,0% … +1,9% | 138 | 56 |

## Anno intero: ottobre 2025 – settembre 2026 (buy & hold −6,1%), 5 semi
| Configurazione | Città | Intervallo | Operazioni | Commissioni € |
|---|---|---|---|---|
| base | −25,3% | −28,8% … −22,0% | 9.605 | 1.992 |
| D + vs mercato + T200 O100 S0,35 | −0,6% | −0,9% … −0,4% | 209 | 82 |
| D + vs mercato + T480 O250 S0,45 | +0,06% | −0,1% … +0,6% | 16 | 11 |

## Conclusione del secondo giro
Le perdite sono passate da circa −25% l'anno a circa zero, e nel semestre di verifica la configurazione più attiva chiude leggermente in positivo (+0,35% medio). Ma ci arriva soprattutto **operando pochissimo**: la città ha imparato a non perdere, non a guadagnare. Nel semestre in cui il mercato sale del 20,8% resta quasi tutta in contanti. Un guadagno vero richiede agenti con un vantaggio informativo reale.
