"""
Рецепт: длительности по этапам (минуты).

prep до рамы всегда в порядке: кутер → шприц → клипсатор (значения — поля рецепта).
Время на prep-станциях нормировано на 100 кг; compute_sku_times масштабирует по весу SKU.
"""

PREP_STATIONS = ("kuter", "shpric", "klipsator")
POST_PREP_STATIONS = ("osadka", "termokamera", "ohlazdenie", "upakovka")

RECIPES = {
    "varenka": {
        "kuter": 14,
        "shpric": 8,
        "klipsator": 8,
        "osadka": 100,
        "termokamera": 60,
        "ohlazdenie": 30,
        "upakovka": 50,
    },
    "polukopch": {
        "kuter": 10,
        "shpric": 10,
        "klipsator": 10,
        "osadka": 240,
        "termokamera": 110,
        "ohlazdenie": 30,
        "upakovka": 50,
    },
}


def compute_sku_times(recipe: dict, weight: float) -> dict:
    """Время на prep-станциях для конкретного SKU с учётом веса (норматив — 100 кг)."""
    return {s: recipe[s] * weight / 100 for s in PREP_STATIONS}


def compute_rama_times(recipe: dict) -> dict:
    """Время на post-prep этапах для рамы (не зависит от веса)."""
    return {s: recipe[s] for s in POST_PREP_STATIONS}
