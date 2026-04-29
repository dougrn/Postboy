import httpx
import re
import time
from typing import Dict, Any, List
from .models import RequestData, KeyValue, HistoryItem

class RequestEngine:
    def __init__(self, variables: Dict[str, str] = None):
        self.variables = variables or {}

    def _replace_vars(self, text: str) -> str:
        if not text:
            return text
        def replace(match):
            var_name = match.group(1)
            return self.variables.get(var_name, match.group(0))
        
        return re.sub(r"\{\{(.*?)\}\}", replace, text)

    async def execute(self, request_data: RequestData) -> Dict[str, Any]:
        url = self._replace_vars(request_data.url)
        method = request_data.method.upper()
        
        headers = {self._replace_vars(kv.key): self._replace_vars(kv.value) 
                   for kv in request_data.headers if kv.enabled}
        
        params = {self._replace_vars(kv.key): self._replace_vars(kv.value) 
                  for kv in request_data.params if kv.enabled}

        # Auth
        if request_data.auth_type == "bearer":
            token = self._replace_vars(request_data.auth_config.get("token", ""))
            headers["Authorization"] = f"Bearer {token}"
        elif request_data.auth_type == "basic":
            user = self._replace_vars(request_data.auth_config.get("username", ""))
            pwd = self._replace_vars(request_data.auth_config.get("password", ""))
            import base64
            auth_str = base64.b64encode(f"{user}:{pwd}".encode()).decode()
            headers["Authorization"] = f"Basic {auth_str}"

        body = None
        if request_data.body_type == "json" and request_data.body:
            import json
            try:
                if isinstance(request_data.body, str):
                    body = json.loads(self._replace_vars(request_data.body))
                else:
                    # If it's already a dict, we might need recursive replacement, but keep it simple for now
                    body = request_data.body
            except:
                body = request_data.body
        elif request_data.body_type == "text":
            body = self._replace_vars(request_data.body)

        start_time = time.time()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=headers,
                    params=params,
                    json=body if request_data.body_type == "json" else None,
                    content=body if request_data.body_type == "text" else None,
                )
                
                duration = round((time.time() - start_time) * 1000, 2)
                
                try:
                    res_body = response.json()
                except:
                    res_body = response.text

                return {
                    "status_code": response.status_code,
                    "status_text": response.reason_phrase,
                    "headers": dict(response.headers),
                    "body": res_body,
                    "time_ms": duration,
                    "size_bytes": len(response.content)
                }
            except Exception as e:
                return {
                    "error": str(e),
                    "status_code": 0,
                    "time_ms": round((time.time() - start_time) * 1000, 2)
                }
