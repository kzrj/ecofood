"""
Application service for Excel import.
Orchestrates: parsing → saving to repository.
"""
from __future__ import annotations

from app.application.dto.import_dto import (
    DemandDetailDTO,
    DemandListItemDTO,
    GroupedImportResultDTO,
    SavedDemandDTO,
)
from app.domain.entities.demand import Demand
from app.domain.repositories.demand_repository import DemandRepository
from app.infrastructure.excel.batch_splitter import enrich_row
from app.infrastructure.excel.excel_parser import group_rows_by_type


class ImportService:
    def __init__(self, demand_repo: DemandRepository) -> None:
        self._repo = demand_repo

    async def parse_excel(self, filename: str, data: bytes) -> GroupedImportResultDTO:
        groups = group_rows_by_type(data)
        enriched = {t: [enrich_row(r) for r in rows] for t, rows in groups.items()}
        counts = {t: len(rows) for t, rows in enriched.items()}
        return GroupedImportResultDTO(
            filename=filename,
            groups=enriched,
            counts=counts,
            total=sum(counts.values()),
        )

    async def save(self, dto: GroupedImportResultDTO) -> SavedDemandDTO:
        entity = Demand(filename=dto.filename, data=dto.groups)
        saved = await self._repo.save(entity)
        assert saved.id is not None
        return SavedDemandDTO(
            id=saved.id,
            filename=saved.filename,
            created_at=saved.created_at,
        )

    async def list_demands(self, *, limit: int = 50) -> list[DemandListItemDTO]:
        items = await self._repo.list_all(limit=limit)
        return [
            DemandListItemDTO(id=d.id, filename=d.filename, created_at=d.created_at)
            for d in items
        ]

    async def get_demand(self, demand_id: str) -> DemandDetailDTO | None:
        d = await self._repo.get_by_id(demand_id)
        if d is None:
            return None
        counts = {t: len(rows) for t, rows in d.data.items()}
        return DemandDetailDTO(
            id=d.id,
            filename=d.filename,
            created_at=d.created_at,
            groups=d.data,
            counts=counts,
            total=sum(counts.values()),
        )
