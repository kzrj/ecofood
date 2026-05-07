from typing import Annotated

from fastapi import Depends

from app.application.services import RecipeService
from app.application.services.import_service import ImportService
from app.application.services.sku_list_service import SkuListService
from app.infrastructure.repositories import MongoRecipeRepository
from app.infrastructure.repositories.mongo_demand_repository import MongoDemandRepository
from app.infrastructure.repositories.mongo_sku_list_repository import MongoSkuListRepository


def get_recipe_repository() -> MongoRecipeRepository:
    return MongoRecipeRepository()


def get_recipe_service(
    repo: Annotated[MongoRecipeRepository, Depends(get_recipe_repository)],
) -> RecipeService:
    return RecipeService(repo)


def get_demand_repository() -> MongoDemandRepository:
    return MongoDemandRepository()


def get_import_service(
    repo: Annotated[MongoDemandRepository, Depends(get_demand_repository)],
) -> ImportService:
    return ImportService(repo)


def get_sku_list_repository() -> MongoSkuListRepository:
    return MongoSkuListRepository()


def get_sku_list_service(
    repo: Annotated[MongoSkuListRepository, Depends(get_sku_list_repository)],
) -> SkuListService:
    return SkuListService(repo)
