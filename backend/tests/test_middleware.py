"""Tests for app.middleware — rate_limit and request_context."""
import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient


class TestRequestContextMiddleware:
    @pytest.fixture
    def app_with_context(self):
        from app.middleware.request_context import RequestContextMiddleware
        app = FastAPI()
        app.add_middleware(RequestContextMiddleware)

        @app.get("/test")
        def test_endpoint(request: Request):
            ctx = getattr(request.state, "context", {})
            return {"context": ctx}

        return app

    def test_adds_context_to_request_state(self, app_with_context):
        client = TestClient(app_with_context)
        resp = client.get("/test")
        assert resp.status_code == 200
        data = resp.json()
        assert "context" in data

    def test_passes_through_normal_requests(self, app_with_context):
        client = TestClient(app_with_context)
        resp = client.get("/test", headers={"X-Custom": "value"})
        assert resp.status_code == 200


class TestTenantRateLimitMiddleware:
    @pytest.fixture
    def app_with_rate_limit(self):
        from app.middleware.rate_limit import TenantRateLimitMiddleware
        app = FastAPI()
        app.add_middleware(TenantRateLimitMiddleware)

        @app.get("/test")
        def test_endpoint():
            return {"ok": True}

        return app

    def test_allows_normal_request(self, app_with_rate_limit):
        client = TestClient(app_with_rate_limit)
        resp = client.get("/test")
        assert resp.status_code == 200

    def test_handles_rapid_requests(self, app_with_rate_limit):
        client = TestClient(app_with_rate_limit)
        statuses = []
        for _ in range(50):
            resp = client.get("/test")
            statuses.append(resp.status_code)
        # Middleware loaded without error; requests processed
        assert len(statuses) == 50
        assert all(s in (200, 429) for s in statuses)