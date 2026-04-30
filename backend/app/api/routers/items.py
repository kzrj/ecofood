from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from app.application.dto import ItemCreate, ItemRead
from app.application.services import ItemService
from app.api.dependencies import get_item_service

router = APIRouter(prefix="/items", tags=["items"])


@router.post("", response_model=ItemRead, status_code=201)
async def create_item(
    body: ItemCreate,
    service: Annotated[ItemService, Depends(get_item_service)],
) -> ItemRead:
    return await service.create(body)


@router.get("/{item_id}", response_model=ItemRead)
async def get_item(
    item_id: str,
    service: Annotated[ItemService, Depends(get_item_service)],
) -> ItemRead:
    row = await service.get(item_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Not found")
    return row


@router.get("", response_model=list[ItemRead])
async def list_items(
    service: Annotated[ItemService, Depends(get_item_service)],
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
) -> list[ItemRead]:
    return await service.list_items(skip=skip, limit=limit)
