import logging
from fastapi import APIRouter, Depends, Query, Path, Body, Request, HTTPException
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from limiter import limiter
from users import current_active_user, current_optional_user
from db import get_async_session, User, StudySession, Card, Deck
from schemas import StudySessionOut
from typing import Annotated
import uuid
from datetime import datetime, timezone

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/{deck_id}")
@limiter.limit("2/minute")
async def StartSession(request: Request, deck_id: Annotated[uuid.UUID, Path()], cards_due: Annotated[int, Body()], user: User = Depends(current_active_user), session: AsyncSession = Depends(get_async_session)):
    try:
        deck_query = select(Deck).where(Deck.deck_id == deck_id)
        result = await session.execute(deck_query)
        deck = result.scalar_one_or_none()
        if not deck:
            raise HTTPException(status_code=404, detail="Deck not found")
        if not deck.is_public and deck.creator_id != user.id:
            raise HTTPException(status_code=403, detail="Deck is private and you are not the creator")
        study_session = StudySession(
            student_id = user.id,
            deck_id = deck_id,
            started_at = datetime.now(timezone.utc),
            cards_due = cards_due
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
    
@router.get("/me")
@limiter.limit("10/minute")
async def GetMySessions(request: Request, user: User = Depends(current_active_user), session: AsyncSession = Depends(get_async_session)):
    try:
        query = select(StudySession).options(selectinload(StudySession.deck)).where(StudySession.student_id == user.id)
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