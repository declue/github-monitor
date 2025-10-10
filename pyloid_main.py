"""
JHL GitHub Desktop - GitHub Actions Runner Monitor
Pyloid Desktop Application

Author: JHL (declue)
Repository: https://github.com/declue/github-monitor
"""
from pyloid import Pyloid
import sys
import os
import time
import socket
from contextlib import contextmanager
import uvicorn
from threading import Thread

# Add backend to path
backend_path = os.path.join(os.path.dirname(__file__), 'backend')
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.main import app as fastapi_app

# Backend server configuration
HOST = "127.0.0.1"
PORT = 8000

def run_backend():
    """Run FastAPI backend in a separate thread"""
    uvicorn.run(
        fastapi_app,
        host=HOST,
        port=PORT,
        log_level="info",
        access_log=False  # Reduce console noise
    )

@contextmanager
def wait_for_server(host=HOST, port=PORT, timeout=30):
    """Wait for the backend server to start"""
    start_time = time.time()
    while True:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                if sock.connect_ex((host, port)) == 0:
                    break
        except:
            pass

        if time.time() - start_time > timeout:
            raise TimeoutError(f"Backend server at {host}:{port} did not start within {timeout} seconds")
        time.sleep(0.1)
    yield

def main():
    # Start backend server in a separate thread
    backend_thread = Thread(target=run_backend, daemon=True)
    backend_thread.start()

    # Create Pyloid app
    app = Pyloid(app_name="JHL GitHub Desktop", single_instance=True)

    # Create window
    window = app.create_window(
        title="JHL GitHub Desktop - GitHub Actions Runner Monitor",
    )

    # Set window size
    window.set_size(1400, 900)

    # Wait for backend to be ready, then load the app
    with wait_for_server():
        # Load the backend URL
        window.load_url(f"http://{HOST}:{PORT}")
        window.show_and_focus()

    # Run the app
    app.run()

if __name__ == "__main__":
    main()
