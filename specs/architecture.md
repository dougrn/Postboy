# Architecture Specification - Postboy

## Overview
Postboy is a local-first API client built with a decoupled architecture between a FastAPI backend and a Vanilla JS frontend.

## Tech Stack
- **Backend**: Python 3.10+, FastAPI, Uvicorn, HTTPX, WebSockets.
- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript (ES6+).
- **Storage**: Flat-file JSON storage in `/data` directory.
- **Code Editor**: Monaco Editor (via CDN).
- **JSON Viewer**: jsoneditor (via CDN).

## Project Structure
```text
/Postboy
├── /backend          # Python logic
│   ├── app.py        # API Routes (HTTP + WebSocket + GraphQL)
│   ├── engine.py     # Request execution engine
│   ├── models.py     # Pydantic data models
│   ├── storage.py    # JSON persistence logic
│   └── ws_engine.py  # WebSocket manager for proxy connections
├── /frontend         # Web interface
│   ├── index.html    # Layout base with Glassmorphism UI
│   ├── styles.css    # Premium styling (Dark/Glass)
│   └── script.js     # SPA Logic & UI management
├── /data             # Local JSON storage (auto-created)
├── /specs            # Technical documentation
└── main.py           # Application entry point
```

## Communication Flow
1. **Request**: Frontend collects UI state -> Sends JSON to `/api/execute`.
2. **Variable Processing**: Backend loads active environment -> Replaces `{{var}}` with values.
3. **Pre-request Scripts**: Sandboxed JS execution before request is fired.
4. **Execution**: `httpx` performs the HTTP call (or WebSocket/GraphQL proxy).
5. **Persistence**: Successful calls are logged to `history.json`.
6. **Post-request Scripts**: Validation logic executed against response.
7. **Response**: Formatted JSON/Text is returned to frontend for rendering.

## New Features Architecture

### WebSocket Proxy
- Frontend connects to `/ws/{client_id}` via WebSocket.
- Backend acts as intermediary, connecting to target WebSocket servers.
- Messages are forwarded bidirectionally between client and target.

### GraphQL Execution
- Frontend sends `{url, query, variables}` to `/api/execute-graphql`.
- Backend proxies request to target GraphQL endpoint via `httpx`.
- Response returned as-is from target server.

### File Uploads (Multipart)
- Frontend reads files via `FileReader.readAsDataURL()` (Base64).
- Files encoded as `{type: 'file', content: 'data:...'}` in form-data body.
- Backend forwards to `httpx` as multipart/form-data with files.

### Code Editor (Monaco)
- Editor initialized on `#body-editor` div container.
- Syncs with hidden `#body-content` textarea.
- Language detection based on body type (json, text, etc.).

### Tab Persistence
- Active tab saved to `localStorage` on change.
- Keyboard shortcuts (Ctrl+1 to Ctrl+7) for quick navigation.