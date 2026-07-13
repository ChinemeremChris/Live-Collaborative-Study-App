import logging
from fastapi import APIRouter, Request, HTTPException, Depends, Query, Body, Path
from users import current_active_user, current_optional_user
from schemas import TextImportIn
from typing import Annotated
from sqlalchemy import select, delete, func, or_, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from db import get_async_session, User, CardProgress, StudySession, Card, Deck
from schemas import TextImportOut, CardCreate
from limiter import limiter
from services.parser import ParseText

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/preview")
@limiter.limit("3/minute")
async def PreviewCards(request: Request, data: Annotated[TextImportIn, Body()], user: User = Depends(current_active_user)):
    try:
        result = ParseText(data.raw_text)
        parsed_cards = [CardCreate(
            card_temp_id=i,
            card_term=card["term"],
            card_definition=card["definition"],
            card_term_url=None,
            card_definition_url=None
        ) for i, card in enumerate(result["parsed_cards"])]
        return TextImportOut(
            parsed_cards=parsed_cards,
            unparsed_lines=result["unparsed_lines"],
            unparsed_count=result["unparsed_count"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PreviewCards failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to transform text to cards")