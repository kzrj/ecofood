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


class GroupedImportResultDTO(BaseModel):
    """Результат импорта с разбивкой по типам продуктов."""

    filename: str
    # { "Вареные": [{"col_1": 1, "col_2": 245, ...}, ...], ... }
    groups: dict[str, list[dict[str, Any]]]
    # Сколько товаров в каждом типе
    counts: dict[str, int]
    total: int
