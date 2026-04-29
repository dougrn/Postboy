from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any
import os
import json
from datetime import datetime

from .models import Collection, Environment, RequestData, HistoryItem, KeyValue
from .storage import Storage
from .engine import RequestEngine

app = FastAPI(title="Postboy API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Storages
col_storage = Storage("collections.json", Collection)
env_storage = Storage("environments.json", Environment)
his_storage = Storage("history.json", HistoryItem)

# --- Collections ---
@app.get("/api/collections", response_model=List[Collection])
async def get_collections():
    return col_storage.load_all()

@app.post("/api/collections", response_model=Collection)
async def create_collection(col: Collection):
    col_storage.add(col)
    return col

@app.put("/api/collections/{col_id}")
async def update_collection(col_id: str, col: Collection):
    col_storage.update(col_id, col)
    return col

@app.delete("/api/collections/{col_id}")
async def delete_collection(col_id: str):
    col_storage.delete(col_id)
    return {"status": "ok"}

# --- Environments ---
@app.get("/api/environments", response_model=List[Environment])
async def get_environments():
    return env_storage.load_all()

@app.post("/api/environments", response_model=Environment)
async def create_environment(env: Environment):
    env_storage.add(env)
    return env

@app.put("/api/environments/{env_id}")
async def update_environment(env_id: str, env: Environment):
    env_storage.update(env_id, env)
    return env

@app.delete("/api/environments/{env_id}")
async def delete_environment(env_id: str):
    env_storage.delete(env_id)
    return {"status": "ok"}

# --- History ---
@app.get("/api/history", response_model=List[HistoryItem])
async def get_history():
    return his_storage.load_all()

# --- Execution ---
@app.post("/api/execute")
async def execute_request(req_data: RequestData, env_id: str = None):
    # Prepare variables
    variables = {}
    if env_id:
        envs = env_storage.load_all()
        env = next((e for e in envs if e.id == env_id), None)
        if env:
            variables = {v.key: v.value for v in env.variables if v.enabled}
    
    engine = RequestEngine(variables)
    result = await engine.execute(req_data)
    
    # Save to history
    history_entry = HistoryItem(
        timestamp=datetime.now().isoformat(),
        request=req_data,
        response=result
    )
    his_storage.add(history_entry)
    
    return result

# --- Import Postman ---
@app.post("/api/import-postman")
async def import_postman(data: Dict[str, Any]):
    try:
        # Basic conversion from Postman v2.1
        info = data.get("info", {})
        items = data.get("item", [])
        
        new_col = Collection(name=info.get("name", "Imported Collection"))
        
        def parse_items(pm_items):
            reqs = []
            for item in pm_items:
                if "request" in item:
                    pm_req = item["request"]
                    
                    # Convert URL
                    url = pm_req.get("url", "")
                    if isinstance(url, dict):
                        url = url.get("raw", "")
                    
                    # Convert Headers
                    headers = [KeyValue(key=h["key"], value=h["value"]) for h in pm_req.get("header", [])]
                    
                    # Convert Body
                    body_type = "none"
                    body = None
                    pm_body = pm_req.get("body", {})
                    if pm_body:
                        body_type = pm_body.get("mode", "none")
                        if body_type == "raw":
                            body_type = "json" if "json" in pm_body.get("options", {}).get("raw", {}).get("language", "") else "text"
                            body = pm_body.get("raw")
                    
                    reqs.append(RequestData(
                        name=item.get("name", "Untitled"),
                        method=pm_req.get("method", "GET"),
                        url=url,
                        headers=headers,
                        body_type=body_type,
                        body=body
                    ))
                elif "item" in item: # Folder
                    reqs.extend(parse_items(item["item"]))
            return reqs

        new_col.items = parse_items(items)
        col_storage.add(new_col)
        return new_col
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid Postman collection: {str(e)}")

# --- Static Files ---
frontend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
