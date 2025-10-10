#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build script for creating standalone executables
"""
import os
import sys
import shutil
import subprocess
from pathlib import Path

# Force UTF-8 encoding for Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


def run_command(cmd, cwd=None):
    """Run a command and print output"""
    print(f"Running: {' '.join(cmd)}")

    # On Windows, use shell=True for npm and pyinstaller commands
    if sys.platform == "win32" and cmd[0] in ["npm", "pyinstaller"]:
        result = subprocess.run(
            ' '.join(cmd),
            cwd=cwd,
            capture_output=True,
            text=True,
            shell=True,
            encoding='utf-8',
            errors='replace'
        )
    else:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace'
        )

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

    if not frontend_dir.exists():
        raise Exception(f"Frontend directory not found at {frontend_dir}")

    print(f"Frontend directory: {frontend_dir}")

    # Check if package.json exists
    package_json = frontend_dir / "package.json"
    if not package_json.exists():
        raise Exception(f"package.json not found at {package_json}")

    # Install dependencies
    run_command(["npm", "install"], cwd=frontend_dir)

    # Build
    run_command(["npm", "run", "build"], cwd=frontend_dir)

    # Verify build output
    dist_dir = frontend_dir / "dist"
    if not dist_dir.exists():
        raise Exception(f"Build output not found at {dist_dir}")

    print("[OK] Frontend build completed")


def build_executable():
    """Build the executable using PyInstaller"""
    print("\n=== Building Executable ===")

    # Run PyInstaller
    run_command([
        "pyinstaller",
        "--clean",
        "build.spec"
    ])

    print("[OK] Executable build completed")


def create_archive():
    """Create distribution archive"""
    print("\n=== Creating Distribution Archive ===")

    dist_dir = Path(__file__).parent / "dist"

    # Determine platform and create appropriate archive
    if sys.platform == "win32":
        # Windows: Single executable file
        exe_file = dist_dir / "jhl-github-desktop.exe"
        if not exe_file.exists():
            raise Exception(f"Build output not found at {exe_file}")

        archive_name = "jhl-github-desktop-windows"
        # Create a temporary directory for the archive
        temp_dir = dist_dir / "temp_windows"
        temp_dir.mkdir(exist_ok=True)
        shutil.copy(exe_file, temp_dir / "jhl-github-desktop.exe")

        # Create README
        readme = temp_dir / "README.txt"
        readme.write_text(
            "JHL GitHub Desktop - Windows\n\n"
            "Run jhl-github-desktop.exe to start the application.\n\n"
            "Author: JHL (declue)\n"
            "Repository: https://github.com/declue/jhl-github-desktop\n"
        )

        shutil.make_archive(
            str(dist_dir / archive_name),
            'zip',
            temp_dir
        )
        shutil.rmtree(temp_dir)
        print(f"[OK] Created {archive_name}.zip")

    elif sys.platform == "darwin":
        # macOS: .app bundle or single executable
        archive_name = "jhl-github-desktop-macos"
        app_bundle = dist_dir / "JHL GitHub Desktop.app"

        if app_bundle.exists():
            # Archive the .app bundle
            shutil.make_archive(
                str(dist_dir / archive_name),
                'zip',
                dist_dir,
                "JHL GitHub Desktop.app"
            )
        else:
            # Single executable
            exe_file = dist_dir / "jhl-github-desktop"
            if not exe_file.exists():
                raise Exception(f"Build output not found at {exe_file}")

            temp_dir = dist_dir / "temp_macos"
            temp_dir.mkdir(exist_ok=True)
            shutil.copy(exe_file, temp_dir / "jhl-github-desktop")

            readme = temp_dir / "README.txt"
            readme.write_text(
                "JHL GitHub Desktop - macOS\n\n"
                "Run ./jhl-github-desktop to start the application.\n"
                "You may need to: chmod +x jhl-github-desktop\n\n"
                "Author: JHL (declue)\n"
                "Repository: https://github.com/declue/jhl-github-desktop\n"
            )

            shutil.make_archive(
                str(dist_dir / archive_name),
                'zip',
                temp_dir
            )
            shutil.rmtree(temp_dir)

        print(f"[OK] Created {archive_name}.zip")

    else:  # Linux
        # Linux: Single executable
        exe_file = dist_dir / "jhl-github-desktop"
        if not exe_file.exists():
            raise Exception(f"Build output not found at {exe_file}")

        archive_name = "jhl-github-desktop-linux"
        temp_dir = dist_dir / "temp_linux"
        temp_dir.mkdir(exist_ok=True)
        shutil.copy(exe_file, temp_dir / "jhl-github-desktop")

        readme = temp_dir / "README.txt"
        readme.write_text(
            "JHL GitHub Desktop - Linux\n\n"
            "Run ./jhl-github-desktop to start the application.\n"
            "You may need to: chmod +x jhl-github-desktop\n\n"
            "Author: JHL (declue)\n"
            "Repository: https://github.com/declue/jhl-github-desktop\n"
        )

        shutil.make_archive(
            str(dist_dir / archive_name),
            'gztar',
            temp_dir
        )
        shutil.rmtree(temp_dir)
        print(f"[OK] Created {archive_name}.tar.gz")


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
        print("[SUCCESS] Build completed successfully!")
        print(f"Distribution files are in: {Path(__file__).parent / 'dist'}")

    except Exception as e:
        print(f"\n[ERROR] Build failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
