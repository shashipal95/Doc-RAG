"""
Document Routes
Upload, query, delete, and image-vision operations
"""
import io
import json
import asyncio
import base64
import docx
from typing import Optional, List
from fastapi import APIRouter, File, UploadFile, HTTPException, Depends, Form, Request
from fastapi.responses import StreamingResponse
from pypdf import PdfReader
from langsmith import traceable
import httpx
from duckduckgo_search import DDGS

from app.core.config import get_settings
from app.core.security import verify_token, get_user_id
from app.models.schemas import UploadResponse, QueryRequest, SessionCreateRequest
from app.services.embeddings import get_embedding
from app.services.vector_store import upsert_vectors, query_vectors, delete_all_user_vectors
from app.services.llm import generate_stream, generate_vision_stream

router = APIRouter(tags=["Documents"])
settings = get_settings()

SUPPORTED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


def _is_image_request(question: str) -> bool:
    """Return True when the question is explicitly asking to see images."""
    IMAGE_KEYWORDS = {
        "show me images", "show me photos", "show me pictures",
        "find images", "find photos", "search images", "search photos",
        "images of", "photos of", "pictures of",
        "show images", "show photos",
    }
    q = question.lower()
    return any(kw in q for kw in IMAGE_KEYWORDS)


def _extract_image_search_query(question: str) -> str:
    """Strip filler phrases, return a clean search query."""
    stop_phrases = [
        "show me", "find", "get", "search for", "search", "display", "give me",
        "images of", "photos of", "pictures of", "image of", "photo of", "picture of",
        "some", "a few", "related", "similar", "show",
    ]
    q = question.lower()
    for phrase in sorted(stop_phrases, key=len, reverse=True):  # longest first
        q = q.replace(phrase, "")
    return q.strip(" ?.,!")


def _search_images_ddg(query: str, count: int = 4) -> List[dict]:
    """
    Search for images using DuckDuckGo — no API key required.
    Returns list of {url, thumb, title, source} dicts.
    Falls back to empty list on any error.
    """
    try:
        with DDGS() as ddgs:
            results = list(ddgs.images(
                keywords=query,
                max_results=count,
                safesearch="moderate",
                type_image="photo",
            ))
        return [
            {
                "url":    r.get("image", ""),
                "thumb":  r.get("thumbnail", r.get("image", "")),
                "title":  r.get("title", ""),
                "source": r.get("url", ""),       # page where image was found
            }
            for r in results
            if r.get("image")
        ]
    except Exception as e:
        print(f"[ddg-images] search failed for '{query}': {e}")
        return []


# ══════════════════════════════════════════════════════════════════
# Upload text document
# ══════════════════════════════════════════════════════════════════

@router.post("/upload", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    embedding_provider: str = Form("gemini"),
    payload: dict = Depends(verify_token),
):
    """Upload and index a document (user-isolated)."""
    user_id = get_user_id(payload)
    content = await file.read()

    if file.filename.endswith(".txt"):
        text = content.decode("utf-8", errors="ignore")
    elif file.filename.endswith(".pdf"):
        pdf_reader = PdfReader(io.BytesIO(content))
        text = "\n".join(page.extract_text() or "" for page in pdf_reader.pages)
    elif file.filename.endswith(".docx"):
        doc = docx.Document(io.BytesIO(content))
        text = "\n".join(para.text for para in doc.paragraphs)
    else:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type (.txt, .pdf, .docx only)",
        )

    chunks = [
        text[i: i + settings.CHUNK_SIZE]
        for i in range(0, len(text), settings.CHUNK_SIZE - settings.CHUNK_OVERLAP)
    ]

    vectors = [
        {
            "id": f"{user_id}_{file.filename}_{i}",
            "values": get_embedding(chunk, embedding_provider),
            "metadata": {
                "text": chunk,
                "filename": file.filename,
                "user_id": user_id,
            },
        }
        for i, chunk in enumerate(chunks)
    ]

    upsert_vectors(vectors, namespace=user_id)

    return UploadResponse(
        message="Success",
        filename=file.filename,
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
    """
    Multimodal endpoint: analyse an uploaded image and answer the question.
    Streams SSE just like /query. Also returns Pexels images when asked.
    """
    user_id = get_user_id(payload)

    # Validate image type
    content_type = image.content_type or ""
    if content_type not in SUPPORTED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image type '{content_type}'. Use JPEG, PNG, WebP, or GIF.",
        )

    image_bytes = await image.read()

    # Optionally also pull doc context so vision + RAG work together
    try:
        query_embedding = get_embedding(question, embedding_provider)
        matches = query_vectors(
            query_vector=query_embedding,
            namespace=user_id,
            top_k=3,
        )
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
        image_results = await asyncio.to_thread(_search_images_ddg, search_query, count=4)

    async def stream_generator():
        try:
            async for chunk in generate_vision_stream(image_bytes, content_type, full_prompt, provider):
                safe = chunk.replace("\n", "\\n")
                yield f"data: {safe}\n\n"

            # Send image results as a separate event if available
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

@router.post("/query")
async def query_documents(
    request: QueryRequest,
    payload: dict = Depends(verify_token),
):
    """Query user's documents — returns SSE stream.
    Automatically fetches Pexels images when the question asks for visuals.
    """
    user_id = get_user_id(payload)

    @traceable(run_type="chain", name="RAG Query Pipeline")
    def build_prompt():
        query_embedding = get_embedding(request.question, request.embedding_provider)
        matches = query_vectors(
            query_vector=query_embedding,
            namespace=user_id,
            top_k=request.top_k,
        )
        if not matches:
            return None, None
        context_text = "\n\n".join(m["metadata"]["text"] for m in matches)
        prompt = (
            f"Use ONLY the context below to answer.\n\n"
            f"Context:\n{context_text}\n\n"
            f"Question: {request.question}\n"
        )
        return prompt, matches

    wants_images = _is_image_request(request.question)

    async def stream_generator():
        try:
            prompt, matches = build_prompt()

            if not matches:
                yield "data: No relevant context found in your documents.\n\n"
                # Still try image search if requested
                if wants_images:
                    search_query = _extract_image_search_query(request.question)
                    image_results = await asyncio.to_thread(_search_images_ddg, search_query, count=4)
                    if image_results:
                        yield f"event: images\ndata: {json.dumps(image_results)}\n\n"
                yield "event: done\ndata: [DONE]\n\n"
                return

            # Stream LLM text response
            async for chunk in generate_stream(prompt, request.provider):
                safe = chunk.replace("\n", "\\n")
                yield f"data: {safe}\n\n"

            # After text, send images if requested
            if wants_images:
                search_query = _extract_image_search_query(request.question)
                image_results = await asyncio.to_thread(_search_images_ddg, search_query, count=4)
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
    """Delete ALL documents for the authenticated user."""
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
    """Create a new chat session."""
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