"""Tests for app.core.config — settings validation."""
import pytest
from app.core.config import settings


class TestSettings:
    def test_settings_has_secret_key(self):
        assert hasattr(settings, "SECRET_KEY")
        assert settings.SECRET_KEY is not None

    def test_settings_has_database_url(self):
        assert hasattr(settings, "DATABASE_URL")
        assert settings.DATABASE_URL is not None

    def test_settings_has_algorithm(self):
        assert hasattr(settings, "ALGORITHM")
        assert settings.ALGORITHM == "HS256"

    def test_access_token_expire_minutes(self):
        assert hasattr(settings, "ACCESS_TOKEN_EXPIRE_MINUTES")
        assert settings.ACCESS_TOKEN_EXPIRE_MINUTES > 0

    def test_allowed_origins_type(self):
        assert hasattr(settings, "ALLOWED_ORIGINS")
        assert isinstance(settings.ALLOWED_ORIGINS, str)

    def test_log_level_default(self):
        assert hasattr(settings, "LOG_LEVEL")
        assert settings.LOG_LEVEL == "INFO"

    def test_groq_model_set(self):
        assert hasattr(settings, "GROQ_MODEL")
        assert isinstance(settings.GROQ_MODEL, str)
        assert len(settings.GROQ_MODEL) > 0

    def test_r2_bucket_name_default(self):
        assert settings.R2_BUCKET_NAME == "provas-vestibulares"

    def test_stripe_credits_pack_amount_default(self):
        assert settings.STRIPE_CREDITS_PACK_AMOUNT == 100