from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class Demand:
    """Saved production demand — result of parsing a factory plan file."""

    filename: str
    data: dict[str, list[dict[str, Any]]]  # { product_type: [row, ...] }
    created_at: datetime = field(default_factory=datetime.utcnow)
    id: str | None = None
