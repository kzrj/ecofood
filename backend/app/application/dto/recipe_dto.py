from pydantic import BaseModel, ConfigDict, Field


class RecipeCreate(BaseModel):
    code: str = Field(..., min_length=1, max_length=64, pattern=r"^[a-z0-9_\-]+$")
    name: str | None = Field(None, max_length=256)
    kuter: int = Field(..., gt=0)
    shpric: int = Field(..., gt=0)
    klipsator: int = Field(..., gt=0)
    osadka: int = Field(..., gt=0)
    termokamera: int = Field(..., gt=0)
    ohlazdenie: int = Field(..., gt=0)
    upakovka: int = Field(..., gt=0)


class RecipeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    code: str
    name: str | None
    kuter: int
    shpric: int
    klipsator: int
    osadka: int
    termokamera: int
    ohlazdenie: int
    upakovka: int


class RecipeUpdate(BaseModel):
    name: str | None = Field(None, max_length=256)
    kuter: int | None = Field(None, gt=0)
    shpric: int | None = Field(None, gt=0)
    klipsator: int | None = Field(None, gt=0)
    osadka: int | None = Field(None, gt=0)
    termokamera: int | None = Field(None, gt=0)
    ohlazdenie: int | None = Field(None, gt=0)
    upakovka: int | None = Field(None, gt=0)
