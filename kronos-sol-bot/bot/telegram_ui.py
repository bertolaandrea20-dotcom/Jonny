"""Telegram come pannello di controllo: notifiche + comandi.

Comandi: /status /pnl /pause /resume /stop
Accetta comandi SOLO dalla chat configurata in TELEGRAM_CHAT_ID.
"""
from __future__ import annotations

import logging

import requests

log = logging.getLogger(__name__)
COMMANDS = {"/status", "/pnl", "/pause", "/resume", "/stop", "/help"}


class Telegram:
    def __init__(self, token: str, chat_id: str, enabled: bool = True):
        self.enabled = enabled and bool(token and chat_id)
        self.base = f"https://api.telegram.org/bot{token}"
        self.chat_id = str(chat_id)
        self.offset = 0
        if enabled and not self.enabled:
            log.warning("Telegram disattivato: manca TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID")

    def send(self, text: str) -> None:
        if not self.enabled:
            log.info("[telegram] %s", text)
            return
        try:
            requests.post(f"{self.base}/sendMessage",
                          json={"chat_id": self.chat_id, "text": text}, timeout=10)
        except requests.RequestException as e:
            log.warning("Invio Telegram fallito: %s", e)

    def poll_commands(self) -> list[str]:
        if not self.enabled:
            return []
        try:
            r = requests.get(f"{self.base}/getUpdates",
                             params={"offset": self.offset, "timeout": 0}, timeout=10)
            updates = r.json().get("result", [])
        except (requests.RequestException, ValueError) as e:
            log.warning("Polling Telegram fallito: %s", e)
            return []
        cmds = []
        for u in updates:
            self.offset = u["update_id"] + 1
            msg = u.get("message") or {}
            if str(msg.get("chat", {}).get("id")) != self.chat_id:
                continue  # ignora chiunque altro
            text = (msg.get("text") or "").strip().split()[0:1]
            if text and text[0].split("@")[0] in COMMANDS:
                cmds.append(text[0].split("@")[0])
        return cmds
