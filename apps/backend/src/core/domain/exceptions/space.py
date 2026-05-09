from .base import DomainException


class SpaceNotFoundError(DomainException):
    code = "SPACE_NOT_FOUND"


class SpaceAlreadyExistsError(DomainException):
    code = "SPACE_ALREADY_EXISTS"


class SpaceMemberLimitError(DomainException):
    code = "SPACE_MEMBER_LIMIT_REACHED"


class NotSpaceMemberError(DomainException):
    code = "NOT_SPACE_MEMBER"
