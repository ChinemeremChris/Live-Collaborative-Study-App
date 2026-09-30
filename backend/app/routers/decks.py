import logging
from fastapi import APIRouter, Request, HTTPException, Depends, Query, Body, Path
from app.users import current_active_user, current_optional_user
from typing import Annotated
from sqlalchemy import select, delete, func, or_, and_, text
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_async_session, User, Deck, Tag, Deck_Tag, DeckRating, Card, CardProgress, StudySession, CardReview
from app.schemas import DeckSearch, DeckSearchSuggestion, MyDeckOut, CardOutNoDue, DeckWithCardsOut, DeckIn, DeckCreate, DeckCreateOut, DeckUpdate, BulkDeckUpdateOut
from app.services.s3 import batch_delete_image, delete_image
import uuid
from app.limiter import limiter
import math
from datetime import datetime, date, timezone, timedelta

logger = logging.getLogger(__name__)
router = APIRouter()
#get all decks

@router.get("/suggestions")
@limiter.limit("100/minute")
async def SearchSuggestions(request: Request, search_term: Annotated[str|None, Query()], filter_tags: Annotated[list[uuid.UUID] | None, Query()] = None, session: AsyncSession = Depends(get_async_session)):
    conditions = [Deck.is_public.is_(True)]
    if filter_tags:
        tag_list = filter_tags
        deck_id_with_tag_filter = select(Deck_Tag.deck_id).where(Deck_Tag.tag_id.in_(tag_list)).group_by(Deck_Tag.deck_id).having(func.count(Deck_Tag.tag_id) == len(tag_list))
        conditions.append(Deck.deck_id.in_(deck_id_with_tag_filter))

        # debug
        # print(f"tag list: {tag_list}")
        # debug_query = select(Deck_Tag, func.count(Deck_Tag.tag_id).label("count")).group_by(Deck_Tag.deck_id).where(Deck_Tag.tag_id.in_(tag_list), Deck.deck_name.ilike(f"%{search_term}%")).limit(5)
        # debug_result = await session.execute(debug_query)
        # print(f"deck_ids with matching tags: {debug_result.all()}")

    if search_term:
        conditions.append(Deck.deck_name.ilike(f"%{search_term}%"))
        deck_query = select(Deck).options(selectinload(Deck.deck_creator)).where(Deck.deck_id.in_(select(Deck.deck_id).where(*conditions)))
        deck_result = await session.execute(deck_query)
        decks = deck_result.scalars().all()
    deck_list_out = [
        DeckSearchSuggestion(
            deck_id=deck.deck_id,
            deck_name=deck.deck_name,
            creator_name=f"{deck.deck_creator.fname} {deck.deck_creator.lname}" if deck.deck_creator else "Unknown User"
        )
        for deck in decks
    ]
    return deck_list_out

