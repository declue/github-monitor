# -*- mode: python ; coding: utf-8 -*-

import os
import sys
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

block_cipher = None

# Collect all FastAPI and related dependencies
hiddenimports = [
    'uvicorn',
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    'fastapi',
    'httpx',
    'pydantic',
    'starlette',
    'pyloid',
]

# Collect all app modules
hiddenimports.extend(collect_submodules('app'))

# Data files to include
datas = [
    ('frontend/dist', 'frontend/dist'),
    ('backend/app', 'app'),
]

# Add any additional data files from dependencies
datas += collect_data_files('pyloid')

a = Analysis(
    ['pyloid_main.py'],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='jhl-github-desktop',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,  # Set to False for GUI app
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='assets/icon.svg',  # Icon file
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='jhl-github-desktop',
)

# For macOS app bundle
if sys.platform == 'darwin':
    app = BUNDLE(
        coll,
        name='JHL GitHub Desktop.app',
        icon='assets/icon.svg',
        bundle_identifier='com.jhl.github.desktop',
        info_plist={
            'NSHighResolutionCapable': 'True',
            'LSBackgroundOnly': 'False',
            'CFBundleShortVersionString': '0.0.1',
            'CFBundleVersion': '0.0.1',
            'NSHumanReadableCopyright': 'Copyright © 2025 JHL (declue). All rights reserved.',
        },
    )
