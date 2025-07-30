from typing import List, Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    project_name: str = "E-commerce API"
    project_version: str = "1.0.0"
    
    database_url: str = "sqlite:///./test.db"
    secret_key: str = "test-secret-key-for-development-only"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    environment: str = "development"
    debug: bool = True
    
    allowed_hosts: List[str] = ["*"]
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:8080"]
    
    @field_validator("database_url")
    @classmethod
    def assemble_db_connection(cls, v: Optional[str]) -> str:
        if isinstance(v, str):
            return v
        raise ValueError("DATABASE_URL must be provided")

    model_config = {
        "env_file": ".env",
        "case_sensitive": False
    }


def get_settings() -> Settings:
    return Settings()

settings = get_settings()