@router.get("/search")
@limiter.limit("60/minute")
async def SearchForDeck(request: Request, search_term: Annotated[str|None, Query()] = None, filter_tags: Annotated[list[uuid.UUID] | None, Query()] = None, min_rating: Annotated[float | None, Query()] = None, max_rating: Annotated[float | None, Query()] = None, min_cards: Annotated[int | None, Query()] = None, max_cards: Annotated[int | None, Query()] = None, page: Annotated[int, Query(ge=1)] = 1, limit: Annotated[int, Query(ge=1, le=100)] = 20, session: AsyncSession = Depends(get_async_session)):
    conditions = [Deck.is_public.is_(True)]

    if not search_term and not filter_tags:
        return {
            "decks": None,
            "total_decks": 0,
            "page": page,
            "num_pages": 1
        }

    if search_term:
        deck_id_matching_tag_names = select(Deck_Tag.deck_id).join(Tag).where(Tag.tag_name.ilike(f"%{search_term}%"))
        conditions.append(
            or_(
                Deck.deck_name.ilike(f"%{search_term}%"),
                Deck.deck_id.in_(deck_id_matching_tag_names)
            )
        )
    
    if filter_tags:
        tag_list = filter_tags
        deck_id_with_tag_filter = select(Deck_Tag.deck_id).join(Tag).where(Tag.tag_id.in_(tag_list)).group_by(Deck_Tag.deck_id).having(func.count(Deck_Tag.tag_id) == len(tag_list))
        conditions.append(
            Deck.deck_id.in_(deck_id_with_tag_filter)
        )

    rating_subquery = select(DeckRating.deck_id, func.avg(DeckRating.rating).label("average_rating"), func.count(DeckRating.rater_id).label("num_ratings")).where(DeckRating.deck_id.in_(select(Deck.deck_id).where(*conditions))).group_by(DeckRating.deck_id).subquery()
    card_subquery = select(Card.deck_id, func.count(Card.card_id).label("num_cards")).where(Card.deck_id.in_(select(Deck.deck_id).where(*conditions))).group_by(Card.deck_id).subquery()
    main_query = (
        select(
            Deck,
            rating_subquery.c.average_rating,
            rating_subquery.c.num_ratings,
            card_subquery.c.num_cards
        ).options(
            selectinload(Deck.deck_creator)
        ).outerjoin(
            rating_subquery,
            Deck.deck_id == rating_subquery.c.deck_id,
        ).outerjoin(
            card_subquery,
            Deck.deck_id == card_subquery.c.deck_id
        ).where(
            *conditions
        )
    )

    if min_rating is not None:
        main_query = main_query.where(
            func.coalesce(rating_subquery.c.average_rating, 0) >= min_rating
        )

    if max_rating is not None:
        main_query = main_query.where(
            func.coalesce(rating_subquery.c.average_rating, 0) <= max_rating
        )

    if min_cards is not None:
        main_query = main_query.where(
            func.coalesce(card_subquery.c.num_cards, 0) >= min_cards
        )

    if max_cards is not None:
        main_query = main_query.where(
            func.coalesce(card_subquery.c.num_cards, 0) <= max_cards
        )

    count_query = select(func.count()).select_from(
        main_query.subquery()
    )

    total_decks = await session.scalar(count_query)
    offset = (page-1) * limit
    paginated_query = main_query.order_by(Deck.created_at.desc()).offset(offset).limit(limit)
    result = await session.execute(paginated_query)
    rows = result.all()

    deck_out_list = []
    for row in rows:
        if not row.Deck.deck_creator:
            deck_creator_name = "Unknown User"
        elif row.Deck.deck_creator.is_deleted:
            deck_creator_name = "Deleted User"
        else:
            deck_creator_name = f"{row.Deck.deck_creator.fname} {row.Deck.deck_creator.lname}"

        deck_out_list.append(DeckSearch(
            deck_id = row.Deck.deck_id,
            deck_name = row.Deck.deck_name,
            creator_name = deck_creator_name,
            card_count = row.num_cards,
            avg_rating = row.average_rating or 0,
            rating_count = row.num_ratings or 0
        ))

    return {
        "decks": deck_out_list,
        "total_decks": total_decks,
        "page": page,
        "num_pages": math.ceil(total_decks/limit)
    }

