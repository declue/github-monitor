@echo off
chcp 65001 >nul
set PYTHONUTF8=1
set PYTHONIOENCODING=utf-8
uv run -p .venv ./src-pyloid/build/build.py
