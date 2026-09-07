import logging
from fastapi import APIRouter, Depends, Query, Path, Body, Request, HTTPException
from sqlalchemy import select, delete, func, and_, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.limiter import limiter
from app.users import current_active_user, current_optional_user
from app.db import get_async_session, User, StudySession, Card, Deck, CardProgress, DeckRating, CardReview
from app.schemas import StudySessionOut, DueDecksOut, CardOutNoDue, CardOutDeckNameNoDue, StudySessionInfo
from typing import Annotated
import uuid
from datetime import datetime, timezone, date

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/me")
@limiter.limit("3/minute")
async def GetMySessions(request: Request, limit: Annotated[int, Query()] = 20, user: User = Depends(current_active_user), session: AsyncSession = Depends(get_async_session)):
    try:
        query = select(StudySession).options(selectinload(StudySession.deck)).where(StudySession.student_id == user.id).order_by(StudySession.started_at.desc()).limit(limit)
        result = await session.execute(query)
        study_sessions = result.scalars().all()
        study_session_out = []
        if study_sessions:
            for study_session in study_sessions:
                study_session_out.append(
                    StudySessionOut(
                        session_id=study_session.session_id,
                        deck_name=study_session.deck.deck_name,
                        cards_due=study_session.cards_due,
                        cards_studied=study_session.cards_studied,
                        started_at=study_session.started_at,
                        completed_at=study_session.completed_at
                    )
                )
        return study_session_out
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"GetMySessions failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch study sessions")

@router.get("/session/{session_id}")
@limiter.limit("3/minute")
async def GetSession(request: Request, session_id: Annotated[uuid.UUID, Path()], user: User = Depends(current_active_user), session: AsyncSession = Depends(get_async_session)):
    try:
        session_query = select(StudySession, CardReview.rating, func.count(CardReview.review_id).label("num_ratings")).options(selectinload(StudySession.deck)).join(StudySession.card_reviews).where(StudySession.session_id == session_id, StudySession.student_id == user.id).group_by(StudySession.session_id, CardReview.rating)
        session_result = await session.execute(session_query)
        study_session = session_result.all()
        if not study_session:
            raise HTTPException(status_code=404, detail="Study session not found")
        rating_dict = {}
        for row in study_session:
            rating_dict[row.rating] = row.num_ratings
        end_time = study_session[0].StudySession.completed_at or study_session[0].StudySession.last_activity_at

        return StudySessionInfo(
            session_id=study_session[0].StudySession.session_id,
            deck_name=study_session[0].StudySession.deck.deck_name,
            cards_studied=study_session[0].StudySession.cards_studied,
            cards_due=study_session[0].StudySession.cards_due,
            session_time=int((end_time - study_session[0].StudySession.started_at).total_seconds() // 60),
            easy=rating_dict.get("easy", 0),
            medium=rating_dict.get("medium", 0),
            hard=rating_dict.get("hard", 0),
            forgot=rating_dict.get("forgot", 0)
        )
    except HTTPException:
            raise
    except Exception as e:
        logger.error(f"GetSesson failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch study session")
    

@router.get("/due")
@limiter.limit("3/minute")
async def GetDueDecks(request: Request, limit: Annotated[int, Query()] = 20, user: User = Depends(current_active_user), session: AsyncSession = Depends(get_async_session)):
    try:
        ratings = select(DeckRating.deck_id, func.avg(DeckRating.rating).label("avg_rating")).group_by(DeckRating.deck_id).subquery()
        due_cards = select(Deck.deck_id, Deck.deck_name, func.count(CardProgress.card_id).label("num_cards_due")).outerjoin(CardProgress.card).outerjoin(Card.parent_deck).where(CardProgress.student_id == user.id, CardProgress.next_review_date <= date.today()).group_by(Deck.deck_id).subquery()
        total_cards = select(Card.deck_id, func.count(Card.card_id).label("num_total_cards")).group_by(Card.deck_id).subquery()
        main_query = select(due_cards.c.deck_id, due_cards.c.deck_name, due_cards.c.num_cards_due, ratings.c.avg_rating, total_cards.c.num_total_cards).join(total_cards, due_cards.c.deck_id == total_cards.c.deck_id).outerjoin(ratings, due_cards.c.deck_id == ratings.c.deck_id).order_by(due_cards.c.num_cards_due.desc()).limit(limit)
        result = await session.execute(main_query)
        rows = result.all()
        due_decks = [
            DueDecksOut(
                deck_id = row.deck_id,
                deck_name = row.deck_name,
                total_cards = row.num_total_cards,
                num_cards_due = row.num_cards_due,
                avg_rating = row.avg_rating
            )
            for row in rows
        ]
        return due_decks
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"GetDueDecks failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to get study sessions")

