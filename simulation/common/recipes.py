"""
Рецепт: длительности по этапам (минуты).

prep до рамы всегда в порядке: кутер → шприц → клипсатор (значения — поля рецепта).
"""

PREP_STATIONS = ("kuter", "shpric", "klipsator")

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


def get_prep_steps(recipe: dict) -> list[tuple[str, int]]:
    return [(station, int(recipe[station])) for station in PREP_STATIONS]
