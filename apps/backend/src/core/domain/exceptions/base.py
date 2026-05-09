from __future__ import annotations


class DomainException(Exception):
    """Base for all domain exceptions. No HTTP status codes here."""
    code: str = "DOMAIN_ERROR"

    def __init__(self, message: str, code: str | None = None) -> None:
        super().__init__(message)
        self.message = message
        if code:
            self.code = code
