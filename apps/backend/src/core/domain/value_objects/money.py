from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Money:
    amount_cents: int
    currency: str = "EUR"

    def __post_init__(self) -> None:
        if self.amount_cents < 0:
            raise ValueError("Amount cannot be negative")
        if len(self.currency) != 3:
            raise ValueError("Currency must be a 3-letter ISO code")

    def __add__(self, other: Money) -> Money:
        if self.currency != other.currency:
            raise ValueError(f"Cannot add {self.currency} and {other.currency}")
        return Money(self.amount_cents + other.amount_cents, self.currency)

    @property
    def amount_decimal(self) -> float:
        return self.amount_cents / 100

    def __str__(self) -> str:
        return f"{self.amount_decimal:.2f} {self.currency}"
