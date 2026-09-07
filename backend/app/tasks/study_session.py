from sqlalchemy import update, create_engine
from sqlalchemy.orm import Session
from app.db import StudySession
from app.celery_app import celery_app
from datetime import datetime, timezone, timedelta
import os
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv("SYNC_DATABASE_URL"))

@celery_app.task
def CloseStudySessions():
    with Session(engine) as session:
        cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=2)
        session_stmt = update(StudySession).where(StudySession.completed_at.is_(None), StudySession.last_activity_at <= cutoff_time).values(completed_at=StudySession.last_activity_at)
        session.execute(session_stmt)
        session.commit()