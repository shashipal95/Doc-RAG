"""
Document Routes
Upload, query, delete, and image-vision operations
"""
import io
import json
import asyncio
import base64
import tempfile
import os
import docx
from typing import Optional, List
from fastapi import APIRouter, File, UploadFile, HTTPException, Depends, Form, Request
from fastapi.responses import StreamingResponse
from pypdf import PdfReader
from langsmith import traceable
import httpx
import urllib.request as _urllib_req
import urllib.parse as _urllib_parse
from groq import Groq
import google.genai as genai
from google.genai import types as genai_types

from app.core.config import get_settings
from app.core.security import verify_token, get_user_id
from app.models.schemas import UploadResponse, QueryRequest, SessionCreateRequest
from app.services.embeddings import get_embedding
from app.services.vector_store import upsert_vectors, query_vectors, delete_all_user_vectors
from app.services.llm import generate_stream, generate_vision_stream

router = APIRouter(tags=["Documents"])
settings = get_settings()

SUPPORTED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
AUDIO_VIDEO_EXTENSIONS = (".mp3", ".wav", ".m4a", ".webm", ".mp4", ".ogg", ".flac", ".mpeg", ".mpga")
AUDIO_MIME_MAP = {
    ".mp3":  "audio/mpeg",
    ".wav":  "audio/wav",
    ".m4a":  "audio/mp4",
    ".webm": "audio/webm",
    ".mp4":  "video/mp4",
    ".ogg":  "audio/ogg",
    ".flac": "audio/flac",
    ".mpeg": "audio/mpeg",
    ".mpga": "audio/mpeg",
}


def _is_image_request(question: str) -> bool:
    """Return True when the question is asking for images in any way."""
    # Single words that strongly imply image search
    IMAGE_SINGLE_WORDS = {
        "images", "photos", "pictures", "photos", "visuals",
        "wallpaper", "wallpapers", "photography",
    }
    # Multi-word phrases
    IMAGE_PHRASES = {
        "show me", "find me", "recommend", "suggest", "get me",
        "search for", "look for", "display", "show some",
        "give me some", "i want to see", "can i see",
    }
    q = question.lower()

    # If question contains an image word AND an action phrase → image request
    has_image_word = any(w in q.split() for w in IMAGE_SINGLE_WORDS)
    has_action = any(p in q for p in IMAGE_PHRASES)

    # Also match classic explicit combos
    EXPLICIT = {
        "show me images", "show me photos", "show me pictures",
        "find images", "find photos", "search images", "search photos",
        "images of", "photos of", "pictures of",
        "show images", "show photos", "find pictures",
        "recommend images", "recommend photos", "suggest images",
        "nature images", "nature photos", "nature pictures",
    }
    explicit_match = any(kw in q for kw in EXPLICIT)

    return explicit_match or (has_image_word and has_action)


def _extract_image_search_query(question: str) -> str:
    stop_phrases = [
        "show me", "find", "get", "search for", "search", "display", "give me",
        "images of", "photos of", "pictures of", "image of", "photo of", "picture of",
        "some", "a few", "related", "similar", "show",
    ]
    q = question.lower()
    for phrase in sorted(stop_phrases, key=len, reverse=True):
        q = q.replace(phrase, "")
    return q.strip(" ?.,!")


def _search_images_pexels(query: str, count: int = 4) -> List[dict]:
    """
    Search for images using the Pexels API.
    Requires PEXELS_API_KEY in .env — free tier: 200 req/hour, 20000 req/month.
    Get your free key at: https://www.pexels.com/api/
    """
    api_key = settings.PEXELS_API_KEY
    if not api_key:
        print("[pexels] ⚠️  PEXELS_API_KEY not set in .env — skipping image search")
        return []
    print(f"[pexels] searching for: {query}")
    try:
        import urllib.request
        import urllib.parse
        params = urllib.parse.urlencode({"query": query, "per_page": count, "orientation": "landscape"})
        req = urllib.request.Request(
            f"https://api.pexels.com/v1/search?{params}",
            headers={"Authorization": api_key},
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode())
        return [
            {
                "url":    photo.get("src", {}).get("large", ""),
                "thumb":  photo.get("src", {}).get("medium", ""),
                "title":  photo.get("alt", f"Photo by {photo.get('photographer', 'Unknown')}"),
                "source": photo.get("url", ""),
            }
            for photo in data.get("photos", [])
            if photo.get("src", {}).get("large")
        ]
    except Exception as e:
        print(f"[pexels] search failed for '{query}': {e}")
        return []


