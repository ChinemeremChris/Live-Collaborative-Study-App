from fastapi import APIRouter, Depends, Request, Body, HTTPException
from fastapi_users.password import PasswordHelper
from app.db import get_user_db, get_async_session, User, CardProgress, Deck, RoomParticipant, StudySession, CardReview
from app.users import current_active_user
from app.schemas import UserUpdate, UserStats
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession
from app.limiter import limiter
from typing import Annotated
import logging
from datetime import date, timedelta


logger = logging.getLogger(__name__)
router = APIRouter()
password_helper = PasswordHelper()

@limiter.limit("1/min")
@router.patch("/users/me")
async def CompleteOauthProfile(request: Request, user_data: Annotated[UserUpdate, Body()], user: User = Depends(current_active_user), user_db = Depends(get_user_db)):
    try:
        update_data = {}
        if user_data.fname:
            update_data["fname"] = user_data.fname
        else:
            raise HTTPException(status_code=400, detail="First name required")
        if user_data.lname:
            update_data["lname"] = user_data.lname
        else:
            raise HTTPException(status_code=400, detail="Last name required")
        if user_data.password:
            if user_data.fname.lower() in user_data.password.lower() or user_data.lname.lower() in user_data.password.lower() or user.email.lower() in user_data.password.lower():
                raise HTTPException(status_code=400, detail="Password cannot contain name or email")
            update_data["hashed_password"] = password_helper.hash(user_data.password)
        
        updated_user = await user_db.update(user, update_data)
        return {"message": "Profile Completed"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"CompleteOAuthProfile failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to complete OAuth profile")

@router.get("/stats")
@limiter.limit("3/min")
async def GetStats (request: Request, user: User = Depends(current_active_user), session: AsyncSession = Depends(get_async_session)):
    study_sessions_query = select(func.date(StudySession.started_at).label("study_date")).distinct().where(StudySession.student_id == user.id, StudySession.cards_studied > 0).order_by(func.date(StudySession.started_at).desc())
    study_sessions_result = await session.execute(study_sessions_query)
    study_sessions = study_sessions_result.scalars().all()
    study_sessions = [d if isinstance(d, date) else date.fromisoformat(str(d)) for d in study_sessions]
    print(study_sessions)
    streak = 0
    today = date.today()
    if not study_sessions or study_sessions[0] != today:
        print(f"{study_sessions[0]} does not match {today}")
        streak = 0
    else:
        streak = 1
        while streak < len(study_sessions):
            if today - timedelta(days=streak) == study_sessions[streak]:
                streak += 1
            else:
                break


    week_day = (today.weekday() + 1) % 7
    week_start = today - timedelta(days=week_day)
    next_week_start = week_start + timedelta(days=7)

    study_week_query = select(func.date(StudySession.started_at)).distinct().where(StudySession.student_id == user.id, StudySession.cards_studied > 0, StudySession.started_at >= week_start, StudySession.started_at < next_week_start)
    study_week_result = await session.execute(study_week_query)
    study_week = study_week_result.scalars().all()
    study_week_dates = [d if isinstance(d, date) else date.fromisoformat(str(d)) for d in study_week]
    study_week_list = [week_start + timedelta(days=i) in study_week_dates for i in range(7)]

    week_cards_studied_query = select(func.count(CardReview.review_id).label("num_cards")).where(CardReview.student_id == user.id, CardReview.reviewed_at >= week_start, CardReview.reviewed_at < next_week_start)
    week_cards_studied_result = await session.execute(week_cards_studied_query)
    week_cards_studied = week_cards_studied_result.scalar_one()

    deck_count_query = select(func.count(Deck.deck_id).label("num_decks"), func.count(case((Deck.is_public == True, 1))).label("public_decks")).where(Deck.creator_id == user.id)
    deck_count_result = await session.execute(deck_count_query)
    deck_count = deck_count_result.one()

    rooms_query = select(func.count(RoomParticipant.room_id).label("rooms_played"), func.count(case((RoomParticipant.placement.like("1/%"), 1))).label("rooms_won")).where(RoomParticipant.participant_id == user.id)
    rooms_result = await session.execute(rooms_query)
    rooms = rooms_result.one()

    num_cards_due_query = select(func.count(CardProgress.card_id)).where(CardProgress.student_id == user.id, CardProgress.next_review_date <= today)
    num_cards_due_result = await session.execute(num_cards_due_query)
    num_cards_due = num_cards_due_result.scalar_one()

    return UserStats(
        study_streak=streak,
        study_week_list=study_week_list,
        week_cards_studied=week_cards_studied,
        num_decks=deck_count.num_decks,
        public_decks=deck_count.public_decks,
        rooms_played=rooms.rooms_played,
        rooms_won=rooms.rooms_won,
        num_cards_due=num_cards_due
    )


