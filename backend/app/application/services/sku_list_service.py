from __future__ import annotations

from datetime import datetime

from app.application.dto.sku_list_dto import (
    SkuListCreateDTO,
    SkuListDetailDTO,
    SkuListListItemDTO,
    SkuListUpdateDTO,
)
from app.domain.entities.sku_list import SkuList
from app.domain.repositories.sku_list_repository import SkuListRepository


class SkuListService:
    def __init__(self, repo: SkuListRepository) -> None:
        self._repo = repo

    async def _validate_for_simulation_uniqueness(
        self,
        *,
        requested_flag: bool,
        current_id: str | None = None,
    ) -> None:
        if not requested_flag:
            return
        selected = await self._repo.get_for_simulation()
        if selected is not None and selected.id != current_id:
            raise ValueError("Другой список уже отмечен как 'на симуляцию'")

    async def create(self, body: SkuListCreateDTO) -> SkuListDetailDTO:
        await self._validate_for_simulation_uniqueness(requested_flag=body.for_simulation)
        now = datetime.utcnow()
        entity = SkuList(
            name=body.name,
            items=body.items,
            for_simulation=body.for_simulation,
            created_at=now,
            updated_at=now,
        )
        saved = await self._repo.create(entity)
        assert saved.id is not None
        return SkuListDetailDTO(
            id=saved.id,
            name=saved.name,
            created_at=saved.created_at,
            updated_at=saved.updated_at,
            items=saved.items,
            for_simulation=saved.for_simulation,
        )

    async def list_all(self, *, limit: int = 100) -> list[SkuListListItemDTO]:
        rows = await self._repo.list_all(limit=limit)
        return [
            SkuListListItemDTO(
                id=row.id or "",
                name=row.name,
                created_at=row.created_at,
                updated_at=row.updated_at,
                count=len(row.items or []),
                for_simulation=row.for_simulation,
            )
            for row in rows
            if row.id is not None
        ]

    async def get_by_id(self, sku_list_id: str) -> SkuListDetailDTO | None:
        row = await self._repo.get_by_id(sku_list_id)
        if row is None or row.id is None:
            return None
        return SkuListDetailDTO(
            id=row.id,
            name=row.name,
            created_at=row.created_at,
            updated_at=row.updated_at,
            items=row.items,
            for_simulation=row.for_simulation,
        )

    async def update(self, sku_list_id: str, body: SkuListUpdateDTO) -> SkuListDetailDTO | None:
        current = await self._repo.get_by_id(sku_list_id)
        if current is None:
            return None
        await self._validate_for_simulation_uniqueness(
            requested_flag=body.for_simulation,
            current_id=current.id,
        )
        updated_entity = SkuList(
            id=current.id,
            name=body.name,
            items=body.items,
            for_simulation=body.for_simulation,
            created_at=current.created_at,
            updated_at=datetime.utcnow(),
        )
        saved = await self._repo.update(sku_list_id, updated_entity)
        if saved is None or saved.id is None:
            return None
        return SkuListDetailDTO(
            id=saved.id,
            name=saved.name,
            created_at=saved.created_at,
            updated_at=saved.updated_at,
            items=saved.items,
            for_simulation=saved.for_simulation,
        )

    async def get_for_simulation(self) -> SkuListDetailDTO | None:
        row = await self._repo.get_for_simulation()
        if row is None or row.id is None:
            return None
        return SkuListDetailDTO(
            id=row.id,
            name=row.name,
            created_at=row.created_at,
            updated_at=row.updated_at,
            items=row.items,
            for_simulation=row.for_simulation,
        )

    async def delete(self, sku_list_id: str) -> bool:
        return await self._repo.delete(sku_list_id)
