"""Auto-discovery router registry.

Scans app/routers/ for modules exposing a `router` attribute and registers
them on the FastAPI app. Each module may optionally define `ROUTER_PREFIX`
(default: "/api") to override the prefix.
"""
import importlib
import pkgutil
from pathlib import Path
from typing import List, Tuple

from fastapi import APIRouter, FastAPI


def _discover_routers() -> List[Tuple[str, APIRouter, str]]:
    """Return list of (module_name, router_instance, prefix) from app/routers/."""
    routers_dir = Path(__file__).parent / "routers"
    results = []
    for module_info in pkgutil.iter_modules([str(routers_dir)]):
        if module_info.name.startswith("_"):
            continue
        module = importlib.import_module(f"app.routers.{module_info.name}")
        router = getattr(module, "router", None)
        if router is None or not isinstance(router, APIRouter):
            continue
        prefix = getattr(module, "ROUTER_PREFIX", "")
        results.append((module_info.name, router, prefix))
    return results


def register_all_routers(app: FastAPI) -> None:
    """Register all discovered routers on the app."""
    for name, router, prefix in _discover_routers():
        app.include_router(router, prefix=prefix)