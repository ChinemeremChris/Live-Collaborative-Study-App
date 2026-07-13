from collections.abc import AsyncGenerator
from fastapi import Depends
from fastapi_users.db import SQLAlchemyBaseUserTableUUID, SQLAlchemyUserDatabase, SQLAlchemyBaseOAuthAccountTableUUID
from sqlalchemy import String, Boolean, ForeignKey, Text, Float, Date, Integer, DateTime, JSON
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, relationship, mapped_column
import os
import uuid
from datetime import date, datetime, timezone
from dotenv import load_dotenv
from typing import Optional

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

class Base(DeclarativeBase):
    pass

class OAuthAccount(SQLAlchemyBaseOAuthAccountTableUUID, Base):
    pass

class User(SQLAlchemyBaseUserTableUUID, Base):
    fname: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    lname: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(nullable=True)

    oauth_accounts: Mapped[list["OAuthAccount"]] = relationship("OAuthAccount", lazy="joined")
    decks: Mapped[list["Deck"]] = relationship(back_populates="deck_creator")
    session: Mapped[list["StudySession"]] = relationship(back_populates="student", cascade="all, delete-orphan")
    card_progress: Mapped[list["CardProgress"]] = relationship(back_populates="student")
    rooms_hosted: Mapped[list["Room"]] = relationship(back_populates="host")
    participation: Mapped[list["RoomParticipant"]] = relationship(back_populates="participant")
    deck_rating: Mapped[list["DeckRating"]] = relationship(back_populates="rater")
    room_answer: Mapped[list["RoomAnswer"]] = relationship(back_populates="room_student")



class Deck(Base):
    __tablename__ = "deck"
    deck_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    deck_name: Mapped[str] = mapped_column(String(250))
    creator_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id"), index=True)
    is_public: Mapped[bool] = mapped_column(default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))

    deck_creator: Mapped["User"] = relationship(back_populates="decks")
    child_cards: Mapped[list["Card"]] = relationship(back_populates="parent_deck", cascade="all, delete-orphan")
    deck_tag: Mapped[list["Deck_Tag"]] = relationship(back_populates="deck", cascade="all, delete-orphan")
    deck_session: Mapped[list["StudySession"]] = relationship(back_populates="deck", cascade="all, delete-orphan")
    rooms_studied: Mapped[list["Room"]] = relationship(back_populates="deck")
    deck_rating: Mapped[list["DeckRating"]] = relationship(back_populates="deck", cascade="all, delete-orphan")

class DeckRating(Base):
    __tablename__ = "deck_rating"
    deck_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("deck.deck_id", ondelete="CASCADE"), primary_key=True, index=True)
    rater_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id"), primary_key=True, index=True)
    rating: Mapped[int] = mapped_column()
    rated_at: Mapped[datetime] = mapped_column(default=datetime.now(timezone.utc))

    deck: Mapped["Deck"] = relationship(back_populates="deck_rating")
    rater: Mapped["User"] = relationship(back_populates="deck_rating")

class Card(Base):
    __tablename__ = "card"
    card_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    deck_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("deck.deck_id", ondelete="CASCADE"), index=True)
    card_term: Mapped[str] = mapped_column(Text)
    card_definition: Mapped[str] = mapped_column(Text)
    card_term_url: Mapped[str|None] = mapped_column(String(250), nullable=True)
    card_definition_url: Mapped[str|None] = mapped_column(String(250), nullable=True)

    parent_deck: Mapped["Deck"] = relationship(back_populates="child_cards")
    card_progress: Mapped[list["CardProgress"]] = relationship(back_populates="card", cascade="all, delete-orphan")

class Tag(Base):
    __tablename__ = "tag"
    tag_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tag_name: Mapped[str] = mapped_column(String(200))

    tag_deck: Mapped[list["Deck_Tag"]] = relationship(back_populates="tag")

class Deck_Tag(Base):
    __tablename__ = "deck_tag"
    tag_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tag.tag_id", ondelete="CASCADE"), primary_key=True)
    deck_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("deck.deck_id", ondelete="CASCADE"), primary_key=True)
    
    tag: Mapped["Tag"] = relationship(back_populates="tag_deck")
    deck: Mapped["Deck"] = relationship(back_populates="deck_tag")

