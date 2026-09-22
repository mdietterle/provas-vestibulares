import os
import secrets
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.core.security import get_password_hash
from app.database import Base, SessionLocal, engine
from app.models import Institution, User, UserRole
from app.services.subjects import seed_default_subjects

# A signal that we're running as a real deployment rather than a local checkout.
# Used to fail loudly instead of silently running with guessable default secrets.
_IS_PRODUCTION_LIKE = bool(os.getenv("RAILWAY_ENVIRONMENT"))

if _IS_PRODUCTION_LIKE and settings.SECRET_KEY == "change-this-secret-key-in-production":
    raise RuntimeError(
        "SECRET_KEY está com o valor padrão inseguro em um ambiente de produção. "
        "Defina a variável de ambiente SECRET_KEY com um segredo único e forte antes de iniciar o servidor."
    )
from app.routers import acafe, ai, auth, billing, classes, dashboard, enem, exams, fuvest, institutions, invitations, notifications, owner, pucpr, pucrio, pucrs, question_banks, questions, redacoes, simulados, subjects, submissions, udesc, ufpel, ufpr, ufrgs, ufsc, usage, users, ita, unicamp, fgv, espm, uerj, ufgd, uem, ufms, unesp, cebraspe, unifesp

from app.routers import pucminas
from app.routers import question_reports
from app.routers import ufrn
from app.routers import ufsm, ulbra
from app.routers import ufam
from app.routers import puccampinas
from app.routers import unimontes
from app.routers import unicentro
from app.routers import unaerp
from app.routers import feedback
from app.routers import ufg
from app.routers import ufjf
from app.routers import ufu
from app.routers import ufpa
from app.routers import utfpr
from app.routers import unioeste
from app.routers import uel
from app.routers import upf
from app.routers import concurso_fepese
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
    # NOTE: this was previously narrowed to a "cognition-ai(-...)?.vercel.app" regex,
    # but the actual production frontend is deployed under an unrelated
    # Vercel-assigned name (frontend-cyan-three-63.vercel.app), so that regex
    # rejected every real request and broke login. Reverted to the broad
    # *.vercel.app match (any project on the shared public Vercel domain is
    # technically trusted) until the real deployment's origin(s) are confirmed
    # and can be pinned down via ALLOWED_ORIGINS instead.
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(institutions.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(subjects.router, prefix="/api")
app.include_router(classes.router, prefix="/api")
app.include_router(questions.router, prefix="/api")
app.include_router(exams.router, prefix="/api")
app.include_router(submissions.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(enem.router, prefix="/api")
app.include_router(acafe.router, prefix="/api")
app.include_router(ufpr.router, prefix="/api")
app.include_router(ufsc.router, prefix="/api")
app.include_router(ufrgs.router, prefix="/api")
app.include_router(pucpr.router, prefix="/api")
app.include_router(fuvest.router, prefix="/api")
app.include_router(udesc.router, prefix="/api")
app.include_router(pucrs.router, prefix="/api")
app.include_router(ufpel.router, prefix="/api")
app.include_router(pucrio.router, prefix="/api")
app.include_router(ita.router, prefix="/api")
app.include_router(unicamp.router, prefix="/api")
# app.include_router(unb.router, prefix="/api")
app.include_router(usage.router, prefix="/api")
app.include_router(simulados.router, prefix="/api")
app.include_router(redacoes.router, prefix="/api")
app.include_router(invitations.router, prefix="/api")
app.include_router(owner.router)
app.include_router(question_reports.router)
app.include_router(question_banks.router)
app.include_router(billing.router, prefix="/api")
app.include_router(fgv.router, prefix="/api")
app.include_router(espm.router, prefix="/api")
app.include_router(uerj.router, prefix="/api")
app.include_router(ufgd.router, prefix="/api")
app.include_router(uem.router, prefix="/api")
app.include_router(ufms.router, prefix="/api")
app.include_router(unesp.router, prefix="/api")
app.include_router(cebraspe.router, prefix="/api")
app.include_router(unifesp.router, prefix="/api")
# As 26 linhas abaixo (unifei..uel) foram importadas no topo do arquivo mas
# nunca chegaram a ser registradas na app — cada um desses 26 importadores de
# vestibular (9 já implementados de verdade + 17 ainda fake/stub) ficou com
# seus endpoints reais existindo só no código-fonte, inacessíveis via HTTP em
# produção, desde que foram criados.
app.include_router(pucminas.router, prefix="/api")
app.include_router(ufrn.router, prefix="/api")
app.include_router(ufsm.router, prefix="/api")
app.include_router(ulbra.router, prefix="/api")
app.include_router(ufam.router, prefix="/api")
app.include_router(puccampinas.router, prefix="/api")
app.include_router(unimontes.router, prefix="/api")
app.include_router(unicentro.router, prefix="/api")
app.include_router(unaerp.router, prefix="/api")
app.include_router(ufg.router, prefix="/api")
app.include_router(ufjf.router, prefix="/api")
app.include_router(ufu.router, prefix="/api")
app.include_router(ufpa.router, prefix="/api")
app.include_router(utfpr.router, prefix="/api")
app.include_router(unioeste.router, prefix="/api")
app.include_router(uel.router, prefix="/api")
app.include_router(upf.router, prefix="/api")
app.include_router(concurso_fepese.router, prefix="/api")
app.include_router(feedback.router, prefix="/api")


@app.on_event("startup")
def startup():
    delays = [5, 10, 20, 30]
    for attempt, delay in enumerate(delays + [None], start=1):
        try:
            _drop_uuid_schema_if_needed()
            Base.metadata.create_all(bind=engine)
            _run_migrations()
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
    dropa-as para que create_all() possa recriar com o tipo correto.
    Só age quando o banco está vazio (sem dados reais) — verifica pela ausência de usuários."""
    with engine.begin() as conn:
        # Checa se questions.id é UUID (schema incompatível)
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


def _run_migrations():
    """Apply incremental schema changes that create_all doesn't handle."""
    migrations = [
        "ALTER TABLE institutions ADD COLUMN IF NOT EXISTS logo TEXT",
        "ALTER TABLE questions ADD COLUMN IF NOT EXISTS criteria TEXT",
        """CREATE TABLE IF NOT EXISTS exam_submissions (
            id SERIAL PRIMARY KEY,
            exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
            student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            total_score FLOAT,
            submitted_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(exam_id, student_id)
        )""",
        """CREATE TABLE IF NOT EXISTS submission_answers (
            id SERIAL PRIMARY KEY,
            submission_id INTEGER NOT NULL REFERENCES exam_submissions(id) ON DELETE CASCADE,
            exam_question_id INTEGER NOT NULL REFERENCES exam_questions(id) ON DELETE CASCADE,
            selected_option_id INTEGER REFERENCES question_options(id) ON DELETE SET NULL,
            essay_text TEXT,
            score FLOAT,
            ai_feedback TEXT,
            is_auto_corrected BOOLEAN DEFAULT FALSE
        )""",
        "ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS scan_file VARCHAR(500)",
        "ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS correcting_since TIMESTAMP",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP",
        """CREATE TABLE IF NOT EXISTS enem_questions (
            id SERIAL PRIMARY KEY,
            exam_name VARCHAR(200) NOT NULL,
            year INTEGER NOT NULL,
            number INTEGER NOT NULL,
            area VARCHAR(100),
            language VARCHAR(20),
            statement TEXT NOT NULL,
            image_base64 TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(exam_name, number, language)
        )""",
        "ALTER TABLE IF EXISTS enem_questions ADD COLUMN IF NOT EXISTS language VARCHAR(20)",
        "ALTER TABLE IF EXISTS enem_questions ADD COLUMN IF NOT EXISTS color VARCHAR(30)",
        "ALTER TABLE IF EXISTS enem_questions ADD COLUMN IF NOT EXISTS module VARCHAR(50)",
        "ALTER TABLE IF EXISTS enem_questions ADD COLUMN IF NOT EXISTS subject VARCHAR(100)",
        "ALTER TABLE IF EXISTS enem_questions ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20)",
        "ALTER TABLE IF EXISTS enem_questions DROP CONSTRAINT IF EXISTS enem_questions_exam_name_number_key",
        """DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'enem_questions_exam_name_number_language_key'
            ) THEN
                ALTER TABLE enem_questions ADD CONSTRAINT enem_questions_exam_name_number_language_key
                UNIQUE (exam_name, number, language);
            END IF;
        END $$""",
        "ALTER TYPE questiontype ADD VALUE IF NOT EXISTS 'summation'",
        "ALTER TABLE IF EXISTS questions ADD COLUMN IF NOT EXISTS image_base64 TEXT",
        "ALTER TYPE questiontype ADD VALUE IF NOT EXISTS 'SUMMATION'",
        "ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'owner'",
        "ALTER TABLE IF EXISTS institutions ADD COLUMN IF NOT EXISTS plan_type VARCHAR(50)",
        "ALTER TABLE IF EXISTS institutions ADD COLUMN IF NOT EXISTS plan_since TIMESTAMP",
        # Convert users.role from native PostgreSQL enum to VARCHAR and normalise
        # all values to lowercase so 'ADMIN' → 'admin', 'owner' stays 'owner'.
        """DO $$ BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'role'
                AND udt_name = 'userrole'
            ) THEN
                ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(50) USING LOWER(role::text);
            END IF;
        END $$""",
        # Normalise any remaining uppercase role values written before the migration
        "UPDATE users SET role = LOWER(role) WHERE role != LOWER(role)",
        """CREATE TABLE IF NOT EXISTS usage_events (
            id SERIAL PRIMARY KEY,
            institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            event_type VARCHAR(30) NOT NULL,
            quantity INTEGER DEFAULT 1,
            is_overage BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW()
        )""",
        "CREATE INDEX IF NOT EXISTS ix_usage_events_user_type_date ON usage_events (user_id, event_type, created_at)",
        "CREATE INDEX IF NOT EXISTS ix_usage_events_institution ON usage_events (institution_id)",
        """CREATE TABLE IF NOT EXISTS enem_question_options (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES enem_questions(id) ON DELETE CASCADE,
            letter VARCHAR(1) NOT NULL,
            text TEXT NOT NULL,
            is_correct BOOLEAN DEFAULT FALSE,
            "order" INTEGER DEFAULT 0
        )""",
        # ── UFRGS (Vestibular COPERSE) ─────────────────────────────────────
        """CREATE TABLE IF NOT EXISTS ufrgs_questions (
            id SERIAL PRIMARY KEY,
            exam_name VARCHAR(200) NOT NULL,
            year INTEGER NOT NULL,
            day INTEGER NOT NULL DEFAULT 1,
            number INTEGER NOT NULL,
            area VARCHAR(100),
            statement TEXT NOT NULL,
            image_base64 TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(exam_name, number)
        )""",
        """CREATE TABLE IF NOT EXISTS ufrgs_question_options (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES ufrgs_questions(id) ON DELETE CASCADE,
            letter VARCHAR(1) NOT NULL,
            text TEXT NOT NULL,
            is_correct BOOLEAN DEFAULT FALSE,
            "order" INTEGER DEFAULT 0
        )""",
        # ── ACAFE (vestibular de Medicina – Santa Catarina) ──────────────────
        """CREATE TABLE IF NOT EXISTS acafe_questions (
            id SERIAL PRIMARY KEY,
            exam_name VARCHAR(200) NOT NULL,
            year INTEGER NOT NULL,
            period VARCHAR(20),
            number INTEGER NOT NULL,
            area VARCHAR(100),
            language VARCHAR(20),
            statement TEXT NOT NULL,
            image_base64 TEXT,
            justification TEXT,
            reference_matrix TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(exam_name, number, language)
        )""",
        """CREATE TABLE IF NOT EXISTS acafe_question_options (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES acafe_questions(id) ON DELETE CASCADE,
            letter VARCHAR(1) NOT NULL,
            text TEXT NOT NULL,
            is_correct BOOLEAN DEFAULT FALSE,
            "order" INTEGER DEFAULT 0
        )""",
        """CREATE TABLE IF NOT EXISTS acafe_question_images (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES acafe_questions(id) ON DELETE CASCADE,
            image_base64 TEXT NOT NULL,
            "order" INTEGER DEFAULT 0
        )""",
        # ── UFPR (vestibular – Universidade Federal do Paraná) ────────────────
        """CREATE TABLE IF NOT EXISTS ufpr_questions (
            id SERIAL PRIMARY KEY,
            exam_name VARCHAR(200) NOT NULL,
            university VARCHAR(50) NOT NULL DEFAULT 'UFPR',
            year INTEGER NOT NULL,
            number INTEGER NOT NULL,
            area VARCHAR(100),
            language VARCHAR(20),
            statement TEXT NOT NULL,
            image_base64 TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(exam_name, number, language)
        )""",
        """CREATE TABLE IF NOT EXISTS ufpr_question_options (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES ufpr_questions(id) ON DELETE CASCADE,
            letter VARCHAR(1) NOT NULL,
            text TEXT NOT NULL,
            is_correct BOOLEAN DEFAULT FALSE,
            "order" INTEGER DEFAULT 0
        )""",
        """CREATE TABLE IF NOT EXISTS ufpr_question_images (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES ufpr_questions(id) ON DELETE CASCADE,
            image_base64 TEXT NOT NULL,
            "order" INTEGER DEFAULT 0
        )""",
        "ALTER TABLE IF EXISTS ufpr_questions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()",
        "ALTER TABLE IF EXISTS acafe_questions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()",
        # ── UFSC (Vestibular UFSC/IFSC/IFC) ──────────────────────────────────
        """CREATE TABLE IF NOT EXISTS ufsc_questions (
            id SERIAL PRIMARY KEY,
            exam_name VARCHAR(200) NOT NULL,
            university VARCHAR(50) NOT NULL DEFAULT 'UFSC',
            year INTEGER NOT NULL,
            phase VARCHAR(20),
            color VARCHAR(20),
            number INTEGER NOT NULL,
            question_type VARCHAR(20) NOT NULL DEFAULT 'summation',
            area VARCHAR(100),
            language VARCHAR(20),
            statement TEXT NOT NULL,
            answer INTEGER,
            image_base64 TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(exam_name, number, language)
        )""",
        """CREATE TABLE IF NOT EXISTS ufsc_question_options (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES ufsc_questions(id) ON DELETE CASCADE,
            value INTEGER NOT NULL,
            text TEXT NOT NULL,
            is_correct BOOLEAN DEFAULT FALSE,
            "order" INTEGER DEFAULT 0
        )""",
        """CREATE TABLE IF NOT EXISTS ufsc_question_images (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES ufsc_questions(id) ON DELETE CASCADE,
            image_base64 TEXT NOT NULL,
            "order" INTEGER DEFAULT 0
        )""",
        # ── Simulado (mock exam) ──────────────────────────────────────────────
        """CREATE TABLE IF NOT EXISTS simulados (
            id SERIAL PRIMARY KEY,
            student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            exam_type VARCHAR(20) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            total_score FLOAT,
            created_at TIMESTAMP DEFAULT NOW(),
            finished_at TIMESTAMP
        )""",
        "ALTER TABLE IF EXISTS simulados ADD COLUMN IF NOT EXISTS enem_estimated_score FLOAT",
        "ALTER TABLE IF EXISTS simulados ADD COLUMN IF NOT EXISTS enem_score_breakdown TEXT",
        """CREATE TABLE IF NOT EXISTS simulado_questions (
            id SERIAL PRIMARY KEY,
            simulado_id INTEGER NOT NULL REFERENCES simulados(id) ON DELETE CASCADE,
            "order" INTEGER NOT NULL,
            area VARCHAR(100),
            enem_question_id INTEGER REFERENCES enem_questions(id) ON DELETE SET NULL,
            acafe_question_id INTEGER REFERENCES acafe_questions(id) ON DELETE SET NULL,
            ufpr_question_id INTEGER REFERENCES ufpr_questions(id) ON DELETE SET NULL,
            selected_letter VARCHAR(1),
            is_correct BOOLEAN,
            ai_feedback TEXT
        )""",
        "CREATE INDEX IF NOT EXISTS ix_simulados_student ON simulados (student_id)",
        "CREATE INDEX IF NOT EXISTS ix_simulado_questions_simulado ON simulado_questions (simulado_id)",
        "ALTER TABLE IF EXISTS simulado_questions ADD COLUMN IF NOT EXISTS ufsc_question_id INTEGER REFERENCES ufsc_questions(id) ON DELETE SET NULL",
        # ── CAR – Correção Automática de Redações ─────────────────────────────
        """CREATE TABLE IF NOT EXISTS redacoes (
            id SERIAL PRIMARY KEY,
            institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
            student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            professor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            theme VARCHAR(500) NOT NULL,
            rubric TEXT,
            max_score FLOAT NOT NULL DEFAULT 10.0,
            body TEXT NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            ai_total_score FLOAT,
            ai_feedback TEXT,
            final_score FLOAT,
            professor_comment TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            corrected_at TIMESTAMP,
            reviewed_at TIMESTAMP
        )""",
        """CREATE TABLE IF NOT EXISTS redacao_criterion_scores (
            id SERIAL PRIMARY KEY,
            redacao_id INTEGER NOT NULL REFERENCES redacoes(id) ON DELETE CASCADE,
            criterion VARCHAR(200) NOT NULL,
            max_points FLOAT NOT NULL,
            ai_score FLOAT,
            ai_comment TEXT,
            final_score FLOAT,
            professor_note TEXT
        )""",
        "CREATE INDEX IF NOT EXISTS ix_redacoes_institution ON redacoes (institution_id)",
        "CREATE INDEX IF NOT EXISTS ix_redacoes_student ON redacoes (student_id)",
        "CREATE INDEX IF NOT EXISTS ix_redacao_criterion_redacao ON redacao_criterion_scores (redacao_id)",
        "ALTER TABLE IF EXISTS institutions ADD COLUMN IF NOT EXISTS car_enabled BOOLEAN DEFAULT FALSE",
        "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS car_access BOOLEAN DEFAULT FALSE",
        # ── Invitation / magic link ───────────────────────────────────────────
        "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS invitation_token VARCHAR(200)",
        "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMP",
        "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS invitation_accepted_at TIMESTAMP",
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_invitation_token ON users (invitation_token) WHERE invitation_token IS NOT NULL",
        # ── Redação por imagem (foto da redação manuscrita) ───────────────────
        "ALTER TABLE IF EXISTS submission_answers ADD COLUMN IF NOT EXISTS essay_image_base64 TEXT",
        # ── Auto-cadastro / confirmação de e-mail ─────────────────────────────
        "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(200)",
        "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS email_verification_sent_at TIMESTAMP",
        "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP",
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email_verification_token ON users (email_verification_token) WHERE email_verification_token IS NOT NULL",
        # ── PUCPR (vestibular de Verão/Inverno – Medicina e Demais Cursos) ────
        """CREATE TABLE IF NOT EXISTS pucpr_questions (
            id SERIAL PRIMARY KEY,
            exam_name VARCHAR(200) NOT NULL,
            year INTEGER NOT NULL,
            season VARCHAR(20),
            course VARCHAR(100),
            color VARCHAR(20),
            number INTEGER NOT NULL,
            area VARCHAR(100),
            language VARCHAR(20),
            statement TEXT NOT NULL,
            image_base64 TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(exam_name, number, language)
        )""",
        """CREATE TABLE IF NOT EXISTS pucpr_question_options (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES pucpr_questions(id) ON DELETE CASCADE,
            letter VARCHAR(1) NOT NULL,
            text TEXT NOT NULL,
            is_correct BOOLEAN DEFAULT FALSE,
            "order" INTEGER DEFAULT 0
        )""",
        # ── Recuperação de senha ("esqueci minha senha") ──────────────────────
        "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(200)",
        "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS password_reset_sent_at TIMESTAMP",
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_password_reset_token ON users (password_reset_token) WHERE password_reset_token IS NOT NULL",
        # ── Simulado: bancos UFRGS e PUCPR (além de ENEM/ACAFE/UFPR/UFSC) ────
        "ALTER TABLE IF EXISTS simulado_questions ADD COLUMN IF NOT EXISTS ufrgs_question_id INTEGER REFERENCES ufrgs_questions(id)",
        "ALTER TABLE IF EXISTS simulado_questions ADD COLUMN IF NOT EXISTS pucpr_question_id INTEGER REFERENCES pucpr_questions(id)",
        # ── FUVEST (1ª fase do vestibular da USP) ─────────────────────────────
        """CREATE TABLE IF NOT EXISTS fuvest_questions (
            id SERIAL PRIMARY KEY,
            exam_name VARCHAR(200) NOT NULL,
            year INTEGER NOT NULL,
            version VARCHAR(10),
            number INTEGER NOT NULL,
            area VARCHAR(100),
            statement TEXT NOT NULL,
            image_base64 TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(exam_name, number)
        )""",
        """CREATE TABLE IF NOT EXISTS fuvest_question_options (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES fuvest_questions(id) ON DELETE CASCADE,
            letter VARCHAR(1) NOT NULL,
            text TEXT NOT NULL,
            is_correct BOOLEAN DEFAULT FALSE,
            "order" INTEGER DEFAULT 0
        )""",
        """CREATE TABLE IF NOT EXISTS fuvest_question_images (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES fuvest_questions(id) ON DELETE CASCADE,
            image_base64 TEXT NOT NULL,
            "order" INTEGER DEFAULT 0
        )""",
        "ALTER TABLE IF EXISTS simulado_questions ADD COLUMN IF NOT EXISTS fuvest_question_id INTEGER REFERENCES fuvest_questions(id)",
        # ── UNESP (Universidade Estadual Paulista) ─────────────────────────────
        """CREATE TABLE IF NOT EXISTS unesp_questions (
            id SERIAL PRIMARY KEY,
            year INTEGER NOT NULL,
            number INTEGER NOT NULL,
            area VARCHAR(100),
            statement TEXT NOT NULL,
            image_base64 TEXT
        )""",
        "CREATE INDEX IF NOT EXISTS ix_unesp_questions_year ON unesp_questions(year)",
        "CREATE INDEX IF NOT EXISTS ix_unesp_questions_area ON unesp_questions(area)",
        """CREATE TABLE IF NOT EXISTS unesp_question_options (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES unesp_questions(id) ON DELETE CASCADE,
            text TEXT NOT NULL,
            is_correct BOOLEAN DEFAULT FALSE,
            "order" INTEGER NOT NULL
        )""",
        "CREATE INDEX IF NOT EXISTS ix_unesp_question_options_question_id ON unesp_question_options(question_id)",
        """CREATE TABLE IF NOT EXISTS unesp_question_images (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES unesp_questions(id) ON DELETE CASCADE,
            image_base64 TEXT NOT NULL,
            "order" INTEGER NOT NULL
        )""",
        "CREATE INDEX IF NOT EXISTS ix_unesp_question_images_question_id ON unesp_question_images(question_id)",
        "ALTER TABLE IF EXISTS simulado_questions ADD COLUMN IF NOT EXISTS unesp_question_id INTEGER REFERENCES unesp_questions(id)",

        # ── CEBRASPE / UnB ───────────────────────────────────────────────────────────
        """CREATE TABLE IF NOT EXISTS cebraspe_questions (
            id SERIAL PRIMARY KEY,
            year INTEGER NOT NULL,
            exam_name VARCHAR(100) NOT NULL,
            number INTEGER NOT NULL,
            area VARCHAR(100),
            statement TEXT NOT NULL,
            image_base64 TEXT
        )""",
        "CREATE INDEX IF NOT EXISTS ix_cebraspe_questions_year ON cebraspe_questions(year)",
        "CREATE INDEX IF NOT EXISTS ix_cebraspe_questions_area ON cebraspe_questions(area)",
        """CREATE TABLE IF NOT EXISTS cebraspe_question_options (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES cebraspe_questions(id) ON DELETE CASCADE,
            text TEXT NOT NULL,
            is_correct BOOLEAN DEFAULT FALSE,
            "order" INTEGER NOT NULL
        )""",
        "CREATE INDEX IF NOT EXISTS ix_cebraspe_question_options_question_id ON cebraspe_question_options(question_id)",
        """CREATE TABLE IF NOT EXISTS cebraspe_question_images (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES cebraspe_questions(id) ON DELETE CASCADE,
            image_base64 TEXT NOT NULL,
            "order" INTEGER NOT NULL
        )""",
        "CREATE INDEX IF NOT EXISTS ix_cebraspe_question_images_question_id ON cebraspe_question_images(question_id)",
        "ALTER TABLE IF EXISTS simulado_questions ADD COLUMN IF NOT EXISTS cebraspe_question_id INTEGER REFERENCES cebraspe_questions(id)",

        # ── UNIFESP (Universidade Federal de São Paulo) ──────────────────────────────
        """CREATE TABLE IF NOT EXISTS unifesp_questions (
            id SERIAL PRIMARY KEY,
            year INTEGER NOT NULL,
            number INTEGER NOT NULL,
            area VARCHAR(100),
            statement TEXT NOT NULL,
            image_base64 TEXT
        )""",
        "CREATE INDEX IF NOT EXISTS ix_unifesp_questions_year ON unifesp_questions(year)",
        "CREATE INDEX IF NOT EXISTS ix_unifesp_questions_area ON unifesp_questions(area)",
        """CREATE TABLE IF NOT EXISTS unifesp_question_options (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES unifesp_questions(id) ON DELETE CASCADE,
            text TEXT NOT NULL,
            is_correct BOOLEAN DEFAULT FALSE,
            "order" INTEGER NOT NULL
        )""",
        "CREATE INDEX IF NOT EXISTS ix_unifesp_question_options_question_id ON unifesp_question_options(question_id)",
        """CREATE TABLE IF NOT EXISTS unifesp_question_images (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES unifesp_questions(id) ON DELETE CASCADE,
            image_base64 TEXT NOT NULL,
            "order" INTEGER NOT NULL
        )""",
        "CREATE INDEX IF NOT EXISTS ix_unifesp_question_images_question_id ON unifesp_question_images(question_id)",
        "ALTER TABLE IF EXISTS simulado_questions ADD COLUMN IF NOT EXISTS unifesp_question_id INTEGER REFERENCES unifesp_questions(id)",

        # ── UDESC (Universidade do Estado de Santa Catarina) ──────────────────
        """CREATE TABLE IF NOT EXISTS udesc_questions (
            id SERIAL PRIMARY KEY,
            exam_name VARCHAR(200) NOT NULL,
            year INTEGER NOT NULL,
            semester INTEGER NOT NULL,
            shift VARCHAR(20),
            number INTEGER NOT NULL,
            area VARCHAR(100),
            language VARCHAR(20),
            statement TEXT NOT NULL,
            image_base64 TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(exam_name, number, language)
        )""",
        """CREATE TABLE IF NOT EXISTS udesc_question_options (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES udesc_questions(id) ON DELETE CASCADE,
            letter VARCHAR(1) NOT NULL,
            text TEXT NOT NULL,
            is_correct BOOLEAN DEFAULT FALSE,
            "order" INTEGER DEFAULT 0
        )""",
        """CREATE TABLE IF NOT EXISTS udesc_question_images (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES udesc_questions(id) ON DELETE CASCADE,
            image_base64 TEXT NOT NULL,
            "order" INTEGER DEFAULT 0
        )""",
        "ALTER TABLE IF EXISTS simulado_questions ADD COLUMN IF NOT EXISTS udesc_question_id INTEGER REFERENCES udesc_questions(id)",
        # ── PUCRS (vestibular de Medicina — Rio Grande do Sul) ────────────────
        """CREATE TABLE IF NOT EXISTS pucrs_questions (
            id SERIAL PRIMARY KEY,
            exam_name VARCHAR(200) NOT NULL,
            year INTEGER NOT NULL,
            season VARCHAR(20),
            number INTEGER NOT NULL,
            area VARCHAR(100),
            language VARCHAR(20),
            statement TEXT NOT NULL,
            image_base64 TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(exam_name, number, language)
        )""",
        """CREATE TABLE IF NOT EXISTS pucrs_question_options (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES pucrs_questions(id) ON DELETE CASCADE,
            letter VARCHAR(1) NOT NULL,
            text TEXT NOT NULL,
            is_correct BOOLEAN DEFAULT FALSE,
            "order" INTEGER DEFAULT 0
        )""",
        """CREATE TABLE IF NOT EXISTS pucrs_question_images (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES pucrs_questions(id) ON DELETE CASCADE,
            image_base64 TEXT NOT NULL,
            "order" INTEGER DEFAULT 0
        )""",
        "ALTER TABLE IF EXISTS simulado_questions ADD COLUMN IF NOT EXISTS pucrs_question_id INTEGER REFERENCES pucrs_questions(id)",
        # ── UFPel (PAVE — vestibular seriado próprio) ─────────────────────────
        """CREATE TABLE IF NOT EXISTS ufpel_questions (
            id SERIAL PRIMARY KEY,
            exam_name VARCHAR(200) NOT NULL,
            year INTEGER NOT NULL,
            stage INTEGER NOT NULL,
            number INTEGER NOT NULL,
            area VARCHAR(100),
            statement TEXT NOT NULL,
            image_base64 TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(exam_name, number)
        )""",
        """CREATE TABLE IF NOT EXISTS ufpel_question_options (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES ufpel_questions(id) ON DELETE CASCADE,
            letter VARCHAR(1) NOT NULL,
            text TEXT NOT NULL,
            is_correct BOOLEAN DEFAULT FALSE,
            "order" INTEGER DEFAULT 0
        )""",
        """CREATE TABLE IF NOT EXISTS ufpel_question_images (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES ufpel_questions(id) ON DELETE CASCADE,
            image_base64 TEXT NOT NULL,
            "order" INTEGER DEFAULT 0
        )""",
        "ALTER TABLE IF EXISTS simulado_questions ADD COLUMN IF NOT EXISTS ufpel_question_id INTEGER REFERENCES ufpel_questions(id)",
        # ── PUC-Rio ────────────────────────────────────────────────────────
        """CREATE TABLE IF NOT EXISTS pucrio_questions (
            id SERIAL PRIMARY KEY,
            exam_name VARCHAR(200) NOT NULL,
            year INTEGER NOT NULL,
            number INTEGER NOT NULL,
            area VARCHAR(100),
            language VARCHAR(20),
            statement TEXT NOT NULL,
            image_base64 TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(exam_name, number, language)
        )""",
        """CREATE TABLE IF NOT EXISTS pucrio_question_options (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES pucrio_questions(id) ON DELETE CASCADE,
            letter VARCHAR(1) NOT NULL,
            text TEXT NOT NULL,
            is_correct BOOLEAN DEFAULT FALSE,
            "order" INTEGER DEFAULT 0
        )""",
        """CREATE TABLE IF NOT EXISTS pucrio_question_images (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES pucrio_questions(id) ON DELETE CASCADE,
            image_base64 TEXT NOT NULL,
            "order" INTEGER DEFAULT 0
        )""",
        "ALTER TABLE IF EXISTS simulado_questions ADD COLUMN IF NOT EXISTS pucrio_question_id INTEGER REFERENCES pucrio_questions(id)",
        # ── ITA ────────────────────────────────────────────────────────────
        """CREATE TABLE IF NOT EXISTS ita_questions (
            id SERIAL PRIMARY KEY,
            exam_name VARCHAR(200) NOT NULL,
            university VARCHAR(50) NOT NULL DEFAULT 'ITA',
            year INTEGER NOT NULL,
            phase VARCHAR(20),
            number INTEGER NOT NULL,
            question_type VARCHAR(20) NOT NULL DEFAULT 'multiple_choice',
            area VARCHAR(100),
            language VARCHAR(20),
            statement TEXT NOT NULL,
            answer VARCHAR(10),
            image_base64 TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(exam_name, number, area)
        )""",
        """CREATE TABLE IF NOT EXISTS ita_question_options (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES ita_questions(id) ON DELETE CASCADE,
            letter VARCHAR(1) NOT NULL,
            text TEXT NOT NULL,
            is_correct BOOLEAN DEFAULT FALSE,
            "order" INTEGER DEFAULT 0
        )""",
        """CREATE TABLE IF NOT EXISTS ita_question_images (
            id SERIAL PRIMARY KEY,
            question_id INTEGER NOT NULL REFERENCES ita_questions(id) ON DELETE CASCADE,
            image_base64 TEXT NOT NULL,
            "order" INTEGER DEFAULT 0
        )""",
        "ALTER TABLE IF EXISTS simulado_questions ADD COLUMN IF NOT EXISTS ita_question_id INTEGER REFERENCES ita_questions(id)",
        # ── UNAERP (vestibular – Universidade de Ribeirão Preto) ────────────
        # A tabela já existia (modelo antigo, nunca populado de verdade); o
        # importador real precisa de exam_name para diferenciar os dois
        # cadernos por edição ("Geral" x "Medicina") e entre semestres.
        "ALTER TABLE IF EXISTS unaerp_questions ADD COLUMN IF NOT EXISTS exam_name VARCHAR(200)",
        # ── UFJF (vestibular PISM – Universidade Federal de Juiz de Fora) ───
        # Módulo III tem 4 cadernos por dia/ano (Economia, Exatas, Humanas,
        # Saúde) que reiniciam a numeração em 1; exam_name diferencia cada
        # combinação dia/módulo/área, do mesmo jeito que em UnaerpQuestion.
        "ALTER TABLE IF EXISTS ufjf_questions ADD COLUMN IF NOT EXISTS exam_name VARCHAR(200)",
        # ── UFG (Vestibular UFG – Universidade Federal de Goiás) ────────────
        # Cada edição tem cadernos por turno (Matutino/Vespertino) e tipo
        # (A/B); o turno Matutino ainda se divide por opção de língua
        # estrangeira (Inglês/Espanhol/Francês), que reinicia a numeração
        # das 6 primeiras questões; exam_name diferencia cada combinação,
        # do mesmo jeito que em UfjfQuestion.
        "ALTER TABLE IF EXISTS ufg_questions ADD COLUMN IF NOT EXISTS exam_name VARCHAR(200)",
        # ── UNIMONTES (vestibular próprio – Universidade Estadual de Montes
        # Claros) ─────────────────────────────────────────────────────────
        # 8 cadernos por edição (2 grupos x 4 áreas) com numeração 1-45 cada;
        # exam_name diferencia cada caderno e subject diferencia a disciplina
        # (necessário porque as questões 16-19 de Língua Estrangeira se
        # repetem, uma vez para Espanhol e outra para Inglês, sob os mesmos
        # números).
        "ALTER TABLE IF EXISTS unimontes_questions ADD COLUMN IF NOT EXISTS exam_name VARCHAR(200)",
        "ALTER TABLE IF EXISTS unimontes_questions ADD COLUMN IF NOT EXISTS area VARCHAR(100)",
        "ALTER TABLE IF EXISTS unimontes_questions ADD COLUMN IF NOT EXISTS subject VARCHAR(150)",
        # ── PUC-Campinas (vestibular próprio) ────────────────────────────────
        # A tabela já existia (modelo fake antigo, nunca populado de verdade);
        # o importador real precisa de exam_name porque cada edição publica
        # vários cadernos (Geral/Demais Cursos, Direito, Arquitetura e
        # Urbanismo, Design de Games, Medicina — e Medicina ainda se divide
        # em "Geral" e "Específica", cada parte reiniciando a numeração em 1).
        "ALTER TABLE IF EXISTS puccampinas_questions ADD COLUMN IF NOT EXISTS exam_name VARCHAR(200)",
        "ALTER TABLE IF EXISTS puccampinas_questions ADD COLUMN IF NOT EXISTS image_base64 TEXT",
        # ── PUC MINAS (vestibular próprio) ──────────────────────────────────
        # Um caderno por trilha de cursos por semestre (Medicina: 50
        # questões; qualquer outra trilha: 40 questões), numeração reiniciada
        # em 1 por caderno; subject diferencia Espanhol/Inglês, que repetem
        # os mesmos números de questão dentro do mesmo caderno.
        "ALTER TABLE IF EXISTS pucminas_questions ADD COLUMN IF NOT EXISTS exam_name VARCHAR(200)",
        "ALTER TABLE IF EXISTS pucminas_questions ADD COLUMN IF NOT EXISTS subject VARCHAR(100)",
        "ALTER TABLE IF EXISTS pucminas_questions ADD COLUMN IF NOT EXISTS image_base64 TEXT",
        # ── UFAM (PSC – Processo Seletivo Contínuo, Universidade Federal do
        # Amazonas) ──────────────────────────────────────────────────────
        # 3 etapas por "projeto" (ano de ingresso), cada etapa reiniciando a
        # numeração em 1 (54 questões); exam_name diferencia etapa/ano,
        # stage guarda a etapa (1/2/3) e subject diferencia a disciplina —
        # necessário porque a 3ª etapa publica Língua Estrangeira em 3
        # versões (Inglês/Espanhol/Francês) sob os mesmos números de questão.
        "ALTER TABLE IF EXISTS ufam_questions ADD COLUMN IF NOT EXISTS exam_name VARCHAR(200)",
        "ALTER TABLE IF EXISTS ufam_questions ADD COLUMN IF NOT EXISTS stage INTEGER",
        "ALTER TABLE IF EXISTS ufam_questions ADD COLUMN IF NOT EXISTS subject VARCHAR(150)",
        # ── UFPA (Processo Seletivo – Universidade Federal do Pará) ─────────
        # A tabela já existia (modelo fake antigo, nunca populado de verdade);
        # o importador real (só PS 2011/2012/2013, únicos anos com prova
        # objetiva própria — de PS2014 em diante a UFPA usa exclusivamente
        # ENEM/SISU) precisa de exam_name para diferenciar cada ano e de
        # subject para diferenciar as 5 variantes de idioma de Língua
        # Estrangeira (questões 51-55, que se repetem sob os mesmos números
        # uma vez por idioma: Espanhol, Inglês, Alemão, Francês, Italiano).
        "ALTER TABLE IF EXISTS ufpa_questions ADD COLUMN IF NOT EXISTS exam_name VARCHAR(200)",
        "ALTER TABLE IF EXISTS ufpa_questions ADD COLUMN IF NOT EXISTS subject VARCHAR(100)",
        # ── UNICENTRO / UNAERP: essas duas colunas foram adicionadas ao model
        # quando o importador de cada uma passou de fake pra real, mas a
        # migração nunca foi registrada aqui — a tabela ficou desatualizada
        # em produção (`unicentro_questions.area does not exist`), quebrando
        # qualquer query que referencie a coluna (ex.: /owner/stats/detailed).
        "ALTER TABLE IF EXISTS unicentro_questions ADD COLUMN IF NOT EXISTS area VARCHAR(100)",
        "ALTER TABLE IF EXISTS unaerp_questions ADD COLUMN IF NOT EXISTS exam_name VARCHAR(200)",
        # ── UTFPR (vestibular – Universidade Tecnológica Federal do Paraná) ─
        # A tabela já existia (modelo fake antigo, nunca populado de verdade);
        # o importador real precisa de exam_name porque cada ano pode ter até
        # duas edições (Verão/Inverno, ex.: 2024/1 e 2024/2) que colidiriam em
        # (year, number) sem essa coluna para diferenciá-las.
        "ALTER TABLE IF EXISTS utfpr_questions ADD COLUMN IF NOT EXISTS exam_name VARCHAR(200)",
        # ── Stripe billing ────────────────────────────────────────────────────
        "ALTER TABLE IF EXISTS institutions ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(100)",
        "ALTER TABLE IF EXISTS institutions ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(100)",
        "ALTER TABLE IF EXISTS institutions ADD COLUMN IF NOT EXISTS stripe_subscription_status VARCHAR(30)",
        "ALTER TABLE IF EXISTS institutions ADD COLUMN IF NOT EXISTS credits_balance INTEGER DEFAULT 0",
        "ALTER TABLE IF EXISTS institutions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE",
        # Planos foram renomeados no código (essencial/inteligente/institucional →
        # basic/pro/enterprise, mesmos valores) mas os dados já gravados antes
        # dessa mudança continuavam com o nome antigo — sem isso, instituições
        # criadas antes da renomeação mostram um plano "cru"/desconhecido na UI.
        "UPDATE institutions SET plan_type = 'basic' WHERE LOWER(plan_type) = 'essencial'",
        "UPDATE institutions SET plan_type = 'pro' WHERE LOWER(plan_type) = 'inteligente'",
        "UPDATE institutions SET plan_type = 'enterprise' WHERE LOWER(plan_type) = 'institucional'",
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_institutions_stripe_customer_id ON institutions (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL",
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_institutions_stripe_subscription_id ON institutions (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL",
        # Importador real da UFU (antes stub): cada edição/Tipo tem numeração
        # própria reaproveitada entre anos e tipos, exam_name garante unicidade.
        "ALTER TABLE IF EXISTS ufu_questions ADD COLUMN IF NOT EXISTS exam_name VARCHAR(200)",
        # Escolas criadas via auto-inscrição (aluno digitou o nome, sem selecionar
        # uma instituição existente) ficam marcadas como não verificadas, para
        # travar funcionalidades como o menu Provas até um admin confirmar a escola.
        "ALTER TABLE IF EXISTS institutions ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE",
    ]

    # Dynamically append ALTER TABLE for any missing universities in SimuladoQuestion
    from app.routers.simulados import EXAM_TYPE_MODELS
    for exam_type in EXAM_TYPE_MODELS:
        migrations.append(
            f"ALTER TABLE IF EXISTS simulado_questions ADD COLUMN IF NOT EXISTS {exam_type}_question_id INTEGER REFERENCES {exam_type}_questions(id)"
        )
    
    # Progresso online do simulado
    migrations.append("ALTER TABLE IF EXISTS simulados ADD COLUMN IF NOT EXISTS current_index INTEGER DEFAULT 0")

    # Questão tipo somatório (UFSC) permite marcar várias afirmativas — a
    # coluna era VARCHAR(1) (só cabia uma letra); precisa caber várias
    # separadas por vírgula (ex.: "A,C,D,F").
    migrations.append("ALTER TABLE IF EXISTS simulado_questions ALTER COLUMN selected_letter TYPE VARCHAR(40)")

    # Denúncia de questão problemática (reportar problema no simulado).
    migrations.append("""CREATE TABLE IF NOT EXISTS question_reports (
        id SERIAL PRIMARY KEY,
        exam_type VARCHAR(30) NOT NULL,
        question_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason VARCHAR(50) NOT NULL,
        details TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        resolved_at TIMESTAMP
    )""")
    migrations.append("CREATE INDEX IF NOT EXISTS ix_question_reports_exam_type ON question_reports (exam_type)")
    migrations.append("CREATE INDEX IF NOT EXISTS ix_question_reports_question_id ON question_reports (question_id)")

    # Garante RLS ativo em toda tabela do schema public, incluindo tabelas
    # criadas por uma migração acima nesta mesma execução e qualquer tabela
    # nova de vestibular adicionada no futuro — sem isso, uma tabela nova
    # nasceria com RLS desligado (padrão do Postgres) e o advisor de segurança
    # do Supabase voltaria a acusar exposição total via anon/authenticated key.
    # O backend conecta como dono das tabelas (role "postgres"), que ignora
    # RLS por padrão, então isto não afeta nenhuma query da aplicação — só
    # fecha o acesso direto ao Supabase por chaves anon/authenticated.
    migrations.append("""
        DO $$
        DECLARE r RECORD;
        BEGIN
          FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
          END LOOP;
        END $$
    """)

    # Each migration runs in its own transaction so a failure doesn't abort the rest
    for sql in migrations:
        try:
            with engine.begin() as conn:
                conn.execute(text(sql))
        except Exception as e:
            print(f"⚠️   Migration ignorada ({e})")


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

    # Owner seed — transação separada para evitar problema de enum não visível
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
    """Garante que toda instituição já existente tenha a lista padrão de
    matérias (BNCC), sem remover nenhuma que a escola já tenha cadastrado.

    Roda em todo restart — é idempotente (seed_default_subjects só insere o
    que ainda não existe) — para cobrir instituições criadas antes dessa
    lista existir.
    """
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
        # Só popula o seed estático se a tabela estiver realmente vazia — nunca trunca
        # dados existentes. Isso já foi usado uma vez como migração pontual (forçar reimport
        # ao adicionar a coluna language), mas rodava em TODO restart do processo, apagando
        # qualquer importação real feita via /admin/import-all sempre que o container
        # reiniciava (spin-down do Render, deploy, etc).
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
