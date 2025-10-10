"""
JHL GitHub Desktop - FastAPI Server
"""
import sys
from pathlib import Path
from pyloid_adapter.base_adapter import BaseAdapter
from pyloid_adapter.context import PyloidContext

# Add backend to Python path
backend_path = Path(__file__).parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

# Import FastAPI app from our backend
from app.main import app

def start(host: str, port: int):
    """Start the FastAPI server"""
    import uvicorn
    uvicorn.run(app, host=host, port=port, log_level="info")

def setup_cors():
    """CORS is already configured in app.main"""
    pass

# Create adapter for Pyloid
adapter = BaseAdapter(start, setup_cors)