# ══════════════════════════════════════════════════════════════════
# Transcription — routes to Gemini or Groq based on selected provider
# ══════════════════════════════════════════════════════════════════

def _transcribe_with_groq(content: bytes, filename: str) -> str:
    """Transcribe audio/video using Groq Whisper (free tier ~40 min/day)."""
    if not settings.GROQ_API_KEY:
        raise HTTPException(
            status_code=400,
            detail="Groq API key not configured. Add GROQ_API_KEY to your .env.",
        )
    ext = os.path.splitext(filename)[1].lower()
    mime_type = AUDIO_MIME_MAP.get(ext, "audio/mpeg")
    client = Groq(api_key=settings.GROQ_API_KEY)

    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as audio_file:
            transcription = client.audio.transcriptions.create(
                model="whisper-large-v3",
                file=(filename, audio_file, mime_type),
                response_format="text",
            )
        return transcription if isinstance(transcription, str) else transcription.text
    except Exception as e:
        err = str(e)
        if "413" in err or "too large" in err.lower():
            raise HTTPException(status_code=413, detail="File exceeds Groq 25 MB limit.")
        if "429" in err or "quota" in err.lower():
            raise HTTPException(status_code=429, detail="Groq audio quota exceeded. Try again later.")
        raise HTTPException(status_code=500, detail=f"Groq transcription failed: {err}")
    finally:
        os.unlink(tmp_path)


def _transcribe_with_gemini(content: bytes, filename: str) -> str:
    """Transcribe audio/video using Gemini 1.5 Flash native audio understanding."""
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=400,
            detail="Gemini API key not configured. Add GEMINI_API_KEY to your .env.",
        )
    ext = os.path.splitext(filename)[1].lower()
    mime_type = AUDIO_MIME_MAP.get(ext, "audio/mpeg")

    try:
        client = genai.Client(
            api_key=settings.GEMINI_API_KEY,
            http_options={"api_version": "v1beta"},  # generateContent needs v1beta
        )
        audio_part = genai_types.Part.from_bytes(data=content, mime_type=mime_type)
        prompt_part = genai_types.Part.from_text(
            text="Transcribe all speech and lyrics in this audio/video accurately. Return only the transcript text, no commentary."
        )
        response = client.models.generate_content(
            model="gemini-2.0-flash",  # use 2.0-flash, more stable across API versions
            contents=[audio_part, prompt_part],
        )
        return response.text or ""
    except Exception as e:
        err = str(e)
        if "429" in err or "quota" in err.lower():
            raise HTTPException(status_code=429, detail="Gemini quota exceeded. Try again later.")
        raise HTTPException(status_code=500, detail=f"Gemini transcription failed: {err}")


def _transcribe_audio(content: bytes, filename: str, provider: str) -> str:
    """
    Route transcription to the correct provider based on user selection.
      gemini → Gemini 2.0 Flash native audio, auto-falls back to Groq on quota error
      groq   → Groq Whisper large-v3
      openai → Groq Whisper (OpenAI has no free transcription)
      ollama → Groq Whisper (Ollama has no Whisper endpoint by default)
    """
    print(f"[transcribe] provider={provider} file={filename}")
    if provider == "gemini":
        try:
            return _transcribe_with_gemini(content, filename)
        except HTTPException as e:
            if e.status_code == 429:
                # Gemini quota exceeded — silently fall back to Groq Whisper
                print(f"[transcribe] Gemini quota exceeded, falling back to Groq Whisper")
                return _transcribe_with_groq(content, filename)
            raise
    else:
        # groq, openai, ollama — all use Groq Whisper
        return _transcribe_with_groq(content, filename)


# ══════════════════════════════════════════════════════════════════
# Upload — text document OR audio/video
# ══════════════════════════════════════════════════════════════════

