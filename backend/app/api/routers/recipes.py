from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pymongo.errors import DuplicateKeyError

from app.application.dto import RecipeCreate, RecipeRead, RecipeUpdate
from app.application.services import RecipeService
from app.api.dependencies import get_recipe_service

router = APIRouter(prefix="/recipes", tags=["recipes"])


@router.post("", response_model=RecipeRead, status_code=201)
async def create_recipe(
    body: RecipeCreate,
    service: Annotated[RecipeService, Depends(get_recipe_service)],
) -> RecipeRead:
    try:
        return await service.create(body)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Recipe code already exists") from None


@router.get("/{code}", response_model=RecipeRead)
async def get_recipe(
    code: str,
    service: Annotated[RecipeService, Depends(get_recipe_service)],
) -> RecipeRead:
    row = await service.get_by_code(code)
    if row is None:
        raise HTTPException(status_code=404, detail="Not found")
    return row


@router.get("", response_model=list[RecipeRead])
async def list_recipes(
    service: Annotated[RecipeService, Depends(get_recipe_service)],
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
) -> list[RecipeRead]:
    return await service.list_recipes(skip=skip, limit=limit)


@router.patch("/{code}", response_model=RecipeRead)
async def patch_recipe(
    code: str,
    body: RecipeUpdate,
    service: Annotated[RecipeService, Depends(get_recipe_service)],
) -> RecipeRead:
    row = await service.update(code, body)
    if row is None:
        raise HTTPException(status_code=404, detail="Not found")
    return row


@router.delete("/{code}", status_code=204)
async def delete_recipe(
    code: str,
    service: Annotated[RecipeService, Depends(get_recipe_service)],
) -> None:
    deleted = await service.delete(code)
    if not deleted:
        raise HTTPException(status_code=404, detail="Not found")
