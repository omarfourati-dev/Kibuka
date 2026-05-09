from .base import DomainException


class UserNotFoundError(DomainException):
    code = "USER_NOT_FOUND"


class UserAlreadyExistsError(DomainException):
    code = "USER_ALREADY_EXISTS"


class UserSuspendedError(DomainException):
    code = "USER_SUSPENDED"


class InvalidEmailError(DomainException):
    code = "INVALID_EMAIL"
