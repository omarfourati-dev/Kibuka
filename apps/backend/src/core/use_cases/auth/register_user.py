from __future__ import annotations
import uuid
from dataclasses import dataclass
from ...domain.entities.user import User, UserRole, UserStatus
from ...domain.exceptions.user import UserAlreadyExistsError, InvalidEmailError
from ...domain.value_objects.email import Email
from ...ports.output.i_user_repository import IUserRepository
from ...ports.output.i_email_service import IEmailService


@dataclass
class RegisterUserCommand:
    email: str
    name: str
    password: str


class RegisterUserUseCase:
    def __init__(self, user_repo: IUserRepository, email_service: IEmailService) -> None:
        self._user_repo = user_repo
        self._email_service = email_service

    async def execute(self, command: RegisterUserCommand) -> User:
        try:
            email = Email(command.email.lower().strip())
        except ValueError as e:
            raise InvalidEmailError(str(e))

        existing = await self._user_repo.get_by_email(str(email))
        if existing:
            raise UserAlreadyExistsError(f"Email {email} is already registered")

        user = User(
            id=str(uuid.uuid4()),
            email=str(email),
            name=command.name.strip(),
            role=UserRole.MEMBER,
            status=UserStatus.ACTIVE,
        )
        saved = await self._user_repo.save(user)
        await self._email_service.send(
            to=str(email),
            subject="Welcome!",
            template="welcome",
            context={"name": user.name},
        )
        return saved
