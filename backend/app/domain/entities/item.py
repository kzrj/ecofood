from dataclasses import dataclass, field
from datetime import datetime, timezone


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class Item:
    """Пример агрегата домена; замените на сущности ecofood по мере развития."""

    name: str
    id: str | None = None
    created_at: datetime = field(default_factory=_utc_now)
