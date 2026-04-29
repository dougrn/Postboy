# Architecture Specification - Postboy

## Overview
Postboy is a local-first API client built with a decoupled architecture between a FastAPI backend and a Vanilla JS frontend.

## Tech Stack
- **Backend**: Python 3.10+, FastAPI, Uvicorn, HTTPX.
- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript (ES6+).
- **Storage**: Flat-file JSON storage in `/data` directory.

## Project Structure
```text
/Postboy
├── /backend          # Python logic
│   ├── app.py        # API Routes
│   ├── engine.py     # Request execution engine
│   ├── models.py     # Pydantic data models
│   └── storage.py    # JSON persistence logic
├── /frontend         # Web interface
│   ├── index.html    # Layout base
│   ├── styles.css    # Premium styling (Dark/Glass)
│   └── script.js     # SPA Logic & UI management
├── /data             # Local JSON storage (auto-created)
├── /specs            # Technical documentation
└── main.py           # Application entry point
```

## Communication Flow
1. **Request**: Frontend collects UI state -> Sends JSON to `/api/execute`.
2. **Variable Processing**: Backend loads active environment -> Replaces `{{var}}` with values.
3. **Execution**: `httpx` performs the HTTP call.
4. **Persistence**: Successful calls are logged to `history.json`.
5. **Response**: Formatted JSON/Text is returned to frontend for rendering.
