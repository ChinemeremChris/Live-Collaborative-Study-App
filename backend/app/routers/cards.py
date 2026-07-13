import logging
from fastapi import APIRouter, Request, HTTPException, Depends, Query, Body, Path
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from limiter import limiter
from users import current_active_user, current_optional_user
from db import get_async_session, User, Card, Deck
from schemas import ImageUploadRequest, CardOutNoDue, CardCreate, CardUpdateID
from services.s3 import generate_upload_url, batch_delete_image
from typing import Annotated
import uuid

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/image/upload/request")
@limiter.limit("50/minute")
async def RequestImageUpload(request: Request, image_obj: Annotated[ImageUploadRequest, Body()], user: User = Depends(current_active_user), session: AsyncSession = Depends(get_async_session)):
    try:
        allowed_types = ["image/jpeg", "image/png", "image/webp"]
        if image_obj.file_type not in allowed_types:
            raise HTTPException(status_code=400, detail="File type not allowed")
        url_dict = generate_upload_url(image_obj.file_name, image_obj.file_type)
        return url_dict
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"RequestImageUpload failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate upload url for image")

@router.get("/{deck_id}/{card_id}")
@limiter.limit("10/minute")
async def GetCard(request: Request, deck_id: Annotated[uuid.UUID, Path()], card_id: Annotated[uuid.UUID, Path()], user: User = Depends(current_optional_user), session: AsyncSession = Depends(get_async_session)):
    try:
        card_query = select(Card).where(Card.card_id == card_id, Card.deck_id == deck_id)
        result = await session.execute(card_query)
        card = result.scalar_one_or_none()
        if not card:
            raise HTTPException(status_code=404, detail="Card not found")
        return CardOutNoDue(
            card_id = card.card_id,
            deck_id = card.deck_id,
            card_term = card.card_term,
            card_definition = card.card_definition,
            card_term_url = card.card_term_url,
            card_definition_url = card.card_definition_url,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"GetCard failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch card")

@router.post("/{deck_id}")
@limiter.limit("10/minute")
async def AddCard(request: Request, deck_id: Annotated[uuid.UUID, Path()], card_data: Annotated[CardCreate, Body()], user: User = Depends(current_active_user), session: AsyncSession = Depends(get_async_session)):
    try:
        deck_query = select(Deck).where(Deck.deck_id == deck_id, Deck.creator_id == user.id)
        result = await session.execute(deck_query)
        deck = result.scalar_one_or_none()
        if not deck:
            raise HTTPException(status_code=404, detail="Deck belonging to user not found")
        add_card = Card(
            deck_id = deck_id,
            card_term = card_data.card_term,
            card_definition = card_data.card_definition,
            card_term_url = card_data.card_term_url,
            card_definition_url = card_data.card_definition_url
        )
        session.add(add_card)
        await session.flush()
        await session.refresh(add_card)
        await session.commit()
        return {
            "temp_id": card_data.card_temp_id,
            "card_id": add_card.card_id
        }
    except HTTPException:
        await session.rollback()
        raise
    except Exception as e:
        await session.rollback()
        logger.error(f"AddCard failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to add card")
    
@router.patch("/{deck_id}/{card_id}")
@limiter.limit("15/minute")
async def UpdateCard(request: Request, deck_id: Annotated[uuid.UUID, Path()], card_id: Annotated[uuid.UUID, Path()], updated_card: Annotated[CardUpdateID, Body()], user: User= Depends(current_active_user), session: AsyncSession = Depends(get_async_session)):
    try:
        card_query = select(Card).join(Card.parent_deck).where(Card.deck_id == deck_id, Card.card_id == card_id, Deck.creator_id == user.id)
        result = await session.execute(card_query)
        card = result.scalar_one_or_none()
        if not card:
            raise HTTPException(status_code=404, detail="Card belonging to user not found")
        card.card_term = updated_card.card_term
        card.card_definition = updated_card.card_definition
        images_to_be_deleted = []
        if updated_card.card_term_url and card.card_term_url != updated_card.card_term_url:
            images_to_be_deleted.append(card.card_term_url)
            card.card_term_url = updated_card.card_term_url
        if updated_card.card_definition_url and card.card_definition_url != updated_card.card_definition_url:
            images_to_be_deleted.append(card.card_definition_url)
            card.card_definition_url = updated_card.card_definition_url
        await session.commit()
        await session.refresh(card)
        batch_delete_image(images_to_be_deleted)
        return {"message": "Update successful"}
    except HTTPException:
        await session.rollback()
        raise
    except Exception as e:
        await session.rollback()
        logger.error(f"UpdateCard failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update card")

@router.delete("/{deck_id}/{card_id}")
@limiter.limit("50/minute")
async def DeleteCard(request: Request, deck_id: Annotated[uuid.UUID, Path()], card_id: Annotated[uuid.UUID, Path()], user: User = Depends(current_active_user), session: AsyncSession = Depends(get_async_session)):
    try:
        card_query = select(Card).join(Card.parent_deck).where(Card.deck_id == deck_id, Card.card_id == card_id, Deck.creator_id == user.id)
        result = await session.execute(card_query)
        card = result.scalar_one_or_none()
        if not card:
            raise HTTPException(status_code=404, detail="Card belonging to user not found")
        images_to_be_deleted = []
        if card.card_term_url:
            images_to_be_deleted.append(card.card_term_url)
        if card.card_definition_url:
            images_to_be_deleted.append(card.card_definition_url)
        session.delete(card)
        await session.commit()
        batch_delete_image(images_to_be_deleted)
        return {"message": "Delete Successful"}
    except HTTPException:
        await session.rollback()
        raise
    except Exception as e:
        await session.rollback()
        logger.error(f"DeleteCard failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete card")