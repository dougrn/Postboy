import json
import os
from typing import List, Any, Type, TypeVar, Generic
from pydantic import BaseModel, parse_obj_as

T = TypeVar("T", bound=BaseModel)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")

class Storage(Generic[T]):
    def __init__(self, filename: str, model_type: Type[T]):
        self.filepath = os.path.join(DATA_DIR, filename)
        self.model_type = model_type
        if not os.path.exists(DATA_DIR):
            os.makedirs(DATA_DIR)
        if not os.path.exists(self.filepath):
            with open(self.filepath, "w") as f:
                json.dump([], f)

    def load_all(self) -> List[T]:
        try:
            with open(self.filepath, "r") as f:
                data = json.load(f)
                return [self.model_type(**item) for item in data]
        except Exception:
            return []

    def save_all(self, items: List[T]):
        with open(self.filepath, "w") as f:
            json.dump([item.dict() for item in items], f, indent=4)

    def add(self, item: T):
        items = self.load_all()
        items.append(item)
        self.save_all(items)

    def update(self, item_id: str, new_item: T):
        items = self.load_all()
        for i, item in enumerate(items):
            if getattr(item, 'id', None) == item_id:
                items[i] = new_item
                break
        self.save_all(items)

    def delete(self, item_id: str):
        items = self.load_all()
        items = [item for item in items if getattr(item, 'id', None) != item_id]
        self.save_all(items)
