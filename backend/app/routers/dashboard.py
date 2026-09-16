from datetime import datetime, timedelta
from typing import Any, Dict, List

from fastapi import APIRouter, Depends
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_admin, require_professor
from app.models import (
    Class,
    Exam,
    ExamQuestion,
    ExamSubmission,
    Question,
    StudentClass,
    Subject,
    TeachingAssignment,
    User,
    UserRole,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

# Import submission model lazily to avoid circular import
def _submission_model():
    from app.models import ExamSubmission
    return ExamSubmission


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> Dict[str, Any]:
    inst_id = current_user.institution_id

    # ── Entity counts ──────────────────────────────────────────
    professors = db.query(func.count(User.id)).filter(
        User.institution_id == inst_id, User.role == UserRole.PROFESSOR
    ).scalar() or 0

    students = db.query(func.count(User.id)).filter(
        User.institution_id == inst_id, User.role == UserRole.STUDENT
    ).scalar() or 0

    subjects = db.query(func.count(Subject.id)).filter(
        Subject.institution_id == inst_id
    ).scalar() or 0

    classes = db.query(func.count(Class.id)).filter(
        Class.institution_id == inst_id
    ).scalar() or 0

    questions = db.query(func.count(Question.id)).join(
        User, Question.professor_id == User.id
    ).filter(User.institution_id == inst_id).scalar() or 0

    exams = db.query(func.count(Exam.id)).join(
        User, Exam.professor_id == User.id
    ).filter(User.institution_id == inst_id).scalar() or 0

    # ── Submission stats ───────────────────────────────────────
    Sub = _submission_model()

    sub_stats_rows = db.execute(
        text("""
            SELECT LOWER(es.status::text) AS status, COUNT(*) as cnt
            FROM exam_submissions es
            JOIN exams e ON e.id = es.exam_id
            JOIN users u ON u.id = e.professor_id
            WHERE u.institution_id = :inst_id
            GROUP BY es.status
        """),
        {"inst_id": inst_id},
    ).fetchall()

    sub_stats: Dict[str, int] = {row[0]: row[1] for row in sub_stats_rows}

    total_subs     = sum(sub_stats.values())
    pending_subs   = sub_stats.get("pending", 0)
    correcting_subs = sub_stats.get("correcting", 0)
    done_subs      = sub_stats.get("done", 0)
    released_subs  = sub_stats.get("released", 0)

    # ── Recent activity (last 10 submissions) ─────────────────
    recent_rows = db.execute(
        text("""
            SELECT
                es.id,
                es.status,
                es.total_score,
                es.submitted_at,
                s.name  AS student_name,
                e.title AS exam_title,
                subj.name AS subject_name
            FROM exam_submissions es
            JOIN users s    ON s.id = es.student_id
            JOIN exams e    ON e.id = es.exam_id
            JOIN subjects subj ON subj.id = e.subject_id
            JOIN users u    ON u.id = e.professor_id
            WHERE u.institution_id = :inst_id
            ORDER BY es.submitted_at DESC
            LIMIT 10
        """),
        {"inst_id": inst_id},
    ).fetchall()

    recent_activity = [
        {
            "id": row[0],
            "status": str(row[1]).lower(),
            "total_score": row[2],
            "submitted_at": row[3].isoformat() if row[3] else None,
            "student_name": row[4],
            "exam_title": row[5],
            "subject_name": row[6],
        }
        for row in recent_rows
    ]

    # ── Exams per subject ──────────────────────────────────────
    subject_rows = db.execute(
        text("""
            SELECT subj.name, COUNT(e.id) as exam_count
            FROM subjects subj
            LEFT JOIN exams e ON e.subject_id = subj.id
            WHERE subj.institution_id = :inst_id
            GROUP BY subj.name
            ORDER BY exam_count DESC
            LIMIT 8
        """),
        {"inst_id": inst_id},
    ).fetchall()

    exams_by_subject = [{"subject": row[0], "count": row[1]} for row in subject_rows]

    # ── Monthly growth (users created this month vs last) ─────
    now = datetime.utcnow()
    first_this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    first_last_month = (first_this_month - timedelta(days=1)).replace(day=1)

    new_users_this_month = db.query(func.count(User.id)).filter(
        User.institution_id == inst_id,
        User.created_at >= first_this_month,
    ).scalar() or 0

    new_users_last_month = db.query(func.count(User.id)).filter(
        User.institution_id == inst_id,
        User.created_at >= first_last_month,
        User.created_at < first_this_month,
    ).scalar() or 0

    new_exams_this_month = db.query(func.count(Exam.id)).join(
        User, Exam.professor_id == User.id
    ).filter(
        User.institution_id == inst_id,
        Exam.created_at >= first_this_month,
    ).scalar() or 0

    # ── Monthly user growth — last 12 months ──────────────────
    monthly_rows = db.execute(
        text("""
            SELECT
                TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
                COUNT(*) AS new_users
            FROM users
            WHERE institution_id = :inst_id
              AND created_at >= NOW() - INTERVAL '12 months'
            GROUP BY DATE_TRUNC('month', created_at)
            ORDER BY DATE_TRUNC('month', created_at)
        """),
        {"inst_id": inst_id},
    ).fetchall()

    monthly_user_growth = [{"month": row[0], "new_users": row[1]} for row in monthly_rows]

    # ── Monthly exam creation — last 12 months ────────────────
    monthly_exam_rows = db.execute(
        text("""
            SELECT
                TO_CHAR(DATE_TRUNC('month', e.created_at), 'YYYY-MM') AS month,
                COUNT(*) AS new_exams
            FROM exams e
            JOIN users u ON u.id = e.professor_id
            WHERE u.institution_id = :inst_id
              AND e.created_at >= NOW() - INTERVAL '12 months'
            GROUP BY DATE_TRUNC('month', e.created_at)
            ORDER BY DATE_TRUNC('month', e.created_at)
        """),
        {"inst_id": inst_id},
    ).fetchall()

    monthly_exam_growth = [{"month": row[0], "new_exams": row[1]} for row in monthly_exam_rows]

    # ── Questions per difficulty ───────────────────────────────
    diff_rows = db.execute(
        text("""
            SELECT q.difficulty, COUNT(*) as cnt
            FROM questions q
            JOIN users u ON u.id = q.professor_id
            WHERE u.institution_id = :inst_id
            GROUP BY q.difficulty
        """),
        {"inst_id": inst_id},
    ).fetchall()

    questions_by_difficulty = {row[0] or "medium": row[1] for row in diff_rows}

    return {
        "counts": {
            "professors": professors,
            "students": students,
            "subjects": subjects,
            "classes": classes,
            "questions": questions,
            "exams": exams,
        },
        "submissions": {
            "total": total_subs,
            "pending": pending_subs,
            "correcting": correcting_subs,
            "done": done_subs,
            "released": released_subs,
        },
        "recent_activity": recent_activity,
        "exams_by_subject": exams_by_subject,
        "growth": {
            "new_users_this_month": new_users_this_month,
            "new_users_last_month": new_users_last_month,
            "new_exams_this_month": new_exams_this_month,
        },
        "questions_by_difficulty": questions_by_difficulty,
        "monthly_user_growth": monthly_user_growth,
        "monthly_exam_growth": monthly_exam_growth,
    }


@router.get("/monitoring")
def get_dashboard_monitoring(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> Dict[str, Any]:
    inst_id = current_user.institution_id
    now = datetime.utcnow()
    backlog_threshold_days = 7
    low_pass_rate_pct = 60.0

    # ── Per-professor stats ────────────────────────────────────
    professor_rows = db.execute(
        text("""
            SELECT
                u.id,
                u.name,
                COUNT(DISTINCT e.id)                                        AS exam_count,
                COUNT(DISTINCT es.id) FILTER (
                    WHERE UPPER(es.status::text) IN ('PENDING','CORRECTING')
                )                                                           AS pending_correction_count,
                MAX(
                    EXTRACT(EPOCH FROM (:now - es.submitted_at)) / 86400
                ) FILTER (
                    WHERE UPPER(es.status::text) IN ('PENDING','CORRECTING')
                )                                                           AS oldest_pending_days
            FROM users u
            LEFT JOIN exams e ON e.professor_id = u.id
            LEFT JOIN exam_submissions es ON es.exam_id = e.id
            WHERE u.institution_id = :inst_id
              AND UPPER(u.role::text) = 'PROFESSOR'
            GROUP BY u.id, u.name
            ORDER BY u.name
        """),
        {"inst_id": inst_id, "now": now},
    ).fetchall()

    # Per-exam pass rates for professors
    exam_pass_rows = db.execute(
        text("""
            SELECT
                e.professor_id,
                e.id          AS exam_id,
                e.title       AS exam_title,
                COUNT(es.id)  AS total_submissions,
                SUM(CASE WHEN es.total_score IS NOT NULL THEN 1 ELSE 0 END) AS scored,
                COALESCE(SUM(eq_pts.max_pts), 0)                            AS max_score,
                AVG(es.total_score)                                         AS avg_score
            FROM exams e
            JOIN users u ON u.id = e.professor_id
            LEFT JOIN exam_submissions es ON es.exam_id = e.id
                AND UPPER(es.status::text) IN ('DONE', 'RELEASED')
            LEFT JOIN LATERAL (
                SELECT COALESCE(SUM(eq.points), 0) AS max_pts
                FROM exam_questions eq
                WHERE eq.exam_id = e.id
            ) eq_pts ON true
            WHERE u.institution_id = :inst_id
            GROUP BY e.professor_id, e.id, e.title, eq_pts.max_pts
            HAVING COUNT(es.id) >= 3
        """),
        {"inst_id": inst_id},
    ).fetchall()

    # Index pass rates by professor
    prof_pass: Dict[int, list] = {}
    low_pass_exams: Dict[int, list] = []  # type: ignore[assignment]
    low_pass_exams = {}
    for row in exam_pass_rows:
        prof_id = row[0]
        max_score = float(row[5]) if row[5] else 0
        avg_score = float(row[6]) if row[6] else 0
        pass_rate = (avg_score / max_score * 100) if max_score > 0 else None
        if prof_id not in prof_pass:
            prof_pass[prof_id] = []
        if pass_rate is not None:
            prof_pass[prof_id].append(pass_rate)
        if pass_rate is not None and pass_rate < low_pass_rate_pct:
            if prof_id not in low_pass_exams:
                low_pass_exams[prof_id] = []
            low_pass_exams[prof_id].append({
                "exam_id": row[1],
                "exam_title": row[2],
                "pass_rate": round(pass_rate, 1),
                "avg_score": round(avg_score, 1),
                "max_score": round(max_score, 1),
            })

    professor_stats = []
    for row in professor_rows:
        prof_id = row[0]
        rates = prof_pass.get(prof_id, [])
        avg_pass = round(sum(rates) / len(rates), 1) if rates else None
        oldest = float(row[4]) if row[4] else 0
        professor_stats.append({
            "id": prof_id,
            "name": row[1],
            "exam_count": row[2] or 0,
            "pending_correction_count": row[3] or 0,
            "oldest_pending_days": round(oldest, 1),
            "avg_pass_rate": avg_pass,
            "low_pass_rate_exams": low_pass_exams.get(prof_id, []),
        })

    # ── Per-class stats ────────────────────────────────────────
    class_rows = db.execute(
        text("""
            SELECT
                c.id,
                c.name,
                c.year,
                COUNT(DISTINCT sc.student_id)                               AS student_count,
                COUNT(DISTINCT e.id)                                        AS exam_count,
                AVG(es.total_score)                                         AS avg_score,
                COUNT(DISTINCT es.id) FILTER (
                    WHERE UPPER(es.status::text) IN ('DONE','RELEASED')
                    AND es.total_score IS NOT NULL
                )                                                           AS scored_count,
                COUNT(DISTINCT es.id)                                       AS total_submissions
            FROM classes c
            LEFT JOIN student_classes sc ON sc.class_id = c.id
            LEFT JOIN exams e ON e.class_id = c.id
            LEFT JOIN exam_submissions es ON es.exam_id = e.id
                AND UPPER(es.status::text) IN ('DONE','RELEASED')
            WHERE c.institution_id = :inst_id
            GROUP BY c.id, c.name, c.year
            ORDER BY c.year DESC, c.name
        """),
        {"inst_id": inst_id},
    ).fetchall()

    # Per-class pass rates
    class_pass_rows = db.execute(
        text("""
            SELECT
                e.class_id,
                e.id           AS exam_id,
                e.title        AS exam_title,
                COALESCE(SUM(eq.points), 0)  AS max_score,
                AVG(es.total_score)           AS avg_score,
                COUNT(es.id)                  AS submission_count
            FROM exams e
            JOIN users u ON u.id = e.professor_id
            JOIN exam_questions eq ON eq.exam_id = e.id
            LEFT JOIN exam_submissions es ON es.exam_id = e.id
                AND UPPER(es.status::text) IN ('DONE','RELEASED')
            WHERE u.institution_id = :inst_id
            GROUP BY e.class_id, e.id, e.title
            HAVING COUNT(es.id) >= 3
        """),
        {"inst_id": inst_id},
    ).fetchall()

    class_pass: Dict[int, list] = {}
    class_low_pass: Dict[int, list] = {}
    for row in class_pass_rows:
        cls_id = row[0]
        max_score = float(row[3]) if row[3] else 0
        avg_score = float(row[4]) if row[4] else 0
        pass_rate = (avg_score / max_score * 100) if max_score > 0 else None
        if cls_id not in class_pass:
            class_pass[cls_id] = []
        if pass_rate is not None:
            class_pass[cls_id].append(pass_rate)
        if pass_rate is not None and pass_rate < low_pass_rate_pct:
            if cls_id not in class_low_pass:
                class_low_pass[cls_id] = []
            class_low_pass[cls_id].append({
                "exam_id": row[1],
                "exam_title": row[2],
                "pass_rate": round(pass_rate, 1),
            })

    class_stats = []
    for row in class_rows:
        cls_id = row[0]
        rates = class_pass.get(cls_id, [])
        avg_pass = round(sum(rates) / len(rates), 1) if rates else None
        student_count = row[3] or 0
        total_subs = row[7] or 0
        submission_rate = round(total_subs / student_count * 100, 1) if student_count > 0 else 0
        avg_score = round(float(row[5]), 1) if row[5] else None
        class_stats.append({
            "id": cls_id,
            "name": row[1],
            "year": row[2],
            "student_count": student_count,
            "exam_count": row[4] or 0,
            "avg_score": avg_score,
            "avg_pass_rate": avg_pass,
            "submission_rate": submission_rate,
            "low_pass_rate_exams": class_low_pass.get(cls_id, []),
        })

    # ── Alerts ────────────────────────────────────────────────
    alerts = []

    # Alert: professor with pending corrections older than threshold
    for ps in professor_stats:
        if ps["oldest_pending_days"] >= backlog_threshold_days and ps["pending_correction_count"] > 0:
            alerts.append({
                "type": "correction_backlog",
                "severity": "high" if ps["oldest_pending_days"] >= 14 else "medium",
                "professor_name": ps["name"],
                "exam_title": None,
                "class_name": None,
                "detail": (
                    f"{ps['pending_correction_count']} submissões pendentes há "
                    f"{round(ps['oldest_pending_days'])} dias"
                ),
                "exam_id": None,
            })

    # Alert: exams with low pass rate (per professor)
    for ps in professor_stats:
        for ex in ps["low_pass_rate_exams"]:
            alerts.append({
                "type": "low_pass_rate",
                "severity": "high" if ex["pass_rate"] < 40 else "medium",
                "professor_name": ps["name"],
                "exam_title": ex["exam_title"],
                "class_name": None,
                "detail": f"Taxa de aprovação {ex['pass_rate']}% (média {ex['avg_score']}/{ex['max_score']})",
                "exam_id": ex["exam_id"],
            })

    # Alert: classes with very low submission rates
    for cs in class_stats:
        if cs["exam_count"] > 0 and cs["submission_rate"] < 50 and cs["student_count"] > 0:
            alerts.append({
                "type": "low_submission_rate",
                "severity": "medium",
                "professor_name": None,
                "exam_title": None,
                "class_name": f"{cs['name']} ({cs['year']})",
                "detail": f"Apenas {cs['submission_rate']}% dos alunos entregaram avaliações",
                "exam_id": None,
            })

    # Sort alerts: high severity first
    alerts.sort(key=lambda a: (0 if a["severity"] == "high" else 1, a["type"]))

    return {
        "professor_stats": professor_stats,
        "class_stats": class_stats,
        "alerts": alerts,
    }


@router.get("/professor")
def get_professor_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_professor),
) -> Dict[str, Any]:
    prof_id = current_user.id
    now = datetime.utcnow()

    # ── Counts ────────────────────────────────────────────────
    question_count = db.query(func.count(Question.id)).filter(
        Question.professor_id == prof_id
    ).scalar() or 0

    exam_count = db.query(func.count(Exam.id)).filter(
        Exam.professor_id == prof_id
    ).scalar() or 0

    # ── AI correction progress this week ─────────────────────
    week_start = now - timedelta(days=7)

    ai_rows = db.execute(
        text("""
            SELECT
                COUNT(*) FILTER (WHERE UPPER(es.status::text) IN ('DONE','RELEASED','CORRECTING'))
                    AS corrected,
                COUNT(*) AS total
            FROM exam_submissions es
            JOIN exams e ON e.id = es.exam_id
            WHERE e.professor_id = :prof_id
              AND es.submitted_at >= :week_start
        """),
        {"prof_id": prof_id, "week_start": week_start},
    ).fetchone()

    ai_total = ai_rows[1] or 0
    ai_corrected = ai_rows[0] or 0
    ai_progress = round(ai_corrected / ai_total * 100) if ai_total > 0 else 0

    # ── Time saved estimate (2 min per auto-corrected submission) ─
    auto_corrected = db.execute(
        text("""
            SELECT COUNT(*) FROM submission_answers sa
            JOIN exam_submissions es ON es.id = sa.submission_id
            JOIN exams e ON e.id = es.exam_id
            WHERE e.professor_id = :prof_id
              AND sa.is_auto_corrected = true
        """),
        {"prof_id": prof_id},
    ).scalar() or 0

    minutes_saved = auto_corrected * 2
    if minutes_saved >= 60:
        time_saved = f"{minutes_saved // 60}h{minutes_saved % 60:02d}m" if minutes_saved % 60 else f"{minutes_saved // 60}h"
    else:
        time_saved = f"{minutes_saved}min" if minutes_saved > 0 else "0min"

    # ── Avg score across professor's released exams ───────────
    avg_row = db.execute(
        text("""
            SELECT AVG(es.total_score / NULLIF(eq_pts.max_pts, 0) * 10)
            FROM exam_submissions es
            JOIN exams e ON e.id = es.exam_id
            JOIN LATERAL (
                SELECT COALESCE(SUM(eq.points), 0) AS max_pts
                FROM exam_questions eq WHERE eq.exam_id = e.id
            ) eq_pts ON true
            WHERE e.professor_id = :prof_id
              AND UPPER(es.status::text) = 'RELEASED'
              AND es.total_score IS NOT NULL
              AND eq_pts.max_pts > 0
        """),
        {"prof_id": prof_id},
    ).scalar()

    avg_score = round(float(avg_row), 1) if avg_row else None

    # ── Per-class AI correction progress ─────────────────────
    class_rows = db.execute(
        text("""
            SELECT
                c.name AS turma,
                COUNT(es.id) AS total,
                COUNT(es.id) FILTER (
                    WHERE UPPER(es.status::text) IN ('DONE','RELEASED','CORRECTING')
                ) AS corrigidos
            FROM classes c
            JOIN exams e ON e.class_id = c.id
            JOIN exam_submissions es ON es.exam_id = e.id
            WHERE e.professor_id = :prof_id
              AND es.submitted_at >= :week_start
            GROUP BY c.id, c.name
            ORDER BY c.name
            LIMIT 5
        """),
        {"prof_id": prof_id, "week_start": week_start},
    ).fetchall()

    correction_by_class = [
        {
            "turma": row[0],
            "total": row[1],
            "corrigidos": row[2],
            "pct": round(row[2] / row[1] * 100) if row[1] > 0 else 0,
        }
        for row in class_rows
    ]

    return {
        "question_count": question_count,
        "exam_count": exam_count,
        "ai_progress": ai_progress,
        "time_saved": time_saved,
        "avg_score": avg_score,
        "correction_by_class": correction_by_class,
    }


