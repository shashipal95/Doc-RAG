"""
LLM Service
Streaming generation with multiple LLM providers + vision (multimodal) support.

Free-tier model map
───────────────────
Provider │ Text model                              │ Vision model
─────────┼─────────────────────────────────────────┼──────────────────────────────────────
Groq     │ llama-3.3-70b-versatile                 │ meta-llama/llama-4-scout-17b-16e-instruct
Gemini   │ gemini-1.5-flash  (15 RPM free)         │ gemini-1.5-flash  (same)
OpenAI   │ gpt-4o-mini       (paid)                │ gpt-4o            (paid)
Ollama   │ tinyllama:latest  (local/free)           │ llava:latest      (local/free)
"""
import asyncio
import base64
import json
import re
import requests
from typing import AsyncGenerator
from groq import Groq, RateLimitError as GroqRateLimitError
from openai import OpenAI
import google.genai as genai
from google.genai import types as genai_types
from google.api_core.exceptions import ResourceExhausted

from app.core.config import get_settings

settings = get_settings()

# ── Free-tier model names ──────────────────────────────────────────────────────
GEMINI_TEXT_MODEL   = "gemini-2.5-flash"          # 15 RPM · 1 500 RPD free
GEMINI_VISION_MODEL = "gemini-2.5-flash"           # same model, supports multimodal
GROQ_TEXT_MODEL     = "llama-3.3-70b-versatile"   # free, 6 000 tokens/min
GROQ_VISION_MODEL   = "meta-llama/llama-4-scout-17b-16e-instruct"  # free vision on Groq

# ── Lazy-loaded clients ────────────────────────────────────────────────────────
_gemini_client = None
_groq_client   = None
_openai_client = None


def get_gemini_client():
    global _gemini_client
    if _gemini_client is None and settings.GEMINI_API_KEY:
        _gemini_client = genai.Client(
            api_key=settings.GEMINI_API_KEY,
            http_options={"api_version": "v1"},
        )
    return _gemini_client


def get_groq_client():
    global _groq_client
    if _groq_client is None and settings.GROQ_API_KEY:
        _groq_client = Groq(api_key=settings.GROQ_API_KEY)
    return _groq_client


def get_openai_client():
    global _openai_client
    if _openai_client is None and settings.OPENAI_API_KEY:
        _openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _openai_client


# ── Helpers ────────────────────────────────────────────────────────────────────

def sanitize_output(text: str) -> str:
    """Strip chain-of-thought tags that some models leak."""
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL)
    return text.replace("<think>", "").replace("</think>", "")


def _rate_limit_message(retry_after=None) -> str:
    wait = f"{int(retry_after)}s" if retry_after else "~30s"
    return (
        f"⚠️ Free-tier rate limit reached. "
        f"The model will be available again in {wait}. "
        f"Please try again shortly, or switch to **Groq** (fastest free option)."
    )


# ══════════════════════════════════════════════════════════════════════════════
# Vision (Multimodal) Streaming
# ══════════════════════════════════════════════════════════════════════════════

async def generate_vision_stream(
    image_bytes: bytes,
    mime_type: str,
    question: str,
    provider: str,
) -> AsyncGenerator[str, None]:
    """
    Stream a vision response for an uploaded image.

    Groq   -> llama-4-scout (free, native vision via base64 URL)
    Gemini -> gemini-1.5-flash (free tier, 15 RPM)
    OpenAI -> gpt-4o  (paid)
    Ollama -> llava   (local/free)
    """

    # ── Groq vision (FREE) ─────────────────────────────────────────────────────
    if provider == "groq":
        client = get_groq_client()
        if not client:
            yield "Groq API key is not configured."
            return

        b64 = base64.b64encode(image_bytes).decode()
        data_url = f"data:{mime_type};base64,{b64}"

        try:
            stream = client.chat.completions.create(
                model=GROQ_VISION_MODEL,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "image_url", "image_url": {"url": data_url}},
                            {"type": "text", "text": question},
                        ],
                    }
                ],
                stream=True,
                max_tokens=1024,
            )
            for chunk in stream:
                text = chunk.choices[0].delta.content
                if text:
                    yield sanitize_output(text)
                await asyncio.sleep(0)

        except GroqRateLimitError as e:
            retry_after = getattr(e, "retry_after", None)
            yield _rate_limit_message(retry_after)

        except Exception as e:
            yield f"Groq vision error: {e}"

    # ── Gemini vision (FREE tier -- gemini-1.5-flash) ─────────────────────────
    elif provider == "gemini":
        client = get_gemini_client()
        if not client:
            yield "Gemini API key is not configured."
            return

        image_part = genai_types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
        text_part  = genai_types.Part.from_text(text=question)

        try:
            stream = client.models.generate_content_stream(
                model=GEMINI_VISION_MODEL,
                contents=[image_part, text_part],
            )
            for chunk in stream:
                text = getattr(chunk, "text", None)
                if text:
                    yield sanitize_output(text)
                await asyncio.sleep(0)

        except ResourceExhausted as e:
            retry_after = None
            try:
                details = e.details() if callable(e.details) else []
                for d in details:
                    if hasattr(d, "retry_delay"):
                        retry_after = d.retry_delay.seconds
                        break
            except Exception:
                pass
            yield _rate_limit_message(retry_after)

        except Exception as e:
            yield f"Gemini vision error: {e}"

    # ── OpenAI vision (paid -- gpt-4o) ────────────────────────────────────────
    elif provider == "openai":
        client = get_openai_client()
        if not client:
            yield "OpenAI API key is not configured."
            return

        b64 = base64.b64encode(image_bytes).decode()
        try:
            stream = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{b64}"}},
                            {"type": "text", "text": question},
                        ],
                    }
                ],
                stream=True,
            )
            for chunk in stream:
                text = chunk.choices[0].delta.content
                if text:
                    yield sanitize_output(text)
                await asyncio.sleep(0)
        except Exception as e:
            yield f"OpenAI vision error: {e}"

    # ── Ollama vision (local / free -- llava) ─────────────────────────────────
    elif provider == "ollama":
        b64 = base64.b64encode(image_bytes).decode()
        try:
            response = requests.post(
                f"{settings.OLLAMA_BASE_URL}/api/generate",
                json={"model": "llava:latest", "prompt": question, "images": [b64], "stream": True},
                stream=True,
                timeout=60,
            )
            for line in response.iter_lines():
                if line:
                    data = json.loads(line.decode("utf-8"))
                    if "response" in data:
                        yield sanitize_output(data["response"])
                await asyncio.sleep(0)
        except Exception as e:
            yield f"Ollama vision error: {e}"

    else:
        yield "Image analysis is not supported for the selected provider."


