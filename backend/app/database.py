from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings


def _engine_url(raw_url: str) -> str:
    """CockroachDB fala o protocolo do Postgres, mas o dialect "postgresql"
    puro do SQLAlchemy não entende a version string do CockroachDB
    ('CockroachDB CCL v26.2.5 ...') e quebra na conexão. O dialect
    "cockroachdb" (pacote sqlalchemy-cockroachdb) sabe lidar com isso e
    ainda traz retry automático de erro de serialização (40001).
    Reescreve o scheme sozinho pra host de CockroachDB Cloud, assim
    DATABASE_URL pode continuar "postgresql://" tanto no Render quanto
    localmente — sem exigir troca manual de scheme por ambiente."""
    if "cockroachlabs.cloud" in raw_url and raw_url.startswith("postgresql://"):
        return "cockroachdb://" + raw_url[len("postgresql://"):]
    return raw_url


engine = create_engine(
    _engine_url(settings.DATABASE_URL),
    pool_pre_ping=True,   # drop stale connections instead of hanging
    pool_recycle=600,     # recycle connections every 10 min (Supabase idle timeout ~10-25 min)
    pool_size=10,
    max_overflow=5,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def commit_with_retry(session, max_attempts: int = 3) -> None:
    """Commit com retry pra erro de serialização (SQLSTATE 40001) do
    CockroachDB — sob contenção (ex.: import em massa concorrente) ele aborta
    a transação em vez de bloquear, e espera o cliente tentar de novo.
    No-op adicional em Postgres/Supabase: OperationalError 40001 não ocorre
    lá do mesmo jeito, entao isso so entra em acao contra o CockroachDB.
    Uso: trocar session.commit() por commit_with_retry(session) nos pontos
    de escrita em lote mais sensíveis (importadores)."""
    for attempt in range(1, max_attempts + 1):
        try:
            session.commit()
            return
        except OperationalError as e:
            session.rollback()
            if "40001" not in str(e.orig) or attempt == max_attempts:
                raise


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
