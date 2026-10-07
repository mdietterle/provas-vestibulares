import os
import secrets
import time

import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
from sqlalchemy import text

from app.core.config import settings
from app.core.logging import setup_logging
from app.core.security import get_password_hash
from app.database import Base, SessionLocal, engine
from app.middleware.rate_limit import TenantRateLimitMiddleware
from app.middleware.request_context import RequestContextMiddleware
from app.migrations import run_migrations
from app.models import Institution, User, UserRole
from app.router_registry import register_all_routers
from app.services.subjects import seed_default_subjects

# ── Observabilidade ───────────────────────────────────────────────────────────
setup_logging()

if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        integrations=[StarletteIntegration(), FastApiIntegration()],
        traces_sample_rate=1.0,
        send_default_pii=True,
        enable_logs=True,
    )

# A signal that we're running as a real deployment rather than a local checkout.
_IS_PRODUCTION_LIKE = bool(os.getenv("RAILWAY_ENVIRONMENT"))

if _IS_PRODUCTION_LIKE and settings.SECRET_KEY == "change-this-secret-key-in-production":
    raise RuntimeError(
        "SECRET_KEY está com o valor padrão inseguro em um ambiente de produção. "
        "Defina a variável de ambiente SECRET_KEY com um segredo único e forte antes de iniciar o servidor."
    )

app = FastAPI(title="Sistema de Provas", version="1.0.0")

_default_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "https://cognition-ai.vercel.app",
    "https://cognition-ai-martimdietterle-4980s-projects.vercel.app",
    "https://frontend-cyan-three-63.vercel.app",
]
_extra = os.getenv("ALLOWED_ORIGINS", "")
_origins = _default_origins + [o.strip() for o in _extra.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestContextMiddleware)
app.add_middleware(TenantRateLimitMiddleware)

# Auto-discovery: registra todos os routers em app/routers/ automaticamente
register_all_routers(app)


@app.on_event("startup")
def startup():
    delays = [5, 10, 20, 30]
    for attempt, delay in enumerate(delays + [None], start=1):
        try:
            _drop_uuid_schema_if_needed()
            Base.metadata.create_all(bind=engine)
            run_migrations()
            _seed_admin()
            _backfill_default_subjects()
            _seed_enem()
            print(f"✅  Banco de dados conectado com sucesso (tentativa {attempt}).")
            return
        except Exception as e:
            if delay is not None:
                print(f"⚠️   Startup tentativa {attempt}/5 falhou: {type(e).__name__}: {e}. Aguardando {delay}s...")
                time.sleep(delay)
            else:
                print(f"⚠️   Banco de dados indisponível após 5 tentativas: {e}")
                print("⚠️   O servidor iniciou em modo degradado. Configure DATABASE_URL corretamente.")


def _drop_uuid_schema_if_needed():
    """Se o banco tiver tabelas com PKs UUID incompatíveis com nosso modelo INTEGER,
    dropa-as para que create_all() possa recriar com o tipo correto."""
    with engine.begin() as conn:
        row = conn.execute(text("""
            SELECT data_type FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'questions' AND column_name = 'id'
        """)).fetchone()
        if row and row[0] == 'uuid':
            print("⚠️   Schema incompatível detectado (questions.id é UUID). Recriando tabelas...")
            for tbl in [
                "submission_answers", "exam_submissions", "exam_questions",
                "question_options", "questions", "exams", "classes",
                "subjects", "users", "institutions",
            ]:
                conn.execute(text(f"DROP TABLE IF EXISTS {tbl} CASCADE"))
            print("✅  Tabelas incompatíveis removidas. create_all() vai recriar.")


def _seed_admin():
    """Create a default institution and admin user if none exist."""
    db = SessionLocal()
    try:
        inst = db.query(Institution).first()
        if not inst:
            inst = Institution(name="Escola Demo", cnpj=None)
            db.add(inst)
            db.flush()
            seed_default_subjects(db, inst.id)
            print("✅  Instituição criada: Escola Demo")

        admin = db.query(User).filter(User.email == "admin@escola.com").first()
        if not admin:
            admin_pass = os.getenv("ADMIN_PASSWORD")
            if not admin_pass:
                admin_pass = secrets.token_urlsafe(12)
                print(f"⚠️   ADMIN_PASSWORD não definida — senha gerada para admin@escola.com: {admin_pass}")
                print("⚠️   Anote esta senha agora: ela não será exibida novamente. Defina ADMIN_PASSWORD para escolher a sua.")
            admin = User(
                name="Administrador",
                email="admin@escola.com",
                hashed_password=get_password_hash(admin_pass),
                role=UserRole.ADMIN,
                institution_id=inst.id,
            )
            db.add(admin)
            print("✅  Admin criado: admin@escola.com")
        else:
            print("✅  Admin já existe — senha não alterada")

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"❌  Erro no seed: {e}")
    finally:
        db.close()

    _seed_owner()


def _seed_owner():
    owner_email = os.getenv("OWNER_EMAIL", "owner@cognition.com.br")
    owner_pass = os.getenv("OWNER_PASSWORD")
    generated_pass = None
    if not owner_pass:
        generated_pass = secrets.token_urlsafe(12)
        owner_pass = generated_pass
    try:
        with engine.begin() as conn:
            existing = conn.execute(
                text("SELECT id FROM users WHERE email = :email"),
                {"email": owner_email},
            ).fetchone()
            if existing:
                print("✅  Owner já existe")
                return
            inst_id = conn.execute(text("SELECT id FROM institutions LIMIT 1")).scalar()
            if not inst_id:
                print("⚠️   Owner não criado: nenhuma instituição encontrada")
                return
            hashed = get_password_hash(owner_pass)
            conn.execute(
                text("""
                    INSERT INTO users (name, email, hashed_password, role, is_active, institution_id)
                    VALUES (:name, :email, :pwd, 'owner', true, :inst_id)
                """),
                {"name": "Proprietário", "email": owner_email, "pwd": hashed, "inst_id": inst_id},
            )
            print(f"✅  Owner criado: {owner_email}")
            if generated_pass:
                print(f"⚠️   OWNER_PASSWORD não definida — senha gerada: {generated_pass}")
                print("⚠️   Anote esta senha agora: ela não será exibida novamente. Defina OWNER_PASSWORD para escolher a sua.")
    except Exception as e:
        print(f"❌  Erro ao criar owner: {e}")


def _backfill_default_subjects():
    """Garante que toda instituição já existente tenha a lista padrão de matérias."""
    db = SessionLocal()
    try:
        institution_ids = [row[0] for row in db.query(Institution.id).all()]
        for institution_id in institution_ids:
            seed_default_subjects(db, institution_id)
        db.commit()
        print(f"✅  Matérias padrão garantidas em {len(institution_ids)} instituição(ões).")
    except Exception as e:
        db.rollback()
        print(f"⚠️   Backfill de matérias padrão falhou: {e}")
    finally:
        db.close()


def _seed_enem():
    try:
        from app.services.enem.seed import seed_enem
        with engine.begin() as conn:
            total = conn.execute(text("SELECT COUNT(*) FROM enem_questions")).scalar()
        if total > 0:
            print("✅  ENEM seed: questões já existiam ou pasta não encontrada.")
            return
        result = seed_enem()
        total = result.get("total_added", 0)
        if total > 0:
            print(f"✅  ENEM seed: {total} questões importadas.")
        else:
            print("✅  ENEM seed: questões já existiam ou pasta não encontrada.")
    except Exception as e:
        print(f"⚠️   ENEM seed falhou: {e}")


@app.get("/")
def root():
    return {"message": "Sistema de Provas API", "docs": "/docs"}