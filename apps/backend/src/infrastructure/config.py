from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


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
    secret_key: str = Field(default="changeme-replace-in-production-env", min_length=32)

    # Database
    database_url: str = "postgresql+asyncpg://omar:omar@localhost:5432/myapp_dev"

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
    anthropic_api_key: str = ""
    google_tts_credentials_json: str = ""
    default_chat_model: str = "gpt-4o-mini"
    embedding_model: str = "text-embedding-3-small"
    ai_cost_limit_usd_per_day: float = 10.0

    # Storage (S3-compatible)
    s3_bucket: str = "kibuka-books"
    s3_region: str = "eu-central-1"
    s3_access_key_id: str = ""
    s3_secret_access_key: str = ""
    s3_endpoint_url: str = ""  # Non-empty for S3-compatible services (e.g. MinIO)

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
