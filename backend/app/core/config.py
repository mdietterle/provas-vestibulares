import os
from pydantic_settings import BaseSettings, SettingsConfigDict

# Load .env only in local development
_env_file = ".env" if not os.getenv("RAILWAY_ENVIRONMENT") else None


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_env_file, env_file_encoding="utf-8", extra="ignore")

    SECRET_KEY: str = "change-this-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/postgres"
    GROQ_API_KEY: str = ""
    # llama-3.3-70b-versatile foi desativado pela Groq em 16/08/2026 (e
    # qwen/qwen3-32b, usado antes disso, em 17/07/2026) — openai/gpt-oss-120b
    # é o substituto recomendado pela própria Groq para ambos.
    # Ver: https://console.groq.com/docs/deprecations
    GROQ_MODEL: str = "openai/gpt-oss-120b"
    GROQ_VISION_MODEL: str = "meta-llama/llama-4-scout-17b-16e-instruct"
    # Limite de segurança de requisições/minuto ao Groq (fica abaixo do limite real da
    # conta para não estourar o rate limit em importações com muitas questões).
    GROQ_MAX_RPM: int = 25
    # ── E-mail / convite ──────────────────────────────────────────────────────
    RESEND_API_KEY: str = ""          # obrigatório para enviar e-mails
    EMAIL_FROM: str = "onboarding@resend.dev"  # domínio verificado no Resend
    FRONTEND_URL: str = "http://localhost:5173"
    ALLOWED_ORIGINS: str = ""  # comma-separated list, e.g. "https://app.example.com,https://admin.example.com"
    INVITATION_EXPIRE_DAYS: int = 7
    EMAIL_VERIFICATION_EXPIRE_HOURS: int = 48
    PASSWORD_RESET_EXPIRE_HOURS: int = 2
    # ── Stripe ─────────────────────────────────────────────────────────────────
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_BASIC: str = ""
    STRIPE_PRICE_PRO: str = ""
    STRIPE_PRICE_ENTERPRISE: str = ""
    STRIPE_PRICE_CREDITS_PACK: str = ""
    STRIPE_CREDITS_PACK_AMOUNT: int = 100
    # ── Cloudflare R2 (image storage) ──────────────────────────────────────────
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = "provas-vestibulares"
    R2_PUBLIC_URL: str = ""
    # ── Observabilidade ────────────────────────────────────────────────────────
    SENTRY_DSN: str = ""
    LOG_LEVEL: str = "INFO"


settings = Settings()
