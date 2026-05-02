import json
import logging
import asyncio
from typing import Dict, Any, Optional
import websockets
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.client_connections: Dict[str, websockets.WebSocketClientProtocol] = {}

    async def connect_client(self, client_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect_client(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]

    async def connect_to_target(self, client_id: str, url: str) -> bool:
        try:
            target_ws = await websockets.connect(url)
            self.client_connections[client_id] = target_ws
            
            # Start a background task to read from target and send to client
            asyncio.create_task(self._forward_from_target(client_id))
            return True
        except Exception as e:
            logger.error(f"WebSocket connection error to {url}: {e}")
            if client_id in self.active_connections:
                await self.active_connections[client_id].send_json({
                    "type": "error",
                    "data": f"Connection error: {str(e)}"
                })
            return False

    async def disconnect_from_target(self, client_id: str):
        if client_id in self.client_connections:
            try:
                await self.client_connections[client_id].close()
            except Exception:
                pass
            del self.client_connections[client_id]

    async def send_to_target(self, client_id: str, message: str):
        if client_id in self.client_connections:
            try:
                await self.client_connections[client_id].send(message)
                return True
            except Exception as e:
                logger.error(f"Error sending WebSocket message: {e}")
                return False
        return False

    async def _forward_from_target(self, client_id: str):
        target_ws = self.client_connections.get(client_id)
        client_ws = self.active_connections.get(client_id)
        
        if not target_ws or not client_ws:
            return
            
        try:
            async for message in target_ws:
                if client_id in self.active_connections:
                    await self.active_connections[client_id].send_json({
                        "type": "message",
                        "data": message
                    })
        except websockets.exceptions.ConnectionClosed:
            if client_id in self.active_connections:
                await self.active_connections[client_id].send_json({
                    "type": "status",
                    "data": "disconnected"
                })
        except Exception as e:
            logger.error(f"WebSocket forwarding error: {e}")
        finally:
            await self.disconnect_from_target(client_id)

ws_manager = WebSocketManager()