@router.get("/discover")
@limiter.limit("10/minute")
async def GetDiscoverDecks(request: Request, user: User = Depends(current_optional_user), session: AsyncSession = Depends(get_async_session)):
    today = datetime.now(timezone.utc)
    week_start = today - timedelta(days=((today.weekday() + 1) % 7))
    deck_rating_sub = select(DeckRating.deck_id, func.avg(DeckRating.rating).label("avg_rating"), func.count(DeckRating.rater_id).label("num_ratings")).group_by(DeckRating.deck_id).subquery()
    card_count_sub = select(Card.deck_id, func.count(Card.card_id).label("num_cards")).group_by(Card.deck_id).subquery()

    study_total_query = select(Deck, deck_rating_sub.c.avg_rating, deck_rating_sub.c.num_ratings, func.coalesce(card_count_sub.c.num_cards, 0).label("num_cards"), func.count(StudySession.deck_id).label("times_studied"), func.count(func.distinct(StudySession.student_id)).label("unique_students")).options(selectinload(Deck.deck_creator)).join(StudySession.deck).outerjoin(deck_rating_sub, Deck.deck_id == deck_rating_sub.c.deck_id).outerjoin(card_count_sub, Deck.deck_id == card_count_sub.c.deck_id).group_by(StudySession.deck_id).where(StudySession.started_at >= week_start, StudySession.started_at < week_start + timedelta(days=7), Deck.is_public.is_(True))
    study_total_result = await session.execute(study_total_query)
    study_total = study_total_result.all() 
    popular_decks = sorted(study_total, key=lambda row: math.log2(row.times_studied + 1) * 10 + row.unique_students * 10, reverse=True)[:10]
    popular_decks_out = [DeckSearch(
        deck_id=row.Deck.deck_id,
        deck_name=row.Deck.deck_name,
        creator_name=f"{row.Deck.deck_creator.fname} {row.Deck.deck_creator.lname}" if (row.Deck.deck_creator and not row.Deck.deck_creator.is_deleted) else "Deleted User",
        card_count=row.num_cards,
        avg_rating=row.avg_rating,
        rating_count=row.num_ratings if row.num_ratings else 0
    )for row in popular_decks]

    recent_query = select(Deck, deck_rating_sub.c.avg_rating, deck_rating_sub.c.num_ratings, func.coalesce(card_count_sub.c.num_cards, 0).label("num_cards")).options(selectinload(Deck.deck_creator)).outerjoin(deck_rating_sub, Deck.deck_id == deck_rating_sub.c.deck_id).outerjoin(card_count_sub, Deck.deck_id == card_count_sub.c.deck_id).where(Deck.is_public.is_(True)).order_by(Deck.created_at.desc()).limit(10)
    recent_result = await session.execute(recent_query)
    recent_decks = recent_result.all()
    recent_decks_out = [DeckSearch(
        deck_id=row.Deck.deck_id,
        deck_name=row.Deck.deck_name,
        creator_name=f"{row.Deck.deck_creator.fname} {row.Deck.deck_creator.lname}" if (row.Deck.deck_creator and not row.Deck.deck_creator.is_deleted) else "Deleted User",
        card_count=row.num_cards,
        avg_rating=row.avg_rating,
        rating_count=row.num_ratings if row.num_ratings else 0
    )for row in recent_decks]

    top_rated_query = select(Deck, deck_rating_sub.c.avg_rating, deck_rating_sub.c.num_ratings, func.coalesce(card_count_sub.c.num_cards, 0).label("num_cards")).options(selectinload(Deck.deck_creator)).outerjoin(deck_rating_sub, Deck.deck_id == deck_rating_sub.c.deck_id).outerjoin(card_count_sub, Deck.deck_id == card_count_sub.c.deck_id).where(Deck.is_public.is_(True), deck_rating_sub.c.avg_rating.is_not(None), deck_rating_sub.c.num_ratings >= 5).order_by(deck_rating_sub.c.avg_rating.desc()).limit(10)
    top_rated_result = await session.execute(top_rated_query)
    top_rated_decks = top_rated_result.all()
    top_rated_decks_out = [DeckSearch(
        deck_id=row.Deck.deck_id,
        deck_name=row.Deck.deck_name,
        creator_name=f"{row.Deck.deck_creator.fname} {row.Deck.deck_creator.lname}" if (row.Deck.deck_creator and not row.Deck.deck_creator.is_deleted) else "Deleted User",
        card_count=row.num_cards,
        avg_rating=row.avg_rating,
        rating_count=row.num_ratings if row.num_ratings else 0
    )for row in top_rated_decks]

    return {
        "popular_decks": popular_decks_out,
        "recent_decks": recent_decks_out,
        "top_rated_decks": top_rated_decks_out
    }

    
    
