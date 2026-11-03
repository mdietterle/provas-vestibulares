"""Security headers middleware — adds Content-Security-Policy and related headers."""

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds security headers to every response.

    - Content-Security-Policy: restricts script sources to mitigate XSS.
      The frontend is served separately; this header protects API responses
      and any HTML endpoints (e.g. /docs).
    - X-Content-Type-Options: prevents MIME-sniffing attacks.
    - Referrer-Policy: limits referrer leakage.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # CSP: only allow scripts from same origin; block inline eval.
        # 'self' covers the API server; the frontend has its own CSP via Vite/HTML meta.
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self'; "
            "connect-src 'self'; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
        return response