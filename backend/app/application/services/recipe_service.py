from app.application.dto import RecipeCreate, RecipeRead, RecipeUpdate
from app.domain.entities.recipe import Recipe
from app.domain.repositories import RecipeRepository


def _to_read(entity: Recipe) -> RecipeRead:
    return RecipeRead(
        id=entity.id or "",
        code=entity.code,
        name=entity.name,
        kuter=entity.kuter,
        shpric=entity.shpric,
        klipsator=entity.klipsator,
        osadka=entity.osadka,
        termokamera=entity.termokamera,
        ohlazdenie=entity.ohlazdenie,
        upakovka=entity.upakovka,
    )


class RecipeService:
    def __init__(self, repo: RecipeRepository) -> None:
        self._repo = repo

    async def create(self, data: RecipeCreate) -> RecipeRead:
        entity = Recipe(
            code=data.code,
            name=data.name,
            kuter=data.kuter,
            shpric=data.shpric,
            klipsator=data.klipsator,
            osadka=data.osadka,
            termokamera=data.termokamera,
            ohlazdenie=data.ohlazdenie,
            upakovka=data.upakovka,
        )
        saved = await self._repo.create(entity)
        return _to_read(saved)

    async def get_by_code(self, code: str) -> RecipeRead | None:
        entity = await self._repo.get_by_code(code)
        if entity is None or entity.id is None:
            return None
        return _to_read(entity)

    async def list_recipes(self, *, skip: int = 0, limit: int = 100) -> list[RecipeRead]:
        rows = await self._repo.list_all(skip=skip, limit=limit)
        return [_to_read(r) for r in rows if r.id is not None]

    async def update(self, code: str, data: RecipeUpdate) -> RecipeRead | None:
        current = await self._repo.get_by_code(code)
        if current is None:
            return None
        updated = Recipe(
            id=current.id,
            code=current.code,
            name=data.name if data.name is not None else current.name,
            kuter=data.kuter if data.kuter is not None else current.kuter,
            shpric=data.shpric if data.shpric is not None else current.shpric,
            klipsator=data.klipsator if data.klipsator is not None else current.klipsator,
            osadka=data.osadka if data.osadka is not None else current.osadka,
            termokamera=data.termokamera if data.termokamera is not None else current.termokamera,
            ohlazdenie=data.ohlazdenie if data.ohlazdenie is not None else current.ohlazdenie,
            upakovka=data.upakovka if data.upakovka is not None else current.upakovka,
        )
        saved = await self._repo.update_by_code(code, updated)
        if saved is None or saved.id is None:
            return None
        return _to_read(saved)

    async def delete(self, code: str) -> bool:
        return await self._repo.delete_by_code(code)
