from pydantic_settings import BaseSettings
from typing import Optional
import os
from config_manager import get_config_manager


class Settings(BaseSettings):
    github_token: Optional[str] = None
    github_org: str = ""
    github_api_url: str = "https://api.github.com"

    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'
        # Allow extra fields and don't validate .env existence
        extra = 'ignore'


def load_settings() -> Settings:
    """Load settings from both config file and environment variables

    Priority order:
    1. Environment variables (highest priority)
    2. User config file (~/.config/jhl-github-desktop/config.json)
    3. .env file in project directory
    4. Defaults (lowest priority)
    """
    # First, try to load from .env file
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_path):
        env_settings = Settings(_env_file=env_path)
    elif os.path.exists('.env'):
        env_settings = Settings(_env_file='.env')
    else:
        env_settings = Settings()

    # Load from config manager (user's home directory)
    config_manager = get_config_manager()
    app_config = config_manager.load_config()

    # Merge settings - environment variables take precedence
    final_token = os.environ.get('GITHUB_TOKEN') or env_settings.github_token or app_config.github.token
    final_org = os.environ.get('GITHUB_ORG') or env_settings.github_org or app_config.github.organization or ""
    final_api_url = os.environ.get('GITHUB_API_URL') or app_config.github.api_url

    return Settings(
        github_token=final_token,
        github_org=final_org,
        github_api_url=final_api_url
    )


# Load settings on module import
settings = load_settings()