@router.post("/upload", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    provider: str = Form("gemini"),
    embedding_provider: str = Form("gemini"),
    payload: dict = Depends(verify_token),
):
    """
    Upload and index a document or media file (user-isolated).

    Supported formats:
      Text  → .txt, .pdf, .docx
      Audio → .mp3, .wav, .m4a, .ogg, .flac, .mpeg, .mpga, .webm
      Video → .mp4, .webm

    Transcription provider:
      Gemini selected → Gemini 1.5 Flash native audio understanding
      Groq selected   → Groq Whisper large-v3 (free ~40 min/day)
      Others          → Groq Whisper as fallback
    """
    user_id = get_user_id(payload)
    content = await file.read()
    fname = file.filename or ""
    fname_lower = fname.lower()

    # ── Text formats ──────────────────────────────────────────────
    if fname_lower.endswith(".txt"):
        text = content.decode("utf-8", errors="ignore")

    elif fname_lower.endswith(".pdf"):
        pdf_reader = PdfReader(io.BytesIO(content))
        text = "\n".join(page.extract_text() or "" for page in pdf_reader.pages)

    elif fname_lower.endswith(".docx"):
        doc = docx.Document(io.BytesIO(content))
        text = "\n".join(para.text for para in doc.paragraphs)

    # ── Audio / Video ─────────────────────────────────────────────
    elif fname_lower.endswith(AUDIO_VIDEO_EXTENSIONS):
        if len(content) > 25 * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail="File exceeds the 25 MB limit for audio/video transcription.",
            )
        text = await asyncio.to_thread(_transcribe_audio, content, fname, provider)

        if not text or not text.strip():
            raise HTTPException(
                status_code=422,
                detail="Transcription returned empty. The file may be silent or corrupted.",
            )
        print(f"[transcribe] '{fname}' → {len(text)} chars via {provider}")

    # ── Unsupported ───────────────────────────────────────────────
    else:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Accepted: .txt, .pdf, .docx, .mp3, .wav, .m4a, .ogg, .flac, .webm, .mp4",
        )

    # ── Chunk → Embed → Upsert ────────────────────────────────────
    chunks = [
        text[i: i + settings.CHUNK_SIZE]
        for i in range(0, len(text), settings.CHUNK_SIZE - settings.CHUNK_OVERLAP)
    ]

    if not chunks:
        raise HTTPException(status_code=422, detail="No text content could be extracted from the file.")

    vectors = [
        {
            "id": f"{user_id}_{fname}_{i}",
            "values": get_embedding(chunk, embedding_provider),
            "metadata": {
                "text": chunk,
                "filename": fname,
                "user_id": user_id,
            },
        }
        for i, chunk in enumerate(chunks)
    ]

    upsert_vectors(vectors, namespace=user_id)

    return UploadResponse(
        message="Success",
        filename=fname,
        chunks_added=len(chunks),
    )


# ══════════════════════════════════════════════════════════════════
# Query with optional image attachment (vision)
# ══════════════════════════════════════════════════════════════════

@router.post("/query-image")
async def query_with_image(
    question: str = Form(...),
    provider: str = Form("gemini"),
    embedding_provider: str = Form("gemini"),
    session_id: Optional[str] = Form(None),
    image: UploadFile = File(...),
    payload: dict = Depends(verify_token),
):
    user_id = get_user_id(payload)

    content_type = image.content_type or ""
    if content_type not in SUPPORTED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image type '{content_type}'. Use JPEG, PNG, WebP, or GIF.",
        )

    image_bytes = await image.read()

    try:
        query_embedding = get_embedding(question, embedding_provider)
        matches = query_vectors(query_vector=query_embedding, namespace=user_id, top_k=3)
        doc_context = "\n\n".join(m["metadata"]["text"] for m in matches) if matches else ""
    except Exception:
        doc_context = ""

    full_prompt = question
    if doc_context:
        full_prompt = (
            f"Use the document context below if helpful, then analyse the image to answer.\n\n"
            f"Document Context:\n{doc_context}\n\n"
            f"Question: {question}"
        )

    wants_images = _is_image_request(question)
    image_results: List[dict] = []
    if wants_images:
        search_query = _extract_image_search_query(question)
        image_results = await asyncio.to_thread(_search_images_pexels, search_query, count=4)

    async def stream_generator():
        try:
            async for chunk in generate_vision_stream(image_bytes, content_type, full_prompt, provider):
                safe = chunk.replace("\n", "\\n")
                yield f"data: {safe}\n\n"
            if image_results:
                yield f"event: images\ndata: {json.dumps(image_results)}\n\n"
            yield "event: done\ndata: [DONE]\n\n"
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        stream_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ══════════════════════════════════════════════════════════════════
# Standard text query (RAG)
# ══════════════════════════════════════════════════════════════════

def _web_search_tavily(query: str, max_results: int = 5) -> str:
    """
    Search the web using Tavily API and return results as formatted text context.
    Free tier: 1000 searches/month. Get key at: https://tavily.com
    Falls back to empty string if key not set.
    """
    api_key = settings.TAVILY_API_KEY
    if not api_key:
        print("[tavily] TAVILY_API_KEY not set — skipping web search")
        return ""
    try:
        payload = json.dumps({
            "api_key": api_key,
            "query": query,
            "search_depth": "basic",
            "max_results": max_results,
            "include_answer": True,
        }).encode()
        req = _urllib_req.Request(
            "https://api.tavily.com/search",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with _urllib_req.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())

        parts = []
        # Include Tavily's own answer summary if available
        if data.get("answer"):
            parts.append(f"Summary: {data['answer']}")

        # Include top result snippets
        for r in data.get("results", []):
            title = r.get("title", "")
            snippet = r.get("content", "")
            url = r.get("url", "")
            if snippet:
                parts.append(f"Source: {title}\n{snippet}\nURL: {url}")

        context = "\n\n".join(parts)
        print(f"[tavily] found {len(data.get('results', []))} results for: {query}")
        return context

    except Exception as e:
        print(f"[tavily] search failed: {e}")
        return ""


