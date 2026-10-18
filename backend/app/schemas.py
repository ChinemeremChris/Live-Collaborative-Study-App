from fastapi_users import schemas
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, ConfigDict
import uuid
from typing import Optional, List
from datetime import datetime, date, timezone

class BaseSchema(BaseModel):
     model_config = ConfigDict(
         json_encoders={
             datetime: lambda v: v.astimezone(timezone.utc).isoformat()
         }
     )

class UserRead(schemas.BaseUser[uuid.UUID]):
    fname: Optional[str] = None
    lname: Optional[str] = None
    timezone: Optional[str] = None

class UserCreate(schemas.BaseUserCreate):
    fname: str
    lname: str

class UserUpdate(schemas.BaseUserUpdate):
    fname: Optional[str] = None
    lname: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    timezone: Optional[str] = None

class UserStats(BaseSchema):
    study_streak: int
    study_week_list: list[bool]
    week_cards_studied: int
    num_decks: int
    public_decks: int
    rooms_played: int
    rooms_won: int
    num_cards_due: int

class DeckIn(BaseSchema):
    deck_name: str
    is_public: bool
    tags: list[str]

class DeckCreate(BaseSchema):
    deck_name: str
    is_public: bool
    tags: list[uuid.UUID] | None = None
    cards: list["CardCreate"]

class DeckUpdate(BaseSchema):
    deck_name: str
    is_public: bool
    tags: list[str]
    updated_cards: list["CardUpdateID"]
    new_cards: list["CardCreate"]
    deleted_cards: list[uuid.UUID]

class DeckCreateOut(BaseSchema):
    deck_id: uuid.UUID
    deck_name: str
    is_public: bool
    tags: list[str]

class DeckSearch(BaseSchema):
    deck_id: uuid.UUID
    deck_name: str
    creator_name: str
    card_count: int
    avg_rating: float | None
    rating_count: int
    created_at: date

class DeckSearchSuggestion(BaseSchema):
    deck_id: uuid.UUID
    deck_name: str
    creator_name: str

class MyDeckOut(BaseSchema):
    deck_id: uuid.UUID
    deck_name: str
    card_count: int
    avg_rating: float | None
    rating_count: int

class DeckOut(BaseSchema):
    deck_id: uuid.UUID
    deck_name: str
    creator_name: str
    is_public: bool
    created_at: datetime
    updated_at: datetime
    card_count: int
    tags: list[str]

class DeckWithCardsOut(BaseSchema):
    deck_id: uuid.UUID
    deck_name: str
    creator_id: uuid.UUID | None
    creator_name: str
    creator_deck_count: int | None
    is_public: bool
    created_at: datetime
    updated_at: datetime
    card_count: int
    preview_cards: list["CardOutNoDue"]
    tags: list[dict]
    avg_rating: float | None
    num_ratings: int | None
    my_rating: int | None
    study_time_minutes: int | None
    due_cards_count: int | None
    mastered_cards: int | None
    study_session_count: int | None
    last_session: date | None
    cards_reviewed: int | None
    first_review_date: date | None

class DeckEdit(BaseSchema):
    deck_id: uuid.UUID
    deck_name: str
    is_public: bool
    tags: list[uuid.UUID]
    cards: list["CardOutNoDue"]


class BulkDeckUpdateOut(BaseSchema):
    deck_id: uuid.UUID
    success: bool
    new_card_ids: list[dict]

class TextImportOut(BaseSchema):
    parsed_cards: list["CardCreate"]
    unparsed_lines: list[str]
    unparsed_count: int

class CardCreate(BaseSchema):
    card_temp_id: int
    card_term: Optional[str] = None
    card_definition: Optional[str] = None
    card_term_url: Optional[str] = None
    card_definition_url: Optional[str] = None

class CardUpdate(BaseSchema):
    card_term: Optional[str] = None
    card_definition: Optional[str] = None

class CardUpdateID(BaseSchema):
    card_id: uuid.UUID
    card_term: Optional[str] = None
    card_definition: Optional[str] = None
    card_term_url: Optional[str] = None
    card_definition_url: Optional[str] = None

