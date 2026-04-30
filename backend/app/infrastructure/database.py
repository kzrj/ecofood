from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase


class Database:
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None

    @classmethod
    async def connect(cls, uri: str, db_name: str) -> None:
        cls.client = AsyncIOMotorClient(uri)
        cls.db = cls.client[db_name]

    @classmethod
    async def disconnect(cls) -> None:
        if cls.client is not None:
            cls.client.close()
        cls.client = None
        cls.db = None

    @classmethod
    def get_db(cls) -> AsyncIOMotorDatabase:
        if cls.db is None:
            raise RuntimeError("Database is not connected")
        return cls.db
