import random

from .common.constants import SKU_WEIGHT_MAX, SKU_WEIGHT_MIN
from .common.recipes import RECIPES


def make_random_sku_list(count=50, *, seed=None):
    """
    Список SKU для симуляции: (id, recipe_id, weight_kg).
    Рецепт выбирается случайно из RECIPES; вес — равномерно в диапазоне SKU.
    """
    if seed is not None:
        random.seed(seed)
    recipe_ids = tuple(RECIPES.keys())
    return [
        (f"sku-{i:03d}", random.choice(recipe_ids), random.randint(SKU_WEIGHT_MIN, SKU_WEIGHT_MAX))
        for i in range(1, count + 1)
    ]


# Партия по умолчанию (каждый импорт модуля — новый набор, если нужен фикс — seed в make_random_sku_list)
SKU_LIST = make_random_sku_list(50)
