import logging
from fastapi import APIRouter, Request, HTTPException, Depends, Query, Body, Path
from users import current_active_user, current_optional_user
from typing import Annotated
from sqlalchemy import select, delete, func, or_, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from db import get_async_session, User, CardProgress, StudySession, Card, Deck
from services.sm2 import SM2
from limiter import limiter
import uuid
from datetime import date

logger = logging.getLogger(__name__)
router = APIRouter()

@router.put("/{card_id}")
@limiter.limit("20/minute")
async def InputProgress(request: Request, card_id: Annotated[uuid.UUID, Path()], session_id: Annotated[uuid.UUID, Body()], rating: Annotated[str, Body()], user: User = Depends(current_active_user), session: AsyncSession = Depends(get_async_session)):
    try:
        session_query = select(StudySession).where(StudySession.session_id == session_id, StudySession.student_id == user.id)
        session_result = await session.execute(session_query)
        study_session = session_result.scalar_one_or_none()
        if not study_session:
            raise HTTPException(status_code=404, detail="Study session not found")
        card_query = select(Card).join(Deck).where(Card.card_id == card_id, or_(Deck.is_public.is_(True), Deck.creator_id == user.id))
        card_result = await session.execute(card_query)
        card = card_result.scalar_one_or_none()
        if not card:
            raise HTTPException(status_code=404, detail="Card not found")
        progress_query = select(CardProgress).where(CardProgress.card_id == card_id, CardProgress.student_id == user.id)
        result = await session.execute(progress_query)
        card_progress = result.scalar_one_or_none()
        if not card_progress:
            card_progress = CardProgress(
                student_id = user.id,
                card_id = card_id,
                last_rating = rating
            )
            session.add(card_progress)
            await session.flush()
            await session.refresh(card_progress)
        return_dict = SM2(card_progress.ease_factor, rating, card_progress.times_reviewed, card_progress.current_interval)
        card_progress.ease_factor = return_dict["ease_factor"]
        card_progress.current_interval = return_dict["interval"]
        card_progress.next_review_date = return_dict["next_review_date"]
        card_progress.times_reviewed = return_dict["times_reviewed"]
        card_progress.last_rating = rating
        study_session.cards_studied += 1
        await session.commit()
        return {
            "interval": return_dict["interval"]
        }
    except HTTPException:
        await session.rollback()
        raise
    except Exception as e:
        await session.rollback()
        logger.error(f"InputProgress failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to input card progress")
    
@router.delete("/{card_id}")
@limiter.limit("20/minute")
async def ResetCardProgress(request: Request, card_id: Annotated[uuid.UUID, Path()], user: User = Depends(current_active_user), session: AsyncSession = Depends(get_async_session)):
    try:
        card_query = select(Card).join(Deck).where(Card.card_id == card_id, or_(Deck.is_public.is_(True), Deck.creator_id == user.id))
        card_result = await session.execute(card_query)
        card = card_result.scalar_one_or_none()
        if not card:
            raise HTTPException(status_code=404, detail="Card not found")
        progress_query = select(CardProgress).where(CardProgress.card_id == card_id, CardProgress.student_id == user.id)
        result = await session.execute(progress_query)
        card_progress = result.scalar_one_or_none()
        if not card_progress:
            raise HTTPException(status_code=400, detail="Card is already at default")
        card_progress.ease_factor = 2.5
        card_progress.current_interval = 1
        card_progress.next_review_date = date.today()
        card_progress.times_reviewed = 0
        card_progress.last_rating = None
        await session.commit()
        return {"message": "Card progress has been reset"}
    except HTTPException:
        await session.rollback()
        raise
    except Exception as e:
        await session.rollback()
        logger.error(f"ResetCardProgress failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to reset card progress")
