"""
LLM Service
Streaming generation with multiple LLM providers
"""
import asyncio
import json
import re
import requests
from typing import AsyncGenerator
from groq import Groq
from openai import OpenAI
import google.genai as genai

from app.core.config import get_settings

settings = get_settings()

# Initialize clients (lazy loading)
_gemini_client = None
_groq_client = None
_openai_client = None


def get_gemini_client():
    """Get or create Gemini client"""
    global _gemini_client
    if _gemini_client is None and settings.GEMINI_API_KEY:
        _gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _gemini_client


def get_groq_client():
    """Get or create Groq client"""
    global _groq_client
    if _groq_client is None and settings.GROQ_API_KEY:
        _groq_client = Groq(api_key=settings.GROQ_API_KEY)
    return _groq_client


def get_openai_client():
    """Get or create OpenAI client"""
    global _openai_client
    if _openai_client is None and settings.OPENAI_API_KEY:
        _openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _openai_client


def sanitize_output(text: str) -> str:
    """Remove thinking tags from LLM output"""
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL)
    return text.replace("<think>", "").replace("</think>", "")


def extract_text(chunk, provider: str) -> str:
    """Extract text from provider-specific chunk format"""
    if provider == "gemini":
        return getattr(chunk, "text", None)
    elif provider in ("openai", "groq"):
        return chunk.choices[0].delta.content
    return None


async def generate_stream(
    prompt: str,
    provider: str
) -> AsyncGenerator[str, None]:
    """
    Generate streaming response from LLM
    
    Args:
        prompt: Input prompt
        provider: 'gemini', 'groq', 'openai', or 'ollama'
        
    Yields:
        Text chunks from the LLM
    """
    
    if provider == "gemini":
        client = get_gemini_client()
        if not client:
            yield "Gemini not configured."
            return

        stream = client.models.generate_content_stream(
            model="gemini-2.0-flash",
            contents=prompt,
        )

        for chunk in stream:
            text = extract_text(chunk, provider)
            if text:
                yield sanitize_output(text)
            await asyncio.sleep(0)

    elif provider == "groq":
        client = get_groq_client()
        if not client:
            yield "Groq not configured."
            return

        stream = client.chat.completions.create(
            model="qwen/qwen3-32b",
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant. Never include <think> tags. Return only the final answer.",
                },
                {"role": "user", "content": prompt},
            ],
            stream=True,
        )

        for chunk in stream:
            text = extract_text(chunk, provider)
            if text:
                yield sanitize_output(text)
            await asyncio.sleep(0)

    elif provider == "openai":
        client = get_openai_client()
        if not client:
            yield "OpenAI not configured."
            return

        stream = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            stream=True,
        )

        for chunk in stream:
            text = extract_text(chunk, provider)
            if text:
                yield sanitize_output(text)
            await asyncio.sleep(0)

    elif provider == "ollama":
        response = requests.post(
            f"{settings.OLLAMA_BASE_URL}/api/generate",
            json={"model": "tinyllama:latest", "prompt": prompt, "stream": True},
            stream=True,
        )

        for line in response.iter_lines():
            if line:
                data = json.loads(line.decode("utf-8"))
                if "response" in data:
                    yield sanitize_output(data["response"])
            await asyncio.sleep(0)

    else:
        yield "Invalid provider selected."
