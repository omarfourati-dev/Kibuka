from __future__ import annotations
from dataclasses import dataclass
from ...domain.entities.space import Space
from ...domain.exceptions.space import SpaceNotFoundError
from ...ports.output.i_space_repository import ISpaceRepository


@dataclass
class CreateCheckoutCommand:
    space_id: str
    price_id: str
    success_url: str
    cancel_url: str


class CreateCheckoutUseCase:
    """Delegates to billing adapter — only orchestration logic here."""
    def __init__(self, space_repo: ISpaceRepository) -> None:
        self._space_repo = space_repo

    async def execute(self, command: CreateCheckoutCommand) -> str:
        space = await self._space_repo.get_by_id(command.space_id)
        if not space:
            raise SpaceNotFoundError(f"Space {command.space_id} not found")
        # Checkout session URL is created by the billing adapter (injected at route level)
        return command.space_id
