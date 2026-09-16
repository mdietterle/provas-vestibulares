from __future__ import annotations

"""Controle de limitação de uso da API do Groq.

Implementa uma janela deslizante de requisições/minuto (thread-safe) e retry
com backoff exponencial para erros de rate limit (HTTP 429), evitando que
importações em lote (muitas questões) estourem o limite da conta Groq ou
gerem custo descontrolado.
"""


import threading
import time
from collections import deque

try:
    from app.core.config import settings
except Exception:  # pragma: no cover - fallback for lightweight environments
    class _FallbackSettings:
        GROQ_MAX_RPM = 10
    settings = _FallbackSettings()


class GroqRateLimiter:
    def __init__(self, max_per_minute: int):
        self.max_per_minute = max_per_minute
        self._timestamps: deque[float] = deque()
        self._lock = threading.Lock()

    def acquire(self):
        """Bloqueia até que haja espaço na janela de 60s para mais uma requisição."""
        while True:
            with self._lock:
                now = time.monotonic()
                while self._timestamps and now - self._timestamps[0] >= 60:
                    self._timestamps.popleft()
                if len(self._timestamps) < self.max_per_minute:
                    self._timestamps.append(now)
                    return
                wait = 60 - (now - self._timestamps[0]) + 0.05
            time.sleep(max(wait, 0.05))


_limiter = GroqRateLimiter(settings.GROQ_MAX_RPM)


def call_with_rate_limit(fn, *args, max_retries: int = 5, **kwargs):
    """Executa `fn(*args, **kwargs)` respeitando o limite de RPM e tentando
    novamente com backoff exponencial em caso de erro de rate limit (429)."""
    last_err: Exception | None = None
    for attempt in range(max_retries):
        _limiter.acquire()
        try:
            return fn(*args, **kwargs)
        except Exception as e:  # noqa: BLE001 - retry genérico por status/mensagem
            last_err = e
            msg = str(e).lower()
            is_rate_limit = "429" in msg or "rate_limit" in msg or "rate limit" in msg
            if not is_rate_limit or attempt == max_retries - 1:
                raise
            backoff = min(2 ** attempt, 30)
            time.sleep(backoff)
    raise last_err  # pragma: no cover
