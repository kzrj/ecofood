from typing import Annotated

from fastapi import Depends

from app.application.services import ItemService, RecipeService
from app.infrastructure.repositories import MongoItemRepository, MongoRecipeRepository


def get_item_repository() -> MongoItemRepository:
    return MongoItemRepository()


def get_item_service(
    repo: Annotated[MongoItemRepository, Depends(get_item_repository)],
) -> ItemService:
    return ItemService(repo)


def get_recipe_repository() -> MongoRecipeRepository:
    return MongoRecipeRepository()


def get_recipe_service(
    repo: Annotated[MongoRecipeRepository, Depends(get_recipe_repository)],
) -> RecipeService:
    return RecipeService(repo)
