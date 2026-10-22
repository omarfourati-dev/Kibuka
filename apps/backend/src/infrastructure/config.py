from __future__ import annotations

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

#: Shipped default — only acceptable in development; see validator below.
DEFAULT_SECRET_KEY = "changeme-replace-in-production-env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    app_name: str = "MyApp"
    app_url: str = "http://localhost:8000"
    environment: str = "development"
    debug: bool = False
    secret_key: str = Field(default=DEFAULT_SECRET_KEY, min_length=32)

    @model_validator(mode="after")
    def _reject_default_secret_outside_development(self) -> Settings:
        """Tokens signed with the shipped default key could be forged by anyone."""
        if self.environment != "development" and self.secret_key == DEFAULT_SECRET_KEY:
            raise ValueError(
                "SECRET_KEY must be set to a strong unique value when "
                f"ENVIRONMENT={self.environment!r} — the shipped default is only "
                "allowed in development"
            )
        return self

    # Database
    database_url: str = "postgresql+asyncpg://omar:omar@localhost:5432/myapp_dev"

    # Einzelkaufpreis (EUR) für neu generierte Bücher — nie 0, sonst ist
    # jedes Buch gratis und der Billing-Flow ins Leere gebaut
    book_price_single_eur: float = 2.99

    # Abo-Endpreise inkl. MwSt (EUR) + Testphase
    subscription_price_monthly_eur: float = 14.99
    subscription_price_yearly_eur: float = 99.0
    subscription_trial_days: int = 14

    # Redis
    redis_url: str = "redis://localhost:6379/0"
    redis_host: str = "localhost"
    redis_port: int = 6379

    # Auth
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    cors_origins: list[str] = ["http://localhost:5173"]
    google_client_id: str = ""
    google_client_secret: str = ""

    # Email
    smtp_host: str = "smtp.example.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    email_from: str = "noreply@example.com"

    # AI
    openai_api_key: str = ""
    google_tts_credentials_json: str = ""
    default_chat_model: str = "gpt-4.1-mini"
    embedding_model: str = "text-embedding-3-small"
    ai_cost_limit_usd_per_day: float = 10.0

    # Storage (S3-compatible)
    s3_bucket: str = "kibuka-books"
    s3_region: str = "eu-central-1"
    s3_access_key_id: str = ""
    s3_secret_access_key: str = ""
    s3_endpoint_url: str = ""
    # Externe Basis-URL für öffentliche Asset-Links, wenn Uploads über einen
    # internen Endpoint laufen (z. B. SeaweedFS im Compose-Netz)
    s3_public_url_base: str = ""  # Non-empty for S3-compatible services (e.g. MinIO)

    # Billing
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""

    # GitHub
    github_token: str = ""
    github_org: str = ""
    github_repo: str = ""

    # Observability
    sentry_dsn: str = ""
    otel_exporter_otlp_endpoint: str = ""

    # Feature Flags
    enable_ai: bool = True
    enable_rag: bool = True
    enable_agents: bool = True
    enable_billing: bool = False
    enable_multi_tenant: bool = True
    enable_websockets: bool = True
    enable_ai_code_editor: bool = True


settings = Settings()
