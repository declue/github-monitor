# -*- mode: python ; coding: utf-8 -*-

import os
import sys
from PyInstaller.utils.hooks import collect_data_files, collect_submodules, collect_all

block_cipher = None

# Collect all hiddenimports
hiddenimports = []

# Pyloid dependencies
datas_pyloid, binaries_pyloid, hiddenimports_pyloid = collect_all('pyloid')
hiddenimports += hiddenimports_pyloid

# FastAPI and Uvicorn
for module in ['uvicorn', 'fastapi', 'starlette', 'pydantic', 'pydantic_settings', 'httpx']:
    try:
        _, _, hidden = collect_all(module)
        hiddenimports += hidden
    except:
        pass

# Additional required modules
hiddenimports += [
    'anyio',
    'sniffio',
    'email_validator',
    'python_multipart',
]

# Collect all app modules
hiddenimports.extend(collect_submodules('app'))

# Exclude unnecessary modules to reduce size
excludes = [
    'matplotlib',
    'PIL',
    'numpy',
    'pandas',
    'scipy',
    'pytest',
    'test',
    'unittest',
    'setuptools',
    'pip',
    'wheel',
    'distutils',
]

# Data files to include
datas = [
    ('frontend/dist', 'frontend/dist'),
    ('backend/app', 'app'),
]

# Add Pyloid data files
datas += datas_pyloid

# Determine icon file based on platform
icon_file = None
if sys.platform == 'win32':
    # Windows needs .ico file - will be created if available
    if os.path.exists('assets/icon.ico'):
        icon_file = 'assets/icon.ico'
elif sys.platform == 'darwin':
    # macOS needs .icns file - will be created if available
    if os.path.exists('assets/icon.icns'):
        icon_file = 'assets/icon.icns'
# Linux doesn't need icon file for PyInstaller

a = Analysis(
    ['src-pyloid/main.py'],
    pathex=[],
    binaries=binaries_pyloid,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=['runtime_hook_pyloid.py'],  # Add runtime hook for DLL path fixing
    excludes=excludes,
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='jhl-github-desktop',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # Set to False for GUI app
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=icon_file,  # Platform-specific icon or None
)

# For macOS app bundle
if sys.platform == 'darwin':
    # Use .icns icon if available, otherwise None
    bundle_icon = 'assets/icon.icns' if os.path.exists('assets/icon.icns') else None

    app = BUNDLE(
        exe,
        name='JHL GitHub Desktop.app',
        icon=bundle_icon,
        bundle_identifier='com.jhl.github.desktop',
        info_plist={
            'NSHighResolutionCapable': 'True',
            'LSBackgroundOnly': 'False',
            'CFBundleShortVersionString': '0.0.3',
            'CFBundleVersion': '0.0.3',
            'NSHumanReadableCopyright': 'Copyright © 2025 JHL (declue). All rights reserved.',
        },
    )
