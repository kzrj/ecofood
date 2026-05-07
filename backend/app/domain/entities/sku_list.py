from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class SkuList:
    """Saved manual SKU input list for simulation."""

    name: str
    items: list[dict[str, Any]]
    for_simulation: bool = False
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    id: str | None = None
