# GitHub Actions Runner Monitor - Desktop Application

This is the desktop application version of GitHub Actions Runner Monitor, built with [Pyloid](https://github.com/pyloid/pyloid).

## Features

- 🖥️ **Standalone Desktop App**: No need for separate backend/frontend servers
- 📦 **Single Executable**: One file contains everything you need
- 🔒 **Local Storage**: Your GitHub token is stored locally and securely
- 🚀 **Fast**: Native performance with embedded backend
- 🌐 **Cross-Platform**: Available for Windows, macOS, and Linux

## Download

Download the latest release from the [Releases](https://github.com/declue/github-monitor/releases) page:

- **Windows**: `github-actions-runner-monitor-windows.zip`
- **macOS**: `github-actions-runner-monitor-macos.zip`
- **Linux**: `github-actions-runner-monitor-linux.tar.gz`

## Installation

### Windows
1. Download `github-actions-runner-monitor-windows.zip`
2. Extract the archive
3. Run `github-actions-runner-monitor.exe`

### macOS
1. Download `github-actions-runner-monitor-macos.zip`
2. Extract the archive
3. Run `GitHub Actions Runner Monitor.app` (or the executable inside)
4. If you see a security warning, right-click the app and select "Open"

### Linux
1. Download `github-actions-runner-monitor-linux.tar.gz`
2. Extract: `tar -xzf github-actions-runner-monitor-linux.tar.gz`
3. Run: `./github-actions-runner-monitor/github-actions-runner-monitor`

## Configuration

On first launch, you'll see the settings dialog:

1. **GitHub Token**: Create a personal access token at https://github.com/settings/tokens
   - Required scopes: `repo`, `workflow`, `read:org`
2. **Organizations**: Enter comma-separated list of organizations to monitor
   - Leave empty to monitor all accessible organizations
3. **GitHub API URL**: Default is `https://api.github.com`
   - Change only if using GitHub Enterprise

## Building from Source

### Prerequisites
- Python 3.11+
- Node.js 20+
- Git

### Steps

1. Clone the repository:
```bash
git clone https://github.com/declue/github-monitor.git
cd github-monitor
git checkout pyloid
```

2. Install Python dependencies:
```bash
pip install -r requirements-pyloid.txt
```

3. Build the application:
```bash
python build.py
```

The executable will be in the `dist/` directory.

## Development

### Running in Development Mode

1. Start the backend:
```bash
cd backend
uvicorn app.main:app --reload
```

2. Start the frontend:
```bash
cd frontend
npm install
npm run dev
```

3. Run the Pyloid app:
```bash
python pyloid_main.py
```

## Architecture

```
┌─────────────────────────────────────┐
│   Pyloid Window (Chromium-based)   │
│  ┌───────────────────────────────┐  │
│  │   Frontend (React + Vite)     │  │
│  │   ├── TreeView                │  │
│  │   ├── ListView                │  │
│  │   └── SearchFilter            │  │
│  └───────────────────────────────┘  │
│              ▼                       │
│  ┌───────────────────────────────┐  │
│  │   FastAPI Backend (Thread)    │  │
│  │   ├── GitHub API Client       │  │
│  │   ├── Rate Limit Manager      │  │
│  │   └── Data Aggregation        │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

## Technologies

- **Pyloid**: Desktop application framework
- **FastAPI**: Backend API framework
- **React**: Frontend UI framework
- **Material-UI**: UI component library
- **PyInstaller**: Packaging tool

## Troubleshooting

### App won't start
- Make sure you have the necessary permissions
- Check if port 8000 is available (backend uses this port internally)

### Can't connect to GitHub
- Verify your GitHub token is valid
- Check your internet connection
- Verify firewall settings

### macOS Security Warning
- Right-click the app and select "Open" instead of double-clicking
- Go to System Preferences → Security & Privacy → Allow the app

## License

MIT License - See LICENSE file for details

## Credits

Built with [Pyloid](https://github.com/pyloid/pyloid) and [Claude Code](https://claude.com/claude-code)
