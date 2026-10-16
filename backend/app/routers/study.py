import logging
from fastapi import APIRouter, Depends, Query, Path, Body, Request, HTTPException
from sqlalchemy import select, delete, func, and_, or_, text
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.limiter import limiter
from app.users import current_active_user, current_optional_user
from app.db import get_async_session, User, StudySession, Card, Deck, CardProgress, DeckRating, CardReview
from app.schemas import StudySessionOut, StudySessionMetaOut, DueDecksOut, CardOutNoDue, CardOutDeckNameNoDue, StudySessionInfo, SessionStatsOut
from typing import Annotated
import uuid
from datetime import datetime, timezone, date, timedelta
from calendar import monthrange
from app.timezone import get_user_timezone
from app.services.percentage import percentage_diff
from app.encoder import encode_cursor, decode_cursor

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/me")
@limiter.limit("30/minute")
async def GetMySessions(request: Request, cursor: Annotated[str, Query()] = None, limit: Annotated[int, Query()] = 5, user: User = Depends(current_active_user), session: AsyncSession = Depends(get_async_session)):
    try:
        tz = get_user_timezone(user)
        query = None
        if cursor:
            current_cursor = decode_cursor(cursor)
            query = select(StudySession).options(selectinload(StudySession.deck)).where(StudySession.student_id == user.id, or_(StudySession.started_at < current_cursor.get("started_at", None), and_(StudySession.started_at == current_cursor.get("started_at", None), StudySession.session_id < current_cursor.get("session_id", None)))).order_by(StudySession.started_at.desc(), StudySession.session_id.desc()).limit(limit+1)
        else:
            query = select(StudySession).options(selectinload(StudySession.deck)).where(StudySession.student_id == user.id).order_by(StudySession.started_at.desc(), StudySession.session_id.desc()).limit(limit+1)
        result = await session.execute(query)
        study_sessions = result.scalars().all()
        has_next = len(study_sessions) > limit
        next_cursor = None
        if has_next:
            study_sessions = study_sessions[:limit]
            next_cursor = encode_cursor(study_sessions[-1].started_at, study_sessions[-1].session_id)
        study_session_ids = []
        if study_sessions:
            for study_session in study_sessions:
                study_session.started_at = study_session.started_at.astimezone(tz)
                if study_session.completed_at:
                    study_session.completed_at = study_session.completed_at.astimezone(tz)
                study_session_ids.append(study_session.session_id)
                
            card_review_query = select(CardReview.session_id, CardReview.rating, func.count(CardReview.review_id).label("num_reviews")).group_by(CardReview.session_id, CardReview.rating).where(user.id == CardReview.student_id, CardReview.session_id.in_(study_session_ids))
            card_review_result = await session.execute(card_review_query)
            card_reviews = card_review_result.all()
            review_dict = {}
            for row in card_reviews:
                if row.session_id not in review_dict:
                    review_dict[row.session_id] = {
                        "easy": 0,
                        "medium": 0,
                        "hard": 0,
                        "forgot": 0
                    }
                if row.rating in review_dict[row.session_id]:
                    review_dict[row.session_id][row.rating] = row.num_reviews

            study_session_out = [
                StudySessionMetaOut(
                    session_id=study_session.session_id,
                    deck_id=study_session.deck.deck_id,
                    deck_name=study_session.deck.deck_name,
                    cards_due=study_session.cards_due,
                    cards_studied=study_session.cards_studied,
                    started_at=study_session.started_at,
                    completed_at=study_session.completed_at,
                    easy=review_dict.get(study_session.session_id, {}).get("easy", 0),
                    medium=review_dict.get(study_session.session_id, {}).get("medium", 0),
                    hard=review_dict.get(study_session.session_id, {}).get("hard", 0),
                    forgot=review_dict.get(study_session.session_id, {}).get("forgot", 0)
                )
                for study_session in study_sessions
            ]
            return {
                "study_sessions": study_session_out,
                "next_cursor": next_cursor
            }
        return {
            "study_sessions": [],
            "next_cursor": None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"GetMySessions failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch study sessions")

