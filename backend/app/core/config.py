"""
Application Configuration
Centralized settings management using Pydantic
"""
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    """Application settings"""

    # ═══════════════════════════════════════════════════════════════
    # API Keys
    # ═══════════════════════════════════════════════════════════════
    GEMINI_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    PINECONE_API_KEY: str  # Required

    # ═══════════════════════════════════════════════════════════════
    # Pinecone
    # ═══════════════════════════════════════════════════════════════
    PINECONE_INDEX_NAME: str = "gemini-rag2"
    PINECONE_DIMENSION: int = 3072
    PINECONE_METRIC: str = "cosine"
    PINECONE_CLOUD: str = "aws"
    PINECONE_REGION: str = "us-east-1"

    # ═══════════════════════════════════════════════════════════════
    # Supabase (Authentication)
    # ═══════════════════════════════════════════════════════════════
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_JWT_SECRET: str

    # ═══════════════════════════════════════════════════════════════
    # LangSmith (Optional Tracing)
    # ═══════════════════════════════════════════════════════════════
    LANGCHAIN_TRACING_V2: bool = False
    LANGCHAIN_ENDPOINT: Optional[str] = None
    LANGCHAIN_API_KEY: Optional[str] = None
    LANGCHAIN_PROJECT: Optional[str] = None

    # ═══════════════════════════════════════════════════════════════
    # Ollama (Optional)
    # ═══════════════════════════════════════════════════════════════
    OLLAMA_BASE_URL: str = "http://localhost:11434"

    GOOGLE_API_KEY: str = ""
    GOOGLE_CX: str = ""

    # ═══════════════════════════════════════════════════════════════
    # Pexels (Image Search)
    # ═══════════════════════════════════════════════════════════════
    PEXELS_API_KEY: str = ""

    # ═══════════════════════════════════════════════════════════════
    # Tavily (Web Search — fallback when no docs uploaded)
    # ═══════════════════════════════════════════════════════════════
    TAVILY_API_KEY: str = ""

    # ═══════════════════════════════════════════════════════════════
    # Application Settings
    # ═══════════════════════════════════════════════════════════════
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200
    DEFAULT_TOP_K: int = 3

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Ignore extra fields in .env


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance (singleton pattern)"""
    return Settings()