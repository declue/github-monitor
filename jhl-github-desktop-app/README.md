# JHL GitHub Desktop

GitHub Actions Runner Monitor - Desktop Application

**Author:** JHL (declue)
**Repository:** https://github.com/declue/jhl-github-desktop

This project was created using the Pyloid framework.

## Prerequisites

- Python 3.9 or higher
- Node.js 20 or higher
- uv package manager

## Getting Started

### Initial Setup

To install the required libraries, run the following command:

```bash
npm run setup
```

### Development Mode

To run the desktop application in development mode:

```bash
npm run dev
```

### Build

To build the application:

```bash
npm run build
```

## Features

- ✅ GitHub Organizations 및 Repositories 트리 뷰
- ✅ Workflows, Runs, Runners 실시간 모니터링
- ✅ Branches, Pull Requests, Issues 확인
- ✅ API Rate Limit 표시
- ✅ 검색 및 필터링
- ✅ 여러 GitHub 토큰 및 Enterprise 지원
- ✅ 한글 UI

## Technology Stack

- **Frontend:** React 18 + TypeScript + Material-UI + Vite
- **Backend:** FastAPI + Python 3.9+
- **Desktop:** Pyloid (Electron for Python) + PySide6

## Project Structure

```
jhl-github-desktop-app/
├── src/                    # React frontend source
├── src-pyloid/             # Pyloid Python source
│   ├── main.py            # App entry point
│   ├── server.py          # FastAPI adapter
│   └── build/             # Build scripts
├── backend/                # FastAPI backend
│   └── app/               # GitHub API client
├── dist-front/             # Frontend build output
└── dist/                   # Executable output
```

## Configuration

### GitHub Token

```bash
export GITHUB_TOKEN=ghp_...
export GITHUB_ORG=your-org  # Optional
```

Or configure via Settings dialog in the app.

## License

MIT

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
