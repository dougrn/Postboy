# Data Models - Postboy

## Storage Format (JSON)

### collections.json
```json
[
  {
    "id": "uuid",
    "name": "Collection Name",
    "items": [
      {
        "id": "uuid",
        "name": "Request Name",
        "method": "GET",
        "url": "https://...",
        "headers": [{"key": "X", "value": "Y", "enabled": true}],
        "params": [],
        "body_type": "json",
        "body": "{}",
        "auth_type": "none",
        "auth_config": {},
        "pre_script": "",
        "post_script": ""
      }
    ]
  }
]
```

### environments.json
```json
[
  {
    "id": "uuid",
    "name": "Dev",
    "variables": [
      {"key": "base_url", "value": "http://localhost:8000", "enabled": true}
    ]
  }
]
```

### folders.json
```json
[
  {
    "id": "uuid",
    "name": "Folder Name",
    "collection_id": "uuid",
    "parent_id": null,
    "items": []
  }
]
```

### history.json
```json
[
  {
    "id": "uuid",
    "timestamp": "2026-05-01T12:00:00.000Z",
    "request": {
      "name": "Request Name",
      "method": "GET",
      "url": "https://...",
      "headers": [],
      "params": [],
      "body_type": "none",
      "body": null
    },
    "response": {
      "status_code": 200,
      "status_text": "OK",
      "time_ms": 150,
      "size_bytes": 1024,
      "body": {...},
      "headers": {}
    }
  }
]
```

## Backend Pydantic Models (Python)
- `KeyValue`: Basic structure for Params/Headers.
- `RequestData`: Core request configuration (includes `pre_script`, `post_script`).
- `Collection`: Container for requests.
- `Environment`: Container for variables.
- `Folder`: Hierarchical folder structure for collections.
- `HistoryItem`: Request/response history entry.
- `ResponseData`: Structure for returned execution results.

## WebSocket Protocol
```json
// Client -> Backend
{"type": "connect", "url": "ws://target-server"}
{"type": "send", "payload": "message"}
{"type": "disconnect"}

// Backend -> Client
{"type": "connect", "success": true}
{"type": "send", "sent": true}
{"type": "message", "data": "response"}
{"type": "status", "data": "disconnected"}
```