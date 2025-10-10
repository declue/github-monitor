#!/usr/bin/env python3
"""
Build script for creating standalone executables
"""
import os
import sys
import shutil
import subprocess
from pathlib import Path


def run_command(cmd, cwd=None):
    """Run a command and print output"""
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    if result.returncode != 0:
        raise Exception(f"Command failed with return code {result.returncode}")
    return result


def build_frontend():
    """Build the frontend"""
    print("\n=== Building Frontend ===")
    frontend_dir = Path(__file__).parent / "frontend"

    # Install dependencies
    run_command(["npm", "install"], cwd=frontend_dir)

    # Build
    run_command(["npm", "run", "build"], cwd=frontend_dir)

    print("✓ Frontend build completed")


def build_executable():
    """Build the executable using PyInstaller"""
    print("\n=== Building Executable ===")

    # Run PyInstaller
    run_command([
        "pyinstaller",
        "--clean",
        "build.spec"
    ])

    print("✓ Executable build completed")


def create_archive():
    """Create distribution archive"""
    print("\n=== Creating Distribution Archive ===")

    dist_dir = Path(__file__).parent / "dist"
    app_dir = dist_dir / "jhl-github-desktop"

    if not app_dir.exists():
        raise Exception(f"Build output not found at {app_dir}")

    # Determine platform and create appropriate archive
    if sys.platform == "win32":
        archive_name = "jhl-github-desktop-windows"
        shutil.make_archive(
            str(dist_dir / archive_name),
            'zip',
            app_dir
        )
        print(f"✓ Created {archive_name}.zip")
    elif sys.platform == "darwin":
        archive_name = "jhl-github-desktop-macos"
        # For macOS, look for .app bundle
        app_bundle = dist_dir / "JHL GitHub Desktop.app"
        if app_bundle.exists():
            shutil.make_archive(
                str(dist_dir / archive_name),
                'zip',
                dist_dir,
                "JHL GitHub Desktop.app"
            )
        else:
            shutil.make_archive(
                str(dist_dir / archive_name),
                'zip',
                app_dir
            )
        print(f"✓ Created {archive_name}.zip")
    else:  # Linux
        archive_name = "jhl-github-desktop-linux"
        shutil.make_archive(
            str(dist_dir / archive_name),
            'gztar',
            app_dir
        )
        print(f"✓ Created {archive_name}.tar.gz")


def main():
    """Main build process"""
    print("JHL GitHub Desktop - Build Script")
    print("=" * 50)
    print("Author: JHL (declue)")
    print("=" * 50)

    try:
        # Build frontend
        build_frontend()

        # Build executable
        build_executable()

        # Create distribution archive
        create_archive()

        print("\n" + "=" * 50)
        print("✓ Build completed successfully!")
        print(f"Distribution files are in: {Path(__file__).parent / 'dist'}")

    except Exception as e:
        print(f"\n✗ Build failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
