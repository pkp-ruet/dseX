from pymongo import MongoClient
from config import MONGODB_URI, MONGODB_DB_NAME

_client = None
_db = None

# Keep the pool small for Atlas M0's connection cap (used by the scraper CLI).
_POOL_KWARGS = dict(
    maxPoolSize=10,
    minPoolSize=0,
    maxIdleTimeMS=60_000,
    serverSelectionTimeoutMS=5_000,
    connectTimeoutMS=5_000,
)


def get_db():
    global _client, _db
    if _db is None:
        _client = MongoClient(MONGODB_URI, **_POOL_KWARGS)
        _db = _client[MONGODB_DB_NAME]
    return _db


def close_connection():
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None
