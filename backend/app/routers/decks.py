import logging
from fastapi import APIRouter, Request, HTTPException, Depends, Query, Body, Path
from users import current_active_user, current_optional_user
from typing import Annotated
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from db import get_async_session, User, Deck, Tag, Deck_Tag, DeckRating, Card
from schemas import DeckSearch, MyDeckOut, CardOut, DeckWithCardsOut, DeckIn, DeckCreateOut
import uuid
from limiter import limiter

logger = logging.getLogger(__name__)
router = APIRouter()
#get all decks
@router.get("/")
@limiter.limit("60/minute")
async def SearchForDeck(request: Request, search_term: Annotated[str, Query()], filter_tags: Annotated[str | None, Query()] = None, session: AsyncSession = Depends(get_async_session)):
    conditions = [Deck.is_public.is_(True)]

    if search_term:
        deck_id_matching_tag_names = select(Deck_Tag.deck_id).join(Tag).where(Tag.tag_name.ilike(f"%{search_term}%"))
        conditions.append(
            or_(
                Deck.deck_name.ilike(f"%{search_term}%"),
                Deck.deck_id.in_(deck_id_matching_tag_names)
            )
        )
    
    if filter_tags:
        tag_list = [uuid.UUID(t) for t in filter_tags.split(",")]
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

    result = await session.execute(main_query)
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
            rating_count = row.num_ratings
        ))
    
    return deck_out_list

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
            rating_count = row.num_ratings
        ))

    return deck_out_list

@router.get("/{deck_id}")
async def GetOneDeck(deck_id: Annotated[uuid.UUID, Path()], user: User = Depends(current_optional_user), session: AsyncSession = Depends(get_async_session)):
    query = select(Deck, func.avg(DeckRating.rating).label("average_rating"), func.count(DeckRating.rater_id).label("num_ratings")).options(selectinload(Deck.child_cards), selectinload(Deck.deck_creator), selectinload(Deck.deck_tag).selectinload(Deck_Tag.tag)).outerjoin(Deck.deck_rating).where(Deck.deck_id == deck_id).group_by(Deck.deck_id)
    result = await session.execute(query)
    row = result.one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Deck not found")
    if not row.Deck.is_public and (not user or user.id != row.Deck.creator_id):
        raise HTTPException(status_code=403, detail="Deck is private")
    cards = []
    for card in row.Deck.child_cards:
        cards.append(CardOut(
            card_id = card.card_id,
            deck_id = card.deck_id,
            card_term = card.card_term,
            card_definition = card.card_definition,
            card_term_url = card.card_term_url,
            card_definition_url = card.card_definition_url
        ))
    tag_list =  [{deck_tag.tag.tag_id: deck_tag.tag.tag_name} for deck_tag in row.Deck.deck_tag]

    deck_return = DeckWithCardsOut(
        deck_id = row.Deck.deck_id,
        deck_name = row.Deck.deck_name,
        creator_name = f"{row.Deck.deck_creator.fname} {row.Deck.deck_creator.lname}" if row.Deck.deck_creator else "Deleted User",
        is_public = row.Deck.is_public,
        created_at = row.Deck.created_at,
        updated_at = row.Deck.updated_at,
        card_count = len(cards),
        cards = cards,
        tags = tag_list
    )

    return deck_return

@router.post("/decks")
async def CreateDeck(deck_data: Annotated[DeckIn, Body()], user: User = Depends(current_active_user), session: AsyncSession = Depends(get_async_session)):
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