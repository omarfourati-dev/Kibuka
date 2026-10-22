from __future__ import annotations

from abc import ABC, abstractmethod

from ...domain.entities.child_profile import ChildProfile


class IChildProfileRepository(ABC):
    @abstractmethod
    async def get_by_id(self, profile_id: str) -> ChildProfile | None: ...

    @abstractmethod
    async def list_by_user(self, user_id: str) -> list[ChildProfile]: ...

    @abstractmethod
    async def save(self, profile: ChildProfile) -> ChildProfile: ...
