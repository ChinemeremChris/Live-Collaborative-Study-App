from celery import Celery
import os
from dotenv import load_dotenv

celery_app = Celery(
    "Deckmate",
    broker=os.getenv("REDIS_URL"),
    backend=os.getenv("REDIS_URL"),
    include=["app.tasks.study_session"]
)

celery_app.conf.timezone = "UTC"
celery_app.conf.beat_schedule = {
    "close-stale-study-sessions": {
        "task": "app.tasks.study_session.CloseStudySessions",
        "schedule": 120.0
    }
}