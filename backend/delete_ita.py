from app.database import SessionLocal
from app.models import ItaQuestion, ItaQuestionOption, ItaQuestionImage

db = SessionLocal()
try:
    deleted_opts = db.query(ItaQuestionOption).delete()
    deleted_imgs = db.query(ItaQuestionImage).delete()
    deleted_qs = db.query(ItaQuestion).delete()
    db.commit()
    print(f"Deleted {deleted_qs} questions, {deleted_opts} options, {deleted_imgs} images.")
except Exception as e:
    db.rollback()
    print(f"Error: {e}")
finally:
    db.close()
