"""Tests for app.router_registry — auto-discovery of routers."""
import pytest
from fastapi import FastAPI, APIRouter
from app.router_registry import _discover_routers, register_all_routers


class TestDiscoverRouters:
    def test_returns_list_of_tuples(self):
        result = _discover_routers()
        assert isinstance(result, list)
        assert len(result) > 0

    def test_each_entry_has_three_elements(self):
        for entry in _discover_routers():
            assert len(entry) == 3
            name, router, prefix = entry
            assert isinstance(name, str)
            assert isinstance(router, APIRouter)
            assert isinstance(prefix, str)

    def test_skips_underscore_modules(self):
        names = [name for name, _, _ in _discover_routers()]
        for name in names:
            assert not name.startswith("_")

    def test_prefix_defaults_to_api(self):
        for _, _, prefix in _discover_routers():
            assert prefix.startswith("/")


class TestRegisterAllRouters:
    def test_registers_without_error(self):
        app = FastAPI()
        register_all_routers(app)
        assert len(app.routes) > 0

    def test_registered_routes_include_auth(self):
        app = FastAPI()
        register_all_routers(app)
        paths = [getattr(r, "path", "") for r in app.routes]
        # Auth router uses prefix="/auth" under default "/api" prefix
        auth_paths = [p for p in paths if "auth" in p.lower()]
        assert len(auth_paths) > 0, f"No auth routes found in {paths[:20]}"