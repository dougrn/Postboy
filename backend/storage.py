import json
import os
import logging
import asyncio
from typing import List, Any, Type, TypeVar, Generic, Optional, Dict
from pydantic import BaseModel, parse_obj_as

T = TypeVar("T", bound=BaseModel)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
logger = logging.getLogger(__name__)

class CacheEntry:
    """Cache entry with timestamp for TTL-based invalidation"""
    def __init__(self, data: Any, ttl_seconds: int = 300):
        self.data = data
        self.created_at = asyncio.get_event_loop().time() if asyncio.get_event_loop().is_running() else 0
        self.ttl_seconds = ttl_seconds

    def is_valid(self) -> bool:
        import time
        return (time.time() - self.created_at) < self.ttl_seconds


class AsyncStorage(Generic[T]):
    """Async storage with in-memory cache"""
    _cache: Dict[str, CacheEntry] = {}

    def __init__(self, filename: str, model_type: Type[T], ttl_seconds: int = 300):
        self.filepath = os.path.join(DATA_DIR, filename)
        self.model_type = model_type
        self.ttl_seconds = ttl_seconds
        if not os.path.exists(DATA_DIR):
            os.makedirs(DATA_DIR)
        if not os.path.exists(self.filepath):
            with open(self.filepath, "w") as f:
                json.dump([], f)

    def _cache_key(self) -> str:
        return self.filepath

    async def load_all(self) -> List[T]:
        cache_key = self._cache_key()
        if cache_key in AsyncStorage._cache:
            entry = AsyncStorage._cache[cache_key]
            if entry.is_valid():
                return entry.data

        try:
            with open(self.filepath, "r") as f:
                data = json.load(f)
                items = [self.model_type(**item) for item in data]
                AsyncStorage._cache[cache_key] = CacheEntry(items, self.ttl_seconds)
                return items
        except (json.JSONDecodeError, IOError, TypeError) as e:
            logger.error(f"Failed to load {self.filepath}: {e}")
            return []

    async def save_all(self, items: List[T]):
        try:
            with open(self.filepath, "w") as f:
                json.dump([item.dict() for item in items], f, indent=4)
            # Invalidate cache on save
            cache_key = self._cache_key()
            if cache_key in AsyncStorage._cache:
                del AsyncStorage._cache[cache_key]
        except IOError as e:
            logger.error(f"Failed to save {self.filepath}: {e}")

    async def add(self, item: T):
        items = await self.load_all()
        items.append(item)
        await self.save_all(items)

    async def update(self, item_id: str, new_item: T):
        items = await self.load_all()
        for i, item in enumerate(items):
            if getattr(item, 'id', None) == item_id:
                items[i] = new_item
                break
        await self.save_all(items)

    async def delete(self, item_id: str):
        items = await self.load_all()
        items = [item for item in items if getattr(item, 'id', None) != item_id]
        await self.save_all(items)

    @classmethod
    def clear_cache(cls):
        """Clear all in-memory cache"""
        cls._cache.clear()


# Keep sync version for backward compatibility (will be migrated later)
Storage = AsyncStorage
