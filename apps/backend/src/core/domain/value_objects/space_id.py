from __future__ import annotations
import uuid
from dataclasses import dataclass


@dataclass(frozen=True)
class SpaceId:
    value: str

    def __post_init__(self) -> None:
        try:
            uuid.UUID(self.value)
        except ValueError:
            raise ValueError(f"Invalid SpaceId: {self.value}")

    def __str__(self) -> str:
        return self.value

    @classmethod
    def generate(cls) -> "SpaceId":
        return cls(value=str(uuid.uuid4()))
