"""
Document Routes
Upload, query, and delete document operations
"""
import io
import json
import asyncio
import docx
from fastapi import APIRouter, File, UploadFile, HTTPException, Depends, Form, Request
from fastapi.responses import StreamingResponse
from pypdf import PdfReader
from langsmith import traceable
import httpx

from app.core.config import get_settings
from app.core.security import verify_token, get_user_id
from app.models.schemas import UploadResponse, QueryRequest, SessionCreateRequest
from app.services.embeddings import get_embedding
from app.services.vector_store import upsert_vectors, query_vectors, delete_all_user_vectors
from app.services.llm import generate_stream

router = APIRouter(tags=["Documents"])
settings = get_settings()


@router.post("/upload", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    embedding_provider: str = Form("gemini"),
    payload: dict = Depends(verify_token),
):
    """Upload and index a document (user-isolated)"""
    user_id = get_user_id(payload)
    content = await file.read()

    # Extract text based on file type
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

    # Chunk the text
    chunks = [
        text[i : i + settings.CHUNK_SIZE]
        for i in range(0, len(text), settings.CHUNK_SIZE - settings.CHUNK_OVERLAP)
    ]

    # Create vectors with embeddings
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

    # Upsert to Pinecone with user namespace
    upsert_vectors(vectors, namespace=user_id)

    return UploadResponse(
        message="Success",
        filename=file.filename,
        chunks_added=len(chunks),
    )


@router.post("/query")
async def query_documents(
    request: QueryRequest,
    payload: dict = Depends(verify_token),
):
    """Query user's documents - returns SSE stream"""
    user_id = get_user_id(payload)

    @traceable(run_type="chain", name="RAG Query Pipeline")
    def build_prompt():
        # Get query embedding
        query_embedding = get_embedding(request.question, request.embedding_provider)

        # Search user's vectors
        matches = query_vectors(
            query_vector=query_embedding,
            namespace=user_id,
            top_k=request.top_k,
        )

        if not matches:
            return None, None

        # Build context from matches
        context_text = "\n\n".join(m["metadata"]["text"] for m in matches)

        prompt = f"""Use ONLY the context below to answer.

Context:
{context_text}

Question: {request.question}
"""
        return prompt, matches

    async def stream_generator():
        try:
            prompt, matches = build_prompt()

            if not matches:
                yield "data: No relevant context found in your documents.\n\n"
                yield "event: done\ndata: [DONE]\n\n"
                return

            # Stream LLM response
            async for chunk in generate_stream(prompt, request.provider):
                safe = chunk.replace("\n", "\\n")
                yield f"data: {safe}\n\n"

            yield "event: done\ndata: [DONE]\n\n"

        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        stream_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.delete("/clear")
async def clear_user_documents(payload: dict = Depends(verify_token)):
    """Delete ALL documents for the authenticated user"""
    user_id = get_user_id(payload)
    
    try:
        delete_all_user_vectors(namespace=user_id)
        return {"message": "All your documents deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sessions")
async def create_session(
    request: Request,
    payload: dict = Depends(verify_token),
):
    """Create a new chat session"""
    user_id = get_user_id(payload)
    body = await request.json()
    title = body.get("title", "New Chat")

    # Insert into Supabase using REST API
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
            json={
                "user_id": user_id,
                "title": title,
            },
        )

        if resp.status_code >= 400:
            raise HTTPException(
                status_code=resp.status_code,
                detail=resp.json() if resp.text else "Failed to create session",
            )

        session_data = resp.json()
        return session_data[0] if isinstance(session_data, list) else session_data
