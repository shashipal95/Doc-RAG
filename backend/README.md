# DocChat Backend - Production RAG API

Production-ready FastAPI backend for a multi-provider RAG (Retrieval Augmented Generation) system with user authentication and document management.

## 🚀 Features

- **Multi-Provider LLM Support**: Gemini, OpenAI, Groq, Ollama
- **User Authentication**: Supabase-based JWT authentication
- **Document Processing**: PDF, DOCX, TXT file support
- **Vector Storage**: Pinecone with user-isolated namespaces
- **Streaming Responses**: Server-Sent Events (SSE) for real-time LLM output
- **Tracing**: Optional LangSmith integration
- **Production-Ready**: Proper error handling, logging, and security

## 📁 Project Structure

```
backend/
├── app/
│   ├── main.py                 # FastAPI app entry
│   ├── core/
│   │   ├── config.py           # Settings management
│   │   └── security.py         # JWT verification
│   ├── api/
│   │   └── v1/
│   │       ├── router.py       # Main API router
│   │       ├── auth.py         # Auth endpoints
│   │       ├── documents.py    # Document operations
│   │       └── health.py       # Health checks
│   ├── services/
│   │   ├── embeddings.py       # Embedding generation
│   │   ├── vector_store.py     # Pinecone operations
│   │   └── llm.py              # LLM streaming
│   └── models/
│       └── schemas.py          # Pydantic models
├── tests/
├── .env.example
├── requirements.txt
├── pyproject.toml
├── Dockerfile
└── README.md
```

## 🔧 Setup

### 1. Prerequisites

- Python 3.11+
- Pinecone account
- Supabase project
- API keys for LLM providers (Gemini/OpenAI/Groq)

### 2. Installation

**Using pip:**
```bash
pip install -r requirements.txt
```

**Using uv (recommended):**
```bash
uv pip install -r requirements.txt
```

### 3. Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:
- `PINECONE_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_JWT_SECRET`
- At least one LLM provider key (GEMINI_API_KEY, OPENAI_API_KEY, or GROQ_API_KEY)

### 4. Run the Application

**Development:**
```bash
uvicorn app.main:app --reload
```

**Production:**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Docker:**
```bash
docker build -t docchat-backend .
docker run -p 8000:8000 --env-file .env docchat-backend
```

## 📡 API Endpoints

### Authentication
- `POST /api/v1/auth/signup` - Create new account
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/logout` - Logout
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user

### Documents
- `POST /api/v1/upload` - Upload document (authenticated)
- `POST /api/v1/query` - Query documents (authenticated, SSE stream)
- `DELETE /api/v1/clear` - Delete all user documents (authenticated)
- `POST /api/v1/sessions` - Create chat session (authenticated)

### Health
- `GET /api/v1/health` - Health check
- `GET /api/v1/stats` - Pinecone statistics

## 🔐 Authentication Flow

1. **Signup/Login** → Receive JWT tokens
2. **Store tokens** in client (localStorage)
3. **Include token** in `Authorization: Bearer <token>` header
4. **Auto-refresh** when access token expires

## 📊 Data Isolation

Each user's documents are stored in a separate Pinecone namespace using their user ID. This ensures complete data isolation between users.

## 🧪 Testing

```bash
pytest tests/
```

## 📝 Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Optional | Google Gemini API key |
| `OPENAI_API_KEY` | Optional | OpenAI API key |
| `GROQ_API_KEY` | Optional | Groq API key |
| `PINECONE_API_KEY` | ✅ Required | Pinecone API key |
| `SUPABASE_URL` | ✅ Required | Supabase project URL |
| `SUPABASE_ANON_KEY` | ✅ Required | Supabase anonymous key |
| `SUPABASE_JWT_SECRET` | ✅ Required | Supabase JWT secret |
| `LANGCHAIN_TRACING_V2` | Optional | Enable LangSmith tracing |

## 🚢 Deployment

### Railway
```bash
railway up
```

### Render
Connect your GitHub repo and deploy with:
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Docker
```bash
docker build -t docchat-backend .
docker push your-registry/docchat-backend
```

## 🛠️ Development

**Code formatting:**
```bash
black app/
isort app/
```

**Type checking:**
```bash
mypy app/
```

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 📧 Support

For issues or questions, please open a GitHub issue.