class CardOut(BaseSchema):
    card_id: uuid.UUID
    deck_id: uuid.UUID
    card_term: Optional[str] = None
    card_definition: Optional[str] = None
    card_term_url: Optional[str] = None
    card_definition_url: Optional[str] = None
    is_due: bool | None

class CardOutNoDue(BaseSchema):
    card_id: uuid.UUID
    deck_id: uuid.UUID
    card_term: Optional[str] = None
    card_definition: Optional[str] = None
    card_term_url: Optional[str] = None
    card_definition_url: Optional[str] = None

class CardOutDeckNameNoDue(BaseSchema):
    card_id: uuid.UUID
    deck_id: uuid.UUID
    deck_name: str
    card_term: Optional[str] = None
    card_definition: Optional[str] = None
    card_term_url: Optional[str] = None
    card_definition_url: Optional[str] = None

class ImageUploadRequest(BaseSchema):
    id: str
    file_name: str
    file_type: str

#StudySession input is just deck_id

class StudySessionOut(BaseSchema):
    session_id: uuid.UUID
    deck_name: str
    started_at: datetime
    completed_at: datetime | None

class StudySessionInfo(BaseSchema):
    session_id: uuid.UUID
    deck_name: str
    cards_due: int
    cards_studied: int | None
    session_time: int | None
    easy: int | None
    medium: int | None
    hard: int | None
    forgot: int | None

class DueDecksOut(BaseSchema):
    deck_id: uuid.UUID
    deck_name: str
    total_cards: int
    num_cards_due: int
    avg_rating: float | None

class CardProgressIn(BaseSchema):
    card_id: uuid.UUID
    current_rating: str

class CardProgressOut(BaseSchema):
    card_term: Optional[str] = None
    next_review_date: date
    times_reviewed: int
    last_rating: str

class TextImportIn(BaseSchema):
    raw_text: str

#RoomCreate and RoomUpdate are basically one column
class RoomOut(BaseSchema):
    room_id: uuid.UUID
    room_code: str
    host_name: str
    deck_name: str
    created_at: datetime
    room_status: str
    participant_count: int

class RoomParticipantOut(BaseSchema):
    room_id: uuid.UUID
    room_code: str
    hosted_by: str
    deck_name: str
    created_at: datetime
    room_status: str
    score: int | None
    placement: str | None
    can_delete: bool

class StudySessionOut(BaseSchema):
    session_id: uuid.UUID
    deck_name: str
    cards_due: int | None
    cards_studied: int | None
    started_at: datetime
    completed_at: datetime | None

class StudySessionMetaOut(BaseSchema):
    session_id: uuid.UUID
    deck_id: uuid.UUID
    deck_name: str
    cards_due: int | None
    cards_studied: int | None
    started_at: datetime
    completed_at: datetime | None
    easy: int | None
    medium: int | None
    hard: int | None
    forgot: int | None

class SessionStatsOut(BaseSchema):
    study_time: float
    study_time_diff: float | None
    num_sessions: int
    num_sessions_diff: float | None
    cards_studied: int
    cards_studied_diff: float | None
    accuracy: int
    accuracy_diff: float | None

class RoomCard(BaseSchema):
    card_id: uuid.UUID
    room_question: str
    short_answer : str | None

class RoomStatsOut(BaseSchema):
    rooms_played: int | None
    rooms_hosted: int | None
    best_position: int | None
    accuracy: float | None

class RoomChoiceOut(BaseSchema):
    choice_id: uuid.UUID
    choice_text: str
    choice_url: Optional[str]
    is_correct: bool
    is_player_choice: bool

class RoomQAOut(BaseSchema):
    room_question_id: uuid.UUID
    prompt: str
    prompt_url: Optional[str]
    choices: list["RoomChoiceOut"]

class RoomInfoOut(BaseSchema):
    room_id: uuid.UUID
    deck_name: str
    interval: int
    room_status: str
    created_at: datetime
    questions: list["RoomQAOut"]
    scores: list[dict]

class RoomLobbyInfoOut(BaseSchema):
    room_id: uuid.UUID
    room_code: str
    room_status: str
    deck_name: str
    host_id: uuid.UUID
    interval: int
    num_questions: int
    participants: list[dict]