@router.post("/{deck_id}")
@limiter.limit("10/minute")
async def StartSession(request: Request, deck_id: Annotated[uuid.UUID, Path()], user: User = Depends(current_active_user), session: AsyncSession = Depends(get_async_session)):
    try:
        deck_query = select(Deck).where(Deck.deck_id == deck_id)
        result = await session.execute(deck_query)
        deck = result.scalar_one_or_none()
        if not deck:
            raise HTTPException(status_code=404, detail="Deck not found")
        #change to allow if user has already started learning deck (if past study session exists)
        if not deck.is_public and deck.creator_id != user.id:
            prev_session_query = select(StudySession).where(StudySession.deck_id == deck_id, StudySession.student_id == user.id).limit(1)
            prev_session_result = await session.execute(prev_session_query)
            prev_session = prev_session_result.scalar_one_or_none()
            if not prev_session:
                raise HTTPException(status_code=403, detail="Deck is private and you are not the creator")
        due_cards_count_query = select(func.count(Card.card_id).label("due_today")).outerjoin(CardProgress, and_(Card.card_id == CardProgress.card_id, CardProgress.student_id == user.id)).where(Card.deck_id == deck_id, or_(CardProgress.next_review_date <= date.today(), CardProgress.progress_id.is_(None)))
        due_cards_count_result = await session.execute(due_cards_count_query)
        due_cards_count = due_cards_count_result.scalar_one()
        study_session = StudySession(
            student_id = user.id,
            deck_id = deck_id,
            started_at = datetime.now(timezone.utc),
            last_activity_at = datetime.now(timezone.utc),
            cards_due = due_cards_count
        )
        session.add(study_session)
        await session.flush()
        await session.refresh(study_session)
        await session.commit()
        return {"study_session": study_session.session_id}
    except HTTPException:
        await session.rollback()
        raise
    except Exception as e:
        await session.rollback()
        logger.error(f"StartSession failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create study session")

@router.get("/{deck_id}")
@limiter.limit("10/minute")
async def GetDueCards(request: Request, deck_id: Annotated[uuid.UUID, Path()], user: User = Depends(current_active_user), session: AsyncSession = Depends(get_async_session)):
    try:
        deck_query = select(Deck).where(Deck.deck_id == deck_id)
        deck_result = await session.execute(deck_query)
        deck = deck_result.scalar_one_or_none()
        if not deck:
            raise HTTPException(status_code=404, detail="Deck not found")
        if not deck.is_public and deck.creator_id != user.id:
            prev_session_query = select(StudySession).where(StudySession.deck_id == deck_id, StudySession.student_id == user.id).limit(1)
            prev_session_result = await session.execute(prev_session_query)
            prev_session = prev_session_result.scalar_one_or_none()
            if not prev_session:
                raise HTTPException(status_code=403, detail="Deck is private")
        
        due_cards_query = select(Card).outerjoin(Card.card_progress.and_(CardProgress.student_id == user.id)).where(Card.deck_id == deck_id, or_(CardProgress.next_review_date <= date.today(), CardProgress.progress_id == None)).order_by(CardProgress.next_review_date)
        due_cards_result = await session.execute(due_cards_query)
        due_cards = due_cards_result.scalars().all()
        due_cards_out = [
            CardOutDeckNameNoDue(
                card_id=card.card_id,
                deck_id=card.deck_id,
                deck_name=deck.deck_name,
                card_term=card.card_term,
                card_definition=card.card_definition,
                card_term_url=card.card_term_url,
                card_definition_url=card.card_definition_url
            )
        for card in due_cards]

        return due_cards_out
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"GetDueCards failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to get due cards")

@router.patch("/{session_id}")
async def EndSession(request: Request, session_id: Annotated[uuid.UUID, Path()], user: User = Depends(current_active_user), session: AsyncSession = Depends(get_async_session)):
    try:
        query = select(StudySession).where(StudySession.session_id == session_id, StudySession.student_id == user.id)
        result = await session.execute(query)
        study_session = result.scalar_one_or_none()
        if not study_session:
            raise HTTPException(status_code=404, detail="Session not found")
        study_session.completed_at = datetime.now(timezone.utc)
        await session.commit()
        return {"message": f"session {session_id} completed"}
    except HTTPException:
        await session.rollback()
        raise
    except Exception as e:
        await session.rollback()
        logger.error(f"EndSession failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update session data")

@router.patch("/heartbeat/{session_id}")
@limiter.limit("2/min")
async def HeartBeat(request: Request, session_id: Annotated[uuid.UUID, Path()], user: User = Depends(current_active_user), session: AsyncSession = Depends(get_async_session)):
    try:
        session_query = select(StudySession).where(StudySession.session_id == session_id, StudySession.student_id == user.id, StudySession.completed_at.is_(None))
        session_result = await session.execute(session_query)
        study_session = session_result.scalar_one_or_none()
        if not study_session:
            raise HTTPException(status_code=404, detail="Study session not found")
        study_session.last_activity_at = datetime.now(timezone.utc)
        await session.commit()
        return {"status": "OK"}
    except HTTPException:
        await session.rollback()
        raise
    except Exception as e:
        await session.rollback()
        logger.error(f"HeartBeat failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to maintain session heartbeat")