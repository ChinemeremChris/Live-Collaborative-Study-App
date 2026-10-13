from fastapi import Header
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from typing import Annotated

def get_user_timezone(x_user_timezone: Annotated[str, Header()] = "UTC") -> ZoneInfo:
    try:
        return ZoneInfo(x_user_timezone)
    except (ZoneInfoNotFoundError, ValueError):
        return ZoneInfo("UTC")