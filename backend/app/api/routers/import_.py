from fastapi import APIRouter, HTTPException, UploadFile

from app.application.dto.import_dto import GroupedImportResultDTO
from app.application.services.import_service import ImportService

router = APIRouter(prefix="/import", tags=["import"])

_ALLOWED_CONTENT_TYPES = {
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
}
_MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10 МБ


@router.post("/excel", response_model=GroupedImportResultDTO)
async def upload_excel(file: UploadFile) -> GroupedImportResultDTO:
    """
    Принимает .xlsx файл, парсит заголовки и строки.
    Возвращает превью: количество строк, список заголовков и все строки в виде объектов.
    """
    if file.content_type not in _ALLOWED_CONTENT_TYPES and not (
        file.filename or ""
    ).lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Ожидается файл формата .xlsx")

    data = await file.read()
    if len(data) > _MAX_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="Файл слишком большой (макс. 10 МБ)")
    if not data:
        raise HTTPException(status_code=400, detail="Файл пустой")

    service = ImportService()
    try:
        return await service.parse_excel(filename=file.filename or "upload.xlsx", data=data)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Ошибка парсинга: {exc}") from exc
