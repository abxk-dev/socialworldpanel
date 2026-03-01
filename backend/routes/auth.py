from fastapi import APIRouter, HTTPException, Request, Response, Body
from datetime import datetime, timezone, timedelta
import uuid
import httpx
import logging

from models.schemas import UserCreate, UserLogin, UserResponse, TokenResponse
from middleware.auth import hash_password, verify_password, create_token
from services.activity import log_activity

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])

# Database will be injected
db = None

def init_router(database):
    global db
    db = database
    return router

@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    settings = await db.admin_settings.find_one({}, {"_id": 0})
    free_balance = settings.get("free_balance_new_users", 0.0) if settings else 0.0
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user = {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password_hash": hash_password(user_data.password),
        "picture": None,
        "balance": free_balance,
        "total_spent": 0.0,
        "total_orders": 0,
        "role": "user",
        "is_active": True,
        "is_first_deposit": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user)
    await log_activity(db, "new_user", "New User Registered", f"{user_data.name} ({user_data.email})", user_id)
    
    token = create_token(user_id, user_data.email)
    
    return TokenResponse(
        access_token=token, 
        user=UserResponse(
            user_id=user_id,
            email=user_data.email,
            name=user_data.name,
            balance=free_balance,
            role="user",
            created_at=datetime.now(timezone.utc),
            is_active=True
        )
    )

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account suspended")
    
    token = create_token(user["user_id"], user["email"], user.get("role", "user"))
    
    created_at = user.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            user_id=user["user_id"],
            email=user["email"],
            name=user.get("name", ""),
            picture=user.get("picture"),
            balance=user.get("balance", 0.0),
            role=user.get("role", "user"),
            created_at=created_at,
            is_active=user.get("is_active", True)
        )
    )

@router.post("/session")
async def process_session(request: Request, response: Response, session_id: str = Body(..., embed=True)):
    try:
        async with httpx.AsyncClient() as client_http:
            resp = await client_http.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            session_data = resp.json()
    except Exception as e:
        logger.error(f"Session exchange error: {e}")
        raise HTTPException(status_code=401, detail="Session exchange failed")
    
    email = session_data.get("email")
    name = session_data.get("name")
    picture = session_data.get("picture")
    
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        user = existing_user
    else:
        settings = await db.admin_settings.find_one({}, {"_id": 0})
        free_balance = settings.get("free_balance_new_users", 0.0) if settings else 0.0
        
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "balance": free_balance,
            "total_spent": 0.0,
            "total_orders": 0,
            "role": "user",
            "is_active": True,
            "is_first_deposit": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user)
        await log_activity(db, "new_user", "New User (Google)", f"{name} ({email})", user_id)
    
    session_token = f"sess_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/"
    )
    
    created_at = user.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    return {
        "user_id": user_id,
        "email": email,
        "name": name,
        "picture": picture,
        "balance": user.get("balance", 0.0),
        "role": user.get("role", "user"),
        "created_at": created_at.isoformat() if created_at else None,
        "is_active": user.get("is_active", True)
    }

@router.get("/me")
async def get_me(request: Request):
    from middleware.auth import get_current_user
    user = await get_current_user(request, db)
    created_at = user.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user.get("name", ""),
        "picture": user.get("picture"),
        "balance": user.get("balance", 0.0),
        "role": user.get("role", "user"),
        "created_at": created_at.isoformat() if created_at else None,
        "is_active": user.get("is_active", True)
    }

@router.post("/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}