@router.get("/me")
async def GetUserDecks(user: User = Depends(current_active_user), session: AsyncSession = Depends(get_async_session)):
    if not user:
        raise HTTPException(status_code=401, detail="Login to get deck data")
    
    main_query = select(Deck, func.avg(DeckRating.rating).label("average_rating"), func.count(DeckRating.rater_id).label("num_ratings"), func.count(Card.card_id.distinct()).label("num_cards")).outerjoin(Deck.deck_rating).outerjoin(Deck.child_cards).where(Deck.creator_id == user.id).group_by(Deck.deck_id)
    result = await session.execute(main_query)
    rows = result.all()
    deck_out_list = []

    for row in rows:
        deck_out_list.append(MyDeckOut(
            deck_id = row.Deck.deck_id,
            deck_name = row.Deck.deck_name,
            card_count = row.num_cards,
            avg_rating = row.average_rating,
            rating_count = row.num_ratings or 0
        ))

    return deck_out_list

@router.get("/{deck_id}")
async def GetOneDeck(deck_id: Annotated[uuid.UUID, Path()], user: User = Depends(current_optional_user), session: AsyncSession = Depends(get_async_session)):
    if not user:
        query = select(Deck, func.avg(DeckRating.rating).label("average_rating"), func.count(DeckRating.rater_id).label("num_ratings")).options(selectinload(Deck.child_cards), selectinload(Deck.deck_creator), selectinload(Deck.deck_tag).selectinload(Deck_Tag.tag)).outerjoin(Deck.deck_rating).where(Deck.deck_id == deck_id).group_by(Deck.deck_id)
    else:
        personal_rating_subq = select(DeckRating.deck_id, DeckRating.rating.label("my_rating")).where(DeckRating.deck_id == deck_id, DeckRating.rater_id == user.id).subquery()
        query = select(Deck, func.avg(DeckRating.rating).label("average_rating"), func.count(DeckRating.rater_id).label("num_ratings"), personal_rating_subq.c.my_rating).options(selectinload(Deck.child_cards), selectinload(Deck.deck_creator), selectinload(Deck.deck_tag).selectinload(Deck_Tag.tag)).outerjoin(Deck.deck_rating).outerjoin(personal_rating_subq, Deck.deck_id == personal_rating_subq.c.deck_id).where(Deck.deck_id == deck_id).group_by(Deck.deck_id)
    result = await session.execute(query)
    row = result.one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Deck not found")
    if not row.Deck.is_public and (not user or user.id != row.Deck.creator_id):
        raise HTTPException(status_code=403, detail="Deck is private")

    card_count_query = select(func.coalesce(func.count(Card.card_id), 0).label("num_cards")).where(Card.deck_id == deck_id)
    card_count_result = await session.execute(card_count_query)
    card_count = card_count_result.scalar_one()

    creator_deck_count = 0
    if row.Deck.deck_creator or not row.Deck.deck_creator.is_deleted:
        creator_count_query = select(func.coalesce(func.count(Deck.deck_id), 0).label("creator_public_decks")).where(Deck.creator_id == row.Deck.deck_creator.id, Deck.is_public.is_(True))
        creator_count_result = await session.execute(creator_count_query)
        creator_deck_count = creator_count_result.scalar_one()        

    due_cards_count = 0
    study_time_minutes = 0
    study_session_count = 0
    last_session = None
    mastered_cards = 0
    cards_reviewed = 0
    first_review_date = None

    if user:
        due_cards_count_query = select(func.count(Card.card_id).label("due_today")).outerjoin(CardProgress, and_(Card.card_id == CardProgress.card_id, CardProgress.student_id == user.id)).where(Card.deck_id == deck_id, or_(CardProgress.next_review_date <= date.today(), CardProgress.progress_id.is_(None)))
        due_cards_count_result = await session.execute(due_cards_count_query)
        due_cards_count = due_cards_count_result.scalar_one()

        study_time_query = select(func.coalesce(func.sum(func.timestampdiff(text("SECOND"), StudySession.started_at, func.coalesce(StudySession.completed_at, StudySession.last_activity_at))), 0)).where(StudySession.deck_id == deck_id, StudySession.student_id == user.id)
        study_time_result = await session.execute(study_time_query)
        study_time_seconds = study_time_result.scalar_one()
        study_time_minutes = int(study_time_seconds // 60)

        study_sessions_query = select(func.count(StudySession.session_id).label("study_session_count"), func.max(StudySession.started_at).label("last_session")).where(StudySession.deck_id == deck_id, StudySession.student_id == user.id)
        study_sessions_result = await session.execute(study_sessions_query)
        study_session_count, last_session = study_sessions_result.one()

        mastered_cards_query = select(func.count(CardProgress.card_id).label("mastered_cards")).join(CardProgress.card).where(CardProgress.student_id == user.id, Card.deck_id == deck_id, CardProgress.current_interval >= 21)
        mastered_cards_result = await session.execute(mastered_cards_query)
        mastered_cards = mastered_cards_result.scalar_one()

        cards_reviewed_query = select(func.coalesce(func.count(CardReview.review_id), 0).label("num_reviews"), func.min(CardReview.reviewed_at).label("first_review")).join(CardReview.parent_card).where(Card.deck_id == deck_id, CardReview.student_id == user.id)
        cards_reviewed_result = await session.execute(cards_reviewed_query)
        cards_reviewed, first_review_date = cards_reviewed_result.one()
        
          
    preview_cards_query = select(Card).where(Card.deck_id == deck_id).order_by(Card.card_id).limit(4)
    preview_cards_result = await session.execute(preview_cards_query)
    preview_cards = preview_cards_result.scalars().all()
    cards = []
    for card in preview_cards:
        cards.append(CardOutNoDue(
            card_id = card.card_id,
            deck_id = card.deck_id,
            card_term = card.card_term,
            card_definition = card.card_definition,
            card_term_url = card.card_term_url,
            card_definition_url = card.card_definition_url,
        ))
    tag_list =  [{"tag_id": deck_tag.tag.tag_id, "tag_name": deck_tag.tag.tag_name} for deck_tag in row.Deck.deck_tag]

    deck_return = DeckWithCardsOut(
        deck_id = row.Deck.deck_id,
        deck_name = row.Deck.deck_name,
        creator_id = None if (not row.Deck.deck_creator or row.Deck.deck_creator.is_deleted) else row.Deck.deck_creator.id,
        creator_name = "Deleted User" if (not row.Deck.deck_creator or row.Deck.deck_creator.is_deleted) else f"{row.Deck.deck_creator.fname} {row.Deck.deck_creator.lname}",
        creator_deck_count = creator_deck_count,
        is_public = row.Deck.is_public,
        created_at = row.Deck.created_at,
        updated_at = row.Deck.updated_at.date(),
        card_count = card_count,
        preview_cards = cards,
        tags = tag_list,
        avg_rating = row.average_rating or 0,
        num_ratings = row.num_ratings or 0,
        my_rating = row.my_rating if user and user.id != row.Deck.creator_id else None,
        study_time_minutes = study_time_minutes,
        due_cards_count = due_cards_count,
        mastered_cards = mastered_cards,
        last_session = last_session.date() if last_session else None,
        study_session_count = study_session_count,
        cards_reviewed = cards_reviewed if user else None,
        first_review_date = first_review_date.date() if first_review_date else None
    )

    return deck_return

@router.post("/")
@limiter.limit("2/minute")
async def CreateDeck(request: Request, deck_data: Annotated[DeckIn, Body()], user: User = Depends(current_active_user), session: AsyncSession = Depends(get_async_session)):
    try:
        deck = Deck(
            deck_name = deck_data.deck_name,
            creator_id = user.id,
            is_public = deck_data.is_public
        )
        session.add(deck)
        await session.flush()
        await session.refresh(deck)

        tag_ids = [uuid.UUID(t) for t in deck_data.tags]
        tag_name_query = select(Tag).where(Tag.tag_id.in_(tag_ids))
        result = await session.execute(tag_name_query)
        fetched_tags = result.scalars().all()
        if len(fetched_tags) != len(tag_ids):
            raise HTTPException(status_code=400, detail="One or more tags not found")
        tag_list = []
        for tag in fetched_tags:
            tag_list.append(Deck_Tag(
                tag_id = tag.tag_id,
                deck_id = deck.deck_id
            ))
        session.add_all(tag_list)
        await session.flush()
        tag_dict_list = [{"tag_id": str(tag.tag_id), "tag_name": tag.tag_name} for tag in fetched_tags]
        await session.commit()
        deck_out = DeckCreateOut(
            deck_id = deck.deck_id,
            deck_name = deck.deck_name,
            is_public = deck.is_public,
            tags = tag_dict_list
        )

        return deck_out
    except HTTPException:
        await session.rollback()
        raise
    except Exception as e:
        await session.rollback()
        logger.error(f"CreateDeck error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create deck")
    
@router.patch("/{deck_id}")
@limiter.limit("5/minute")
async def UpdateDeck(request: Request, deck_id: Annotated[uuid.UUID, Path()], updated_data: Annotated[DeckIn, Body()], user: User = Depends(current_active_user), session: AsyncSession = Depends(get_async_session)):
    try:
        deck_query = select(Deck).options(selectinload(Deck.deck_tag)).where(Deck.deck_id == deck_id, Deck.creator_id == user.id)
        result = await session.execute(deck_query)
        deck = result.scalar_one_or_none()
        if not deck:
            raise HTTPException(status_code=404, detail="Deck not found")
        changed = False
        if deck.deck_name != updated_data.deck_name:
            deck.deck_name = updated_data.deck_name
            changed = True
        if deck.is_public != updated_data.is_public:
            deck.is_public = updated_data.is_public
            changed = True
        old_tags = set([tag.tag_id for tag in deck.deck_tag])
        new_tags = set([uuid.UUID(t) for t in updated_data.tags])
        add_tags = new_tags - old_tags
        remove_tags = old_tags - new_tags
        if add_tags:
            deck_tags = [Deck_Tag(
                tag_id=tag,
                deck_id=deck_id
            ) for tag in list(add_tags)]
            session.add_all(deck_tags)
            changed = True
        if remove_tags:
            stmt = delete(Deck_Tag).where(Deck_Tag.deck_id == deck_id, Deck_Tag.tag_id.in_(list(remove_tags)))
            await session.execute(stmt)
            changed = True
        if changed:
            await session.commit()
        return {"message": "Update successful"}
    except HTTPException:
        await session.rollback()
        raise
    except Exception as e:
        await session.rollback()
        logger.error(f"UpdateDeck error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update deck")

@router.post("/bulk")
async def BulkCreate(deck_data: Annotated[DeckCreate, Body()], user: User = Depends(current_active_user), session: AsyncSession = Depends(get_async_session)):
    try:
        deck = Deck(
            deck_name = deck_data.deck_name,
            creator_id = user.id,
            is_public = deck_data.is_public
        )
        session.add(deck)
        await session.flush()
        await session.refresh(deck)

        tag_ids = deck_data.tags
        tag_name_query = select(Tag).where(Tag.tag_id.in_(tag_ids))
        result = await session.execute(tag_name_query)
        fetched_tags = result.scalars().all()

        if len(fetched_tags) != len(tag_ids):
            raise HTTPException(status_code=400, detail="One or more tags not found")
        tag_list = []
        for tag in fetched_tags:
            tag_list.append(Deck_Tag(
                tag_id = tag.tag_id,
                deck_id = deck.deck_id
            ))
        session.add_all(tag_list)
        await session.flush()
        #new
        add_cards = []
        for card in deck_data.cards:
            if not card.card_term and not card.card_term_url:
                print(f"card term: {card.card_term}\n card term url: {card.card_term_url}")
                raise HTTPException(status_code=400, detail="Card must have either a term or an image")
            if not card.card_definition and not card.card_definition_url:
                print(f"card definition: {card.card_definition}\n card definition url: {card.card_definition_url}")
                raise HTTPException(status_code=400, detail="Card must have either a definition or an image")
            add_cards.append(Card(
                deck_id=deck.deck_id,
                card_term=card.card_term, 
                card_definition=card.card_definition, 
                card_term_url=card.card_term_url, 
                card_definition_url=card.card_definition_url 
            ))
        
        session.add_all(add_cards)
        await session.commit()
        return {"deck_id": deck.deck_id}
    except HTTPException:
        await session.rollback()
        raise
    except Exception as e:
        await session.rollback()
        logger.error(f"CreateDeck error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create deck")

#on the frontend, make sure that everything, including the old, is sent: i.e. if a card had a picture and it is not updated
#send the old picture url or else the picture url will be unlinked from card
@router.put("/bulk/{deck_id}")
async def BulkUpdate(deck_id: Annotated[uuid.UUID, Path()], updated_data: Annotated[DeckUpdate, Body()], user: User = Depends(current_active_user), session: AsyncSession = Depends(get_async_session)):
    try:
        deck_query = select(Deck).options(selectinload(Deck.deck_tag)).where(Deck.deck_id == deck_id, Deck.creator_id == user.id)
        result = await session.execute(deck_query)
        deck = result.scalar_one_or_none()
        if not deck:
            raise HTTPException(status_code=404, detail="Deck not found")
        if deck.deck_name != updated_data.deck_name:
            deck.deck_name = updated_data.deck_name
        if deck.is_public != updated_data.is_public:
            deck.is_public = updated_data.is_public
        old_tags = set([tag.tag_id for tag in deck.deck_tag])
        new_tags = set([uuid.UUID(t) for t in updated_data.tags])
        add_tags = new_tags - old_tags
        remove_tags = old_tags - new_tags
        if add_tags:
            deck_tags = [Deck_Tag(
                tag_id=tag,
                deck_id=deck_id
            ) for tag in list(add_tags)]
            session.add_all(deck_tags)
        if remove_tags:
            stmt = delete(Deck_Tag).where(Deck_Tag.deck_id == deck_id, Deck_Tag.tag_id.in_(list(remove_tags)))
            await session.execute(stmt)
        
        #update cards
        delete_image_urls = []
        update_query = select(Card).join(Card.parent_deck).where(Card.deck_id == deck_id, Card.card_id.in_([card.card_id for card in updated_data.updated_cards])).order_by(Card.card_id)
        update_result = await session.execute(update_query)
        cards_to_be_updated = update_result.scalars().all()
        if len(cards_to_be_updated) != len(updated_data.updated_cards):
            raise HTTPException(status_code=400, detail="Invalid card IDs")
        existing_cards = {
            card.card_id: card
            for card in cards_to_be_updated
        }
        for updated_card in updated_data.updated_cards:
            old_card = existing_cards.get(updated_card.card_id)
            if not old_card:
                continue
            if not updated_card.card_term and not updated_card.card_term_url:
                raise HTTPException(status_code=400, detail="Card must have either a term or an image")
            if not updated_card.card_definition and not updated_card.card_definition_url:
                raise HTTPException(status_code=400, detail="Card must have either a definition or an image")
            if old_card.card_term_url and old_card.card_term_url != updated_card.card_term_url:
                delete_image_urls.append(old_card.card_term_url)
            if old_card.card_definition_url and old_card.card_definition_url != updated_card.card_definition_url:
                delete_image_urls.append(old_card.card_definition_url)
            old_card.card_term = updated_card.card_term
            old_card.card_definition = updated_card.card_definition
            old_card.card_term_url = updated_card.card_term_url
            old_card.card_definition_url = updated_card.card_definition_url
        
        #new cards
        new_card_mappings = []
        for new_card in updated_data.new_cards:
            if not new_card.card_term and not new_card.card_term_url:
                raise HTTPException(status_code=400, detail="Card must have either a term or an image")
            if not new_card.card_definition and not new_card.card_definition_url:
                raise HTTPException(status_code=400, detail="Card must have either a definition or an image")
            card = Card(
                deck_id=deck_id,
                card_term=new_card.card_term,
                card_definition=new_card.card_definition,
                card_term_url=new_card.card_term_url,
                card_definition_url=new_card.card_definition_url
            )
            session.add(card)
            new_card_mappings.append(
                {
                    "temp_id": new_card.card_temp_id,
                    "card": card
                }
            )

        await session.flush()
        new_card_ids_list = [
            {
                "temp_id": mapping["temp_id"],
                "card_id": mapping["card"].card_id
            }
            for mapping in new_card_mappings
        ]
        
        #delete cards
        delete_card_query = select(Card).where(Card.deck_id == deck_id, Card.card_id.in_([uuid.UUID(card_uuid) for card_uuid in updated_data.deleted_cards]))
        delete_result = await session.execute(delete_card_query)
        cards_to_be_deleted = delete_result.scalars().all()
        
        for card in cards_to_be_deleted:
            if card.card_term_url:
                delete_image_urls.append(card.card_term_url)
            if card.card_definition_url:
                delete_image_urls.append(card.card_definition_url)
        
        await session.execute(delete(Card).where(Card.deck_id == deck_id, Card.card_id.in_([uuid.UUID(card_uuid) for card_uuid in updated_data.deleted_cards])))
        await session.commit()
        try:
            batch_delete_image(delete_image_urls)
        except Exception as e:
            logger.warning(f"Failed to delete some S3 objects", exc_info=True)

        #RETURN SOMETHING?
        return BulkDeckUpdateOut(
            deck_id=deck_id,
            success=True,
            new_card_ids=new_card_ids_list
        )
    except HTTPException:
        await session.rollback()
        raise
    except Exception as e:
        await session.rollback()
        logger.error(f"UpdateDeck error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update deck")

@router.delete("/{deck_id}")
async def DeleteDeck(deck_id: Annotated[uuid.UUID, Path()], user: User = Depends(current_active_user), session: AsyncSession = Depends(get_async_session)):
    try:
        delete_query = select(Deck).options(selectinload(Deck.child_cards)).where(Deck.deck_id == deck_id, Deck.creator_id == user.id)
        result = await session.execute(delete_query)
        deck_to_be_deleted = result.scalar_one_or_none()
        if not deck_to_be_deleted:
            raise HTTPException(status_code=404, detail="Deck not found")
        delete_image_urls = []
        for card in deck_to_be_deleted.child_cards:
            if card.card_term_url:
                delete_image_urls.append(card.card_term_url)
            if card.card_definition_url:
                delete_image_urls.append(card.card_definition_url)
        batch_delete_image(delete_image_urls)

        await session.delete(deck_to_be_deleted)
        await session.commit()
        return {"message": "Deck successfully deleted"}
    except HTTPException:
        await session.rollback()
        raise
    except Exception as e:
        await session.rollback()
        logger.error(f"DeleteDeck failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete deck")

@router.put("/rate/{deck_id}")
async def RateDeck(deck_id: Annotated[uuid.UUID, Path()], rating: Annotated[int, Body()], user: User = Depends(current_active_user), session: AsyncSession = Depends(get_async_session)):
    try:
        if rating < 1 or rating > 5:
            raise HTTPException(status_code=400, detail="Rating must be between 1 and 5, inclusive")
        query = select(Deck).where(Deck.deck_id == deck_id)
        result = await session.execute(query)
        deck = result.scalar_one_or_none()
        if not deck:
            raise HTTPException(status_code=404, detail="Deck not found")
        if deck.creator_id == user.id:
            raise HTTPException(status_code=400, detail="Cannot rate your own deck")
        existing_rating_query = select(DeckRating).where(DeckRating.deck_id == deck_id, DeckRating.rater_id == user.id)
        existing_rating_result = await session.execute(existing_rating_query)
        existing_rating = existing_rating_result.scalar_one_or_none()
        if existing_rating:
            existing_rating.rating = rating
        else:
            new_rating = DeckRating(
                deck_id=deck_id,
                rater_id=user.id,
                rating=rating
            )
            session.add(new_rating)
        await session.commit()
        return {"message": "success"}
    except HTTPException:
        await session.rollback()
        raise
    except Exception as e:
        await session.rollback()
        logger.error(f"RateDeck failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to rate deck")

