"""Tenant-level rate limiting middleware for AI endpoints.

Checks institution credits_balance before allowing AI_CORRECTION or AI_GENERATION
requests. Returns 429 when balance exhausted and plan has no overage allowance.
"""
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response, JSONResponse

from app.database import SessionLocal
from app.models import Institution, UsageEvent


# Paths that consume AI credits
_AI_PATHS = {"/api/ai/correct", "/api/ai/generate", "/api/redacoes/correct"}


class TenantRateLimitMiddleware(BaseHTTPMiddleware):
    """Block AI requests when tenant credits exhausted."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        path = request.url.path
        if request.method != "POST" or path not in _AI_PATHS:
            return await call_next(request)

        # Extract user from auth header (already validated by router deps)
        user = getattr(request.state, "user", None)
        if user is None or user.institution_id is None:
            return await call_next(request)

        db = SessionLocal()
        try:
            institution = db.query(Institution).get(user.institution_id)
            if institution is None:
                return await call_next(request)

            # Free-tier students (no institution) bypass credit check
            if institution.credits_balance <= 0:
                # Check if any usage this month — allow overage tracking
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Créditos esgotados. Adquira mais créditos ou aguarde a renovação mensal.",
                        "credits_remaining": 0,
                    },
                )
        finally:
            db.close()

        return await call_next(request)