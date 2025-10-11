"""
Configuration manager for JHL GitHub Desktop
Manages user settings in ~/.config/jhl-github-desktop/
"""

import json
import os
from pathlib import Path
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
import platform


class GitHubConfig(BaseModel):
    """GitHub API configuration"""
    token: Optional[str] = None
    api_url: str = "https://api.github.com"
    organization: Optional[str] = None


class WatchedRepo(BaseModel):
    """Watched repository configuration"""
    owner: str
    repo: str
    notifications: bool = True
    last_checked: Optional[str] = None


class UIConfig(BaseModel):
    """UI configuration"""
    theme: str = "light"
    language: str = "en"
    window_size: Optional[Dict[str, int]] = None
    window_position: Optional[Dict[str, int]] = None


class EnabledRepo(BaseModel):
    """Enabled repository configuration"""
    node_id: str  # The node ID from TreeView (e.g., "org-microsoft", "repo-microsoft-vscode")
    enabled: bool = True

class AppConfig(BaseModel):
    """Main application configuration"""
    github: GitHubConfig = Field(default_factory=GitHubConfig)
    watched_repos: List[WatchedRepo] = Field(default_factory=list)
    enabled_repos: List[EnabledRepo] = Field(default_factory=list)  # Stores which repos are enabled/disabled in TreeView
    ui: UIConfig = Field(default_factory=UIConfig)
    auto_refresh_interval: int = 300  # seconds
    notifications_refresh_interval: int = 15  # seconds for notifications background refresh
    max_repos_per_org: int = 100


