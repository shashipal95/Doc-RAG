"""
Pydantic Models
Request and response schemas for API validation
"""
from pydantic import BaseModel, Field
from typing import Optional


# ═══════════════════════════════════════════════════════════════════
# Auth Schemas
# ═══════════════════════════════════════════════════════════════════

class SignupRequest(BaseModel):
    email: str
    password: str
    full_name: str = ""


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    user: dict


# ═══════════════════════════════════════════════════════════════════
# Document Schemas
# ═══════════════════════════════════════════════════════════════════

class UploadResponse(BaseModel):
    message: str
    filename: str
    chunks_added: int


class QueryRequest(BaseModel):
    question: str
    top_k: int = Field(default=3, ge=1, le=10)
    provider: str = Field(default="groq", pattern="^(groq|gemini|openai|ollama)$")
    embedding_provider: str = Field(default="gemini", pattern="^(gemini|openai)$")
    session_id: Optional[str] = None


class SessionCreateRequest(BaseModel):
    title: str = Field(max_length=100)


class SessionResponse(BaseModel):
    id: str
    user_id: str
    title: str
    created_at: str
