from __future__ import annotations
from dataclasses import dataclass
from typing import Any
from ...domain.exceptions.auth import InsufficientPermissionsError


@dataclass
class AdminStats:
    total_users: int
    total_spaces: int
    active_subscriptions: int
    ai_usage_today_usd: float


class GetAdminStatsUseCase:
    """Aggregates admin dashboard statistics."""
    def __init__(self, user_repo, space_repo, subscription_repo) -> None:
        self._user_repo = user_repo
        self._space_repo = space_repo
        self._subscription_repo = subscription_repo

    async def execute(self, requesting_user_is_admin: bool) -> AdminStats:
        if not requesting_user_is_admin:
            raise InsufficientPermissionsError("Admin access required")

        users, total_users = await self._user_repo.list_by_space("", page=1, page_size=1)
        spaces, total_spaces = await self._space_repo.list_all(page=1, page_size=1)

        return AdminStats(
            total_users=total_users,
            total_spaces=total_spaces,
            active_subscriptions=0,
            ai_usage_today_usd=0.0,
        )
