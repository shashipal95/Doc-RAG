"""
FastAPI Application - Main Entry Point
Production-ready RAG API with authentication
"""
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings

# LangSmith tracing
from langsmith.middleware import TracingMiddleware

settings = get_settings()

# ═══════════════════════════════════════════════════════════════════
# FastAPI App
# ═══════════════════════════════════════════════════════════════════

app = FastAPI(
    title="DocChat RAG API",
    description="Production RAG API with multi-provider LLM support",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ═══════════════════════════════════════════════════════════════════
# Middleware
# ═══════════════════════════════════════════════════════════════════

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Update for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# LangSmith Tracing (optional)
if settings.LANGCHAIN_TRACING_V2:
    app.add_middleware(TracingMiddleware)

# ═══════════════════════════════════════════════════════════════════
# Exception Handlers
# ═══════════════════════════════════════════════════════════════════

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled errors"""
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )

# ═══════════════════════════════════════════════════════════════════
# Routes
# ═══════════════════════════════════════════════════════════════════

# All routes at root level to match frontend expectations
from app.api.v1.auth import router as auth_router
from app.api.v1.documents import router as documents_router
from app.api.v1.health import router as health_router

app.include_router(auth_router)  # /auth/login, /auth/signup, etc.
app.include_router(documents_router)  # /upload, /query, /sessions, /clear
app.include_router(health_router)  # /health, /stats

@app.get("/")
def root():
    """Root endpoint"""
    return {
        "name": "DocChat RAG API",
        "version": "1.0.0",
        "docs": "/docs",
    }

# ═══════════════════════════════════════════════════════════════════
# Startup/Shutdown Events
# ═══════════════════════════════════════════════════════════════════

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    print("🚀 Application starting...")
    print(f"📊 LangSmith tracing: {settings.LANGCHAIN_TRACING_V2}")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    print("👋 Application shutting down...")