@router.get("/student")
def get_student_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    student_id = current_user.id
    inst_id = current_user.institution_id

    # ── Avg grade (over 10) from released submissions ─────────
    avg_row = db.execute(
        text("""
            SELECT AVG(es.total_score / NULLIF(eq_pts.max_pts, 0) * 10)
            FROM exam_submissions es
            JOIN exams e ON e.id = es.exam_id
            JOIN LATERAL (
                SELECT COALESCE(SUM(eq.points), 0) AS max_pts
                FROM exam_questions eq WHERE eq.exam_id = e.id
            ) eq_pts ON true
            WHERE es.student_id = :student_id
              AND UPPER(es.status::text) = 'RELEASED'
              AND es.total_score IS NOT NULL
              AND eq_pts.max_pts > 0
        """),
        {"student_id": student_id},
    ).scalar()

    avg_grade = round(float(avg_row), 1) if avg_row else None

    # ── Ranking within institution ────────────────────────────
    # Combina a média de provas formais (RELEASED) com o mesmo fallback de
    # simulados usado no avg_grade acima — sem isso, um aluno que só fez
    # simulados de IA nunca aparece nos rank_rows (ranking_position fica None)
    # mesmo com total_ranked > 0 mostrando que outros alunos da instituição
    # têm posição, o que lê como "ranking não preenchido" na UI.
    rank_rows = db.execute(
        text("""
            SELECT
                u.id,
                AVG(es.total_score / NULLIF(eq_pts.max_pts, 0) * 10) AS media
            FROM users u
            JOIN exam_submissions es ON es.student_id = u.id
            JOIN exams e ON e.id = es.exam_id
            JOIN LATERAL (
                SELECT COALESCE(SUM(eq.points), 0) AS max_pts
                FROM exam_questions eq WHERE eq.exam_id = e.id
            ) eq_pts ON true
            WHERE u.institution_id = :inst_id
              AND UPPER(u.role::text) = 'STUDENT'
              AND UPPER(es.status::text) = 'RELEASED'
              AND es.total_score IS NOT NULL
              AND eq_pts.max_pts > 0
            GROUP BY u.id
        """),
        {"inst_id": inst_id},
    ).fetchall()

    student_avgs: Dict[int, float] = {row[0]: float(row[1]) for row in rank_rows}

    from app.models import Simulado

    simulado_rows = (
        db.query(Simulado.student_id, Simulado.total_score)
        .join(User, User.id == Simulado.student_id)
        .filter(
            User.institution_id == inst_id,
            Simulado.status == "done",
            Simulado.total_score.isnot(None),
        )
        .all()
    )
    simulado_scores: Dict[int, List[float]] = {}
    for sid, score in simulado_rows:
        simulado_scores.setdefault(sid, []).append(score / 10)
    for sid, scores in simulado_scores.items():
        # Alunos com prova formal RELEASED usam essa média (mais representativa);
        # simulado só entra como fallback para quem não tem nenhuma.
        if sid not in student_avgs:
            student_avgs[sid] = sum(scores) / len(scores)

    ranking = sorted(student_avgs.items(), key=lambda kv: kv[1], reverse=True)
    total_ranked = len(ranking)
    ranking_position = next((i for i, (sid, _) in enumerate(ranking, 1) if sid == student_id), None)
    institution_avg_grade = round(sum(student_avgs.values()) / len(student_avgs), 1) if student_avgs else None

    # ── Completion rate ───────────────────────────────────────
    completion_row = db.execute(
        text("""
            SELECT
                COUNT(DISTINCT e.id) FILTER (WHERE es.id IS NOT NULL) AS done,
                COUNT(DISTINCT e.id) AS total
            FROM exams e
            JOIN classes c ON c.id = e.class_id
            JOIN student_classes sc ON sc.class_id = c.id AND sc.student_id = :student_id
            LEFT JOIN exam_submissions es ON es.exam_id = e.id AND es.student_id = :student_id
        """),
        {"student_id": student_id},
    ).fetchone()

    completion_rate = None
    if completion_row and completion_row[1] and completion_row[1] > 0:
        completion_rate = round(completion_row[0] / completion_row[1] * 100)

    # ── Monthly grade evolution (last 6 months) ───────────────
    # Provas formais (RELEASED) e simulados de IA são fontes de nota
    # completamente diferentes em confiabilidade (a formal foi corrigida e
    # liberada por um professor; o simulado é auto-corrigido) — por isso
    # cada mês guarda de qual fonte veio, para o gráfico poder diferenciar
    # visualmente em vez de misturar tudo numa barra sem distinção.
    month_pt = {
        "Jan": "Jan", "Feb": "Fev", "Mar": "Mar", "Apr": "Abr",
        "May": "Mai", "Jun": "Jun", "Jul": "Jul", "Aug": "Ago",
        "Sep": "Set", "Oct": "Out", "Nov": "Nov", "Dec": "Dez",
    }

    exam_monthly_rows = db.execute(
        text("""
            SELECT
                TO_CHAR(DATE_TRUNC('month', es.submitted_at), 'YYYY-MM') AS mes_key,
                AVG(es.total_score / NULLIF(eq_pts.max_pts, 0) * 10) AS nota
            FROM exam_submissions es
            JOIN exams e ON e.id = es.exam_id
            JOIN LATERAL (
                SELECT COALESCE(SUM(eq.points), 0) AS max_pts
                FROM exam_questions eq WHERE eq.exam_id = e.id
            ) eq_pts ON true
            WHERE es.student_id = :student_id
              AND UPPER(es.status::text) = 'RELEASED'
              AND es.total_score IS NOT NULL
              AND eq_pts.max_pts > 0
              AND es.submitted_at >= NOW() - INTERVAL '6 months'
            GROUP BY DATE_TRUNC('month', es.submitted_at)
        """),
        {"student_id": student_id},
    ).fetchall()
    exam_by_month: Dict[str, float] = {row[0]: round(float(row[1]), 1) for row in exam_monthly_rows if row[1] is not None}

    from app.models import Simulado

    simulados = (
        db.query(Simulado)
        .filter(Simulado.student_id == student_id)
        .order_by(Simulado.created_at)
        .all()
    )
    completed_sims = [s for s in simulados if s.status == "done" and s.total_score is not None]

    sim_monthly_scores: Dict[str, List[float]] = {}
    for s in completed_sims:
        ref = s.finished_at or s.created_at
        if not ref:
            continue
        sim_monthly_scores.setdefault(ref.strftime("%Y-%m"), []).append(s.total_score / 10)
    sim_by_month: Dict[str, float] = {
        key: round(sum(scores) / len(scores), 1) for key, scores in sim_monthly_scores.items()
    }

    all_months = sorted(set(exam_by_month) | set(sim_by_month))[-6:]
    grade_evolution = []
    for key in all_months:
        dt = datetime.strptime(key, "%Y-%m")
        mes_label = month_pt.get(dt.strftime("%b"), dt.strftime("%b"))
        has_exam, has_sim = key in exam_by_month, key in sim_by_month
        if has_exam and has_sim:
            nota = round((exam_by_month[key] + sim_by_month[key]) / 2, 1)
            fonte = "misto"
        elif has_exam:
            nota = exam_by_month[key]
            fonte = "prova"
        else:
            nota = sim_by_month[key]
            fonte = "simulado"
        grade_evolution.append({"mes": mes_label, "nota": nota, "fonte": fonte})

    # ── Fallback para simulados quando o aluno ainda não tem provas
    # (assinaladas pelo professor) computadas — sem isso, um aluno que só fez
    # simulados de IA via a aba "Simulados" via o dashboard principal zerado.
    if avg_grade is None and completed_sims:
        # total_score do simulado é 0-100; normaliza para a escala 0-10 usada nas provas.
        avg_grade = round(sum(s.total_score for s in completed_sims) / len(completed_sims) / 10, 1)

    if completion_rate is None and simulados:
        completion_rate = round(len(completed_sims) / len(simulados) * 100)

    # ── Growth vs first data point ────────────────────────────
    growth_pct = None
    if len(grade_evolution) >= 2:
        first = grade_evolution[0]["nota"]
        last = grade_evolution[-1]["nota"]
        if first > 0:
            growth_pct = round((last - first) / first * 100, 1)

    return {
        "avg_grade": avg_grade,
        "institution_avg_grade": institution_avg_grade,
        "ranking_position": ranking_position,
        "total_ranked": total_ranked,
        "completion_rate": completion_rate,
        "grade_evolution": grade_evolution,
        "growth_pct": growth_pct,
    }
