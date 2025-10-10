#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Runtime hook for Pyloid to fix DLL loading in onefile mode

This hook ensures that the temporary extraction directory is properly
added to the DLL search path before Pyloid/Qt libraries are loaded.
"""
import os
import sys

# Get the temporary extraction directory (_MEIPASS)
if hasattr(sys, '_MEIPASS'):
    # We're running in a PyInstaller bundle
    bundle_dir = sys._MEIPASS

    # Add the bundle directory to PATH at the beginning
    # This ensures bundled DLLs are found first
    os.environ['PATH'] = bundle_dir + os.pathsep + os.environ.get('PATH', '')

    # For Windows, also add DLL search path
    if sys.platform == 'win32':
        try:
            # Add DLL directory (Python 3.8+)
            os.add_dll_directory(bundle_dir)
        except (AttributeError, OSError):
            # Fallback for older Python or if it fails
            pass

        # Set Qt plugin path
        os.environ['QT_PLUGIN_PATH'] = os.path.join(bundle_dir, 'PyQt5', 'Qt5', 'plugins')
        os.environ['QT_QPA_PLATFORM_PLUGIN_PATH'] = os.path.join(bundle_dir, 'PyQt5', 'Qt5', 'plugins', 'platforms')

    print(f"[Runtime Hook] Bundle directory: {bundle_dir}")
    print(f"[Runtime Hook] PATH updated: {os.environ['PATH'][:200]}...")
