"""
FastAPI Application - Main Entry Point
"""
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings

try:
    from langsmith.middleware import TracingMiddleware
    _langsmith_ok = True
except ImportError:
    _langsmith_ok = False

settings = get_settings()

# These must match the constants in app/services/llm.py
GEMINI_TEXT_MODEL   = "gemini-1.5-flash"
GEMINI_VISION_MODEL = "gemini-1.5-flash"
GROQ_TEXT_MODEL     = "llama-3.3-70b-versatile"
GROQ_VISION_MODEL   = "meta-llama/llama-4-scout-17b-16e-instruct"

app = FastAPI(
    title="DocChat RAG API",
    description="Production RAG API with multi-provider LLM support",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if settings.LANGCHAIN_TRACING_V2 and _langsmith_ok:
    app.add_middleware(TracingMiddleware)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    traceback.print_exc()
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

from app.api.v1.auth import router as auth_router
from app.api.v1.documents import router as documents_router
from app.api.v1.health import router as health_router

app.include_router(auth_router)
app.include_router(documents_router)
app.include_router(health_router)

@app.get("/")
def root():
    return {
        "name": "DocChat RAG API",
        "version": "1.0.0",
        "active_models": {
            "gemini_text": GEMINI_TEXT_MODEL,
            "gemini_vision": GEMINI_VISION_MODEL,
            "groq_text": GROQ_TEXT_MODEL,
            "groq_vision": GROQ_VISION_MODEL,
        },
        "docs": "/docs",
    }

@app.on_event("startup")
async def startup_event():
    print("\n" + "=" * 55)
    print("  DocChat RAG API starting...")
    print(f"  Gemini text model  : {GEMINI_TEXT_MODEL}")
    print(f"  Gemini vision model: {GEMINI_VISION_MODEL}")
    print(f"  Groq text model    : {GROQ_TEXT_MODEL}")
    print(f"  Groq vision model  : {GROQ_VISION_MODEL}")
    print(f"  LangSmith tracing  : {settings.LANGCHAIN_TRACING_V2}")
    print("=" * 55 + "\n")

@app.on_event("shutdown")
async def shutdown_event():
    print("DocChat shutting down...")