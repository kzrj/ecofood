from typing import Annotated

from fastapi import Depends

from app.application.services import RecipeService
from app.infrastructure.repositories import MongoRecipeRepository


def get_recipe_repository() -> MongoRecipeRepository:
    return MongoRecipeRepository()


def get_recipe_service(
    repo: Annotated[MongoRecipeRepository, Depends(get_recipe_repository)],
) -> RecipeService:
    return RecipeService(repo)
