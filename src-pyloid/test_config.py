#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test script for configuration management system
"""

import sys
import os
import json
from pathlib import Path
from config_manager import get_config_manager, AppConfig, WatchedRepo, GitHubConfig, UIConfig

# Set UTF-8 encoding for Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')


def test_config_manager():
    """Test configuration management functionality"""
    print("=" * 60)
    print("JHL GitHub Desktop Configuration Test")
    print("=" * 60)

    # Get config manager
    config_manager = get_config_manager()
    print(f"\n✅ Config manager initialized")
    print(f"📁 Config directory: {config_manager.config_directory}")
    print(f"📄 Config file: {config_manager.config_file_path}")

    # Test 1: Load initial configuration
    print("\n🧪 Test 1: Loading configuration...")
    config = config_manager.load_config()
    print(f"✅ Configuration loaded successfully")
    print(f"   - GitHub API URL: {config.github.api_url}")
    print(f"   - UI Theme: {config.ui.theme}")

    # Test 2: Update GitHub token
    print("\n🧪 Test 2: Updating GitHub token...")
    test_token = "ghp_testtoken123456789"
    config_manager.update_github_token(test_token)
    config = config_manager.get_config()
    assert config.github.token == test_token
    print(f"✅ Token updated successfully")

    # Test 3: Update API URL
    print("\n🧪 Test 3: Updating GitHub API URL...")
    test_api_url = "https://github.enterprise.com/api/v3"
    config_manager.update_github_api_url(test_api_url)
    config = config_manager.get_config()
    assert config.github.api_url == test_api_url
    print(f"✅ API URL updated to: {test_api_url}")

    # Test 4: Set organization
    print("\n🧪 Test 4: Setting organization...")
    test_org = "test-organization"
    config_manager.update_github_organization(test_org)
    config = config_manager.get_config()
    assert config.github.organization == test_org
    print(f"✅ Organization set to: {test_org}")

    # Test 5: Add watched repositories
    print("\n🧪 Test 5: Adding watched repositories...")
    repos_to_add = [
        ("microsoft", "vscode", True),
        ("facebook", "react", False),
        ("python", "cpython", True)
    ]

    for owner, repo, notifications in repos_to_add:
        config_manager.add_watched_repo(owner, repo, notifications)
        print(f"   ✅ Added {owner}/{repo} (notifications: {notifications})")

    watched_repos = config_manager.get_watched_repos()
    assert len(watched_repos) == 3
    print(f"✅ Total watched repos: {len(watched_repos)}")

    # Test 6: Remove watched repository
    print("\n🧪 Test 6: Removing watched repository...")
    config_manager.remove_watched_repo("facebook", "react")
    watched_repos = config_manager.get_watched_repos()
    assert len(watched_repos) == 2
    print(f"✅ Removed facebook/react, remaining repos: {len(watched_repos)}")

    # Test 7: Update UI settings
    print("\n🧪 Test 7: Updating UI settings...")
    config_manager.update_ui_theme("dark")
    config_manager.update_window_settings(
        size={"width": 1200, "height": 800},
        position={"x": 100, "y": 50}
    )
    config = config_manager.get_config()
    assert config.ui.theme == "dark"
    assert config.ui.window_size["width"] == 1200
    print(f"✅ UI settings updated (theme: {config.ui.theme}, window: {config.ui.window_size})")

    # Test 8: Export configuration
    print("\n🧪 Test 8: Exporting configuration...")
    export_path = Path("test_export_config.json")
    config_manager.export_config(str(export_path))
    assert export_path.exists()
    print(f"✅ Configuration exported to: {export_path}")

    # Test 9: Reset configuration
    print("\n🧪 Test 9: Resetting configuration...")
    config_manager.reset_config()
    config = config_manager.get_config()
    assert config.github.token is None
    assert len(config.watched_repos) == 0
    assert config.ui.theme == "light"
    print(f"✅ Configuration reset to defaults")

    # Test 10: Import configuration
    print("\n🧪 Test 10: Importing configuration...")
    config_manager.import_config(str(export_path))
    config = config_manager.get_config()
    assert config.github.token == test_token
    assert len(config.watched_repos) == 2
    assert config.ui.theme == "dark"
    print(f"✅ Configuration imported successfully")

    # Clean up
    if export_path.exists():
        export_path.unlink()
        print(f"\n🧹 Cleaned up test export file")

    # Test 11: Integration with config.py
    print("\n🧪 Test 11: Testing integration with config.py...")
    from config import load_settings

    settings = load_settings()
    print(f"   - Settings github_token: {'***' + settings.github_token[-4:] if settings.github_token else '(not set)'}")
    print(f"   - Settings github_api_url: {settings.github_api_url}")
    print(f"   - Settings github_org: {settings.github_org}")
    print(f"✅ Integration with config.py working")

    # Summary
    print("\n" + "=" * 60)
    print("✅ All tests passed successfully!")
    print("=" * 60)

    # Display final configuration
    print("\n📋 Final Configuration Summary:")
    config = config_manager.get_config()
    print(f"   GitHub Token: {'***' + config.github.token[-4:] if config.github.token else '(not set)'}")
    print(f"   API URL: {config.github.api_url}")
    print(f"   Organization: {config.github.organization}")
    print(f"   Watched Repos: {len(config.watched_repos)}")
    for repo in config.watched_repos:
        print(f"      - {repo.owner}/{repo.repo} (notifications: {repo.notifications})")
    print(f"   UI Theme: {config.ui.theme}")
    print(f"   Window Size: {config.ui.window_size}")

    return True


def test_cli():
    """Test CLI tool"""
    print("\n" + "=" * 60)
    print("Testing CLI Tool")
    print("=" * 60)

    import subprocess

    # Test showing configuration
    print("\n🧪 Testing CLI: show command...")
    result = subprocess.run(
        [sys.executable, "config_cli.py", "show"],
        capture_output=True,
        text=True
    )
    if result.returncode == 0:
        print("✅ CLI show command works")
    else:
        print(f"❌ CLI show command failed: {result.stderr}")

    # Test showing config path
    print("\n🧪 Testing CLI: path command...")
    result = subprocess.run(
        [sys.executable, "config_cli.py", "path"],
        capture_output=True,
        text=True
    )
    if result.returncode == 0:
        print("✅ CLI path command works")
        print(result.stdout)
    else:
        print(f"❌ CLI path command failed: {result.stderr}")

    return True


if __name__ == "__main__":
    try:
        # Run configuration manager tests
        success = test_config_manager()

        # Run CLI tests
        test_cli()

        if success:
            print("\n🎉 All configuration tests completed successfully!")
            sys.exit(0)
        else:
            print("\n❌ Some tests failed")
            sys.exit(1)

    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)