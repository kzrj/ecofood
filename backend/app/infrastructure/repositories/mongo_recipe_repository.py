from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ReturnDocument

from app.domain.entities.recipe import Recipe
from app.infrastructure.database import Database

_COLLECTION = "recipes"


def _doc_to_recipe(doc: dict) -> Recipe:
    return Recipe(
        id=str(doc["_id"]),
        code=doc["code"],
        name=doc.get("name"),
        kuter=int(doc["kuter"]),
        shpric=int(doc["shpric"]),
        klipsator=int(doc["klipsator"]),
        osadka=int(doc["osadka"]),
        termokamera=int(doc["termokamera"]),
        ohlazdenie=int(doc["ohlazdenie"]),
        upakovka=int(doc["upakovka"]),
    )


def _recipe_to_doc(recipe: Recipe) -> dict:
    return {
        "code": recipe.code,
        "name": recipe.name,
        "kuter": recipe.kuter,
        "shpric": recipe.shpric,
        "klipsator": recipe.klipsator,
        "osadka": recipe.osadka,
        "termokamera": recipe.termokamera,
        "ohlazdenie": recipe.ohlazdenie,
        "upakovka": recipe.upakovka,
    }


class MongoRecipeRepository:
    @staticmethod
    async def ensure_indexes() -> None:
        db = Database.get_db()
        await db[_COLLECTION].create_index("code", unique=True)
        await db[_COLLECTION].update_many({}, {"$unset": {"post_rama": ""}})

    async def create(self, recipe: Recipe) -> Recipe:
        db = Database.get_db()
        doc = _recipe_to_doc(recipe)
        result = await db[_COLLECTION].insert_one(doc)
        saved = await db[_COLLECTION].find_one({"_id": result.inserted_id})
        assert saved is not None
        return _doc_to_recipe(saved)

    async def get_by_id(self, recipe_id: str) -> Recipe | None:
        try:
            oid = ObjectId(recipe_id)
        except InvalidId:
            return None
        db = Database.get_db()
        doc = await db[_COLLECTION].find_one({"_id": oid})
        if doc is None:
            return None
        return _doc_to_recipe(doc)

    async def get_by_code(self, code: str) -> Recipe | None:
        db = Database.get_db()
        doc = await db[_COLLECTION].find_one({"code": code})
        if doc is None:
            return None
        return _doc_to_recipe(doc)

    async def list_all(self, *, skip: int = 0, limit: int = 100) -> list[Recipe]:
        db = Database.get_db()
        cursor = db[_COLLECTION].find().sort("code", 1).skip(skip).limit(min(limit, 500))
        return [_doc_to_recipe(doc) async for doc in cursor]

    async def update_by_code(self, code: str, recipe: Recipe) -> Recipe | None:
        db = Database.get_db()
        doc = _recipe_to_doc(recipe)
        doc.pop("code", None)
        result = await db[_COLLECTION].find_one_and_update(
            {"code": code},
            {"$set": doc, "$unset": {"post_rama": ""}},
            return_document=ReturnDocument.AFTER,
        )
        if result is None:
            return None
        return _doc_to_recipe(result)

    async def delete_by_code(self, code: str) -> bool:
        db = Database.get_db()
        res = await db[_COLLECTION].delete_one({"code": code})
        return res.deleted_count > 0