# ══════════════════════════════════════════════════════════════════════════════
# Text Streaming
# ══════════════════════════════════════════════════════════════════════════════

async def generate_stream(
    prompt: str,
    provider: str,
) -> AsyncGenerator[str, None]:
    """Stream a text response from the selected LLM provider."""

    # ── Gemini (FREE -- gemini-1.5-flash) ─────────────────────────────────────
    if provider == "gemini":
        client = get_gemini_client()
        if not client:
            yield "Gemini API key is not configured."
            return

        try:
            stream = client.models.generate_content_stream(
                model=GEMINI_TEXT_MODEL,
                contents=prompt,
            )
            for chunk in stream:
                text = getattr(chunk, "text", None)
                if text:
                    yield sanitize_output(text)
                await asyncio.sleep(0)

        except ResourceExhausted as e:
            retry_after = None
            try:
                details = e.details() if callable(e.details) else []
                for d in details:
                    if hasattr(d, "retry_delay"):
                        retry_after = d.retry_delay.seconds
                        break
            except Exception:
                pass
            yield _rate_limit_message(retry_after)

        except Exception as e:
            yield f"Gemini error: {e}"

    # ── Groq (FREE -- llama-3.3-70b-versatile) ────────────────────────────────
    elif provider == "groq":
        client = get_groq_client()
        if not client:
            yield "Groq API key is not configured."
            return

        try:
            stream = client.chat.completions.create(
                model=GROQ_TEXT_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a helpful assistant. "
                            "Never include <think> tags. "
                            "Return only the final answer."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                stream=True,
            )
            for chunk in stream:
                text = chunk.choices[0].delta.content
                if text:
                    yield sanitize_output(text)
                await asyncio.sleep(0)

        except GroqRateLimitError as e:
            retry_after = getattr(e, "retry_after", None)
            yield _rate_limit_message(retry_after)

        except Exception as e:
            yield f"Groq error: {e}"

    # ── OpenAI (paid -- gpt-4o-mini) ──────────────────────────────────────────
    elif provider == "openai":
        client = get_openai_client()
        if not client:
            yield "OpenAI API key is not configured."
            return

        try:
            stream = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                stream=True,
            )
            for chunk in stream:
                text = chunk.choices[0].delta.content
                if text:
                    yield sanitize_output(text)
                await asyncio.sleep(0)
        except Exception as e:
            yield f"OpenAI error: {e}"

    # ── Ollama (local / free -- tinyllama) ────────────────────────────────────
    elif provider == "ollama":
        try:
            response = requests.post(
                f"{settings.OLLAMA_BASE_URL}/api/generate",
                json={"model": "tinyllama:latest", "prompt": prompt, "stream": True},
                stream=True,
                timeout=60,
            )
            for line in response.iter_lines():
                if line:
                    data = json.loads(line.decode("utf-8"))
                    if "response" in data:
                        yield sanitize_output(data["response"])
                await asyncio.sleep(0)
        except Exception as e:
            yield f"Ollama error: {e}"

    else:
        yield "Invalid provider selected."