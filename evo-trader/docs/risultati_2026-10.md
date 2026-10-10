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
