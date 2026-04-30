from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.routers import health, items, recipes
from app.config import settings
from app.infrastructure.database import Database
from app.infrastructure.repositories.mongo_recipe_repository import MongoRecipeRepository


@asynccontextmanager
async def lifespan(app: FastAPI):
    await Database.connect(settings.mongodb_uri, settings.mongodb_db_name)
    try:
        await MongoRecipeRepository.ensure_indexes()
        yield
    finally:
        await Database.disconnect()


app = FastAPI(
    title="Ecofood API",
    lifespan=lifespan,
)

app.include_router(health.router)
app.include_router(items.router, prefix="/api/v1")
app.include_router(recipes.router, prefix="/api/v1")
