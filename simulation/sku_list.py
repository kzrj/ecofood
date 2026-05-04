import random

from .common.constants import SKU_WEIGHT_STEPS
from .common.models import Sku
from .common.recipes import RECIPES, compute_sku_times


def make_random_sku_list(count=50, *, seed=None):
    """
    Список SKU для симуляции: Sku(id, recipe_name, weight, times).
    Рецепт выбирается случайно из RECIPES; вес — кратен 50 (100 / 150 кг).
    times содержит уже масштабированное время prep-станций для данного веса.
    """
    if seed is not None:
        random.seed(seed)
    recipe_ids = tuple(RECIPES.keys())
    skus = []
    for i in range(1, count + 1):
        rn = random.choice(recipe_ids)
        w = random.choice(SKU_WEIGHT_STEPS)
        skus.append(Sku(id=f"sku-{i:03d}", recipe_name=rn, weight=w, times=compute_sku_times(RECIPES[rn], w)))
    return skus


# Партия по умолчанию (каждый импорт модуля — новый набор, если нужен фикс — seed в make_random_sku_list)
SKU_LIST = make_random_sku_list(50)
