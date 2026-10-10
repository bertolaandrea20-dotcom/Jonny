# Primi risultati dell'ecosistema evolutivo (ottobre 2026)

Simulazione storica walk-forward: ogni epoca (1 settimana) è out-of-sample per gli agenti,
perché nascita, promozione, sdoppiamento e morte usano solo dati passati.

- Mercati: BTCUSDT, ETHUSDT, SOLUSDT (dati Binance), capitale reale 100 $, 20 $ per agente promosso
- Costi: fee 10 bps + slippage 5 bps per lato, funding 10%/anno su leva e short
- Leva massima 2x (limite ESMA retail per crypto), short consentiti
- 5 semi casuali diversi per ogni variante, per misurare quanto conta la fortuna
- Buy & hold = media equipesata dei 3 asset nello stesso periodo

| Variante | Periodo | Rendimento medio | Min / max sui semi | Buy & hold | Max DD medio | Fee medie |
|---|---|---|---|---|---|---|
| 1h, solo incubazione di 2 settimane | 27/09/2025 → 30/09/2026 | **−46,7%** | −52,2% / −38,3% | −32,6% | 48,7% | 28,6 $ |
| 1h + prova sul passato (60 giorni) | 27/09/2025 → 30/09/2026 | **−29,0%** | −48,0% / −19,4% | −32,6% | 36,1% | 14,7 $ |
| 4h + prova sul passato (60 giorni) | 05/10/2025 → 30/09/2026 | **−19,1%** | −32,5% / +8,7% | −40,0% | 27,8% | 11,1 $ |

## Cosa dicono i numeri

- **Il meccanismo funziona come progettato**: gli agenti senza profitto muoiono (~150 nati per
  anno, quasi tutti eliminati), quelli in profitto si sdoppiano, i soldi veri vanno solo a chi ha
  superato l'incubazione, il capitale dei morti torna in tesoreria.
- **Ma nessuna variante fa soldi in modo affidabile.** La migliore (4h) batte il buy & hold in un
  anno in cui le crypto sono scese del 40%, ma perde comunque in 4 semi su 5, e la differenza tra
  semi (da −32% a +9%) dice che il risultato dipende molto dalla fortuna.
- **Perdono tutte le famiglie di strategia, sia long sia short, su tutti e 3 gli asset** (diagnosi
  sulla variante 1h con prova sul passato). Lo stop loss è la voce di perdita principale.
- **L'evoluzione seleziona, non crea vantaggio**: se il "materiale genetico" (indicatori tecnici
  classici) non ha un vantaggio al netto dei costi, la selezione naturale non può inventarlo.
  Una selezione su finestre brevi premia chi è stato fortunato, che poi torna nella media.
- La prova sul passato alla nascita dimezza fee e perdite: va tenuta.

## Prossimi passi sensati

1. Paper trading 24/7 della variante 4h (`python -m evo.paper`) per qualche settimana, senza
   soldi veri, confrontando con questa simulazione.
2. Dare agli agenti segnali con più contenuto: gene Kronos (`python -m evo.kronos_cache`, ore di
   CPU) e gene TradingAgents (costa API LLM: da decidere con l'utente).
3. Costi più bassi (broker con commissioni minori, ordini limite) e timeframe giornaliero.
4. Validare su un secondo anno di dati prima di qualsiasi uso di soldi veri.
