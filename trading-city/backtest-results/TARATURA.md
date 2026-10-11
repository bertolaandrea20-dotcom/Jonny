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
