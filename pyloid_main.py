"""
JHL GitHub Desktop - GitHub Actions Runner Monitor
Pyloid Desktop Application

Author: JHL (declue)
Repository: https://github.com/declue/github-monitor
"""
from pyloid import Pyloid, PyloidAPI, Bridge
import sys
import os
import asyncio
import uvicorn
from threading import Thread

# Add backend to path
backend_path = os.path.join(os.path.dirname(__file__), 'backend')
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.main import app as fastapi_app

class AppAPI(PyloidAPI):
    """Custom API for the application"""

    @Bridge(str, result=str)
    def get_app_version(self):
        """Get application version"""
        from app.version import __version__
        return __version__

def run_backend():
    """Run FastAPI backend in a separate thread"""
    uvicorn.run(fastapi_app, host="127.0.0.1", port=8000, log_level="info")

def main():
    # Start backend server in a separate thread
    backend_thread = Thread(target=run_backend, daemon=True)
    backend_thread.start()

    # Create Pyloid app
    app = Pyloid(app_name="JHL GitHub Desktop")

    # Set window properties
    window = app.create_window(
        title="JHL GitHub Desktop - GitHub Actions Runner Monitor",
        width=1400,
        height=900,
        dev_tools=False
    )

    # Load the frontend
    # In production, load from bundled frontend files
    frontend_path = os.path.join(os.path.dirname(__file__), "frontend", "dist", "index.html")

    if os.path.exists(frontend_path):
        window.load_file(frontend_path)
    else:
        # Fallback to development server
        window.load_url("http://localhost:5173")

    # Register custom API
    window.set_api(AppAPI())

    # Run the app
    app.run()

if __name__ == "__main__":
    main()
