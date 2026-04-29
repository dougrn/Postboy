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
        "auth_config": {}
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

## Backend Pydantic Models (Python)
- `KeyValue`: Basic structure for Params/Headers.
- `RequestData`: Core request configuration.
- `Collection`: Container for requests.
- `Environment`: Container for variables.
- `ResponseData`: Structure for returned execution results.
