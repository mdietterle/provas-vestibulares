"""Tests for app.routers.auth — login, register, token endpoints."""
import pytest


class TestLogin:
    def test_login_success(self, client, sample_user):
        resp = client.post("/api/auth/login", data={
            "username": "test@example.com",
            "password": "testpass123",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client, sample_user):
        resp = client.post("/api/auth/login", data={
            "username": "test@example.com",
            "password": "wrongpass",
        })
        assert resp.status_code == 401

    def test_login_nonexistent_user(self, client):
        resp = client.post("/api/auth/login", data={
            "username": "nobody@example.com",
            "password": "whatever",
        })
        assert resp.status_code == 401

    def test_login_missing_fields(self, client):
        resp = client.post("/api/auth/login", data={})
        assert resp.status_code == 422


class TestRegister:
    def test_register_success(self, client, sample_institution):
        resp = client.post("/api/auth/register", json={
            "name": "New User",
            "email": "newuser@example.com",
            "password": "strongpass123",
            "institution_id": sample_institution.id,
        })
        assert resp.status_code == 201
        data = resp.json()
        assert "message" in data

    def test_register_duplicate_email(self, client, sample_user, sample_institution):
        resp = client.post("/api/auth/register", json={
            "name": "Duplicate",
            "email": "test@example.com",
            "password": "strongpass123",
            "institution_id": sample_institution.id,
        })
        assert resp.status_code == 400

    def test_register_short_password_rejected(self, client, sample_institution):
        resp = client.post("/api/auth/register", json={
            "name": "Short Pass",
            "email": "shortpass@example.com",
            "password": "12345",
            "institution_id": sample_institution.id,
        })
        assert resp.status_code == 422

    def test_register_no_institution_rejected(self, client):
        resp = client.post("/api/auth/register", json={
            "name": "No School",
            "email": "noschool@example.com",
            "password": "strongpass123",
        })
        assert resp.status_code == 400


class TestProtectedEndpoints:
    def test_access_without_token_returns_401(self, client):
        resp = client.get("/api/auth/me")
        assert resp.status_code == 401

    def test_access_with_valid_token(self, authenticated_client):
        resp = authenticated_client.get("/api/auth/me")
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "test@example.com"

    def test_access_with_invalid_token(self, client):
        headers = {"Authorization": "Bearer invalid.token.here"}
        resp = client.get("/api/auth/me", headers=headers)
        assert resp.status_code == 401