class StudySession(Base):
    __tablename__ = "study_session"
    session_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id"), index=True)
    deck_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("deck.deck_id", ondelete="CASCADE"), index=True)
    cards_due: Mapped[int] = mapped_column(default=0)
    cards_studied: Mapped[int] = mapped_column(default=0)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.now(timezone.utc))
    completed_at: Mapped[datetime|None] = mapped_column(DateTime(timezone=True), nullable=True, default=None)

    student: Mapped["User"] = relationship(back_populates="session")
    deck: Mapped["Deck"] = relationship(back_populates="deck_session")

class CardProgress(Base):
    __tablename__ = "card_progress"
    progress_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id"), index=True)
    card_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("card.card_id", ondelete="CASCADE"), index=True)
    ease_factor: Mapped[float] = mapped_column(Float, default=2.5)
    current_interval: Mapped[int] = mapped_column(default=1)
    next_review_date: Mapped[date|None] = mapped_column(Date, default=date.today(), index=True)
    times_reviewed: Mapped[int] = mapped_column(default=0)
    last_rating: Mapped[str|None] = mapped_column(String(6), nullable=True)

    student: Mapped["User"] = relationship(back_populates="card_progress")
    card: Mapped["Card"] = relationship(back_populates="card_progress")

class Room(Base):
    __tablename__ = "room"
    room_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    host_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id"), index=True)
    deck_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("deck.deck_id", ondelete="SET NULL"), nullable=True, index=True) #make nullable?
    room_code: Mapped[str] = mapped_column(String(6), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.now(timezone.utc))
    room_status: Mapped[str] = mapped_column(String(20), default="Waiting")

    host: Mapped["User"] = relationship(back_populates="rooms_hosted")
    deck: Mapped["Deck"] = relationship(back_populates="rooms_studied")
    participation: Mapped[list["RoomParticipant"]] = relationship(back_populates="room")
    room_question: Mapped[list["RoomQuestion"]] = relationship(back_populates="host_room")


class RoomParticipant(Base):
    __tablename__ = "room_participant"
    participant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id"), primary_key=True)
    room_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("room.room_id", ondelete="CASCADE"), primary_key=True, index=True)
    score: Mapped[int] = mapped_column(Integer, nullable=True)
    placement: Mapped[str] = mapped_column(String(10), nullable=True) #save position like 1/30 as string so you don't need complicated queries

    participant: Mapped["User"] = relationship(back_populates="participation")
    room: Mapped["Room"] = relationship(back_populates="participation")

class RoomQuestion(Base):
    __tablename__ = "room_question"
    room_question_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    room_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("room.room_id", ondelete="CASCADE"), index=True)
    prompt: Mapped[str] = mapped_column(Text)
    prompt_url: Mapped[str|None] = mapped_column(String(250), nullable=True)
    order_in_room: Mapped[int] = mapped_column()

    host_room: Mapped["Room"] = relationship(back_populates="room_question")
    student_answer: Mapped[list["RoomAnswer"]] = relationship(back_populates="student_question")
    question_choices: Mapped[list["RoomQuestionChoice"]] = relationship(back_populates="parent_question", order_by="RoomQuestionChoice.choice_order", cascade="all, delete-orphan")

class RoomQuestionChoice(Base):
    __tablename__ = "room_question_choice"
    choice_id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    room_question_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("room_question.room_question_id", ondelete="CASCADE"))
    choice_text: Mapped[str] = mapped_column(Text)
    choice_url: Mapped[str|None] = mapped_column(String(250), nullable=True)
    is_correct: Mapped[bool] = mapped_column()
    choice_order: Mapped[int] = mapped_column()

    parent_question: Mapped["RoomQuestion"] = relationship(back_populates="question_choices")
    answers: Mapped[list["RoomAnswer"]] = relationship(back_populates="question_choice")

class RoomAnswer(Base):
    __tablename__ = "room_answer"
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id"), primary_key=True)
    room_question_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("room_question.room_question_id", ondelete="CASCADE"), primary_key=True)
    answer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("room_question_choice.choice_id"))
    is_correct: Mapped[bool] = mapped_column()

    room_student: Mapped["User"] = relationship(back_populates="room_answer")
    student_question: Mapped["RoomQuestion"] = relationship(back_populates="student_answer")
    question_choice: Mapped["RoomQuestionChoice"] = relationship(back_populates="answers")
    





engine = create_async_engine(DATABASE_URL)
async_session_maker = async_sessionmaker(engine, expire_on_commit=False)

async def create_db_and_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session

async def get_user_db(session: AsyncSession = Depends(get_async_session)):
    yield SQLAlchemyUserDatabase(session, User, OAuthAccount)


