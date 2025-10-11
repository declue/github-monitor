#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
CLI tool for managing JHL GitHub Desktop configuration
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Optional
from config_manager import get_config_manager
import getpass

# Set UTF-8 encoding for Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')


def main():
    parser = argparse.ArgumentParser(
        description="JHL GitHub Desktop Configuration Manager"
    )

    subparsers = parser.add_subparsers(dest='command', help='Commands')

    # Show configuration
    show_parser = subparsers.add_parser('show', help='Show current configuration')
    show_parser.add_argument(
        '--section',
        choices=['all', 'github', 'repos', 'ui'],
        default='all',
        help='Configuration section to display'
    )

    # Set GitHub token
    token_parser = subparsers.add_parser('set-token', help='Set GitHub personal access token')
    token_parser.add_argument(
        '--token',
        help='GitHub token (will prompt if not provided)',
        default=None
    )

    # Set API URL
    api_parser = subparsers.add_parser('set-api-url', help='Set GitHub API URL')
    api_parser.add_argument('url', help='GitHub API URL (e.g., https://api.github.com)')

    # Set organization
    org_parser = subparsers.add_parser('set-org', help='Set default GitHub organization')
    org_parser.add_argument('organization', help='Organization name')

    # Add watched repo
    add_repo_parser = subparsers.add_parser('add-repo', help='Add repository to watch list')
    add_repo_parser.add_argument('owner', help='Repository owner')
    add_repo_parser.add_argument('repo', help='Repository name')
    add_repo_parser.add_argument(
        '--no-notifications',
        action='store_true',
        help='Disable notifications for this repository'
    )

    # Remove watched repo
    remove_repo_parser = subparsers.add_parser('remove-repo', help='Remove repository from watch list')
    remove_repo_parser.add_argument('owner', help='Repository owner')
    remove_repo_parser.add_argument('repo', help='Repository name')

    # List watched repos
    subparsers.add_parser('list-repos', help='List watched repositories')

    # Set theme
    theme_parser = subparsers.add_parser('set-theme', help='Set UI theme')
    theme_parser.add_argument('theme', choices=['light', 'dark'], help='Theme name')

    # Reset configuration
    subparsers.add_parser('reset', help='Reset configuration to defaults')

    # Export configuration
    export_parser = subparsers.add_parser('export', help='Export configuration to file')
    export_parser.add_argument('file', help='Output file path')

    # Import configuration
    import_parser = subparsers.add_parser('import', help='Import configuration from file')
    import_parser.add_argument('file', help='Input file path')

    # Show config path
    subparsers.add_parser('path', help='Show configuration file path')

    # Clear token (security feature)
    subparsers.add_parser('clear-token', help='Clear stored GitHub token')

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    config_manager = get_config_manager()

    try:
        if args.command == 'show':
            show_config(config_manager, args.section)

        elif args.command == 'set-token':
            if args.token:
                token = args.token
            else:
                token = getpass.getpass("Enter GitHub Personal Access Token: ")

            if token:
                config_manager.update_github_token(token)
                print("✅ GitHub token updated successfully")
                print("🔒 Token stored securely in:", config_manager.config_file_path)
            else:
                print("❌ No token provided")

        elif args.command == 'clear-token':
            config_manager.update_github_token(None)
            print("✅ GitHub token cleared")

        elif args.command == 'set-api-url':
            config_manager.update_github_api_url(args.url)
            print(f"✅ API URL set to: {args.url}")

        elif args.command == 'set-org':
            config_manager.update_github_organization(args.organization)
            print(f"✅ Default organization set to: {args.organization}")

        elif args.command == 'add-repo':
            notifications = not args.no_notifications
            config_manager.add_watched_repo(args.owner, args.repo, notifications)
            status = "with" if notifications else "without"
            print(f"✅ Added {args.owner}/{args.repo} to watch list {status} notifications")

        elif args.command == 'remove-repo':
            config_manager.remove_watched_repo(args.owner, args.repo)
            print(f"✅ Removed {args.owner}/{args.repo} from watch list")

        elif args.command == 'list-repos':
            repos = config_manager.get_watched_repos()
            if repos:
                print("\n📚 Watched Repositories:")
                print("-" * 40)
                for repo in repos:
                    notif_icon = "🔔" if repo.notifications else "🔕"
                    print(f"  {notif_icon} {repo.owner}/{repo.repo}")
            else:
                print("No repositories in watch list")

        elif args.command == 'set-theme':
            config_manager.update_ui_theme(args.theme)
            print(f"✅ Theme set to: {args.theme}")

        elif args.command == 'reset':
            response = input("⚠️  Are you sure you want to reset all configuration? (yes/no): ")
            if response.lower() == 'yes':
                config_manager.reset_config()
                print("✅ Configuration reset to defaults")
            else:
                print("Reset cancelled")

        elif args.command == 'export':
            export_path = Path(args.file).resolve()
            config_manager.export_config(str(export_path))
            print(f"✅ Configuration exported to: {export_path}")

        elif args.command == 'import':
            import_path = Path(args.file).resolve()
            if not import_path.exists():
                print(f"❌ File not found: {import_path}")
                sys.exit(1)
            config_manager.import_config(str(import_path))
            print(f"✅ Configuration imported from: {import_path}")

        elif args.command == 'path':
            print("\n📁 Configuration Paths:")
            print("-" * 40)
            print(f"Config Directory: {config_manager.config_directory}")
            print(f"Config File:      {config_manager.config_file_path}")

            if config_manager.config_file_path.exists():
                print(f"Status:           ✅ Exists")
                stat = config_manager.config_file_path.stat()
                print(f"Size:             {stat.st_size} bytes")
            else:
                print(f"Status:           ⚠️  Not yet created")

    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)


def show_config(config_manager, section: str):
    """Display configuration"""
    config = config_manager.get_config()

    if section in ['all', 'github']:
        print("\n🔧 GitHub Configuration:")
        print("-" * 40)
        token_display = "***" + config.github.token[-4:] if config.github.token else "(not set)"
        print(f"  Token:        {token_display}")
        print(f"  API URL:      {config.github.api_url}")
        print(f"  Organization: {config.github.organization or '(not set)'}")

    if section in ['all', 'repos']:
        print("\n📚 Watched Repositories:")
        print("-" * 40)
        if config.watched_repos:
            for repo in config.watched_repos:
                notif_icon = "🔔" if repo.notifications else "🔕"
                print(f"  {notif_icon} {repo.owner}/{repo.repo}")
        else:
            print("  (none)")

    if section in ['all', 'ui']:
        print("\n🎨 UI Configuration:")
        print("-" * 40)
        print(f"  Theme:    {config.ui.theme}")
        print(f"  Language: {config.ui.language}")

        if config.ui.window_size:
            print(f"  Window:   {config.ui.window_size.get('width')}x{config.ui.window_size.get('height')}")

        if config.ui.window_position:
            print(f"  Position: ({config.ui.window_position.get('x')}, {config.ui.window_position.get('y')})")

    print()


if __name__ == "__main__":
    main()