from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    github_token: Optional[str] = None
    github_org: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'
        # Allow extra fields and don't validate .env existence
        extra = 'ignore'


# Only try to load .env if it exists
# Try both possible .env locations
env_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(env_path):
    settings = Settings(_env_file=env_path)
elif os.path.exists('.env'):
    settings = Settings(_env_file='.env')
else:
    settings = Settings()
