"""Tests for app.core.security — password hashing and JWT tokens."""
import pytest
from datetime import timedelta
from jose import jwt
from app.core.config import settings
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    decode_token,
)


class TestPasswordHashing:
    def test_hash_returns_bcrypt_string(self):
        hashed = get_password_hash("mypassword")
        assert hashed.startswith("$2b$")

    def test_same_password_different_hash(self):
        h1 = get_password_hash("password")
        h2 = get_password_hash("password")
        assert h1 != h2  # bcrypt salt differs

    def test_verify_correct_password(self):
        hashed = get_password_hash("correct")
        assert verify_password("correct", hashed) is True

    def test_verify_wrong_password(self):
        hashed = get_password_hash("correct")
        assert verify_password("wrong", hashed) is False

    def test_empty_password_hashes(self):
        hashed = get_password_hash("")
        assert verify_password("", hashed) is True


class TestAccessToken:
    def test_create_token_returns_string(self):
        token = create_access_token(data={"sub": "42"})
        assert isinstance(token, str)
        assert len(token) > 20

    def test_token_contains_subject(self):
        token = create_access_token(data={"sub": "99"})
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        assert payload["sub"] == "99"

    def test_token_has_expiry(self):
        token = create_access_token(data={"sub": "1"})
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        assert "exp" in payload

    def test_custom_expiry(self):
        delta = timedelta(minutes=5)
        token = create_access_token(data={"sub": "1"}, expires_delta=delta)
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        assert "exp" in payload

    def test_extra_claims_preserved(self):
        token = create_access_token(data={"sub": "1", "role": "admin"})
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        assert payload["role"] == "admin"


class TestDecodeToken:
    def test_valid_token_returns_payload(self):
        token = create_access_token(data={"sub": "42"})
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == "42"

    def test_invalid_token_returns_none(self):
        result = decode_token("invalid.token.here")
        assert result is None

    def test_tampered_token_returns_none(self):
        token = create_access_token(data={"sub": "1"})
        tampered = token[:-5] + "XXXXX"
        result = decode_token(tampered)
        assert result is None