from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    github_token: str
    github_org: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
