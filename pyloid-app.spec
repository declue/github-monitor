# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['src-pyloid\\main.py'],
    pathex=[],
    binaries=[],
    datas=[('./src-pyloid/icons/', './src-pyloid/icons/'), ('./dist-front/', './dist-front/')],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['pytest', 'unittest', 'test', 'pydoc', 'tkinter', 'IPython', 'numpy', 'pandas', 'matplotlib'],
    noarchive=False,
    optimize=2,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [('O', None, 'OPTION'), ('O', None, 'OPTION')],
    name='pyloid-app',
    debug=False,
    bootloader_ignore_signals=False,
    strip=True,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['src-pyloid\\icons\\icon.ico'],
)
