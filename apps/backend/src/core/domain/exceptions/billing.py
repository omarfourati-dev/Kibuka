from .base import DomainException


class SubscriptionNotFoundError(DomainException):
    code = "SUBSCRIPTION_NOT_FOUND"


class SubscriptionInactiveError(DomainException):
    code = "SUBSCRIPTION_INACTIVE"


class PaymentFailedError(DomainException):
    code = "PAYMENT_FAILED"


class PlanUpgradeRequiredError(DomainException):
    code = "PLAN_UPGRADE_REQUIRED"
