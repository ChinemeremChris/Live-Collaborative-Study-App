from fastapi import APIRouter, Depends, Request, Body, HTTPException, Response
from fastapi_users.password import PasswordHelper
from app.db import get_user_db, get_async_session, User, CardProgress, Deck, OAuthAccount, RoomParticipant, StudySession, CardReview, Card, RoomQuestion, RoomQuestionChoice
from app.users import current_active_user, get_user_manager
from app.schemas import UserUpdate, UserStats, ChangePasswordRequest
from sqlalchemy import select, func, case, update, delete, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.limiter import limiter
from app.services.s3 import batch_delete_image
from typing import Annotated
import logging
from datetime import date, timedelta, datetime, timezone
from zoneinfo import ZoneInfo
from app.timezone import get_user_timezone
import asyncio


logger = logging.getLogger(__name__)
router = APIRouter()
password_helper = PasswordHelper()

@limiter.limit("5/minute")
@router.delete("/users/me")
async def DeleteAccount(request: Request, response: Response, user: User = Depends(current_active_user), session: AsyncSession = Depends(get_async_session)):
    try:
        end_study_sessions = update(StudySession).where(StudySession.student_id == user.id, StudySession.completed_at.is_(None)).values(completed_at=datetime.now(timezone.utc))
        await session.execute(end_study_sessions)
        update_public_decks = update(Deck).where(Deck.creator_id == user.id, Deck.is_public == True).values(creator_id=None)
        await session.execute(update_public_decks)
        to_be_deleted_query = select(Card.card_term_url).outerjoin(Card.parent_deck).where(Deck.creator_id == user.id, Deck.is_public.is_(False), and_(Card.card_term_url.is_not(None), Card.card_term_url != "string"))
        to_be_deleted_result = await session.execute(to_be_deleted_query)
        to_be_deleted_term_imgs = to_be_deleted_result.scalars().all()

        to_be_deleted_query = select(Card.card_definition_url).outerjoin(Card.parent_deck).where(Deck.creator_id == user.id, Deck.is_public.is_(False), and_(Card.card_definition_url.is_not(None), Card.card_definition_url != "string"))
        to_be_deleted_result = await session.execute(to_be_deleted_query)
        to_be_deleted_def_imgs = to_be_deleted_result.scalars().all()

        to_be_deleted_imgs = to_be_deleted_term_imgs + to_be_deleted_def_imgs

        if to_be_deleted_imgs:
            in_use_query = select(RoomQuestion.prompt_url).where(RoomQuestion.prompt_url.in_(to_be_deleted_imgs))
            in_use_result = await session.execute(in_use_query)
            in_use_terms = in_use_result.scalars().all()

            in_use_query = select(RoomQuestionChoice.choice_url).where(RoomQuestionChoice.choice_url.in_(to_be_deleted_imgs))
            in_use_result = await session.execute(in_use_query)
            in_use_defs = in_use_result.scalars().all()

            in_use_imgs = in_use_terms + in_use_defs
            images_to_be_deleted = set(to_be_deleted_imgs) - set(in_use_imgs)
            if images_to_be_deleted:
                await asyncio.to_thread(batch_delete_image, list(images_to_be_deleted))
        
        delete_private_decks = delete(Deck).where(Deck.creator_id == user.id, Deck.is_public.is_(False))
        await session.execute(delete_private_decks)
        await session.execute(delete(OAuthAccount).where(OAuthAccount.user_id == user.id))
        user.is_deleted = True
        user.deleted_at = datetime.now(timezone.utc)
        user.email = f"deleted_{user.id}@deleted.com"
        user.fname = "Deleted"
        user.lname = "User"
        user.hashed_password = ""
        user.is_active = False
        await session.commit()
        response.delete_cookie("fastapiusersauth", httponly=True, secure=IS_PROD, samesite="none" if IS_PROD else "lax")
        return {"message": "Account Deleted"}
    except HTTPException:
        await session.rollback()
        raise
    except Exception as e:
        await session.rollback()
        logger.error(f"DeleteAccount failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete account")

        
