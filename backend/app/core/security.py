"""
Security - JWT Token Verification
Validates Supabase JWT tokens
"""
import httpx
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.config import get_settings

settings = get_settings()
security = HTTPBearer()


async def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Verify JWT token with Supabase
    Returns user payload if valid, raises 401 if invalid
    """
    token = credentials.credentials

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.SUPABASE_URL}/auth/v1/user",
            headers={
                "apikey": settings.SUPABASE_ANON_KEY,
                "Authorization": f"Bearer {token}",
            },
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return resp.json()


def get_user_id(user: dict) -> str:
    """Extract user ID from verified token payload"""
    uid = user.get("id")
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid user payload")
    return uid
