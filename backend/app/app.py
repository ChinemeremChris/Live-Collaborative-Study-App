from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from fastapi.responses import HTMLResponse
from users import auth_backend, fastapi_users, google_oauth_client, SECRET
from schemas import UserCreate, UserRead, UserUpdate
from db import create_db_and_tables
from routers import decks, cards, rooms, study, progress, transform, tags
from limiter import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import os
from dotenv import load_dotenv
import logging

load_dotenv()
logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        import redis
        r = redis.from_url(os.getenv("REDIS_URL"))
        r.ping()
        print("Redis connected")
    except Exception as e:
        print(f"Redis connection failed: {e}")
    yield

app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
        "null"  # for local HTML files opened directly in browser
    ],
    # allow_origins=[os.getenv("FRONTEND_URL")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.include_router(fastapi_users.get_auth_router(auth_backend), prefix="/auth/jwt", tags=["auth"])
app.include_router(fastapi_users.get_register_router(UserRead, UserCreate), prefix="/auth", tags=["auth"])
app.include_router(fastapi_users.get_verify_router(UserRead), prefix="/auth", tags=["auth"])
app.include_router(fastapi_users.get_reset_password_router(), prefix="/auth", tags=["auth"])
#add redirect url to oauth_router: redirect to frontend
app.include_router(fastapi_users.get_oauth_router(google_oauth_client, auth_backend, SECRET, associate_by_email=True, is_verified_by_default=True), prefix="/auth/google", tags=["auth"])


#app routes
app.include_router(tags.router, prefix="/tags", tags=["tags"])
app.include_router(decks.router, prefix="/decks", tags=["decks"])
app.include_router(cards.router, prefix="/cards", tags=["cards"])
app.include_router(study.router, prefix="/study", tags=["study"])
app.include_router(progress.router, prefix="/progress", tags=["progress"])
app.include_router(transform.router, prefix="/transform", tags=["transform"])
app.include_router(rooms.router, prefix="/rooms", tags=["rooms"])