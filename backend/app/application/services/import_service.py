"""
Application-сервис импорта из Excel.
Оркестрирует: парсинг → (в будущем) валидация домена → сохранение.
"""
from __future__ import annotations

from app.application.dto.import_dto import ExcelParseResultDTO, ParsedRowDTO
from app.infrastructure.excel.excel_parser import parse_excel_bytes


class ImportService:
    async def parse_excel(self, filename: str, data: bytes) -> ExcelParseResultDTO:
        rows_raw = parse_excel_bytes(data)

        headers = list(rows_raw[0].keys()) if rows_raw else []
        rows = [ParsedRowDTO(data=r) for r in rows_raw]

        return ExcelParseResultDTO(
            filename=filename,
            row_count=len(rows),
            headers=headers,
            rows=rows,
        )
