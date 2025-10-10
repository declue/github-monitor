"""
FastAPI server management for Pyloid app
"""
import sys
import time
import socket
import threading
from pathlib import Path

# Add backend to path
BASE_PATH = Path(__file__).parent.parent
backend_path = BASE_PATH / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

# FastAPI server configuration
HOST = "127.0.0.1"
PORT = 8000

def create_app():
    """Import and return the FastAPI app"""
    from app.main import app
    return app

def wait_for_server(host=HOST, port=PORT, timeout=30):
    """Wait for the server to start"""
    start_time = time.time()
    while True:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                if sock.connect_ex((host, port)) == 0:
                    return True
        except:
            pass

        if time.time() - start_time > timeout:
            return False
        time.sleep(0.1)

def run_server():
    """Run the FastAPI server"""
    import uvicorn
    app = create_app()
    uvicorn.run(
        app,
        host=HOST,
        port=PORT,
        log_level="info",
        access_log=False
    )

def start_server():
    """Start the server in a background thread"""
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()

    # Wait for server to be ready
    if not wait_for_server():
        raise RuntimeError(f"Backend server failed to start on {HOST}:{PORT}")

    print(f"✓ Backend server started on http://{HOST}:{PORT}")
