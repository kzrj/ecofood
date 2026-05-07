from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class SkuListCreateDTO(BaseModel):
    name: str = Field(..., min_length=1, max_length=256)
    items: list[dict[str, Any]] = Field(default_factory=list)
    for_simulation: bool = False


class SkuListUpdateDTO(BaseModel):
    name: str = Field(..., min_length=1, max_length=256)
    items: list[dict[str, Any]] = Field(default_factory=list)
    for_simulation: bool = False


class SkuListListItemDTO(BaseModel):
    id: str
    name: str
    created_at: datetime
    updated_at: datetime
    count: int
    for_simulation: bool


class SkuListDetailDTO(BaseModel):
    id: str
    name: str
    created_at: datetime
    updated_at: datetime
    items: list[dict[str, Any]]
    for_simulation: bool
