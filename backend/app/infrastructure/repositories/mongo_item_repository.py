from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId

from app.domain.entities import Item
from app.infrastructure.database import Database

_COLLECTION = "items"


def _ensure_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


class MongoItemRepository:
    async def create(self, item: Item) -> Item:
        db = Database.get_db()
        doc = {"name": item.name, "created_at": _ensure_utc(item.created_at)}
        result = await db[_COLLECTION].insert_one(doc)
        return Item(
            id=str(result.inserted_id),
            name=item.name,
            created_at=doc["created_at"],
        )

    async def get_by_id(self, item_id: str) -> Item | None:
        try:
            oid = ObjectId(item_id)
        except InvalidId:
            return None
        db = Database.get_db()
        doc = await db[_COLLECTION].find_one({"_id": oid})
        if doc is None:
            return None
        return Item(
            id=str(doc["_id"]),
            name=doc["name"],
            created_at=_ensure_utc(doc["created_at"]),
        )

    async def list_all(self, *, skip: int = 0, limit: int = 100) -> list[Item]:
        db = Database.get_db()
        cursor = (
            db[_COLLECTION]
            .find()
            .sort("created_at", -1)
            .skip(skip)
            .limit(min(limit, 500))
        )
        items: list[Item] = []
        async for doc in cursor:
            items.append(
                Item(
                    id=str(doc["_id"]),
                    name=doc["name"],
                    created_at=_ensure_utc(doc["created_at"]),
                )
            )
        return items
