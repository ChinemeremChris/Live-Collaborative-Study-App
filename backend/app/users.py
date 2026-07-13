from fastapi import Depends, Request, WebSocket, WebSocketException
from fastapi_users import FastAPIUsers, BaseUserManager, UUIDIDMixin, InvalidPasswordException
from fastapi_users.authentication import CookieTransport, AuthenticationBackend
from fastapi_users.authentication.strategy import JWTStrategy
from httpx_oauth.clients.google import GoogleOAuth2
from db import User, get_user_db
import uuid
import os
from dotenv import load_dotenv
from schemas import UserCreate

load_dotenv()

SECRET = os.getenv("JWT_SECRET")
RESET_PASSWORD_SECRET = os.getenv("RESET_PASSWORD_SECRET")
VERIFICATION_SECRET = os.getenv("VERIFICATION_SECRET")
IS_PROD = os.getenv("IS_PROD")
IS_PROD = IS_PROD.lower() == "true"

google_oauth_client = GoogleOAuth2(
    os.getenv("GOOGLE_OAUTH_CLIENT_ID", ""),
    os.getenv("GOOGLE_OAUTH_CLIENT_SECRET", ""),
)

class UserManager(UUIDIDMixin, BaseUserManager[User, uuid.UUID]):
    reset_password_token_secret = RESET_PASSWORD_SECRET
    reset_password_token_lifetime_seconds = 600
    verification_token_secret = VERIFICATION_SECRET
    verification_token_lifetime_seconds = 600

    async def validate_password(self, password: str, user: UserCreate | User):
        if len(password) < 8:
            raise InvalidPasswordException(reason="Password should be at least 8 characters")
        if user.fname in password or user.lname in password:
            raise InvalidPasswordException(reason="Name cannot be contained in password")
        if user.email in password:
            raise InvalidPasswordException(reason="Email cannot be contained in password")

    async def on_after_register(self, user: User, request: Request | None = None):
        print(f"User {user.id} has registered.")

    async def on_after_forgot_password(self, user: User, token: str, request: Request | None = None):
        print(f"User {user.id} has forgot their password. Reset token: {token}")

    async def on_after_request_verify(self, user: User, token: str, request: Request | None = None):
        print(f"Verification requested for user {user.id}. Verification token: {token}")
    

async def get_user_manager(user_db = Depends(get_user_db)):
    yield UserManager(user_db)

cookie_transport = CookieTransport(cookie_max_age=7200, cookie_httponly=True, cookie_secure=IS_PROD, cookie_samesite="none" if IS_PROD else "lax")

def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(secret=SECRET, lifetime_seconds=7200)

auth_backend = AuthenticationBackend(
    name="database",
    transport=cookie_transport,
    get_strategy=get_jwt_strategy
)

fastapi_users = FastAPIUsers[User, uuid.UUID](
    get_user_manager,
    [auth_backend]
)
current_active_user = fastapi_users.current_user(active=True)
current_optional_user = fastapi_users.current_user(active=True, optional=True)

async def get_user_from_cookie(websocket: WebSocket, user_manager = Depends(get_user_manager)):
    cookie = websocket.cookies.get("fastapiusersauth")
    if not cookie:
        raise WebSocketException(code=4001, reason="Not authenticated")
    try:
        strategy = get_jwt_strategy()
        user = await strategy.read_token(cookie, user_manager)
        if not user or not user.is_active:
            raise WebSocketException(code=4001, reason="Invalid user")
        yield user
    except WebSocketException:
        raise
    except Exception:
        raise WebSocketException(code=4001, reason="Authentication failed")
    