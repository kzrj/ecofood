from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_sku_list_service
from app.application.dto.sku_list_dto import (
    SkuListCreateDTO,
    SkuListDetailDTO,
    SkuListListItemDTO,
    SkuListUpdateDTO,
)
from app.application.services.sku_list_service import SkuListService

router = APIRouter(prefix="/sku-lists", tags=["sku-lists"])


@router.post("", response_model=SkuListDetailDTO, status_code=201)
async def create_sku_list(
    body: SkuListCreateDTO,
    service: Annotated[SkuListService, Depends(get_sku_list_service)],
) -> SkuListDetailDTO:
    try:
        return await service.create(body)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.get("", response_model=list[SkuListListItemDTO])
async def list_sku_lists(
    service: Annotated[SkuListService, Depends(get_sku_list_service)],
) -> list[SkuListListItemDTO]:
    return await service.list_all()


@router.get("/simulation", response_model=SkuListDetailDTO)
async def get_simulation_sku_list(
    service: Annotated[SkuListService, Depends(get_sku_list_service)],
) -> SkuListDetailDTO:
    row = await service.get_for_simulation()
    if row is None:
        raise HTTPException(status_code=404, detail="SKU list for simulation not found")
    return row


@router.get("/{sku_list_id}", response_model=SkuListDetailDTO)
async def get_sku_list(
    sku_list_id: str,
    service: Annotated[SkuListService, Depends(get_sku_list_service)],
) -> SkuListDetailDTO:
    row = await service.get_by_id(sku_list_id)
    if row is None:
        raise HTTPException(status_code=404, detail="SKU list not found")
    return row


@router.patch("/{sku_list_id}", response_model=SkuListDetailDTO)
async def update_sku_list(
    sku_list_id: str,
    body: SkuListUpdateDTO,
    service: Annotated[SkuListService, Depends(get_sku_list_service)],
) -> SkuListDetailDTO:
    try:
        row = await service.update(sku_list_id, body)
        if row is None:
            raise HTTPException(status_code=404, detail="SKU list not found")
        return row
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.delete("/{sku_list_id}", status_code=204)
async def delete_sku_list(
    sku_list_id: str,
    service: Annotated[SkuListService, Depends(get_sku_list_service)],
) -> None:
    deleted = await service.delete(sku_list_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="SKU list not found")
