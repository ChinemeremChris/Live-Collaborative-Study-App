from fastapi_users import schemas
from pydantic import BaseModel
import uuid
from typing import Optional

class UserRead(schemas.BaseUser[uuid.UUID]):
    fname: str
    lname: str

class UserCreate(schemas.BaseUserCreate):
    fname: str
    lname: str

class UserUpdate(schemas.BaseUserUpdate):
    fname: Optional[str] = None
    lname: Optional[str] = None