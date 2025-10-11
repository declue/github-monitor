from pyloid.tray import (
    TrayEvent,
)
from pyloid.utils import (
    get_production_path,
    is_production,
)
from pyloid.serve import pyloid_serve
from pyloid import Pyloid
from server import adapter
from config_manager import get_config_manager

app = Pyloid(app_name="JHL GitHub Desktop", single_instance=True, server=adapter)

app.set_icon(get_production_path("src-pyloid/icons/icon.png"))
app.set_tray_icon(get_production_path("src-pyloid/icons/icon.png"))

# Get saved window size or use default
config_manager = get_config_manager()
config = config_manager.get_config()

# Default window size
default_width = 1600
default_height = 900

# Use saved size if available, otherwise use default
if config.ui.window_size:
    window_width = config.ui.window_size.get('width', default_width)
    window_height = config.ui.window_size.get('height', default_height)
else:
    window_width = default_width
    window_height = default_height

print(f"Window size: {window_width}x{window_height}")

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
        {"label": "Show Window", "callback": app.show_and_focus_main_window},
        {"label": "Exit", "callback": app.quit},
    ]
)
####################################################################

if is_production():
    url = pyloid_serve(directory=get_production_path("dist-front"))
    window = app.create_window(
        title="JHL GitHub Desktop - Production",
        width=window_width,
        height=window_height,
    )
    window.load_url(url)
else:
    window = app.create_window(
        title="JHL GitHub Desktop - Dev",
        dev_tools=True,
        width=window_width,
        height=window_height,
    )
    window.load_url("http://localhost:5173")

# TODO: Add window size saving on close
# Pyloid doesn't support set_close_callback yet
# Window size will be saved manually through settings dialog

window.show_and_focus()

app.run()