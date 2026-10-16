from fastapi import Header
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from typing import Annotated
from app.users import User

def get_user_timezone(user: User) -> ZoneInfo:
    try:
        return ZoneInfo(user.timezone or "UTC")
    except (ZoneInfoNotFoundError, ValueError):
        return ZoneInfo("UTC")