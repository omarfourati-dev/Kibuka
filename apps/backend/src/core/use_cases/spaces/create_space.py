from __future__ import annotations
import uuid
from dataclasses import dataclass
from ...domain.entities.space import Space, PlanType
from ...domain.entities.user import User, UserRole
from ...domain.exceptions.space import SpaceAlreadyExistsError
from ...ports.output.i_space_repository import ISpaceRepository
from ...ports.output.i_user_repository import IUserRepository


@dataclass
class CreateSpaceCommand:
    name: str
    slug: str
    owner_id: str


class CreateSpaceUseCase:
    def __init__(self, space_repo: ISpaceRepository, user_repo: IUserRepository) -> None:
        self._space_repo = space_repo
        self._user_repo = user_repo

    async def execute(self, command: CreateSpaceCommand) -> Space:
        existing = await self._space_repo.get_by_slug(command.slug)
        if existing:
            raise SpaceAlreadyExistsError(f"Slug '{command.slug}' is already taken")

        space = Space(
            id=str(uuid.uuid4()),
            name=command.name.strip(),
            slug=command.slug.lower().strip(),
            owner_id=command.owner_id,
            plan=PlanType.FREE,
        )
        saved = await self._space_repo.save(space)

        owner = await self._user_repo.get_by_id(command.owner_id)
        if owner:
            owner.space_id = saved.id
            owner.role = UserRole.OWNER
            await self._user_repo.save(owner)

        return saved
