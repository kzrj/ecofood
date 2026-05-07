from __future__ import annotations

from datetime import datetime
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


class GroupedImportResultDTO(BaseModel):
    """Результат импорта с разбивкой по типам продуктов."""

    filename: str
    groups: dict[str, list[dict[str, Any]]]
    days: dict[str, dict[str, list[dict[str, Any]]]]
    counts: dict[str, int]
    total: int


class SavedDemandDTO(BaseModel):
    """Response after successfully saving demand to MongoDB."""

    id: str
    filename: str
    created_at: datetime


class DemandListItemDTO(BaseModel):
    """One row in the demand list (no groups data)."""

    id: str
    filename: str
    created_at: datetime


class DemandDetailDTO(BaseModel):
    """Full demand with grouped data — used when opening from the list."""

    id: str
    filename: str
    created_at: datetime
    groups: dict[str, list[dict[str, Any]]]
    days: dict[str, dict[str, list[dict[str, Any]]]]
    counts: dict[str, int]
    total: int
