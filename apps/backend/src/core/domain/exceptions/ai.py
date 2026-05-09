from .base import DomainException


class DocumentNotFoundError(DomainException):
    code = "DOCUMENT_NOT_FOUND"


class DocumentProcessingError(DomainException):
    code = "DOCUMENT_PROCESSING_ERROR"


class AIFeatureDisabledError(DomainException):
    code = "AI_FEATURE_DISABLED"


class AICostLimitExceededError(DomainException):
    code = "AI_COST_LIMIT_EXCEEDED"


class AgentRunNotFoundError(DomainException):
    code = "AGENT_RUN_NOT_FOUND"


class ConversationNotFoundError(DomainException):
    code = "CONVERSATION_NOT_FOUND"
