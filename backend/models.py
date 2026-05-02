from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from uuid import uuid4

class KeyValue(BaseModel):
    key: str
    value: str
    enabled: bool = True

class RequestData(BaseModel):
    id: Optional[str] = None
    name: str = "Untitled"
    method: str = "GET"
    url: str
    headers: List[KeyValue] = []
    params: List[KeyValue] = []
    body_type: str = "none" # none, json, form-data, text
    body: Optional[Any] = None
    auth_type: str = "none" # none, bearer, basic
    auth_config: Dict[str, str] = {}
    pre_script: Optional[str] = None  # JavaScript to run before request
    post_script: Optional[str] = None  # JavaScript to run after request

class Folder(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    description: Optional[str] = ""
    items: List[RequestData] = []
    folders: List['Folder'] = []  # Nested folders

Folder.update_forward_refs()

class Collection(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    description: Optional[str] = ""
    items: List[RequestData] = []
    folders: List[Folder] = []  # Top-level folders

class Environment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    variables: List[KeyValue] = []

class HistoryItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    timestamp: str
    request: RequestData
    response: Dict[str, Any]

