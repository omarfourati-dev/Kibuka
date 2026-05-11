from __future__ import annotations

from ...domain.entities.space import Space
from ...domain.exceptions.space import SpaceNotFoundError
from ...ports.output.i_space_repository import ISpaceRepository


class GetSpaceUseCase:
    def __init__(self, space_repo: ISpaceRepository) -> None:
        self._space_repo = space_repo

    async def execute(self, space_id: str) -> Space:
        space = await self._space_repo.get_by_id(space_id)
        if not space:
            raise SpaceNotFoundError(f"Space {space_id} not found")
        return space
