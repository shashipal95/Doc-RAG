"""
Embeddings Service

Model compatibility matrix (google-genai SDK uses v1beta by default):
──────────────────────────────────────────────────────────────────────
Model                  │ API ver │ Dims │ Free quota
───────────────────────┼─────────┼──────┼─────────────────────────
gemini-embedding-001   │ v1beta  │ 3072 │ 1500 RPD free  ← USE THIS
text-embedding-004     │ v1 only │ 768  │ breaks with google-genai SDK
text-embedding-3-large │ OpenAI  │ 3072 │ paid only
"""
from typing import List
from langsmith import traceable
import google.genai as genai
from google.genai import types
from openai import OpenAI

from app.core.config import get_settings

settings = get_settings()

# ✅ gemini-embedding-001 works with v1beta (what google-genai SDK uses)
# ✅ 3072 dims — matches your existing Pinecone index, no recreation needed
GEMINI_EMBED_MODEL = "gemini-embedding-001"

_gemini_client = None
_openai_client = None


def get_gemini_client():
    global _gemini_client
    if _gemini_client is None and settings.GEMINI_API_KEY:
        _gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _gemini_client


def get_openai_client():
    global _openai_client
    if _openai_client is None and settings.OPENAI_API_KEY:
        _openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _openai_client


@traceable(run_type="embedding")
def get_embedding(text: str, provider: str) -> List[float]:
    """
    Generate embedding vector for text.
    Always use provider='gemini' unless you have paid OpenAI credits.
    """
    clean_text = text.encode("ascii", "ignore").decode("utf-8")

    if provider == "gemini":
        client = get_gemini_client()
        if not client:
            raise ValueError("Gemini API key not configured")

        try:
            result = client.models.embed_content(
                model=GEMINI_EMBED_MODEL,
                contents=clean_text,
                config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT"),
            )
            return result.embeddings[0].values
        except Exception as e:
            err = str(e)
            if "quota" in err.lower() or "429" in err:
                raise ValueError(
                    "Gemini embedding quota exceeded — wait a minute and retry."
                ) from e
            if "404" in err or "not found" in err.lower():
                raise ValueError(
                    f"Embedding model not found: {GEMINI_EMBED_MODEL}. "
                    "Check your google-genai SDK version."
                ) from e
            raise

    elif provider == "openai":
        client = get_openai_client()
        if not client:
            raise ValueError("OpenAI API key not configured")
        try:
            response = client.embeddings.create(
                model="text-embedding-3-large",
                input=clean_text,
            )
            return response.data[0].embedding
        except Exception as e:
            if "429" in str(e) or "quota" in str(e).lower() or "insufficient_quota" in str(e):
                raise ValueError(
                    "OpenAI quota exceeded. Add billing at platform.openai.com, "
                    "or switch the Embed dropdown to Gemini."
                ) from e
            raise

    else:
        raise ValueError(f"Invalid embedding provider: {provider}")