# Bot Schedine

Bot di pronostici calcistici con **regole fisse** e **soldi virtuali**. Ogni giorno analizza le
partite in arrivo, gioca al massimo una schedina da 2-3 eventi a quota ~2 e tiene il registro.
Il bankroll cresce solo se vince più del 50% delle schedine.

## Regole (modificabili in `config.json`)

| Regola | Valore |
|---|---|
| Bankroll iniziale | 50 € = 10 vite da 5 € (puntata fissa) |
| Eventi per schedina | 2-3, una sola giocata per partita |
| Quota totale | 1,90 – 2,30 |
| Probabilità stimata della schedina | ≥ 50% (sennò non si gioca) |
| Singolo evento | quota 1,18 – 1,75, probabilità ≥ 55%, valore atteso ≥ 1 |
| Mercati | 1X2, Over/Under 2.5 |
| Assenti | si scarta la squadra su cui puntiamo se ha ≥ 3 assenti (serve `API_FOOTBALL_KEY`) |
| Schedine al giorno | massimo 1 |

Le regole vanno fissate **prima** di partire: cambiarle a metà rende il tracciamento inutile.

## Come stima le probabilità

1. **Modello Poisson (Dixon-Coles)**: forza in attacco e in difesa di ogni squadra, calcolata
   sui gol delle ultime 3 stagioni. Le partite recenti pesano di più (emivita 180 giorni).
2. **Mercato**: le quote medie dei bookmaker, tolto il margine.
3. **Probabilità finale** = media pesata dei due (50/50 di default). Il backtest mostra
   come va ogni peso.

Per le coppe europee (Champions, Europa e Conference League) usa solo le quote di mercato, perché
il modello per campionato non confronta squadre di leghe diverse.

## Fonti dati

| Fonte | Cosa | Chiave |
|---|---|---|
| [football-data.co.uk](https://www.football-data.co.uk) | risultati e quote di Serie A, Serie B, Premier League, Liga, Ligue 1, Bundesliga, Eredivisie, Pro League belga, Süper Lig turca | nessuna |
| [The Odds API](https://the-odds-api.com) | quote e risultati di Champions, Europa e Conference League | `ODDS_API_KEY` (gratis, 500 crediti al mese) |
| [API-Football](https://www.api-football.com) | infortunati e squalificati | `API_FOOTBALL_KEY` (il piano gratuito potrebbe non coprire la stagione in corso) |

Le chiavi sono facoltative: senza chiavi il bot gioca solo i campionati nazionali e non applica
la regola sugli assenti. Le chiavi si inseriscono in GitHub → Settings → Secrets and variables →
Actions con i nomi `ODDS_API_KEY` e `API_FOOTBALL_KEY`.

## Come gira

- **GitHub Actions** (`.github/workflows/football-bot.yml`) gira alle 7:10 e alle 15:10 UTC.
  A ogni giro chiude le schedine finite, analizza le partite delle 36 ore successive, gioca e
  salva tutto in `data/`. Ogni lunedì rifà il backtest.
- **Dashboard**: `dashboard/index.html`, pubblicata con GitHub Pages in `/bot/`.

## Uso in locale

```bash
cd football-bot
pip install -r requirements.txt
python -m bot.run daily       # un giro
python -m bot.run backtest    # rigioca le ultime 2 stagioni
python -m pytest -q tests
```

## File in `data/`

- `ledger.json`: bankroll, schedine e storico (il registro ufficiale)
- `latest.json`: analisi dell'ultimo giro, decisione presa e stato delle fonti
- `backtest.json`: risultati delle regole sulle stagioni passate
