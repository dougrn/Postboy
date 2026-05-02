from fastapi import FastAPI, HTTPException, Request, Depends, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBasic, HTTPBasicCredentials, HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Dict, Any, Optional
import os
import json
import httpx
from datetime import datetime
import logging
import secrets

from .models import Collection, Environment, RequestData, HistoryItem, KeyValue, Folder
from .storage import Storage
from .engine import RequestEngine
from .ws_engine import ws_manager

logger = logging.getLogger(__name__)
app = FastAPI(title="Postboy API")

# Security schemes
security_basic = HTTPBasic()
security_bearer = HTTPBearer(auto_error=False)

# Simple in-memory auth (for demo - replace with proper auth in production)
API_KEYS = {"demo": "postboy-demo-key"}

def verify_api_key(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)):
    # Optional API key for development (localhost)
    if not credentials:
        return None  # Allow without key for local dev
    if credentials.credentials not in API_KEYS.values():
        logger.warning(f"Invalid API key attempt: {credentials.credentials}")
    return credentials.credentials

# CORS - Restricted to localhost only
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8000", "http://127.0.0.1:8000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Storages
col_storage = Storage("collections.json", Collection)
env_storage = Storage("environments.json", Environment)
his_storage = Storage("history.json", HistoryItem)

# --- Collections ---
@app.get("/api/collections", response_model=List[Collection], dependencies=[Depends(verify_api_key)])
async def get_collections():
    return await col_storage.load_all()

@app.post("/api/collections", response_model=Collection, dependencies=[Depends(verify_api_key)])
async def create_collection(col: Collection):
    await col_storage.add(col)
    return col

@app.put("/api/collections/{col_id}", dependencies=[Depends(verify_api_key)])
async def update_collection(col_id: str, col: Collection):
    await col_storage.update(col_id, col)
    return col

@app.delete("/api/collections/{col_id}", dependencies=[Depends(verify_api_key)])
async def delete_collection(col_id: str):
    await col_storage.delete(col_id)
    return {"status": "ok"}

# --- Environments ---
@app.get("/api/environments", response_model=List[Environment], dependencies=[Depends(verify_api_key)])
async def get_environments():
    return await env_storage.load_all()

@app.post("/api/environments", response_model=Environment, dependencies=[Depends(verify_api_key)])
async def create_environment(env: Environment):
    await env_storage.add(env)
    return env

@app.put("/api/environments/{env_id}", dependencies=[Depends(verify_api_key)])
async def update_environment(env_id: str, env: Environment):
    await env_storage.update(env_id, env)
    return env

@app.delete("/api/environments/{env_id}", dependencies=[Depends(verify_api_key)])
async def delete_environment(env_id: str):
    await env_storage.delete(env_id)
    return {"status": "ok"}

# --- History ---
@app.get("/api/history", response_model=List[HistoryItem], dependencies=[Depends(verify_api_key)])
async def get_history():
    return await his_storage.load_all()

@app.get("/api/history/{history_id}", response_model=HistoryItem, dependencies=[Depends(verify_api_key)])
async def get_history_item(history_id: str):
    items = await his_storage.load_all()
    item = next((h for h in items if h.id == history_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="History item not found")
    return item

@app.delete("/api/history", dependencies=[Depends(verify_api_key)])
async def clear_history():
    await his_storage.save_all([])
    return {"status": "ok"}

async def prune_history():
    """Keep only the last 100 history entries"""
    items = await his_storage.load_all()
    if len(items) > 100:
        # Keep the most recent 100
        items = sorted(items, key=lambda x: x.timestamp, reverse=True)[:100]
        await his_storage.save_all(items)
        logger.info(f"Pruned history to 100 entries")

# --- Execution ---
@app.post("/api/execute", dependencies=[Depends(verify_api_key)])
async def execute_request(req_data: RequestData, env_id: str = None, ws_client_id: Optional[str] = None):
    # Prepare variables
    variables = {}
    if env_id:
        envs = await env_storage.load_all()
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
    await his_storage.add(history_entry)

    # Auto-prune history to keep max 100 entries
    await prune_history()

    return result

# --- Import Postman ---
@app.post("/api/import-postman", dependencies=[Depends(verify_api_key)])
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
        await col_storage.add(new_col)
        return new_col
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid Postman collection: {str(e)}")

# --- WebSocket Proxy Endpoint ---
@app.websocket("/ws/{client_id}")
async def websocket_proxy(websocket: WebSocket, client_id: str):
    await ws_manager.connect_client(client_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            # Expect a JSON with a "type" field: "connect", "send", "disconnect"
            msg_type = data.get("type")
            if msg_type == "connect":
                target_url = data.get("url")
                if target_url:
                    success = await ws_manager.connect_to_target(client_id, target_url)
                    await websocket.send_json({"type": "connect", "success": success})
                else:
                    await websocket.send_json({"type": "error", "msg": "Missing URL"})
            elif msg_type == "send":
                payload = data.get("payload")
                if payload is not None:
                    sent = await ws_manager.send_to_target(client_id, payload)
                    await websocket.send_json({"type": "send", "sent": sent})
                else:
                    await websocket.send_json({"type": "error", "msg": "Missing payload"})
            elif msg_type == "disconnect":
                await ws_manager.disconnect_from_target(client_id)
                await websocket.send_json({"type": "disconnect", "status": "ok"})
            else:
                await websocket.send_json({"type": "error", "msg": f"Unknown message type: {msg_type}"})
    except WebSocketDisconnect:
        ws_manager.disconnect_client(client_id)
        # Clean up any target connections as well
        await ws_manager.disconnect_from_target(client_id)

# --- GraphQL Execution Endpoint ---
@app.post("/api/execute-graphql", dependencies=[Depends(verify_api_key)])
async def execute_graphql(request: Request):
    # Expect JSON body: {"url": "...", "query": "...", "variables": {}}
    payload = await request.json()
    target_url = payload.get("url")
    query = payload.get("query")
    variables = payload.get("variables", {})
    if not target_url or not query:
        raise HTTPException(status_code=400, detail="'url' and 'query' are required")
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                target_url,
                json={"query": query, "variables": variables},
                headers={"Content-Type": "application/json"},
                timeout=30.0,
            )
            try:
                res_body = resp.json()
            except:
                res_body = resp.text
            return {
                "status_code": resp.status_code,
                "body": res_body,
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

# --- History routes ---
@app.get("/api/history", dependencies=[Depends(verify_api_key)])
async def get_history():
    storage = Storage("history.json", HistoryItem)
    return await storage.load_all()

@app.get("/api/history/{item_id}", dependencies=[Depends(verify_api_key)])
async def get_history_item(item_id: str):
    storage = Storage("history.json", HistoryItem)
    return await storage.get(item_id)

@app.delete("/api/history", dependencies=[Depends(verify_api_key)])
async def clear_history():
    storage = Storage("history.json", HistoryItem)
    await storage.clear()
    return {"status": "ok"}

# --- Folders CRUD ---
@app.get("/api/folders", dependencies=[Depends(verify_api_key)])
async def get_folders():
    storage = Storage("folders.json", Folder)
    return await storage.load_all()

@app.post("/api/folders", dependencies=[Depends(verify_api_key)])
async def create_folder(folder: Folder):
    storage = Storage("folders.json", Folder)
    await storage.add(folder)
    return folder

@app.delete("/api/folders/{folder_id}", dependencies=[Depends(verify_api_key)])
async def delete_folder(folder_id: str):
    storage = Storage("folders.json", Folder)
    await storage.delete(folder_id)
    return {"status": "ok"}

# --- Static Files ---
frontend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")

