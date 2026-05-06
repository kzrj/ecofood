from bson import ObjectId
from bson.errors import InvalidId

from app.domain.entities.demand import Demand
from app.infrastructure.database import Database

_COLLECTION = "demand"


def _doc_to_entity(doc: dict) -> Demand:
    return Demand(
        id=str(doc["_id"]),
        filename=doc["filename"],
        data=doc["data"],
        created_at=doc["created_at"],
    )


class MongoDemandRepository:
    async def save(self, entity: Demand) -> Demand:
        db = Database.get_db()
        doc = {
            "filename": entity.filename,
            "data": entity.data,
            "created_at": entity.created_at,
        }
        result = await db[_COLLECTION].insert_one(doc)
        saved = await db[_COLLECTION].find_one({"_id": result.inserted_id})
        assert saved is not None
        return _doc_to_entity(saved)

    async def list_all(self, *, limit: int = 50) -> list[Demand]:
        db = Database.get_db()
        cursor = db[_COLLECTION].find().sort("created_at", -1).limit(limit)
        return [_doc_to_entity(doc) async for doc in cursor]

    async def get_by_id(self, demand_id: str) -> Demand | None:
        try:
            oid = ObjectId(demand_id)
        except InvalidId:
            return None
        db = Database.get_db()
        doc = await db[_COLLECTION].find_one({"_id": oid})
        return _doc_to_entity(doc) if doc else None