@router.get("/history/stats")
@limiter.limit("7/minute")
async def SessionStats(request: Request, interval: Annotated[int, Query()] = None, user: User = Depends(current_active_user), session: AsyncSession = Depends(get_async_session)):
    try:
        if interval:
            tz = get_user_timezone(user)
            utc_offset = datetime.now(tz).utcoffset()
            total_seconds = int(utc_offset.total_seconds())
            hours, remainder = divmod(abs(total_seconds), 3600)
            minutes = remainder // 60
            sign = '+' if total_seconds >= 0 else '-'
            offset_str = f"{sign}{hours:02d}:{minutes:02d}"

            today = datetime.now(timezone.utc).astimezone(tz)
            start_date = today - timedelta(days=interval-1)
            session_query = select(func.coalesce(func.sum(func.timestampdiff(text("SECOND"), StudySession.started_at, func.coalesce(StudySession.completed_at, StudySession.last_activity_at))), 0).label("study_time"), func.coalesce(func.sum(StudySession.cards_studied), 0).label("cards_studied"), func.coalesce(func.count(StudySession.session_id), 0).label("num_sessions")).where(StudySession.student_id == user.id, func.convert_tz(StudySession.started_at, "+00:00", offset_str) >= start_date, func.convert_tz(func.coalesce(StudySession.completed_at, StudySession.last_activity_at), "+00:00", offset_str) <= today)
            session_result = await session.execute(session_query)
            main_stats = session_result.one()

            accuracy_query = select(func.count(CardReview.review_id).label("accuracy")).where(CardReview.student_id == user.id, CardReview.rating.in_(["Easy", "Medium"]), func.convert_tz(CardReview.reviewed_at, "+00:00", offset_str) >= start_date, func.convert_tz(CardReview.reviewed_at, "+00:00", offset_str) <= today)
            accuracy_result = await session.execute(accuracy_query)
            main_accuracy = accuracy_result.one_or_none()

            end_date = today - timedelta(days=interval)
            start_date = end_date - timedelta(days=interval-1)
            comparison_session_query = select(func.coalesce(func.sum(func.timestampdiff(text("SECOND"), StudySession.started_at, func.coalesce(StudySession.completed_at, StudySession.last_activity_at))), 0).label("study_time"), func.coalesce(func.sum(StudySession.cards_studied), 0).label("cards_studied"), func.coalesce(func.count(StudySession.session_id), 0).label("num_sessions")).where(StudySession.student_id == user.id, func.convert_tz(StudySession.started_at, "+00:00", offset_str) >= start_date, func.convert_tz(func.coalesce(StudySession.completed_at, StudySession.last_activity_at), "+00:00", offset_str) <= end_date)
            comparison_session_result = await session.execute(comparison_session_query)
            comparison_stats = comparison_session_result.one()

            accuracy_query = select(func.count(CardReview.review_id).label("accuracy")).where(CardReview.student_id == user.id, CardReview.rating.in_(["Easy", "Medium"]), func.convert_tz(CardReview.reviewed_at, "+00:00", offset_str) >= start_date, func.convert_tz(CardReview.reviewed_at, "+00:00", offset_str) <= end_date)
            accuracy_result = await session.execute(accuracy_query)
            comparison_accuracy = accuracy_result.one_or_none()

            study_time_diff = percentage_diff(main_stats.study_time, comparison_stats.study_time)
            cards_studied_diff = percentage_diff(main_stats.cards_studied, comparison_stats.cards_studied)
            num_sessions_diff = percentage_diff(main_stats.num_sessions, comparison_stats.num_sessions)
            accuracy_diff = percentage_diff(main_accuracy.accuracy, comparison_accuracy.accuracy)

            return SessionStatsOut(
                study_time=main_stats.study_time,
                study_time_diff=study_time_diff,
                num_sessions=main_stats.num_sessions,
                num_sessions_diff=num_sessions_diff,
                cards_studied=main_stats.cards_studied,
                cards_studied_diff=cards_studied_diff,
                accuracy=main_accuracy.accuracy,
                accuracy_diff=accuracy_diff
            )
        else:
            session_query = select(func.coalesce(func.sum(func.timestampdiff(text("SECOND"), StudySession.started_at, func.coalesce(StudySession.completed_at, StudySession.last_activity_at))), 0).label("study_time"), func.coalesce(func.sum(StudySession.cards_studied), 0).label("cards_studied"), func.coalesce(func.count(StudySession.session_id), 0).label("num_sessions")).where(StudySession.student_id == user.id)
            session_result = await session.execute(session_query)
            main_stats = session_result.one()

            accuracy_query = select(func.count(CardReview.review_id).label("accuracy")).where(CardReview.student_id == user.id, CardReview.rating.in_(["Easy", "Medium"]))
            accuracy_result = await session.execute(accuracy_query)
            main_accuracy = accuracy_result.one_or_none()

            return SessionStatsOut(
                study_time=main_stats.study_time,
                study_time_diff=None,
                num_sessions=main_stats.num_sessions,
                num_sessions_diff=None,
                cards_studied=main_stats.cards_studied,
                cards_studied_diff=None,
                accuracy=main_accuracy.accuracy,
                accuracy_diff=None
            )


    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"SessionStats failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to get session stats")

@router.get("/stats/heatmap")
@limiter.limit("20/minute")
async def Heatmap(request: Request, day: Annotated[date, Query()] = None, user: User = Depends(current_active_user), session: AsyncSession = Depends(get_async_session)):
    try:
        tz = get_user_timezone(user)
        utc_offset = datetime.now(tz).utcoffset()
        total_seconds = int(utc_offset.total_seconds())
        hours, remainder = divmod(abs(total_seconds), 3600)
        minutes = remainder // 60
        sign = '+' if total_seconds >= 0 else '-'
        offset_str = f"{sign}{hours:02d}:{minutes:02d}"

        month_start = day.replace(day=1)
        _, days_in_month = monthrange(day.year, day.month)
        if day.month == 12:
            next_month = month_start.replace(year=day.year + 1, month=1)
        else:
            next_month = month_start.replace(month=day.month + 1)
        heatmap_query = select(func.date(func.convert_tz(StudySession.started_at, "+00:00", offset_str)).label("study_date"), func.sum(func.timestampdiff(text("SECOND"), StudySession.started_at, func.coalesce(StudySession.completed_at, StudySession.last_activity_at))).label("study_time")).group_by(func.date(func.convert_tz(StudySession.started_at, "+00:00", offset_str))).where(StudySession.student_id == user.id, func.convert_tz(StudySession.started_at, "+00:00", offset_str) >= month_start, func.convert_tz(StudySession.started_at, "+00:00", offset_str) < next_month)
        heatmap_result = await session.execute(heatmap_query)
        heatmap = heatmap_result.all()

        heatmap_dict = {}
        for d in range(1, days_in_month+1):
            heatmap_dict[f"{day.year}-{day.month:02d}-{d:02d}"] = 0
        for row in heatmap:
            heatmap_dict[row.study_date.strftime("%Y-%m-%d")] = row.study_time

        return heatmap_dict
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Heatmap failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to get heatmap")

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