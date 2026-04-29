import uvicorn
import os
import sys

# Add current directory to path so we can import backend
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    print("Postboy esta decolando...")
    print("Acesse em: http://localhost:8000")
    uvicorn.run("backend.app:app", host="127.0.0.1", port=8000, reload=True)
