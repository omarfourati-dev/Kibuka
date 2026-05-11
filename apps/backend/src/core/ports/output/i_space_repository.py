from __future__ import annotations

from abc import ABC, abstractmethod

from ...domain.entities.space import Space


class ISpaceRepository(ABC):
    @abstractmethod
    async def get_by_id(self, space_id: str) -> Space | None: ...

    @abstractmethod
    async def get_by_slug(self, slug: str) -> Space | None: ...

    @abstractmethod
    async def list_all(self, page: int = 1, page_size: int = 20) -> tuple[list[Space], int]: ...

    @abstractmethod
    async def save(self, space: Space) -> Space: ...

    @abstractmethod
    async def delete(self, space_id: str) -> None: ...
