from fastapi_users import schemas
from pydantic import BaseModel
import uuid
from typing import Optional, List
from datetime import datetime

class UserRead(schemas.BaseUser[uuid.UUID]):
    fname: str
    lname: str

class UserCreate(schemas.BaseUserCreate):
    fname: str
    lname: str

class UserUpdate(schemas.BaseUserUpdate):
    fname: Optional[str] = None
    lname: Optional[str] = None

class DeckIn(BaseModel):
    deck_name: str
    is_public: bool
    tags: list[str]

class DeckCreateOut(BaseModel):
    deck_id: uuid.UUID
    deck_name: str
    is_public: bool
    tags: list[str]

class DeckSearch(BaseModel):
    deck_id: uuid.UUID
    deck_name: str
    creator_name: str
    card_count: int
    avg_rating: float | None
    rating_count: int

class MyDeckOut(BaseModel):
    deck_id: uuid.UUID
    deck_name: str
    card_count: int
    avg_rating: float | None
    rating_count: int

class DeckOut(BaseModel):
    deck_id: uuid.UUID
    deck_name: str
    creator_name: str
    is_public: bool
    created_at: datetime
    updated_at: datetime
    card_count: int
    tags: list[str]

class DeckWithCardsOut(BaseModel):
    deck_id: uuid.UUID
    deck_name: str
    creator_name: str
    is_public: bool
    created_at: datetime
    updated_at: datetime
    card_count: int
    cards: list[CardOut]
    tags: list[str]

deck

class TextImportIn(BaseModel):
    raw_text: str
    deck_name: str
    is_public: bool
    tags: list[str]

class TextImportOut(BaseModel):
    parsed_cards: list[CardCreate]
    unparsed_count: int

class CardCreate(BaseModel):
    card_term: str
    card_definition: str

class CardUpdate(BaseModel):
    card_term: Optional[str] = None
    card_definition: Optional[str] = None

class CardOut(BaseModel):
    card_id: uuid.UUID
    deck_id: uuid.UUID
    card_term: str
    card_definition: str
    card_term_url: Optional[str] = None
    card_definition_url: Optional[str] = None
 
#StudySession input is just deck_id

class StudySessionOut(BaseModel):
    session_id: uuid.UUID
    deck_name: str
    started_at: datetime
    completed_at: datetime | None

class CardProgressIn(BaseModel):
    card_id: uuid.UUID
    current_rating: str

class CardProgressOut(BaseModel):
    card_term: str
    next_review_date: str|None
    times_reviewed: int
    last_rating: str

#RoomCreate and RoomUpdate are basically one column
class RoomOut(BaseModel):
    room_code: str
    host_name: str
    deck_name: str
    created_at: datetime
    room_status: str
    participant_count: int

class RoomParticipantOut(BaseModel):
    participant_name: str
    score: int
    placement: str