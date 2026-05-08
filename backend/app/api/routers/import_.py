from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile

from app.api.dependencies import get_import_service
from app.application.dto.import_dto import (
    DemandDetailDTO,
    DemandListItemDTO,
    GroupedImportResultDTO,
    SavedDemandDTO,
)
from app.application.services.import_service import ImportService

router = APIRouter(prefix="/import", tags=["import"])

_ALLOWED_CONTENT_TYPES = {
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
}
_MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


@router.post("/excel", response_model=GroupedImportResultDTO)
async def upload_excel(
    file: UploadFile,
    service: Annotated[ImportService, Depends(get_import_service)],
) -> GroupedImportResultDTO:
    """Parse an .xlsx file and return grouped demand data."""
    if file.content_type not in _ALLOWED_CONTENT_TYPES and not (
        file.filename or ""
    ).lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Expected .xlsx file")

    data = await file.read()
    if len(data) > _MAX_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 10 MB)")
    if not data:
        raise HTTPException(status_code=400, detail="File is empty")

    try:
        return await service.parse_excel(filename=file.filename or "upload.xlsx", data=data)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Parse error: {exc}") from exc


@router.post("/save", response_model=SavedDemandDTO)
async def save_demand(
    body: GroupedImportResultDTO,
    service: Annotated[ImportService, Depends(get_import_service)],
) -> SavedDemandDTO:
    """Save parsed demand to the 'demand' MongoDB collection."""
    try:
        return await service.save(body)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Save error: {exc}") from exc


@router.get("/list", response_model=list[DemandListItemDTO])
async def list_demands(
    service: Annotated[ImportService, Depends(get_import_service)],
) -> list[DemandListItemDTO]:
    """Return saved demands ordered by date descending (filename + date only)."""
    return await service.list_demands()


@router.get("/{demand_id}", response_model=DemandDetailDTO)
async def get_demand(
    demand_id: str,
    service: Annotated[ImportService, Depends(get_import_service)],
) -> DemandDetailDTO:
    """Return full demand data by id."""
    result = await service.get_demand(demand_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Demand not found")
    return result


@router.delete("/{demand_id}", status_code=204)
async def delete_demand(
    demand_id: str,
    service: Annotated[ImportService, Depends(get_import_service)],
) -> None:
    """Delete saved demand by id."""
    deleted = await service.delete_demand(demand_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Demand not found")
