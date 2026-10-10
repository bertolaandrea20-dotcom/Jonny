# Primi risultati dell'ecosistema evolutivo (ottobre 2026)

Simulazione storica walk-forward: ogni epoca (1 settimana) è out-of-sample per gli agenti,
perché nascita, promozione, sdoppiamento e morte usano solo dati passati.

- Mercati: BTCUSDT, ETHUSDT, SOLUSDT (dati Binance), capitale reale 100 $, 20 $ per agente promosso
- Costi: fee 10 bps + slippage 5 bps per lato, funding 10%/anno su leva e short
- Leva massima 2x (limite ESMA retail per crypto), short consentiti
- 5 semi casuali diversi per ogni variante, per misurare quanto conta la fortuna
- Buy & hold = media equipesata dei 3 asset nello stesso periodo

| Variante | Periodo | Rendimento medio | Min / max sui semi | Buy & hold | Semi sopra il B&H | Max DD medio | Fee medie |
|---|---|---|---|---|---|---|---|
| 1h, solo incubazione di 2 settimane | 27/09/2025 → 30/09/2026 | **−38,1%** | −60,7% / −16,0% | −32,6% | 2 su 5 | 46,4% | 32,3 $ |
| 1h + prova sul passato (60 giorni) | 27/09/2025 → 30/09/2026 | **−33,3%** | −39,9% / −15,7% | −32,6% | 1 su 5 | 35,2% | 17,9 $ |
| 4h + prova sul passato (60 giorni) | 05/10/2025 → 30/09/2026 | **−19,7%** | −37,6% / −9,7% | −40,0% | 5 su 5 | 26,8% | 11,3 $ |

Nessun seme, in nessuna variante, chiude in positivo. Rilanciando con un'altra sequenza casuale
(versione precedente del codice) le medie erano −46,7%, −29,0% e −19,1%: la variabilità tra
semi è grande quanto le differenze tra varianti a 1h.

## Cosa dicono i numeri

- **Il meccanismo funziona come progettato**: gli agenti senza profitto muoiono (~150 nati per
  anno, quasi tutti eliminati), quelli in profitto si sdoppiano, i soldi veri vanno solo a chi ha
  superato l'incubazione, il capitale dei morti torna in tesoreria.
- **Nessuna variante fa soldi.** La migliore (4h) batte il buy & hold in tutti i semi in un anno
  in cui le crypto sono scese del 40%, perché sta spesso fuori mercato o short, ma perde comunque
  tra il 10% e il 38%: meglio sarebbe stato restare in contanti.
- **Perdono tutte le famiglie di strategia, sia long sia short, su tutti e 3 gli asset** (diagnosi
  sulla variante 1h con prova sul passato). Lo stop loss è la voce di perdita principale.
- **L'evoluzione seleziona, non crea vantaggio**: se il "materiale genetico" (indicatori tecnici
  classici) non ha un vantaggio al netto dei costi, la selezione naturale non può inventarlo.
  Una selezione su finestre brevi premia chi è stato fortunato, che poi torna nella media.
- La prova sul passato alla nascita dimezza le fee e riduce il drawdown: va tenuta.

## Prossimi passi sensati

1. Paper trading 24/7 della variante 4h (`python -m evo.paper`) per qualche settimana, senza
   soldi veri, confrontando con questa simulazione.
2. Dare agli agenti segnali con più contenuto: gene Kronos (`python -m evo.kronos_cache`, ore di
   CPU) e gene TradingAgents (costa API LLM: da decidere con l'utente).
3. Costi più bassi (broker con commissioni minori, ordini limite) e timeframe giornaliero.
4. Validare su un secondo anno di dati prima di qualsiasi uso di soldi veri.

## Capitale piccolo (150 €) su exchange crypto spot, candele giornaliere, 2019-2026

10 crypto con storia lunga (BTC, ETH, BNB, XRP, ADA, LTC, LINK, TRX, DOGE, XLM), fee 0,10% +
slippage 0,05% per lato, solo long, niente leva. Config: `config.crypto-small.example.yaml`.

**Ecosistema di agenti** (5 semi, 28/10/2019 → 30/09/2026): rendimento medio **−6,0%**
(da −30,4% a +32,3%) contro **+1276%** del buy & hold equipesato. Le regole di
sopravvivenza (in profitto sulle ultime 8 settimane) uccidono proprio le strategie di trend
following, che hanno lunghe fasi in perdita prima dei grandi rialzi; buona parte del capitale
resta ferma in tesoreria.

**Regole semplici** (`python -m evo.rules`, 01/01/2019 → 30/09/2026, ogni moneta 1/10 del
capitale, investita se il prezzo è sopra la sua media mobile, altrimenti in contanti):

| Regola | Totale | Annuo | Max drawdown | 2022 | 2025 |
|---|---|---|---|---|---|
| Buy & hold | +2450% | 51,9% | 82,0% | −62,1% | −17,6% |
| Sopra media 40 giorni | +3422% | 58,4% | 60,5% | −40,5% | −13,0% |
| Sopra media 50 giorni | +5233% | 67,1% | 67,8% | −41,3% | −13,6% |
| Sopra media 60 giorni | +3153% | 56,8% | 75,5% | −38,9% | −8,7% |
| Sopra media 100 giorni | +1787% | 46,1% | 81,4% | −44,8% | −12,9% |
| Sopra media 200 giorni | +989% | 36,1% | 78,3% | −24,8% | −45,1% |

- Con medie tra 40 e 75 giorni il filtro di trend fa circa come o meglio del buy & hold con
  drawdown più bassi; con costi doppi la media 50 resta sopra (+4062%). 50 è il picco: in
  pratica conta l'intervallo, non il numero esatto.
- **Attenzione**: le 10 monete sono scelte oggi tra quelle sopravvissute (bias di
  sopravvivenza, gonfia tutti i risultati) e anche il filtro ha perso fino al 60-75% nei crolli.

## Kraken, 200 €: frequenza dei trade e commissioni (2019-2026)

Stesso paniere con SOL al posto di BNB (non quotata su Kraken), dati Binance come
approssimazione dei prezzi, commissioni Kraken: ordini limite 0,25% o a mercato 0,40%
per lato, più 0,05% di slippage.

| Strategia | Trade/anno (paniere) | Ordini limite | Ordini a mercato |
|---|---|---|---|
| Giornaliera, media 50 giorni | ~220 | +3242% (DD 75%) | +2611% |
| Ogni 4h, media 50 giorni (config Kraken) | ~500 | +2453% (DD 76%) | +1516% |
| Buy & hold | 1 | +1548% (DD 86%) | +1546% |
| Ogni 4h, media 5 giorni ("tanti trade") | ~2000 | **−51%** | **−94%** |
