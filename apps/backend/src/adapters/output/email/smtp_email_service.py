from __future__ import annotations

from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib
from jinja2 import Environment, PackageLoader, select_autoescape

from ....core.ports.output.i_email_service import IEmailService


class SmtpEmailService(IEmailService):
    def __init__(
        self,
        host: str,
        port: int,
        username: str,
        password: str,
        from_email: str,
    ) -> None:
        self._host = host
        self._port = port
        self._username = username
        self._password = password
        self._from_email = from_email
        self._jinja = Environment(
            loader=PackageLoader("src", "templates/email"),
            autoescape=select_autoescape(["html"]),
        )

    async def send(self, to: str, subject: str, template: str, context: dict[str, object]) -> None:
        try:
            tmpl = self._jinja.get_template(f"{template}.html")
            html_content = tmpl.render(**context)
        except Exception:
            html_content = f"<p>{subject}</p>"

        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = self._from_email
        message["To"] = to
        message.attach(MIMEText(html_content, "html"))

        await aiosmtplib.send(
            message,
            hostname=self._host,
            port=self._port,
            username=self._username,
            password=self._password,
            start_tls=True,
        )
