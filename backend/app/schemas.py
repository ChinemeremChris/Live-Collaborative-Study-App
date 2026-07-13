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

class DeckCreate(BaseModel):
    deck_name: str
    is_public: bool
    tags: list[str]
    cards: list[CardCreate]

class DeckUpdate(BaseModel):
    deck_name: str
    is_public: bool
    tags: list[str]
    updated_cards: list[CardUpdateID]
    new_cards: list[CardCreate]
    deleted_cards: list[str]

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
    tags: list[dict]
    avg_rating: float | None
    num_ratings: int | None
    my_rating: int | None

class BulkDeckUpdateOut(BaseModel):
    deck_id: uuid.UUID
    success: bool
    new_card_ids: list[dict]

class TextImportOut(BaseModel):
    parsed_cards: list[CardCreate]
    unparsed_lines: list[str]
    unparsed_count: int

class CardCreate(BaseModel):
    card_temp_id: int
    card_term: str
    card_definition: str
    card_term_url: Optional[str] = None
    card_definition_url: Optional[str] = None

class CardUpdate(BaseModel):
    card_term: Optional[str] = None
    card_definition: Optional[str] = None

class CardUpdateID(BaseModel):
    card_id: uuid.UUID
    card_term: Optional[str] = None
    card_definition: Optional[str] = None
    card_term_url: Optional[str] = None
    card_definition_url: Optional[str] = None

class CardOut(BaseModel):
    card_id: uuid.UUID
    deck_id: uuid.UUID
    card_term: str
    card_definition: str
    card_term_url: Optional[str] = None
    card_definition_url: Optional[str] = None
    is_due: bool

class CardOutNoDue(BaseModel):
    card_id: uuid.UUID
    deck_id: uuid.UUID
    card_term: str
    card_definition: str
    card_term_url: Optional[str] = None
    card_definition_url: Optional[str] = None

class ImageUploadRequest(BaseModel):
    file_name: str
    file_type: str
 
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

class TextImportIn(BaseModel):
    raw_text: str

#RoomCreate and RoomUpdate are basically one column
class RoomOut(BaseModel):
    room_id: uuid.UUID
    room_code: str
    host_name: str
    deck_name: str
    created_at: datetime
    room_status: str
    participant_count: int

class RoomParticipantOut(BaseModel):
    room_code: str
    hosted_by: str
    deck_name: str
    created_at: datetime
    room_status: str
    score: int | None
    placement: str | None
    can_delete: bool

class StudySessionOut(BaseModel):
    session_id: uuid.UUID
    deck_name: str
    cards_due: int | None
    cards_studied: int | None
    started_at: datetime
    completed_at: datetime | None

class RoomChoiceOut(BaseModel):
    choice_id: uuid.UUID
    choice_text: str
    choice_url: Optional[str]
    is_correct: bool
    is_player_choice: bool

class RoomQAOut(BaseModel):
    room_question_id: uuid.UUID
    prompt: str
    prompt_url: Optional[str]
    choices: list[RoomChoiceOut]

class RoomInfoOut(BaseModel):
    room_id: uuid.UUID
    deck_name: str
    room_status: str
    created_at: datetime
    questions: list[RoomQAOut]
    scores: list[dict]


    