"""
Application-сервис импорта из Excel.
Оркестрирует: парсинг → (в будущем) валидация домена → сохранение.
"""
from __future__ import annotations

from app.application.dto.import_dto import GroupedImportResultDTO
from app.infrastructure.excel.excel_parser import group_rows_by_type


class ImportService:
    async def parse_excel(self, filename: str, data: bytes) -> GroupedImportResultDTO:
        groups = group_rows_by_type(data)
        counts = {t: len(rows) for t, rows in groups.items()}
        return GroupedImportResultDTO(
            filename=filename,
            groups=groups,
            counts=counts,
            total=sum(counts.values()),
        )
