"""Poisson team-strength model (Maher / Dixon-Coles) with time decay and shrinkage.

Expected goals:  home = base * home_adv * att[home] * def[away]
                 away = base *            att[away] * def[home]
Ratings are fitted by weighted maximum likelihood (iterative proportional fitting),
shrunk toward the league average for teams with few matches (e.g. newly promoted).
"""
import math

import numpy as np

MAX_GOALS = 10


class LeagueModel:
    def __init__(self, matches, as_of, half_life_days=180, shrinkage_matches=4, rho=-0.08, iterations=60):
        self.rho = rho
        self.as_of = as_of
        played = [m for m in matches if m.played and m.kickoff < as_of]
        self.teams = sorted({m.home for m in played} | {m.away for m in played})
        idx = {t: i for i, t in enumerate(self.teams)}
        n = len(self.teams)
        self.n_matches = np.zeros(n)
        if not played:
            self.att, self.dfn = np.ones(n), np.ones(n)
            self.base, self.home_adv = 1.3, 1.2
            self.idx = idx
            return

        h = np.array([idx[m.home] for m in played])
        a = np.array([idx[m.away] for m in played])
        hg = np.array([m.home_goals for m in played], float)
        ag = np.array([m.away_goals for m in played], float)
        age = np.array([(as_of - m.kickoff).total_seconds() / 86400 for m in played])
        w = 0.5 ** (age / half_life_days)
        np.add.at(self.n_matches, h, 1)
        np.add.at(self.n_matches, a, 1)

        att, dfn = np.ones(n), np.ones(n)
        base = (np.sum(w * (hg + ag)) / (2 * np.sum(w)))
        home_adv = max(np.sum(w * hg) / max(np.sum(w * ag), 1e-9), 1.0)
        k = shrinkage_matches
        for _ in range(iterations):
            lam_h = base * home_adv * att[h] * dfn[a]
            lam_a = base * att[a] * dfn[h]
            # attack: goals scored / expected goals scored (with att=1)
            scored = np.zeros(n); exp_s = np.zeros(n)
            np.add.at(scored, h, w * hg); np.add.at(exp_s, h, w * lam_h / att[h])
            np.add.at(scored, a, w * ag); np.add.at(exp_s, a, w * lam_a / att[a])
            att = (scored + k * base) / (exp_s + k * base)
            att /= np.exp(np.mean(np.log(att)))
            lam_h = base * home_adv * att[h] * dfn[a]
            lam_a = base * att[a] * dfn[h]
            conceded = np.zeros(n); exp_c = np.zeros(n)
            np.add.at(conceded, a, w * hg); np.add.at(exp_c, a, w * lam_h / dfn[a])
            np.add.at(conceded, h, w * ag); np.add.at(exp_c, h, w * lam_a / dfn[h])
            dfn = (conceded + k * base) / (exp_c + k * base)
            dfn /= np.exp(np.mean(np.log(dfn)))
            lam_h = base * home_adv * att[h] * dfn[a]
            lam_a = base * att[a] * dfn[h]
            home_adv = np.sum(w * hg) / np.sum(w * lam_h / home_adv)
            base = np.sum(w * (hg + ag)) / np.sum(w * (lam_h / base + lam_a / base))
        self.att, self.dfn, self.base, self.home_adv, self.idx = att, dfn, base, home_adv, idx

    def knows(self, team, min_matches=0):
        return team in self.idx and self.n_matches[self.idx[team]] >= min_matches

    def expected_goals(self, home, away):
        ah = self.att[self.idx[home]] if home in self.idx else 0.85
        dh = self.dfn[self.idx[home]] if home in self.idx else 1.15
        aa = self.att[self.idx[away]] if away in self.idx else 0.85
        da = self.dfn[self.idx[away]] if away in self.idx else 1.15
        return self.base * self.home_adv * ah * da, self.base * aa * dh

    def probabilities(self, home, away):
        lh, la = self.expected_goals(home, away)
        g = np.arange(MAX_GOALS + 1)
        fact = np.array([math.factorial(i) for i in g], float)
        ph = np.exp(-lh) * lh ** g / fact
        pa = np.exp(-la) * la ** g / fact
        m = np.outer(ph, pa)
        r = self.rho
        m[0, 0] *= 1 - lh * la * r
        m[0, 1] *= 1 + lh * r
        m[1, 0] *= 1 + la * r
        m[1, 1] *= 1 - r
        m /= m.sum()
        tot = np.add.outer(g, g)
        return {
            "1": float(np.tril(m, -1).sum()),
            "X": float(np.trace(m)),
            "2": float(np.triu(m, 1).sum()),
            "O25": float(m[tot >= 3].sum()),
            "U25": float(m[tot <= 2].sum()),
            "xg_home": float(lh),
            "xg_away": float(la),
        }


def market_probs(odds):
    """Bookmaker margin removed proportionally within each market."""
    out = {}
    if all(k in odds for k in ("1", "X", "2")):
        s = sum(1 / odds[k] for k in ("1", "X", "2"))
        out.update({k: (1 / odds[k]) / s for k in ("1", "X", "2")})
    if "O25" in odds and "U25" in odds:
        s = 1 / odds["O25"] + 1 / odds["U25"]
        out.update({"O25": (1 / odds["O25"]) / s, "U25": (1 / odds["U25"]) / s})
    return out


def blend(model_p, market_p, weight):
    """Weighted mix of model and margin-free market probability per outcome."""
    out = {}
    for k in ("1", "X", "2", "O25", "U25"):
        if k in model_p and k in market_p:
            out[k] = weight * model_p[k] + (1 - weight) * market_p[k]
        elif k in market_p:
            out[k] = market_p[k]
    return out
