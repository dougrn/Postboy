import httpx
import re
import time
import uuid
import random
import string
import hashlib
import base64
from typing import Dict, Any, List
from .models import RequestData, KeyValue, HistoryItem

class RequestEngine:
    def __init__(self, variables: Dict[str, str] = None):
        self.variables = variables or {}
        self._init_dynamic_vars()

    def _init_dynamic_vars(self):
        """Initialize dynamic variable generators (Postman-style)"""
        self.dynamic_generators = {
            'guid': lambda: str(uuid.uuid4()),
            'randomUUID': lambda: str(uuid.uuid4()),
            'timestamp': lambda: str(int(time.time())),
            'randomInt': lambda: str(random.randint(0, 10000)),
            'randomNumber': lambda: str(random.random()),
            'isoTimestamp': lambda: time.strftime('%Y-%m-%dT%H:%M:%S.000Z'),
            'isoDate': lambda: time.strftime('%Y-%m-%d'),
            'randomEmail': lambda: f"user{random.randint(1,9999)}@example.com",
            'randomFirstName': lambda: random.choice(['John', 'Jane', 'Mike', 'Sarah', 'David']),
            'randomLastName': lambda: random.choice(['Doe', 'Smith', 'Johnson', 'Brown', 'Wilson']),
            'randomPassword': lambda: ''.join(random.choices(string.ascii_letters + string.digits, k=12)),
            'randomColor': lambda: '#{:06x}'.format(random.randint(0, 0xFFFFFF)),
            'randomBoolean': lambda: str(random.choice([True, False])),
            'randomPhone': lambda: f"+1{random.randint(2000000000, 9999999999)}",
            'randomIP': lambda: f"{random.randint(1,255)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(0,255)}",
            'randomMAC': lambda: ':'.join([f'{random.randint(0,255):02x}' for _ in range(6)]),
            'randomCity': lambda: random.choice(['New York', 'London', 'Paris', 'Tokyo', 'Berlin']),
            'randomCountry': lambda: random.choice(['USA', 'UK', 'France', 'Japan', 'Germany']),
            'randomStreet': lambda: random.choice(['Main St', 'Oak Ave', 'Maple Rd', 'First Blvd', 'Second St']),
            'randomZipcode': lambda: str(random.randint(10000, 99999)),
            'randomUsername': lambda: f"user{random.randint(1,9999)}",
            'randomDomain': lambda: random.choice(['example.com', 'test.com', 'demo.org', 'sample.net']),
            'randomUrl': lambda: f"https://www.{self.dynamic_generators['randomDomain']()}",
            'md5': lambda: hashlib.md5(str(time.time()).encode()).hexdigest(),
            'sha256': lambda: hashlib.sha256(str(time.time()).encode()).hexdigest(),
            'base64': lambda: base64.b64encode(str(time.time()).encode()).decode(),
        }

    def _replace_vars(self, text: str) -> str:
        if not text:
            return text
        def replace(match):
            var_name = match.group(1).strip()
            # Check if it's a dynamic variable
            if var_name in self.dynamic_generators:
                return self.dynamic_generators[var_name]()
            # Check if it's a user variable
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
        files = None
        data = None

        if request_data.body_type == "json" and request_data.body:
            import json
            try:
                if isinstance(request_data.body, str):
                    body = json.loads(self._replace_vars(request_data.body))
                else:
                    body = request_data.body
            except json.JSONDecodeError as e:
                import logging
                logging.warning(f"Failed to parse JSON body: {e}")
                body = request_data.body
        elif request_data.body_type == "text":
            body = self._replace_vars(request_data.body)
        elif request_data.body_type == "form-data":
            # Handle multipart/form-data
            if isinstance(request_data.body, dict):
                data = {}
                files = {}
                for key, value in request_data.body.items():
                    if isinstance(value, dict) and value.get('type') == 'file':
                        # File upload placeholder - frontend should send base64 or file path
                        files[key] = value.get('content', '')
                    else:
                        data[key] = self._replace_vars(str(value))

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
                    data=data if request_data.body_type == "form-data" else None,
                    files=files if request_data.body_type == "form-data" else None,
                )

                duration = round((time.time() - start_time) * 1000, 2)

                try:
                    res_body = response.json()
                except:
                    import logging
                    logging.info("Response is not JSON, falling back to text")
                    res_body = response.text

                return {
                    "status_code": response.status_code,
                    "status_text": response.reason_phrase,
                    "headers": dict(response.headers),
                    "body": res_body,
                    "time_ms": duration,
                    "size_bytes": len(response.content)
                }
            except httpx.TimeoutException as e:
                return {
                    "error": f"Request timeout: {str(e)}",
                    "status_code": 0,
                    "time_ms": round((time.time() - start_time) * 1000, 2)
                }
            except httpx.ConnectError as e:
                return {
                    "error": f"Connection error: {str(e)}",
                    "status_code": 0,
                    "time_ms": round((time.time() - start_time) * 1000, 2)
                }
            except Exception as e:
                return {
                    "error": str(e),
                    "status_code": 0,
                    "time_ms": round((time.time() - start_time) * 1000, 2)
                }