class ConfigManager:
    """Manages application configuration in user's home directory"""

    def __init__(self, app_name: str = "jhl-github-desktop"):
        """Initialize configuration manager

        Args:
            app_name: Application name for config directory
        """
        self.app_name = app_name
        self._config_dir = self._get_config_directory()
        self._config_file = self._config_dir / "config.json"
        self._ensure_config_directory()
        self._config: Optional[AppConfig] = None

    def _get_config_directory(self) -> Path:
        """Get the configuration directory path based on the OS"""
        system = platform.system()

        if system == "Windows":
            # Windows: Use %APPDATA%
            app_data = os.environ.get('APPDATA')
            if app_data:
                return Path(app_data) / self.app_name
            else:
                # Fallback to user home
                return Path.home() / ".config" / self.app_name
        elif system == "Darwin":
            # macOS: Use ~/Library/Application Support
            return Path.home() / "Library" / "Application Support" / self.app_name
        else:
            # Linux and others: Use ~/.config
            config_home = os.environ.get('XDG_CONFIG_HOME')
            if config_home:
                return Path(config_home) / self.app_name
            else:
                return Path.home() / ".config" / self.app_name

    def _ensure_config_directory(self):
        """Ensure the configuration directory exists"""
        self._config_dir.mkdir(parents=True, exist_ok=True)

    def load_config(self) -> AppConfig:
        """Load configuration from file or create default

        Returns:
            AppConfig: Loaded or default configuration
        """
        if self._config_file.exists():
            try:
                with open(self._config_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self._config = AppConfig(**data)
            except (json.JSONDecodeError, Exception) as e:
                print(f"Error loading config: {e}, using default configuration")
                self._config = AppConfig()
        else:
            # Create default configuration
            self._config = AppConfig()
            self.save_config()

        return self._config

    def save_config(self):
        """Save current configuration to file"""
        if not self._config:
            self._config = AppConfig()

        try:
            # Ensure directory exists before writing
            self._ensure_config_directory()

            # Try to write the config file
            with open(self._config_file, 'w', encoding='utf-8') as f:
                json.dump(self._config.model_dump(), f, indent=2, ensure_ascii=False)

            print(f"Configuration saved successfully to {self._config_file}")
        except PermissionError as e:
            print(f"Permission denied when writing to {self._config_file}: {e}")
            raise RuntimeError(f"No write permission for config file: {self._config_file}") from e
        except OSError as e:
            print(f"OS error when writing to {self._config_file}: {e}")
            raise RuntimeError(f"Failed to write config file: {self._config_file}") from e
        except Exception as e:
            print(f"Unexpected error when saving config: {type(e).__name__}: {e}")
            raise

    def get_config(self) -> AppConfig:
        """Get current configuration

        Returns:
            AppConfig: Current configuration
        """
        if not self._config:
            self._config = self.load_config()
        return self._config

    def update_github_token(self, token: str):
        """Update GitHub token

        Args:
            token: GitHub personal access token
        """
        config = self.get_config()
        config.github.token = token
        self.save_config()

    def update_github_api_url(self, api_url: str):
        """Update GitHub API URL (for GitHub Enterprise)

        Args:
            api_url: GitHub API URL
        """
        config = self.get_config()
        config.github.api_url = api_url
        self.save_config()

    def update_github_organization(self, organization: Optional[str]):
        """Update default GitHub organization

        Args:
            organization: Organization name or None
        """
        config = self.get_config()
        config.github.organization = organization
        self.save_config()

    def add_watched_repo(self, owner: str, repo: str, notifications: bool = True):
        """Add a repository to watch list

        Args:
            owner: Repository owner
            repo: Repository name
            notifications: Enable notifications for this repo
        """
        config = self.get_config()

        # Check if already exists
        for watched in config.watched_repos:
            if watched.owner == owner and watched.repo == repo:
                watched.notifications = notifications
                self.save_config()
                return

        # Add new
        config.watched_repos.append(
            WatchedRepo(owner=owner, repo=repo, notifications=notifications)
        )
        self.save_config()

    def remove_watched_repo(self, owner: str, repo: str):
        """Remove a repository from watch list

        Args:
            owner: Repository owner
            repo: Repository name
        """
        config = self.get_config()
        config.watched_repos = [
            r for r in config.watched_repos
            if not (r.owner == owner and r.repo == repo)
        ]
        self.save_config()

    def get_watched_repos(self) -> List[WatchedRepo]:
        """Get list of watched repositories

        Returns:
            List[WatchedRepo]: List of watched repositories
        """
        config = self.get_config()
        return config.watched_repos

    def update_enabled_repos(self, enabled_repos: List[Dict[str, Any]]):
        """Update the enabled/disabled state of repositories in TreeView

        Args:
            enabled_repos: List of dicts with node_id and enabled status
        """
        config = self.get_config()
        config.enabled_repos = [
            EnabledRepo(node_id=repo['node_id'], enabled=repo['enabled'])
            for repo in enabled_repos
        ]
        self.save_config()

    def get_enabled_repos(self) -> List[EnabledRepo]:
        """Get list of enabled/disabled repositories

        Returns:
            List[EnabledRepo]: List of repository enable states
        """
        config = self.get_config()
        return config.enabled_repos

    def update_ui_theme(self, theme: str):
        """Update UI theme

        Args:
            theme: Theme name (e.g., 'light', 'dark')
        """
        config = self.get_config()
        config.ui.theme = theme
        self.save_config()

    def update_window_settings(self, size: Optional[Dict[str, int]] = None,
                              position: Optional[Dict[str, int]] = None):
        """Update window size and position

        Args:
            size: Window size {'width': int, 'height': int}
            position: Window position {'x': int, 'y': int}
        """
        config = self.get_config()
        if size:
            config.ui.window_size = size
        if position:
            config.ui.window_position = position
        self.save_config()

    def reset_config(self):
        """Reset configuration to defaults"""
        self._config = AppConfig()
        self.save_config()

    def export_config(self, export_path: str):
        """Export configuration to a file

        Args:
            export_path: Path to export configuration
        """
        config = self.get_config()
        with open(export_path, 'w', encoding='utf-8') as f:
            json.dump(config.model_dump(), f, indent=2, ensure_ascii=False)

    def import_config(self, import_path: str):
        """Import configuration from a file

        Args:
            import_path: Path to import configuration from
        """
        with open(import_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            self._config = AppConfig(**data)
            self.save_config()

    @property
    def config_file_path(self) -> Path:
        """Get the configuration file path

        Returns:
            Path: Configuration file path
        """
        return self._config_file

    @property
    def config_directory(self) -> Path:
        """Get the configuration directory path

        Returns:
            Path: Configuration directory path
        """
        return self._config_dir


# Singleton instance
_config_manager: Optional[ConfigManager] = None


def get_config_manager() -> ConfigManager:
    """Get or create the singleton ConfigManager instance

    Returns:
        ConfigManager: The configuration manager instance
    """
    global _config_manager
    if _config_manager is None:
        _config_manager = ConfigManager()
    return _config_manager