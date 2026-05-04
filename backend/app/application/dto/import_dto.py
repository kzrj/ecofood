from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class ParsedRowDTO(BaseModel):
    """Одна строка из загруженного Excel-файла (до доменной валидации)."""

    data: dict[str, Any]


class ExcelParseResultDTO(BaseModel):
    filename: str
    row_count: int
    headers: list[str]
    rows: list[ParsedRowDTO]