@router.patch("/users/password/me")
@limiter.limit("1/minute")
async def UpdatePassword(request: Request, passwordObj: Annotated[ChangePasswordRequest, Body()],  user: User = Depends(current_active_user), user_manager = Depends(get_user_manager)):
    try:
        if passwordObj.new and passwordObj.old:
            valid = None
            if user.hashed_password:
                valid = password_helper.verify_and_update(passwordObj.old, user.hashed_password)[0]
                if not valid:
                    raise HTTPException(status_code=400, detail="Current password is incorrect")
            await user_manager.update(UserUpdate(password=passwordObj.new), user, safe=True, request=request)
            return {"message": "Password successfully updated"}
        elif passwordObj.new and not passwordObj.old:
            if not user.hashed_password:
                await user_manager.update(UserUpdate(password=passwordObj.new), user, safe=True, request=request)
                return {"message": "Password successfully updated"}
            else:
                raise HTTPException(status_code=400, detail="Old password is required")    
        else:
            raise HTTPException(status_code=400, detail="You need to fill the input fields")
    except HTTPException:
        # rollback?
        raise
    except Exception as e:
            #rollback?
            logger.error(f"UpdatePassword failed: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="Failed to update password")

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
@limiter.limit("10/min")
async def GetStats (request: Request, user: User = Depends(current_active_user), session: AsyncSession = Depends(get_async_session)):
    tz = get_user_timezone(user)
    today = datetime.now(timezone.utc).astimezone(tz).date()
    utc_offset = datetime.now(tz).utcoffset()
    total_seconds = int(utc_offset.total_seconds())
    hours, remainder = divmod(abs(total_seconds), 3600)
    minutes = remainder // 60
    sign = '+' if total_seconds >= 0 else '-'
    offset_str = f"{sign}{hours:02d}:{minutes:02d}"
    
    local_date_expr = func.date(func.convert_tz(StudySession.started_at, '+00:00', offset_str))

    week_day = (today.weekday() + 1) % 7
    week_start = today - timedelta(days=week_day)
    next_week_start = week_start + timedelta(days=7)
    week_start_dt = datetime(week_start.year, week_start.month, week_start.day, tzinfo=tz).astimezone(timezone.utc)
    next_week_start_dt = datetime(next_week_start.year, next_week_start.month, next_week_start.day, tzinfo=tz).astimezone(timezone.utc)

    study_sessions_query = select(local_date_expr.label("study_date")).distinct().where(StudySession.student_id == user.id, StudySession.cards_studied > 0).order_by(local_date_expr.desc())
    study_sessions_result = await session.execute(study_sessions_query)
    study_sessions = study_sessions_result.scalars().all()
    study_sessions = [d if isinstance(d, date) else date.fromisoformat(str(d)) for d in study_sessions]
    print(study_sessions)
    streak = 0
    if study_sessions and today - timedelta(days=1) <= study_sessions[0] <= today:
        streak = 1
        while streak < len(study_sessions):
            if study_sessions[0] - timedelta(days=streak) == study_sessions[streak]:
                streak += 1
            else:
                break

    study_week_query = select(local_date_expr).distinct().where(StudySession.student_id == user.id, StudySession.cards_studied > 0, StudySession.started_at >= week_start, StudySession.started_at < next_week_start)
    study_week_result = await session.execute(study_week_query)
    study_week = study_week_result.scalars().all()
    study_week_dates = [d if isinstance(d, date) else date.fromisoformat(str(d)) for d in study_week]
    study_week_list = [week_start + timedelta(days=i) in study_week_dates for i in range(7)]

    week_cards_studied_query = select(func.count(CardReview.review_id).label("num_cards")).where(CardReview.student_id == user.id, CardReview.reviewed_at >= week_start_dt, CardReview.reviewed_at < next_week_start_dt)
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


