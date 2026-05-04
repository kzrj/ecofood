"""
Инфраструктурный слой: знает про openpyxl, не знает про домен.
Принимает сырые байты → возвращает список строк в виде dict.
"""
from __future__ import annotations

import io
from typing import Any

import openpyxl

_TARGET_SHEET_PREFIX = "завод план"
_MAX_COLUMNS = 6


def _select_target_sheet(workbook: openpyxl.Workbook):
    for sheet in workbook.worksheets:
        if sheet.title.strip().lower().startswith(_TARGET_SHEET_PREFIX):
            return sheet
    raise ValueError("Лист с названием, начинающимся на 'Завод план', не найден")


def parse_excel_bytes(data: bytes) -> list[dict[str, Any]]:
    """
    Читает .xlsx из байтов.
    Первая строка — заголовки (header).
    Возвращает список dict {заголовок: значение}.
    Пустые строки пропускаются.
    """
    wb = openpyxl.load_workbook(io.BytesIO(data), read_only=True, data_only=True)
    ws = _select_target_sheet(wb)

    rows_iter = ws.iter_rows(values_only=True)
    try:
        first_row = next(rows_iter)
        headers = [
            str(h).strip() if h is not None else f"col_{i + 1}"
            for i, h in enumerate(first_row[:_MAX_COLUMNS])
        ]
    except StopIteration:
        return []

    result: list[dict[str, Any]] = []
    for row in rows_iter:
        row_slice = row[:_MAX_COLUMNS]
        if all(v is None for v in row_slice):
            continue
        result.append(dict(zip(headers, row_slice)))

    wb.close()
    return result
