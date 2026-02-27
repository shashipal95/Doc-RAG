"""
Auth Routes
Supabase authentication endpoints
"""
import httpx
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.config import get_settings
from app.core.security import verify_token
from app.models.schemas import SignupRequest, LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()
security = HTTPBearer()


def supa_headers(token: str = None) -> dict:
    """Build headers for Supabase Auth API"""
    return {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token or settings.SUPABASE_ANON_KEY}",
    }


async def supabase_post(path: str, body: dict, token: str = None) -> dict:
    """POST to Supabase Auth API"""
    url = f"{settings.SUPABASE_URL}{path}"

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            url,
            headers=supa_headers(token),
            json=body
        )

    # Handle errors
    if resp.status_code >= 400:
        try:
            error_json = resp.json()
            detail = (
                error_json.get("error_description")
                or error_json.get("msg")
                or resp.text
            )
        except Exception:
            detail = resp.text

        raise HTTPException(status_code=resp.status_code, detail=detail)

    # ✅ Handle empty response (like 204 logout)
    if resp.status_code == 204 or not resp.content:
        return {}

    # ✅ Safe JSON parsing
    try:
        return resp.json()
    except ValueError:
        return {}


@router.post("/signup")
async def signup(body: SignupRequest):
    """Create a new user account"""
    data = await supabase_post(
        "/auth/v1/signup",
        {
            "email": body.email,
            "password": body.password,
            "data": {"full_name": body.full_name},
        },
    )
    
    return {
        "message": "Account created. Please verify your email.",
        "user_id": data.get("id") or data.get("user", {}).get("id"),
        "email": body.email,
        "access_token": data.get("access_token"),
        "refresh_token": data.get("refresh_token"),
    }


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    """Authenticate user and return JWT tokens"""
    data = await supabase_post(
        "/auth/v1/token?grant_type=password",
        {"email": body.email, "password": body.password},
    )
    
    return {
        "access_token": data["access_token"],
        "refresh_token": data["refresh_token"],
        "expires_in": data.get("expires_in", 3600),
        "user": {
            "id": data["user"]["id"],
            "email": data["user"]["email"],
            "name": (data["user"].get("user_metadata") or {}).get("full_name", ""),
        },
    }


@router.post("/logout")
async def logout(
    payload: dict = Depends(verify_token),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Revoke user session"""
    await supabase_post("/auth/v1/logout", {}, token=credentials.credentials)
    return {"message": "Logged out successfully"}


@router.post("/refresh")
async def refresh_token(request: Request):
    """Exchange refresh_token for new access_token"""
    body = await request.json()
    refresh = body.get("refresh_token")
    
    if not refresh:
        raise HTTPException(status_code=400, detail="refresh_token is required")
    
    data = await supabase_post(
        "/auth/v1/token?grant_type=refresh_token",
        {"refresh_token": refresh},
    )
    
    return {
        "access_token": data["access_token"],
        "refresh_token": data["refresh_token"],
        "expires_in": data.get("expires_in", 3600),
    }


@router.get("/me")
async def get_me(payload: dict = Depends(verify_token)):
    """Get current user info"""
    return {
        "id": payload.get("sub"),
        "email": payload.get("email"),
        "name": (payload.get("user_metadata") or {}).get("full_name", ""),
        "role": payload.get("role"),
    }
