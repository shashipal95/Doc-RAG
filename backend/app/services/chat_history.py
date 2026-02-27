import httpx
from app.core.config import get_settings

settings = get_settings()

async def save_message(token: str, session_id: str, role: str, content: str, metadata: dict = None):
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.SUPABASE_URL}/rest/v1/chat_messages",
            headers={
                "apikey": settings.SUPABASE_ANON_KEY,
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
            },
            json={
                "session_id": session_id,
                "role": role,
                "content": content,
                "metadata": metadata or {}
            },
        )

        if resp.status_code >= 400:
            print("⚠ Failed to save message:", resp.text)