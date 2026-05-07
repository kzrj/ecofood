from __future__ import annotations

from datetime import datetime

from bson import ObjectId
from bson.errors import InvalidId

from app.domain.entities.sku_list import SkuList
from app.infrastructure.database import Database

_COLLECTION = "sku_lists"


def _doc_to_entity(doc: dict) -> SkuList:
    return SkuList(
        id=str(doc["_id"]),
        name=doc["name"],
        items=doc.get("items", []),
        for_simulation=doc.get("for_simulation", False),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


class MongoSkuListRepository:
    async def create(self, entity: SkuList) -> SkuList:
        db = Database.get_db()
        now = datetime.utcnow()
        doc = {
            "name": entity.name,
            "items": entity.items,
            "for_simulation": entity.for_simulation,
            "created_at": entity.created_at or now,
            "updated_at": entity.updated_at or now,
        }
        result = await db[_COLLECTION].insert_one(doc)
        saved = await db[_COLLECTION].find_one({"_id": result.inserted_id})
        assert saved is not None
        return _doc_to_entity(saved)

    async def list_all(self, *, limit: int = 100) -> list[SkuList]:
        db = Database.get_db()
        cursor = db[_COLLECTION].find().sort("updated_at", -1).limit(limit)
        return [_doc_to_entity(doc) async for doc in cursor]

    async def get_by_id(self, sku_list_id: str) -> SkuList | None:
        try:
            oid = ObjectId(sku_list_id)
        except InvalidId:
            return None
        db = Database.get_db()
        doc = await db[_COLLECTION].find_one({"_id": oid})
        return _doc_to_entity(doc) if doc else None

    async def get_for_simulation(self) -> SkuList | None:
        db = Database.get_db()
        doc = await db[_COLLECTION].find_one({"for_simulation": True})
        return _doc_to_entity(doc) if doc else None

    async def update(self, sku_list_id: str, entity: SkuList) -> SkuList | None:
        try:
            oid = ObjectId(sku_list_id)
        except InvalidId:
            return None
        db = Database.get_db()
        await db[_COLLECTION].update_one(
            {"_id": oid},
            {
                "$set": {
                    "name": entity.name,
                    "items": entity.items,
                    "for_simulation": entity.for_simulation,
                    "updated_at": datetime.utcnow(),
                }
            },
        )
        doc = await db[_COLLECTION].find_one({"_id": oid})
        return _doc_to_entity(doc) if doc else None

    async def delete(self, sku_list_id: str) -> bool:
        try:
            oid = ObjectId(sku_list_id)
        except InvalidId:
            return False
        db = Database.get_db()
        result = await db[_COLLECTION].delete_one({"_id": oid})
        return result.deleted_count > 0
