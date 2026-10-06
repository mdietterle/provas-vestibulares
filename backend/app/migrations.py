"""Incremental schema migrations extracted from main.py.
Each migration runs in its own transaction so a failure doesn't abort the rest.
"""
from sqlalchemy import text
from app.database import engine


def run_migrations() -> None:
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
        """DO $$ BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'role'
                AND udt_name = 'userrole'
            ) THEN
                ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(50) USING LOWER(role::text);
            END IF;
        END $$""",
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
        # UFRGS
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
        # ACAFE
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
        # UFPR
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
        # UFSC
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
        # Simulado
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
        # CAR – Redações
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
        # Invitation / magic link
        "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS invitation_token VARCHAR(200)",
        "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMP",
        "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS invitation_accepted_at TIMESTAMP",
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_invitation_token ON users (invitation_token) WHERE invitation_token IS NOT NULL",
        # Redação por imagem
        "ALTER TABLE IF EXISTS submission_answers ADD COLUMN IF NOT EXISTS essay_image_base64 TEXT",
        # Auto-cadastro / confirmação de e-mail
        "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(200)",
        "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS email_verification_sent_at TIMESTAMP",
        "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP",
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email_verification_token ON users (email_verification_token) WHERE email_verification_token IS NOT NULL",
        # PUCPR
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
        # Recuperação de senha
        "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(200)",
        "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS password_reset_sent_at TIMESTAMP",
        "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP",
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_password_reset_token ON users (password_reset_token) WHERE password_reset_token IS NOT NULL",
        # Token expiry fields
        "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMP",
        "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMP",
        # Stripe billing
        "ALTER TABLE IF EXISTS institutions ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(100)",
        "ALTER TABLE IF EXISTS institutions ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(100)",
        "ALTER TABLE IF EXISTS institutions ADD COLUMN IF NOT EXISTS stripe_subscription_status VARCHAR(30)",
        "ALTER TABLE IF EXISTS institutions ADD COLUMN IF NOT EXISTS credits_balance INTEGER DEFAULT 0",
        "ALTER TABLE IF EXISTS institutions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE",
        "UPDATE institutions SET plan_type = 'basic' WHERE LOWER(plan_type) = 'essencial'",
        "UPDATE institutions SET plan_type = 'pro' WHERE LOWER(plan_type) = 'inteligente'",
        "UPDATE institutions SET plan_type = 'enterprise' WHERE LOWER(plan_type) = 'institucional'",
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_institutions_stripe_customer_id ON institutions (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL",
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_institutions_stripe_subscription_id ON institutions (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL",
        # Institution verification
        "ALTER TABLE IF EXISTS institutions ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE",
        "ALTER TABLE IF EXISTS users ALTER COLUMN institution_id DROP NOT NULL",
        "ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS pending_institution_name VARCHAR(200)",
        # RLS
        """
        DO $$
        DECLARE r RECORD;
        BEGIN
          FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
          END LOOP;
        END $$
    """,
    ]

    # Dynamic simulado FK columns
    try:
        from app.routers.simulados import EXAM_TYPE_MODELS
        for exam_type in EXAM_TYPE_MODELS:
            migrations.append(
                f"ALTER TABLE IF EXISTS simulado_questions ADD COLUMN IF NOT EXISTS {exam_type}_question_id INTEGER REFERENCES {exam_type}_questions(id)"
            )
    except Exception:
        pass

    migrations.append("ALTER TABLE IF EXISTS simulados ADD COLUMN IF NOT EXISTS current_index INTEGER DEFAULT 0")
    migrations.append("ALTER TABLE IF EXISTS simulado_questions ALTER COLUMN selected_letter TYPE VARCHAR(40)")

    # Question reports
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

    for sql in migrations:
        try:
            with engine.begin() as conn:
                conn.execute(text(sql))
        except Exception as e:
            print(f"⚠️   Migration ignorada ({e})")