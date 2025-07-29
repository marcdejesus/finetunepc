from typing import List, Optional
from pydantic import BaseSettings, PostgresDsn, validator


class Settings(BaseSettings):
    project_name: str = "E-commerce API"
    project_version: str = "1.0.0"
    
    database_url: PostgresDsn
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    environment: str = "development"
    debug: bool = True
    
    allowed_hosts: List[str] = ["*"]
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:8080"]
    
    @validator("database_url", pre=True)
    def assemble_db_connection(cls, v: Optional[str]) -> str:
        if isinstance(v, str):
            return v
        raise ValueError("DATABASE_URL must be provided")

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()