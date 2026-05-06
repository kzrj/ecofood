from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from app.api.dependencies import get_recipe_service
from app.application.services import RecipeService
from simulation.common.models import Sku
from simulation.common.recipes import RECIPES as STATIC_RECIPES, compute_sku_times
from simulation.run import run

router = APIRouter(prefix="/simulation", tags=["simulation"])

_SIM_STAGES = ("kuter", "shpric", "klipsator", "osadka", "termokamera", "ohlazdenie", "upakovka")


async def _load_recipe_book(service: RecipeService) -> dict:
    """Рецепты из Mongo, смаппленные в формат симуляции. Если БД пустая — встроенный fallback."""
    rows = await service.list_recipes(limit=500)
    if not rows:
        return dict(STATIC_RECIPES)
    return {r.code: {stage: getattr(r, stage) for stage in _SIM_STAGES} for r in rows}


class SkuIn(BaseModel):
    id: str
    recipe: str
    weight: float = Field(gt=0)


class SimulationRunRequest(BaseModel):
    sku_list: list[SkuIn] | None = None


@router.post("/run")
async def run_simulation(
    body: SimulationRunRequest,
    recipe_service: Annotated[RecipeService, Depends(get_recipe_service)],
) -> dict:
    """
    Запуск симуляции (в потоке, без записи файлов).
    Рецепты берутся из Mongo; fallback на встроенные, если БД пустая.
    Если sku_list не задан — используется случайная партия по умолчанию.
    """
    recipe_book = await _load_recipe_book(recipe_service)

    sku_objects: list[Sku] | None = None
    if body.sku_list is not None:
        sku_objects = [
            Sku(
                id=x.id,
                recipe_name=x.recipe,
                weight=x.weight,
                times=compute_sku_times(recipe_book[x.recipe], x.weight),
            )
            for x in body.sku_list
        ]

    def _sync() -> dict:
        *_, payload = run(sku_list=sku_objects, recipe_book=recipe_book, persist=False, verbose=False)
        return payload

    try:
        return await run_in_threadpool(_sync)
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Неизвестный рецепт: {e!s}") from e
