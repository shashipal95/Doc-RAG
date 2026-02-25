"""
Embeddings Service
Handles vector embedding generation for multiple providers
"""
from typing import List
from langsmith import traceable
import google.genai as genai
from google.genai import types
from openai import OpenAI

from app.core.config import get_settings

settings = get_settings()

# Initialize clients (lazy loading)
_gemini_client = None
_openai_client = None


def get_gemini_client():
    """Get or create Gemini client"""
    global _gemini_client
    if _gemini_client is None and settings.GEMINI_API_KEY:
        _gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _gemini_client


def get_openai_client():
    """Get or create OpenAI client"""
    global _openai_client
    if _openai_client is None and settings.OPENAI_API_KEY:
        _openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _openai_client


@traceable(run_type="embedding")
def get_embedding(text: str, provider: str) -> List[float]:
    """
    Generate embedding vector for text
    
    Args:
        text: Input text to embed
        provider: 'gemini' or 'openai'
        
    Returns:
        List of floats representing the embedding vector
    """
    # Clean text
    clean_text = text.encode("ascii", "ignore").decode("utf-8")

    if provider == "gemini":
        client = get_gemini_client()
        if not client:
            raise ValueError("Gemini API key not configured")

        result = client.models.embed_content(
            model="gemini-embedding-001",
            contents=clean_text,
            config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT"),
        )
        return result.embeddings[0].values

    elif provider == "openai":
        client = get_openai_client()
        if not client:
            raise ValueError("OpenAI API key not configured")

        response = client.embeddings.create(
            model="text-embedding-3-large",  # 3072 dimensions
            input=clean_text,
        )
        return response.data[0].embedding

    else:
        raise ValueError(f"Invalid embedding provider: {provider}")
