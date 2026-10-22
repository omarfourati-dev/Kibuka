from __future__ import annotations

import logging

from ....core.ports.output.i_email_service import IEmailService

logger = logging.getLogger(__name__)


class LoggingEmailService(IEmailService):
    """Ersatz, solange kein SMTP konfiguriert ist: schreibt nur eine Warnung
    (ohne Empfänger — personenbezogen), damit fehlende Mails auffallen."""

    async def send(self, to: str, subject: str, template: str, context: dict[str, object]) -> None:
        logger.warning("SMTP not configured — e-mail %r (%s) not sent", template, subject)
