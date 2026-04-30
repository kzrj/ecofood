from dataclasses import dataclass


@dataclass
class Recipe:
    """Рецепт: длительности этапов (мин)."""

    code: str
    kuter: int
    shpric: int
    klipsator: int
    osadka: int
    termokamera: int
    ohlazdenie: int
    upakovka: int
    id: str | None = None
    name: str | None = None
