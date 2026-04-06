"""
Рецепты: prep до рамы, затем post_rama (порядок этапов после набора рамы).

Пока симуляция проводит полную линию как в study/sim_step6; post_rama задаёт
контракт данных для будущей ветвления (без термо и т.д.).
"""

# Полная линия после рамы: осадка → термокамера → охлаждение → батч упаковки
POST_RAMA_FULL = ("osadka", "termokamera", "ohlazdenie", "upakovka_batch")

RECIPES = {
    "varenka": {
        "prep_steps": [
            ("kuter", 14),
            ("shpric", 8),
            ("klipsator", 8),
        ],
        "post_rama": POST_RAMA_FULL,
        "osadka_time": 100,
        "termokamera_time": 60,
    },
    "polukopch": {
        "prep_steps": [
            ("kuter", 10),
            ("shpric", 10),
            ("klipsator", 10),
        ],
        "post_rama": POST_RAMA_FULL,
        "osadka_time": 240,
        "termokamera_time": 110,
    },
}


def get_prep_steps(recipe):
    return recipe["prep_steps"]
