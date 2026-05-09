from .base import DomainException


class AuthenticationError(DomainException):
    code = "AUTHENTICATION_FAILED"


class InvalidCredentialsError(DomainException):
    code = "INVALID_CREDENTIALS"


class TokenExpiredError(DomainException):
    code = "TOKEN_EXPIRED"


class TokenInvalidError(DomainException):
    code = "TOKEN_INVALID"


class InsufficientPermissionsError(DomainException):
    code = "INSUFFICIENT_PERMISSIONS"
