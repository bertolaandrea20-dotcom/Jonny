"""Esecuzione ordini.

- PaperExecutor: simula i fill con fee e slippage (usato in paper e nel backtest).
- JupiterExecutor: swap reali USDC <-> SOL su Solana tramite l'API di Jupiter.

ATTENZIONE: JupiterExecutor NON è ancora stato testato contro la mainnet.
Prima di usarlo verifica gli endpoint e i parametri sulla documentazione attuale
di Jupiter (https://dev.jup.ag) e provalo con importi minimi.
"""
from __future__ import annotations

import base64
import logging
import time
from dataclasses import dataclass

import requests

from .config import Config

log = logging.getLogger(__name__)

USDC_DECIMALS = 6
SOL_DECIMALS = 9


@dataclass
class Fill:
    side: str          # BUY | SELL
    price: float       # prezzo effettivo USD per SOL
    qty_sol: float
    usd: float         # BUY: USD spesi (fee incluse) / SELL: USD incassati (al netto fee)
    fee_usd: float
    tx: str = ""


class PaperExecutor:
    def __init__(self, cfg: Config):
        self.fee = cfg.costs.fee_bps / 1e4
        self.slip = cfg.costs.slippage_bps / 1e4

    def buy(self, usd: float, ref_price: float) -> Fill:
        price = ref_price * (1 + self.slip)
        fee = usd * self.fee
        qty = (usd - fee) / price
        return Fill("BUY", price, qty, usd, fee, "paper")

    def sell(self, qty_sol: float, ref_price: float) -> Fill:
        price = ref_price * (1 - self.slip)
        gross = qty_sol * price
        fee = gross * self.fee
        return Fill("SELL", price, qty_sol, gross - fee, fee, "paper")


class PriceDeviationError(RuntimeError):
    pass


class JupiterExecutor:
    def __init__(self, cfg: Config):
        from solders.keypair import Keypair  # import qui: serve solo in live

        self.cfg = cfg
        self.j = cfg.jupiter
        self.rpc = cfg.secrets.rpc_url
        self.kp = Keypair.from_base58_string(cfg.secrets.private_key)
        self.pubkey = str(self.kp.pubkey())
        self.headers = {"Content-Type": "application/json"}
        if cfg.secrets.jupiter_api_key:
            self.headers["x-api-key"] = cfg.secrets.jupiter_api_key
        self.fee_bps = cfg.costs.fee_bps
        log.info("JupiterExecutor pronto, wallet %s", self.pubkey)

    # ---------- RPC ----------
    def _rpc(self, method: str, params: list):
        r = requests.post(self.rpc, json={"jsonrpc": "2.0", "id": 1,
                                          "method": method, "params": params}, timeout=20)
        r.raise_for_status()
        data = r.json()
        if "error" in data:
            raise RuntimeError(f"RPC {method}: {data['error']}")
        return data["result"]

    def sol_balance(self) -> float:
        return self._rpc("getBalance", [self.pubkey])["value"] / 10**SOL_DECIMALS

    # ---------- Jupiter ----------
    def _quote(self, input_mint: str, output_mint: str, amount: int) -> dict:
        params = {"inputMint": input_mint, "outputMint": output_mint,
                  "amount": str(amount), "slippageBps": self.j.slippage_bps}
        r = requests.get(self.j.quote_url, params=params, headers=self.headers, timeout=15)
        r.raise_for_status()
        return r.json()

    def _swap(self, quote: dict) -> str:
        body = {
            "quoteResponse": quote,
            "userPublicKey": self.pubkey,
            "wrapAndUnwrapSol": True,
            "dynamicComputeUnitLimit": True,
            # Formato da verificare sulla doc corrente di Jupiter:
            "prioritizationFeeLamports": {"priorityLevelWithMaxLamports": {
                "maxLamports": self.j.priority_fee_max_lamports, "priorityLevel": "high"}},
        }
        r = requests.post(self.j.swap_url, json=body, headers=self.headers, timeout=20)
        r.raise_for_status()
        return r.json()["swapTransaction"]

    def _sign_and_send(self, swap_tx_b64: str) -> str:
        from solders.transaction import VersionedTransaction

        raw = VersionedTransaction.from_bytes(base64.b64decode(swap_tx_b64))
        signed = VersionedTransaction(raw.message, [self.kp])
        encoded = base64.b64encode(bytes(signed)).decode()
        sig = self._rpc("sendTransaction", [encoded, {
            "encoding": "base64", "skipPreflight": False, "maxRetries": 3}])
        self._confirm(sig)
        return sig

    def _confirm(self, sig: str) -> None:
        deadline = time.time() + self.j.confirm_timeout_s
        while time.time() < deadline:
            st = self._rpc("getSignatureStatuses", [[sig], {"searchTransactionHistory": True}])
            s = st["value"][0]
            if s:
                if s.get("err"):
                    raise RuntimeError(f"Transazione fallita {sig}: {s['err']}")
                if s.get("confirmationStatus") in ("confirmed", "finalized"):
                    return
            time.sleep(2)
        raise TimeoutError(f"Transazione non confermata in tempo: {sig}")

    def _check_price(self, quote_price: float, ref_price: float) -> None:
        dev = abs(quote_price / ref_price - 1) * 1e4
        if dev > self.j.max_price_deviation_bps:
            raise PriceDeviationError(
                f"Quote Jupiter {quote_price:.4f} devia {dev:.0f}bps dal feed {ref_price:.4f}")

    # ---------- API pubblica ----------
    def buy(self, usd: float, ref_price: float) -> Fill:
        m = self.cfg.market
        amount = int(usd * 10**USDC_DECIMALS)
        quote = self._quote(m.usdc_mint, m.sol_mint, amount)
        qty = int(quote["outAmount"]) / 10**SOL_DECIMALS
        price = usd / qty
        self._check_price(price, ref_price)
        sig = self._sign_and_send(self._swap(quote))
        # TODO: riconciliare qty con il saldo on-chain effettivo dopo lo swap.
        return Fill("BUY", price, qty, usd, usd * self.fee_bps / 1e4, sig)

    def sell(self, qty_sol: float, ref_price: float) -> Fill:
        m = self.cfg.market
        available = self.sol_balance() - self.cfg.risk.min_sol_reserve
        qty = min(qty_sol, available)
        if qty <= 0:
            raise RuntimeError("Saldo SOL insufficiente oltre la riserva per le fee")
        amount = int(qty * 10**SOL_DECIMALS)
        quote = self._quote(m.sol_mint, m.usdc_mint, amount)
        usd = int(quote["outAmount"]) / 10**USDC_DECIMALS
        price = usd / qty
        self._check_price(price, ref_price)
        sig = self._sign_and_send(self._swap(quote))
        return Fill("SELL", price, qty, usd, usd * self.fee_bps / 1e4, sig)


def make_executor(cfg: Config):
    return JupiterExecutor(cfg) if cfg.is_live else PaperExecutor(cfg)
