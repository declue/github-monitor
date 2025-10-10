"""
JHL GitHub Desktop - GitHub Actions Runner Monitor
Pyloid Desktop Application

Author: JHL (declue)
Repository: https://github.com/declue/jhl-github-desktop
"""
from pyloid.tray import TrayEvent
from pyloid.utils import get_production_path, is_production
from pyloid.serve import pyloid_serve
from pyloid import Pyloid
from server import adapter

# Create Pyloid app with FastAPI server
app = Pyloid(app_name="JHL GitHub Desktop", single_instance=True, server=adapter)

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

if is_production():
    # Production: serve built frontend files
    url = pyloid_serve(directory=get_production_path("dist-front"))
    window = app.create_window(
        title="JHL GitHub Desktop - GitHub Actions Runner Monitor",
    )
    window.load_url(url)
else:
    # Development: use Vite dev server
    window = app.create_window(
        title="JHL GitHub Desktop - GitHub Actions Runner Monitor (Dev)",
        dev_tools=True,
    )
    window.load_url("http://localhost:5173")

# Set window size
window.set_size(1400, 900)
window.set_position(100, 100)
window.show_and_focus()

app.run()
