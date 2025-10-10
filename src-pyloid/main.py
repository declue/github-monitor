"""
JHL GitHub Desktop - GitHub Actions Runner Monitor
Pyloid Desktop Application

Author: JHL (declue)
Repository: https://github.com/declue/jhl-github-desktop
"""
import os
import sys
from pathlib import Path
from pyloid import Pyloid, PyloidAPI, Bridge
from server import create_app, start_server

# Get base path for bundled app
if getattr(sys, 'frozen', False):
    BASE_PATH = Path(sys._MEIPASS)
else:
    BASE_PATH = Path(__file__).parent.parent

# Custom API for Pyloid window
class CustomAPI(PyloidAPI):
    @Bridge(result=str)
    def get_version(self):
        """Get application version"""
        sys.path.insert(0, str(BASE_PATH / "backend"))
        from app.version import __version__
        return __version__

def main():
    # Start FastAPI server in background
    start_server()

    # Create Pyloid app
    app = Pyloid(
        app_name="JHL GitHub Desktop",
        single_instance=True
    )

    # Create main window
    window = app.create_window(
        title="JHL GitHub Desktop - GitHub Actions Runner Monitor",
        js_apis=[CustomAPI()],
    )

    # Set window size
    window.set_size(1400, 900)
    window.set_position(100, 100)

    # Load the app (backend serves frontend)
    window.load_url("http://127.0.0.1:8000")
    window.show()
    window.focus()

    # Run the app
    app.run()

if __name__ == "__main__":
    main()
