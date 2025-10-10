"""
JHL GitHub Desktop - GitHub Actions Runner Monitor
Pyloid Desktop Application

Author: JHL (declue)
Repository: https://github.com/declue/jhl-github-desktop
"""
import sys
import traceback

print("Starting JHL GitHub Desktop...")
print(f"Python version: {sys.version}")
print(f"Executable: {sys.executable}")

try:
    from pyloid.tray import TrayEvent
    from pyloid.utils import get_production_path, is_production
    from pyloid.serve import pyloid_serve
    from pyloid import Pyloid
    print("✓ Pyloid modules loaded")

    from server import adapter
    print("✓ Server adapter loaded")
except Exception as e:
    print(f"ERROR loading modules: {e}")
    traceback.print_exc()
    input("Press Enter to exit...")
    sys.exit(1)

print("\n=== Creating Pyloid App ===")
try:
    # Create Pyloid app with FastAPI server
    app = Pyloid(app_name="JHL GitHub Desktop", single_instance=True, server=adapter)
    print("✓ Pyloid app created")
except Exception as e:
    print(f"ERROR creating Pyloid app: {e}")
    traceback.print_exc()
    input("Press Enter to exit...")
    sys.exit(1)

# Set icons (will create these later)
# app.set_icon(get_production_path("src-pyloid/icons/icon.png"))
# app.set_tray_icon(get_production_path("src-pyloid/icons/icon.png"))

############################## Tray ################################
def on_double_click():
    app.show_and_focus_main_window()


app.set_tray_actions(
    {
        TrayEvent.DoubleClick: on_double_click,
    }
)
app.set_tray_menu_items(
    [
        {"label": "윈도우 표시", "callback": app.show_and_focus_main_window},
        {"label": "종료", "callback": app.quit},
    ]
)
####################################################################

print("\n=== Setting up Window ===")
try:
    if is_production():
        # Production: serve built frontend files
        print("Mode: Production")
        frontend_path = get_production_path("dist-front")
        print(f"Frontend path: {frontend_path}")
        url = pyloid_serve(directory=frontend_path)
        print(f"Serving at: {url}")
        window = app.create_window(
            title="JHL GitHub Desktop - GitHub Actions Runner Monitor",
        )
        window.load_url(url)
    else:
        # Development: use Vite dev server
        print("Mode: Development")
        window = app.create_window(
            title="JHL GitHub Desktop - GitHub Actions Runner Monitor (Dev)",
            dev_tools=True,
        )
        window.load_url("http://localhost:5173")

    # Set window size
    window.set_size(1400, 900)
    window.set_position(100, 100)
    print("✓ Window configured")

    window.show_and_focus()
    print("✓ Window shown")

    print("\n=== Running App ===")
    app.run()
except Exception as e:
    print(f"ERROR during execution: {e}")
    traceback.print_exc()
    input("Press Enter to exit...")
    sys.exit(1)
