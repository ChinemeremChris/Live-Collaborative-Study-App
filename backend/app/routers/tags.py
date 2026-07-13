from fastapi import APIRouter, Depends
from db import Tag, get_async_session
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()
@router.get("/")
async def GetTags(session: AsyncSession = Depends(get_async_session)):
    result = await session.execute(select(Tag))
    tags = result.scalars().all()
    return [{"tag_id": str(tag.tag_id), "tag_name": tag.tag_name} for tag in tags]