@router.post("/query")
async def query_documents(
    request: QueryRequest,
    payload: dict = Depends(verify_token),
):
    user_id = get_user_id(payload)

    RELEVANCE_THRESHOLD = 0.50

    @traceable(run_type="chain", name="RAG Query Pipeline")
    def get_relevant_docs():
        query_embedding = get_embedding(request.question, request.embedding_provider)
        matches = query_vectors(
            query_vector=query_embedding,
            namespace=user_id,
            top_k=request.top_k
        )

        relevant = [m for m in matches if m.get("score", 0) >= RELEVANCE_THRESHOLD]
        scores = [round(m.get("score", 0), 3) for m in matches]

        print(f"[query] scores={scores} → {len(relevant)} above threshold {RELEVANCE_THRESHOLD}")

        return relevant

    wants_images = _is_image_request(request.question)

    async def stream_generator():
        try:
            has_tavily = bool(settings.TAVILY_API_KEY)

            # Step 1: retrieve docs
            relevant_docs = get_relevant_docs()
            has_relevant_docs = len(relevant_docs) > 0

            # Step 2: Decide source
            if has_relevant_docs:
                context_text = "\n\n".join(
                    m["metadata"]["text"] for m in relevant_docs
                )

                prompt = (
                    "Use the document context below to answer accurately.\n\n"
                    f"Context:\n{context_text}\n\n"
                    f"Question: {request.question}\n"
                )

                print(f"[query] → doc context ({len(relevant_docs)} chunks)")

            elif has_tavily:
                web_context = await asyncio.to_thread(
                    _web_search_tavily,
                    request.question
                )

                if web_context:
                    prompt = (
                        "Use the web search results below to give an accurate answer.\n\n"
                        f"Web Search Results:\n{web_context}\n\n"
                        f"Question: {request.question}\n"
                    )

                    print("[query] → web search")

                else:
                    prompt = (
                        "Answer as accurately as possible.\n\n"
                        f"Question: {request.question}\n"
                    )

                    print("[query] → general knowledge (web search failed)")

            else:
                prompt = (
                    "Answer as accurately as possible.\n\n"
                    f"Question: {request.question}\n"
                )

                print("[query] → general knowledge (no docs, no web)")
            # Stream LLM response
            async for chunk in generate_stream(prompt, request.provider):
                safe = chunk.replace("\n", "\\n")
                yield f"data: {safe}\n\n"

            # Fetch Pexels images if requested
            if wants_images:
                search_query = _extract_image_search_query(request.question)
                image_results = await asyncio.to_thread(_search_images_pexels, search_query, count=4)
                if image_results:
                    yield f"event: images\ndata: {json.dumps(image_results)}\n\n"

            yield "event: done\ndata: [DONE]\n\n"
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        stream_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ══════════════════════════════════════════════════════════════════
# Clear documents
# ══════════════════════════════════════════════════════════════════

@router.delete("/clear")
async def clear_user_documents(payload: dict = Depends(verify_token)):
    user_id = get_user_id(payload)
    try:
        delete_all_user_vectors(namespace=user_id)
        return {"message": "All your documents deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════════════════════════
# Sessions
# ══════════════════════════════════════════════════════════════════

@router.post("/sessions")
async def create_session(
    request: Request,
    payload: dict = Depends(verify_token),
):
    user_id = get_user_id(payload)
    body = await request.json()
    title = body.get("title", "New Chat")

    async with httpx.AsyncClient() as client:
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        resp = await client.post(
            f"{settings.SUPABASE_URL}/rest/v1/chat_sessions",
            headers={
                "apikey": settings.SUPABASE_ANON_KEY,
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Prefer": "return=representation",
            },
            json={"user_id": user_id, "title": title},
        )
        if resp.status_code >= 400:
            raise HTTPException(
                status_code=resp.status_code,
                detail=resp.json() if resp.text else "Failed to create session",
            )
        session_data = resp.json()
        return session_data[0] if isinstance(session_data, list) else session_data