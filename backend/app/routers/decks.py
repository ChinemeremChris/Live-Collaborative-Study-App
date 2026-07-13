import logging
from fastapi import APIRouter, Request, HTTPException, Depends, Query, Body, Path
from users import current_active_user, current_optional_user
from typing import Annotated
from sqlalchemy import select, delete, func, or_, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from db import get_async_session, User, Deck, Tag, Deck_Tag, DeckRating, Card, CardProgress
from schemas import DeckSearch, MyDeckOut, CardOut, DeckWithCardsOut, DeckIn, DeckCreate, DeckCreateOut, DeckUpdate, BulkDeckUpdateOut
from services.s3 import batch_delete_image, delete_image
import uuid
from limiter import limiter
from datetime import date

logger = logging.getLogger(__name__)
router = APIRouter()
#get all decks
@router.get("/")
@limiter.limit("60/minute")
async def SearchForDeck(request: Request, search_term: Annotated[str|None, Query()], filter_tags: Annotated[str | None, Query()] = None, session: AsyncSession = Depends(get_async_session)):
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

        #debug
        print(f"tag list: {tag_list}")
        debug_query = select(Deck_Tag, func.count(Deck_Tag.tag_id).label("count")).group_by(Deck_Tag.deck_id).where(Deck_Tag.tag_id.in_(tag_list))
        debug_result = await session.execute(debug_query)
        print(f"deck_ids with matching tags: {debug_result.all()}")

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
            rating_count = row.num_ratings or 0
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
    if user:
        card_ids = [card.card_id for card in row.Deck.child_cards]
        if card_ids:
            progress_query = select(CardProgress).where(CardProgress.card_id.in_(card_ids), CardProgress.student_id == user.id)
            progress_result = await session.execute(progress_query)
            progress = progress_result.scalars().all()
            progress_map = {card_progress.card_id: card_progress for card_progress in progress}
        else:
            progress_map = {}
    cards = []
    for card in row.Deck.child_cards:
        if user:
            card_progress = progress_map.get(card.card_id)
            card_due = (card_progress.next_review_date <= date.today()) if card_progress else True
        else:
            card_due = None
        cards.append(CardOut(
            card_id = card.card_id,
            deck_id = card.deck_id,
            card_term = card.card_term,
            card_definition = card.card_definition,
            card_term_url = card.card_term_url,
            card_definition_url = card.card_definition_url,
            is_due = card_due
        ))
    tag_list =  [{"tag_id": deck_tag.tag.tag_id, "tag_name": deck_tag.tag.tag_name} for deck_tag in row.Deck.deck_tag]

    #add my_rating and avg_rating to DeckWithCardsOut and modify all instances (should i do it, since i cannot rate my own deck?)
    deck_return = DeckWithCardsOut(
        deck_id = row.Deck.deck_id,
        deck_name = row.Deck.deck_name,
        creator_name = "Deleted User" if (not row.Deck.deck_creator or row.Deck.deck_creator.is_deleted) else f"{row.Deck.deck_creator.fname} {row.Deck.deck_creator.lname}",
        is_public = row.Deck.is_public,
        created_at = row.Deck.created_at,
        updated_at = row.Deck.updated_at,
        card_count = len(cards),
        cards = cards,
        tags = tag_list,
        avg_rating = row.average_rating or 0,
        num_ratings = row.num_ratings or 0,
        my_rating=row.my_rating if user and user.id != row.Deck.creator_id else None
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

        tag_ids = list(set(uuid.UUID(t) for t in deck_data.tags if deck_data.tags))
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
        add_cards = [
            Card(
                deck_id=deck.deck_id,
                card_term=card.card_term, 
                card_definition=card.card_definition, 
                card_term_url=card.card_term_url, 
                card_definition_url=card.card_definition_url 
            )
            for card in deck_data.cards
        ]
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
            deck.deck_rating.rating = rating
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
        session.rollback()
        raise
    except Exception as e:
        session.rollback()
        logger.error(f"RateDeck failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to rate deck")

