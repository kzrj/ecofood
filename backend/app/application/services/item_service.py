from app.application.dto import ItemCreate, ItemRead
from app.domain.entities import Item
from app.domain.repositories import ItemRepository


class ItemService:
    def __init__(self, repo: ItemRepository) -> None:
        self._repo = repo

    async def create(self, data: ItemCreate) -> ItemRead:
        entity = Item(name=data.name)
        saved = await self._repo.create(entity)
        return ItemRead(id=saved.id or "", name=saved.name, created_at=saved.created_at)

    async def get(self, item_id: str) -> ItemRead | None:
        entity = await self._repo.get_by_id(item_id)
        if entity is None or entity.id is None:
            return None
        return ItemRead(id=entity.id, name=entity.name, created_at=entity.created_at)

    async def list_items(self, *, skip: int = 0, limit: int = 100) -> list[ItemRead]:
        rows = await self._repo.list_all(skip=skip, limit=limit)
        return [
            ItemRead(id=r.id or "", name=r.name, created_at=r.created_at)
            for r in rows
            if r.id is not None
        ]
