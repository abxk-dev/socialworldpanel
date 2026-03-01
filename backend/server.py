# Re-export from modular main.py
from main import app

# Legacy imports kept for backwards compatibility
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query, Body, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx
import random
import string
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'social-world-panel-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24 * 7

# Note: app is imported from main.py now
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== PYDANTIC MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    balance: float = 0.0
    role: str = "user"
    created_at: datetime
    is_active: bool = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ServiceCategory(BaseModel):
    category_id: str = Field(default_factory=lambda: f"cat_{uuid.uuid4().hex[:8]}")
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    platform: Optional[str] = None
    order: int = 0
    is_active: bool = True

class Service(BaseModel):
    service_id: str = Field(default_factory=lambda: f"srv_{uuid.uuid4().hex[:8]}")
    name: str
    category_id: str
    description: Optional[str] = None
    rate: float
    min_order: int = 100
    max_order: int = 10000
    type: str = "default"
    avg_time: Optional[str] = None
    platform: str
    provider_id: Optional[str] = None
    provider_service_id: Optional[str] = None
    cost: float = 0.0  # Provider cost
    is_refillable: bool = False
    is_drip_feed: bool = False
    is_active: bool = True
    is_popular: bool = False
    is_new: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OrderCreate(BaseModel):
    service_id: str
    link: str
    quantity: int
    drip_feed: Optional[Dict[str, Any]] = None

class Order(BaseModel):
    order_id: str = Field(default_factory=lambda: f"ord_{uuid.uuid4().hex[:8]}")
    user_id: str
    service_id: str
    service_name: str
    link: str
    quantity: int
    charge: float
    cost: float = 0.0  # Provider cost
    profit: float = 0.0
    status: str = "pending"
    provider_id: Optional[str] = None
    provider_order_id: Optional[str] = None
    start_count: Optional[int] = None
    remains: Optional[int] = None
    drip_feed: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DepositCreate(BaseModel):
    amount: float
    method: str

class Deposit(BaseModel):
    deposit_id: str = Field(default_factory=lambda: f"dep_{uuid.uuid4().hex[:8]}")
    user_id: str
    amount: float
    bonus_amount: float = 0.0
    total_amount: float = 0.0
    method: str
    status: str = "pending"
    transaction_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TicketCreate(BaseModel):
    subject: str
    message: str
    priority: str = "normal"
    order_id: Optional[str] = None

class Ticket(BaseModel):
    ticket_id: str = Field(default_factory=lambda: f"tkt_{uuid.uuid4().hex[:8]}")
    user_id: str
    subject: str
    priority: str = "normal"
    status: str = "open"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TicketMessage(BaseModel):
    message_id: str = Field(default_factory=lambda: f"msg_{uuid.uuid4().hex[:8]}")
    ticket_id: str
    user_id: str
    message: str
    is_admin: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== NEW MODELS FOR PHASE 1 ====================

class Provider(BaseModel):
    provider_id: str = Field(default_factory=lambda: f"prov_{uuid.uuid4().hex[:8]}")
    name: str
    api_url: str
    api_key: str
    alias: Optional[str] = None  # Hide real domain from staff
    balance: float = 0.0
    currency: str = "USD"
    status: str = "active"  # active, inactive, error
    services_count: int = 0
    last_balance_check: Optional[datetime] = None
    last_sync: Optional[datetime] = None
    notes: Optional[str] = None
    is_mock: bool = False  # For mock provider
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProviderLog(BaseModel):
    log_id: str = Field(default_factory=lambda: f"plog_{uuid.uuid4().hex[:8]}")
    provider_id: str
    action: str  # balance_check, sync_services, place_order, check_status
    request: Optional[Dict[str, Any]] = None
    response: Optional[Dict[str, Any]] = None
    status: str = "success"  # success, error
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BonusTier(BaseModel):
    tier_id: str = Field(default_factory=lambda: f"tier_{uuid.uuid4().hex[:8]}")
    min_amount: float
    max_amount: float
    bonus_percent: float
    bonus_type: str = "percentage"  # percentage, fixed
    payment_methods: List[str] = []  # empty = all methods
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BonusPromotion(BaseModel):
    promo_id: str = Field(default_factory=lambda: f"promo_{uuid.uuid4().hex[:8]}")
    title: str
    bonus_percent: float
    min_deposit: float = 0.0
    max_bonus: Optional[float] = None
    start_date: datetime
    end_date: datetime
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BonusSettings(BaseModel):
    enabled: bool = True
    first_deposit_bonus: bool = False
    first_deposit_percent: float = 10.0
    first_deposit_min: float = 10.0

class AdminSettings(BaseModel):
    panel_name: str = "Social World Panel"
    panel_logo: Optional[str] = None
    favicon: Optional[str] = None
    maintenance_mode: bool = False
    registration_enabled: bool = True
    free_balance_new_users: float = 0.0
    default_currency: str = "USD"
    google_analytics_id: Optional[str] = None
    bonus_settings: Optional[BonusSettings] = None

class ActivityLog(BaseModel):
    log_id: str = Field(default_factory=lambda: f"act_{uuid.uuid4().hex[:8]}")
    type: str  # new_order, new_payment, new_user, new_ticket, failed_order, provider_sync
    title: str
    description: str
    user_id: Optional[str] = None
    reference_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str = "user") -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(request: Request) -> Dict[str, Any]:
    session_token = request.cookies.get("session_token")
    if session_token:
        session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
        if session:
            expires_at = session.get("expires_at")
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at > datetime.now(timezone.utc):
                user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
                if user:
                    return user
    
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        payload = decode_token(token)
        user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
        if user:
            return user
    
    raise HTTPException(status_code=401, detail="Not authenticated")

async def get_admin_user(request: Request) -> Dict[str, Any]:
    user = await get_current_user(request)
    if user.get("role") not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ==================== ACTIVITY LOG HELPER ====================

async def log_activity(activity_type: str, title: str, description: str, user_id: str = None, reference_id: str = None):
    log = ActivityLog(type=activity_type, title=title, description=description, user_id=user_id, reference_id=reference_id)
    log_dict = log.model_dump()
    log_dict["created_at"] = log_dict["created_at"].isoformat()
    await db.activity_logs.insert_one(log_dict)

# ==================== MOCK SMM PROVIDER ====================

class MockSMMProvider:
    """Simulates a real SMM API provider like JustAnotherPanel"""
    
    MOCK_SERVICES = [
        {"service": "1001", "name": "Instagram Followers [HQ] [Fast]", "type": "Default", "category": "Instagram Followers", "rate": "1.50", "min": "100", "max": "100000", "refill": True, "cancel": True},
        {"service": "1002", "name": "Instagram Likes [Real] [Non Drop]", "type": "Default", "category": "Instagram Likes", "rate": "0.80", "min": "50", "max": "50000", "refill": False, "cancel": True},
        {"service": "1003", "name": "Instagram Views [Fast Start]", "type": "Default", "category": "Instagram Views", "rate": "0.30", "min": "100", "max": "10000000", "refill": False, "cancel": False},
        {"service": "1004", "name": "Instagram Reel Views [Real]", "type": "Default", "category": "Instagram Views", "rate": "0.50", "min": "500", "max": "5000000", "refill": False, "cancel": False},
        {"service": "1005", "name": "Instagram Comments [Custom]", "type": "Custom Comments", "category": "Instagram Comments", "rate": "4.00", "min": "10", "max": "10000", "refill": False, "cancel": True},
        {"service": "2001", "name": "YouTube Views [High Retention]", "type": "Default", "category": "YouTube Views", "rate": "2.00", "min": "500", "max": "1000000", "refill": False, "cancel": True},
        {"service": "2002", "name": "YouTube Subscribers [Real]", "type": "Default", "category": "YouTube Subscribers", "rate": "6.00", "min": "100", "max": "100000", "refill": True, "cancel": True},
        {"service": "2003", "name": "YouTube Likes", "type": "Default", "category": "YouTube Likes", "rate": "1.50", "min": "50", "max": "100000", "refill": False, "cancel": True},
        {"service": "2004", "name": "YouTube Watch Time [4000 Hours]", "type": "Default", "category": "YouTube Watch Time", "rate": "150.00", "min": "1", "max": "10", "refill": False, "cancel": False},
        {"service": "3001", "name": "TikTok Followers [Fast]", "type": "Default", "category": "TikTok Followers", "rate": "2.50", "min": "100", "max": "500000", "refill": True, "cancel": True},
        {"service": "3002", "name": "TikTok Likes [Real]", "type": "Default", "category": "TikTok Likes", "rate": "0.60", "min": "50", "max": "100000", "refill": False, "cancel": True},
        {"service": "3003", "name": "TikTok Views [Instant]", "type": "Default", "category": "TikTok Views", "rate": "0.20", "min": "500", "max": "10000000", "refill": False, "cancel": False},
        {"service": "3004", "name": "TikTok Shares", "type": "Default", "category": "TikTok Engagement", "rate": "1.00", "min": "100", "max": "50000", "refill": False, "cancel": True},
        {"service": "4001", "name": "Twitter/X Followers [HQ]", "type": "Default", "category": "Twitter Followers", "rate": "3.00", "min": "100", "max": "100000", "refill": True, "cancel": True},
        {"service": "4002", "name": "Twitter/X Likes", "type": "Default", "category": "Twitter Likes", "rate": "1.20", "min": "50", "max": "50000", "refill": False, "cancel": True},
        {"service": "4003", "name": "Twitter/X Retweets", "type": "Default", "category": "Twitter Engagement", "rate": "1.50", "min": "50", "max": "50000", "refill": False, "cancel": True},
        {"service": "5001", "name": "Facebook Page Likes", "type": "Default", "category": "Facebook Likes", "rate": "4.00", "min": "100", "max": "100000", "refill": True, "cancel": True},
        {"service": "5002", "name": "Facebook Post Likes", "type": "Default", "category": "Facebook Likes", "rate": "1.00", "min": "50", "max": "50000", "refill": False, "cancel": True},
        {"service": "5003", "name": "Facebook Followers", "type": "Default", "category": "Facebook Followers", "rate": "2.50", "min": "100", "max": "100000", "refill": True, "cancel": True},
        {"service": "6001", "name": "Telegram Members [Real]", "type": "Default", "category": "Telegram Members", "rate": "1.20", "min": "100", "max": "200000", "refill": False, "cancel": True},
        {"service": "6002", "name": "Telegram Post Views", "type": "Default", "category": "Telegram Views", "rate": "0.15", "min": "100", "max": "1000000", "refill": False, "cancel": False},
        {"service": "7001", "name": "Spotify Plays [Premium]", "type": "Default", "category": "Spotify Plays", "rate": "1.50", "min": "1000", "max": "10000000", "refill": False, "cancel": True},
        {"service": "7002", "name": "Spotify Followers", "type": "Default", "category": "Spotify Followers", "rate": "3.00", "min": "100", "max": "100000", "refill": True, "cancel": True},
        {"service": "8001", "name": "LinkedIn Followers", "type": "Default", "category": "LinkedIn Followers", "rate": "5.00", "min": "100", "max": "50000", "refill": True, "cancel": True},
        {"service": "8002", "name": "LinkedIn Post Likes", "type": "Default", "category": "LinkedIn Engagement", "rate": "2.00", "min": "50", "max": "10000", "refill": False, "cancel": True},
    ]
    
    @classmethod
    async def get_balance(cls) -> Dict[str, Any]:
        await asyncio.sleep(0.3)  # Simulate API delay
        return {"balance": str(round(random.uniform(500, 2000), 2)), "currency": "USD"}
    
    @classmethod
    async def get_services(cls) -> List[Dict[str, Any]]:
        await asyncio.sleep(0.5)  # Simulate API delay
        return cls.MOCK_SERVICES
    
    @classmethod
    async def place_order(cls, service: str, link: str, quantity: int) -> Dict[str, Any]:
        await asyncio.sleep(0.4)  # Simulate API delay
        order_id = random.randint(100000, 999999)
        return {"order": order_id}
    
    @classmethod
    async def get_order_status(cls, order_id: str) -> Dict[str, Any]:
        await asyncio.sleep(0.3)  # Simulate API delay
        statuses = ["Pending", "In progress", "Processing", "Completed", "Partial"]
        weights = [0.1, 0.2, 0.2, 0.4, 0.1]
        status = random.choices(statuses, weights=weights)[0]
        
        start_count = random.randint(100, 10000)
        remains = 0 if status == "Completed" else random.randint(0, 500)
        
        return {
            "charge": str(round(random.uniform(0.5, 10), 2)),
            "start_count": str(start_count),
            "status": status,
            "remains": str(remains)
        }

async def call_provider_api(provider: Dict[str, Any], action: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
    """Call provider API - supports both mock and real providers"""
    
    if provider.get("is_mock"):
        # Use mock provider
        if action == "balance":
            return await MockSMMProvider.get_balance()
        elif action == "services":
            return await MockSMMProvider.get_services()
        elif action == "add":
            return await MockSMMProvider.place_order(params.get("service"), params.get("link"), params.get("quantity"))
        elif action == "status":
            return await MockSMMProvider.get_order_status(params.get("order"))
        else:
            return {"error": "Invalid action"}
    else:
        # Real provider API call
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                data = {"key": provider["api_key"], "action": action}
                if params:
                    data.update(params)
                response = await client.post(provider["api_url"], data=data)
                return response.json()
        except Exception as e:
            logger.error(f"Provider API error: {e}")
            return {"error": str(e)}

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
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
    await log_activity("new_user", "New User Registered", f"{user_data.name} ({user_data.email})", user_id)
    
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

@api_router.post("/auth/login", response_model=TokenResponse)
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

@api_router.post("/auth/session")
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
        await log_activity("new_user", "New User (Google)", f"{name} ({email})", user_id)
    
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

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
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

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# ==================== USER ROUTES ====================

@api_router.get("/user/profile")
async def get_user_profile(request: Request):
    return await get_me(request)

@api_router.put("/user/profile")
async def update_profile(request: Request, name: str = Body(None), email: EmailStr = Body(None)):
    user = await get_current_user(request)
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if name:
        update_data["name"] = name
    if email:
        update_data["email"] = email
    
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": update_data})
    return {"message": "Profile updated"}

@api_router.get("/user/stats")
async def get_user_stats(request: Request):
    user = await get_current_user(request)
    
    total_orders = await db.orders.count_documents({"user_id": user["user_id"]})
    pending_orders = await db.orders.count_documents({"user_id": user["user_id"], "status": "pending"})
    completed_orders = await db.orders.count_documents({"user_id": user["user_id"], "status": "completed"})
    
    return {
        "balance": user.get("balance", 0.0),
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "completed_orders": completed_orders
    }

@api_router.get("/user/api-key")
async def get_api_key(request: Request):
    user = await get_current_user(request)
    api_key = user.get("api_key")
    if not api_key:
        api_key = f"swp_{uuid.uuid4().hex}"
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"api_key": api_key}})
    return {"api_key": api_key}

@api_router.post("/user/api-key/regenerate")
async def regenerate_api_key(request: Request):
    user = await get_current_user(request)
    api_key = f"swp_{uuid.uuid4().hex}"
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"api_key": api_key}})
    return {"api_key": api_key}

# ==================== SERVICE ROUTES ====================

@api_router.get("/services/categories")
async def get_categories():
    return await db.service_categories.find({"is_active": True}, {"_id": 0}).sort("order", 1).to_list(100)

@api_router.get("/services")
async def get_services(category_id: Optional[str] = None, platform: Optional[str] = None, search: Optional[str] = None):
    query = {"is_active": True}
    if category_id:
        query["category_id"] = category_id
    if platform:
        query["platform"] = platform
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    return await db.services.find(query, {"_id": 0}).sort("service_id", 1).to_list(500)

@api_router.get("/services/{service_id}")
async def get_service(service_id: str):
    service = await db.services.find_one({"service_id": service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service

# ==================== ORDER ROUTES ====================

@api_router.post("/orders", status_code=201)
async def create_order(request: Request, order_data: OrderCreate, background_tasks: BackgroundTasks):
    user = await get_current_user(request)
    
    service = await db.services.find_one({"service_id": order_data.service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    if order_data.quantity < service.get("min_order", 100):
        raise HTTPException(status_code=400, detail=f"Minimum order: {service.get('min_order', 100)}")
    
    if order_data.quantity > service.get("max_order", 10000):
        raise HTTPException(status_code=400, detail=f"Maximum order: {service.get('max_order', 10000)}")
    
    rate_per_1000 = service.get("rate", 0)
    charge = (order_data.quantity / 1000) * rate_per_1000
    cost = (order_data.quantity / 1000) * service.get("cost", 0)
    profit = charge - cost
    
    if user.get("balance", 0) < charge:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    order = Order(
        user_id=user["user_id"],
        service_id=service["service_id"],
        service_name=service["name"],
        link=order_data.link,
        quantity=order_data.quantity,
        charge=charge,
        cost=cost,
        profit=profit,
        provider_id=service.get("provider_id"),
        drip_feed=order_data.drip_feed
    )
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$inc": {"balance": -charge, "total_spent": charge, "total_orders": 1}}
    )
    
    order_dict = order.model_dump()
    order_dict["created_at"] = order_dict["created_at"].isoformat()
    order_dict["updated_at"] = order_dict["updated_at"].isoformat()
    await db.orders.insert_one(order_dict)
    
    await log_activity("new_order", "New Order", f"Order {order.order_id} - {service['name']}", user["user_id"], order.order_id)
    
    # Send to provider in background if provider is set
    if service.get("provider_id"):
        background_tasks.add_task(send_order_to_provider, order.order_id, service, order_data.link, order_data.quantity)
    
    return {"order_id": order.order_id, "charge": charge, "message": "Order placed successfully"}

async def send_order_to_provider(order_id: str, service: Dict, link: str, quantity: int):
    """Background task to send order to provider"""
    provider = await db.providers.find_one({"provider_id": service.get("provider_id")}, {"_id": 0})
    if not provider:
        return
    
    try:
        result = await call_provider_api(provider, "add", {
            "service": service.get("provider_service_id", service["service_id"]),
            "link": link,
            "quantity": quantity
        })
        
        if "order" in result:
            await db.orders.update_one(
                {"order_id": order_id},
                {"$set": {"provider_order_id": str(result["order"]), "status": "processing", "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
        elif "error" in result:
            await db.orders.update_one(
                {"order_id": order_id},
                {"$set": {"status": "failed", "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            await log_activity("failed_order", "Order Failed", f"Order {order_id} - {result.get('error')}", reference_id=order_id)
    except Exception as e:
        logger.error(f"Error sending order to provider: {e}")

@api_router.get("/orders")
async def get_orders(
    request: Request,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    user = await get_current_user(request)
    query = {"user_id": user["user_id"]}
    if status:
        query["status"] = status
    
    skip = (page - 1) * limit
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.orders.count_documents(query)
    
    return {"orders": orders, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@api_router.get("/orders/{order_id}")
async def get_order(request: Request, order_id: str):
    user = await get_current_user(request)
    order = await db.orders.find_one({"order_id": order_id, "user_id": user["user_id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@api_router.post("/orders/{order_id}/refill")
async def refill_order(request: Request, order_id: str):
    user = await get_current_user(request)
    order = await db.orders.find_one({"order_id": order_id, "user_id": user["user_id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    service = await db.services.find_one({"service_id": order["service_id"]}, {"_id": 0})
    if not service or not service.get("is_refillable"):
        raise HTTPException(status_code=400, detail="Refill not available")
    
    refill_order = Order(
        user_id=user["user_id"],
        service_id=order["service_id"],
        service_name=order["service_name"],
        link=order["link"],
        quantity=order["quantity"],
        charge=0.0,
        cost=0.0,
        profit=0.0,
        status="pending"
    )
    
    order_dict = refill_order.model_dump()
    order_dict["created_at"] = order_dict["created_at"].isoformat()
    order_dict["updated_at"] = order_dict["updated_at"].isoformat()
    order_dict["is_refill"] = True
    order_dict["original_order_id"] = order_id
    await db.orders.insert_one(order_dict)
    
    return {"message": "Refill order placed", "order_id": refill_order.order_id}

# ==================== DEPOSIT / BONUS ROUTES ====================

async def calculate_bonus(user: Dict, amount: float, method: str) -> float:
    """Calculate bonus for a deposit based on tiers and promotions"""
    settings = await db.admin_settings.find_one({}, {"_id": 0})
    bonus_settings = settings.get("bonus_settings", {}) if settings else {}
    
    if not bonus_settings.get("enabled", True):
        return 0.0
    
    total_bonus = 0.0
    
    # Check first deposit bonus
    if user.get("is_first_deposit") and bonus_settings.get("first_deposit_bonus"):
        if amount >= bonus_settings.get("first_deposit_min", 0):
            total_bonus = amount * (bonus_settings.get("first_deposit_percent", 0) / 100)
    
    # Check tiered bonuses
    tiers = await db.bonus_tiers.find({"is_active": True}).sort("min_amount", 1).to_list(100)
    for tier in tiers:
        if tier["min_amount"] <= amount <= tier["max_amount"]:
            # Check if tier applies to this payment method
            if not tier.get("payment_methods") or method in tier["payment_methods"]:
                tier_bonus = amount * (tier["bonus_percent"] / 100)
                total_bonus = max(total_bonus, tier_bonus)
                break
    
    # Check active promotions
    now = datetime.now(timezone.utc)
    promotions = await db.bonus_promotions.find({"is_active": True}).to_list(100)
    for promo in promotions:
        start = promo.get("start_date")
        end = promo.get("end_date")
        if isinstance(start, str):
            start = datetime.fromisoformat(start)
        if isinstance(end, str):
            end = datetime.fromisoformat(end)
        
        if start <= now <= end and amount >= promo.get("min_deposit", 0):
            promo_bonus = amount * (promo["bonus_percent"] / 100)
            if promo.get("max_bonus"):
                promo_bonus = min(promo_bonus, promo["max_bonus"])
            total_bonus = max(total_bonus, promo_bonus)
    
    return round(total_bonus, 2)

@api_router.get("/deposits/bonus-preview")
async def preview_bonus(request: Request, amount: float, method: str):
    """Preview bonus before making deposit"""
    user = await get_current_user(request)
    bonus = await calculate_bonus(user, amount, method)
    return {"amount": amount, "bonus": bonus, "total": amount + bonus}

@api_router.post("/deposits")
async def create_deposit(request: Request, deposit_data: DepositCreate):
    user = await get_current_user(request)
    
    if deposit_data.amount < 1:
        raise HTTPException(status_code=400, detail="Minimum deposit: $1")
    
    bonus_amount = await calculate_bonus(user, deposit_data.amount, deposit_data.method)
    total_amount = deposit_data.amount + bonus_amount
    
    deposit = Deposit(
        user_id=user["user_id"],
        amount=deposit_data.amount,
        bonus_amount=bonus_amount,
        total_amount=total_amount,
        method=deposit_data.method,
        transaction_id=f"txn_{uuid.uuid4().hex[:12]}"
    )
    
    deposit_dict = deposit.model_dump()
    deposit_dict["created_at"] = deposit_dict["created_at"].isoformat()
    await db.deposits.insert_one(deposit_dict)
    
    # Mock payment - auto complete for demo
    await db.deposits.update_one(
        {"deposit_id": deposit.deposit_id},
        {"$set": {"status": "completed"}}
    )
    
    # Update user balance and first deposit flag
    update_data = {"$inc": {"balance": total_amount}}
    if user.get("is_first_deposit"):
        update_data["$set"] = {"is_first_deposit": False}
    await db.users.update_one({"user_id": user["user_id"]}, update_data)
    
    await log_activity("new_payment", "New Payment", f"${deposit_data.amount} via {deposit_data.method} (Bonus: ${bonus_amount})", user["user_id"], deposit.deposit_id)
    
    return {
        "deposit_id": deposit.deposit_id,
        "amount": deposit_data.amount,
        "bonus": bonus_amount,
        "total": total_amount,
        "method": deposit_data.method,
        "status": "completed",
        "message": f"Deposit successful! Bonus: ${bonus_amount}"
    }

@api_router.get("/deposits")
async def get_deposits(request: Request, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100)):
    user = await get_current_user(request)
    skip = (page - 1) * limit
    
    deposits = await db.deposits.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.deposits.count_documents({"user_id": user["user_id"]})
    
    return {"deposits": deposits, "total": total, "page": page, "pages": (total + limit - 1) // limit}

# ==================== TICKET ROUTES ====================

@api_router.post("/tickets")
async def create_ticket(request: Request, ticket_data: TicketCreate):
    user = await get_current_user(request)
    
    ticket = Ticket(
        user_id=user["user_id"],
        subject=ticket_data.subject,
        priority=ticket_data.priority
    )
    
    ticket_dict = ticket.model_dump()
    ticket_dict["created_at"] = ticket_dict["created_at"].isoformat()
    await db.tickets.insert_one(ticket_dict)
    
    message = TicketMessage(
        ticket_id=ticket.ticket_id,
        user_id=user["user_id"],
        message=ticket_data.message
    )
    message_dict = message.model_dump()
    message_dict["created_at"] = message_dict["created_at"].isoformat()
    await db.ticket_messages.insert_one(message_dict)
    
    await log_activity("new_ticket", "New Ticket", f"#{ticket.ticket_id} - {ticket_data.subject}", user["user_id"], ticket.ticket_id)
    
    return {"ticket_id": ticket.ticket_id, "message": "Ticket created successfully"}

@api_router.get("/tickets")
async def get_tickets(request: Request):
    user = await get_current_user(request)
    return await db.tickets.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)

@api_router.get("/tickets/{ticket_id}")
async def get_ticket(request: Request, ticket_id: str):
    user = await get_current_user(request)
    ticket = await db.tickets.find_one({"ticket_id": ticket_id, "user_id": user["user_id"]}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    messages = await db.ticket_messages.find({"ticket_id": ticket_id}, {"_id": 0}).sort("created_at", 1).to_list(100)
    return {"ticket": ticket, "messages": messages}

@api_router.post("/tickets/{ticket_id}/reply")
async def reply_ticket(request: Request, ticket_id: str, message: str = Body(..., embed=True)):
    user = await get_current_user(request)
    ticket = await db.tickets.find_one({"ticket_id": ticket_id, "user_id": user["user_id"]}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    msg = TicketMessage(ticket_id=ticket_id, user_id=user["user_id"], message=message)
    msg_dict = msg.model_dump()
    msg_dict["created_at"] = msg_dict["created_at"].isoformat()
    await db.ticket_messages.insert_one(msg_dict)
    
    await db.tickets.update_one({"ticket_id": ticket_id}, {"$set": {"status": "open"}})
    return {"message": "Reply sent"}

# ==================== PUBLIC ROUTES ====================

@api_router.get("/public/stats")
async def get_public_stats():
    total_orders = await db.orders.count_documents({})
    total_users = await db.users.count_documents({})
    total_services = await db.services.count_documents({"is_active": True})
    
    return {
        "total_orders": total_orders + 125000,
        "total_users": total_users + 45000,
        "total_services": total_services + 500,
        "orders_today": random.randint(500, 1500)
    }

@api_router.get("/public/services")
async def get_public_services():
    return await db.services.find({"is_active": True}, {"_id": 0}).limit(20).to_list(20)

@api_router.get("/public/categories")
async def get_public_categories():
    return await db.service_categories.find({"is_active": True}, {"_id": 0}).sort("order", 1).to_list(50)

# ==================== ADMIN DASHBOARD ====================

@api_router.get("/admin/dashboard")
async def get_admin_dashboard(request: Request):
    await get_admin_user(request)
    
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    month_start = today_start - timedelta(days=30)
    
    # Basic counts
    total_users = await db.users.count_documents({})
    new_users_today = await db.users.count_documents({"created_at": {"$gte": today_start.isoformat()}})
    total_orders = await db.orders.count_documents({})
    pending_orders = await db.orders.count_documents({"status": "pending"})
    processing_orders = await db.orders.count_documents({"status": "processing"})
    completed_orders = await db.orders.count_documents({"status": "completed"})
    failed_orders = await db.orders.count_documents({"status": "failed"})
    
    # Revenue calculations
    revenue_pipeline = [{"$group": {"_id": None, "total": {"$sum": "$charge"}, "cost": {"$sum": "$cost"}}}]
    revenue_result = await db.orders.aggregate(revenue_pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    total_cost = revenue_result[0]["cost"] if revenue_result else 0
    total_profit = total_revenue - total_cost
    
    # Today's revenue
    today_orders = await db.orders.find({"created_at": {"$gte": today_start.isoformat()}}, {"_id": 0}).to_list(10000)
    revenue_today = sum(o.get("charge", 0) for o in today_orders)
    orders_today = len(today_orders)
    
    # This week
    week_orders = await db.orders.find({"created_at": {"$gte": week_start.isoformat()}}, {"_id": 0}).to_list(10000)
    revenue_week = sum(o.get("charge", 0) for o in week_orders)
    
    # This month
    month_orders = await db.orders.find({"created_at": {"$gte": month_start.isoformat()}}, {"_id": 0}).to_list(10000)
    revenue_month = sum(o.get("charge", 0) for o in month_orders)
    
    # Provider balances
    providers = await db.providers.find({}, {"_id": 0}).to_list(100)
    low_balance_providers = [p for p in providers if p.get("balance", 0) < 10]
    
    # Recent activities
    recent_orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    recent_deposits = await db.deposits.find({}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    
    return {
        # Users
        "total_users": total_users,
        "new_users_today": new_users_today,
        
        # Orders
        "total_orders": total_orders,
        "orders_today": orders_today,
        "pending_orders": pending_orders,
        "processing_orders": processing_orders,
        "completed_orders": completed_orders,
        "failed_orders": failed_orders,
        
        # Revenue
        "revenue_today": round(revenue_today, 2),
        "revenue_week": round(revenue_week, 2),
        "revenue_month": round(revenue_month, 2),
        "revenue_total": round(total_revenue, 2),
        "total_cost": round(total_cost, 2),
        "total_profit": round(total_profit, 2),
        
        # Providers
        "providers": providers,
        "low_balance_providers": low_balance_providers,
        
        # Recent
        "recent_orders": recent_orders,
        "recent_deposits": recent_deposits
    }

@api_router.get("/admin/dashboard/charts")
async def get_admin_charts(request: Request):
    """Get chart data for admin dashboard"""
    await get_admin_user(request)
    
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)
    
    # Revenue by day (last 30 days)
    revenue_by_day = []
    for i in range(30):
        day = now - timedelta(days=29-i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        day_orders = await db.orders.find({
            "created_at": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()}
        }, {"_id": 0}).to_list(10000)
        
        revenue = sum(o.get("charge", 0) for o in day_orders)
        profit = sum(o.get("profit", 0) for o in day_orders)
        orders_count = len(day_orders)
        
        revenue_by_day.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "label": day_start.strftime("%b %d"),
            "revenue": round(revenue, 2),
            "profit": round(profit, 2),
            "orders": orders_count
        })
    
    # Users by day (last 30 days)
    users_by_day = []
    for i in range(30):
        day = now - timedelta(days=29-i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        new_users = await db.users.count_documents({
            "created_at": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()}
        })
        
        users_by_day.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "label": day_start.strftime("%b %d"),
            "users": new_users
        })
    
    # Top services by orders
    top_services_pipeline = [
        {"$group": {"_id": "$service_name", "count": {"$sum": 1}, "revenue": {"$sum": "$charge"}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    top_services = await db.orders.aggregate(top_services_pipeline).to_list(10)
    top_services = [{"name": s["_id"], "orders": s["count"], "revenue": round(s["revenue"], 2)} for s in top_services]
    
    # Orders by status
    status_pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    orders_by_status = await db.orders.aggregate(status_pipeline).to_list(10)
    orders_by_status = [{"status": s["_id"], "count": s["count"]} for s in orders_by_status]
    
    # Revenue by payment method
    payment_pipeline = [
        {"$match": {"status": "completed"}},
        {"$group": {"_id": "$method", "amount": {"$sum": "$total_amount"}, "count": {"$sum": 1}}}
    ]
    revenue_by_method = await db.deposits.aggregate(payment_pipeline).to_list(10)
    revenue_by_method = [{"method": r["_id"], "amount": round(r["amount"], 2), "count": r["count"]} for r in revenue_by_method]
    
    return {
        "revenue_by_day": revenue_by_day,
        "users_by_day": users_by_day,
        "top_services": top_services,
        "orders_by_status": orders_by_status,
        "revenue_by_method": revenue_by_method
    }

@api_router.get("/admin/activity-feed")
async def get_activity_feed(request: Request, limit: int = 20):
    """Get recent activity feed"""
    await get_admin_user(request)
    
    activities = await db.activity_logs.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return activities

# ==================== ADMIN PROVIDERS ====================

@api_router.get("/admin/providers")
async def get_providers(request: Request):
    await get_admin_user(request)
    return await db.providers.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)

@api_router.post("/admin/providers")
async def create_provider(request: Request, data: dict = Body(...)):
    await get_admin_user(request)
    
    provider = Provider(**data)
    provider_dict = provider.model_dump()
    provider_dict["created_at"] = provider_dict["created_at"].isoformat()
    if provider_dict.get("last_balance_check"):
        provider_dict["last_balance_check"] = provider_dict["last_balance_check"].isoformat()
    if provider_dict.get("last_sync"):
        provider_dict["last_sync"] = provider_dict["last_sync"].isoformat()
    
    await db.providers.insert_one(provider_dict)
    
    return {"provider_id": provider.provider_id, "message": "Provider created"}

@api_router.put("/admin/providers/{provider_id}")
async def update_provider(request: Request, provider_id: str, data: dict = Body(...)):
    await get_admin_user(request)
    
    result = await db.providers.update_one({"provider_id": provider_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    return {"message": "Provider updated"}

@api_router.delete("/admin/providers/{provider_id}")
async def delete_provider(request: Request, provider_id: str):
    await get_admin_user(request)
    await db.providers.delete_one({"provider_id": provider_id})
    return {"message": "Provider deleted"}

@api_router.post("/admin/providers/{provider_id}/test")
async def test_provider_connection(request: Request, provider_id: str):
    """Test provider connection"""
    await get_admin_user(request)
    
    provider = await db.providers.find_one({"provider_id": provider_id}, {"_id": 0})
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    try:
        import time
        start = time.time()
        result = await call_provider_api(provider, "balance")
        ping = round((time.time() - start) * 1000)
        
        if "error" in result:
            await db.providers.update_one({"provider_id": provider_id}, {"$set": {"status": "error"}})
            return {"success": False, "error": result["error"], "ping": ping}
        
        await db.providers.update_one({"provider_id": provider_id}, {"$set": {"status": "active"}})
        return {"success": True, "balance": result.get("balance"), "ping": ping}
    except Exception as e:
        await db.providers.update_one({"provider_id": provider_id}, {"$set": {"status": "error"}})
        return {"success": False, "error": str(e)}

@api_router.post("/admin/providers/{provider_id}/refresh-balance")
async def refresh_provider_balance(request: Request, provider_id: str):
    """Refresh provider balance"""
    await get_admin_user(request)
    
    provider = await db.providers.find_one({"provider_id": provider_id}, {"_id": 0})
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    result = await call_provider_api(provider, "balance")
    
    if "balance" in result:
        balance = float(result["balance"])
        await db.providers.update_one(
            {"provider_id": provider_id},
            {"$set": {"balance": balance, "last_balance_check": datetime.now(timezone.utc).isoformat(), "status": "active"}}
        )
        return {"balance": balance}
    
    return {"error": result.get("error", "Failed to get balance")}

@api_router.get("/admin/providers/{provider_id}/services")
async def get_provider_services(request: Request, provider_id: str):
    """Get services from provider API"""
    await get_admin_user(request)
    
    provider = await db.providers.find_one({"provider_id": provider_id}, {"_id": 0})
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    result = await call_provider_api(provider, "services")
    
    if isinstance(result, list):
        return {"services": result, "count": len(result)}
    
    return {"error": result.get("error", "Failed to get services"), "services": []}

@api_router.post("/admin/providers/{provider_id}/import-services")
async def import_provider_services(request: Request, provider_id: str, data: dict = Body(...)):
    """Import selected services from provider"""
    await get_admin_user(request)
    
    provider = await db.providers.find_one({"provider_id": provider_id}, {"_id": 0})
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    service_ids = data.get("service_ids", [])
    markup = data.get("markup", 100)  # Default 100% markup
    
    result = await call_provider_api(provider, "services")
    if not isinstance(result, list):
        raise HTTPException(status_code=400, detail="Failed to get services from provider")
    
    imported = 0
    for srv in result:
        if srv["service"] in service_ids or not service_ids:  # If no IDs specified, import all
            rate = float(srv["rate"]) * (1 + markup / 100)
            
            # Determine platform from category
            category = srv.get("category", "").lower()
            platform = "other"
            for p in ["instagram", "youtube", "tiktok", "twitter", "facebook", "telegram", "spotify", "linkedin"]:
                if p in category:
                    platform = p
                    break
            
            service = Service(
                name=srv["name"],
                category_id=f"cat_{platform}",
                platform=platform,
                rate=round(rate, 2),
                cost=float(srv["rate"]),
                min_order=int(srv["min"]),
                max_order=int(srv["max"]),
                type=srv.get("type", "Default"),
                is_refillable=srv.get("refill", False),
                provider_id=provider_id,
                provider_service_id=srv["service"]
            )
            
            srv_dict = service.model_dump()
            srv_dict["created_at"] = srv_dict["created_at"].isoformat()
            await db.services.insert_one(srv_dict)
            imported += 1
    
    # Update provider services count
    services_count = await db.services.count_documents({"provider_id": provider_id})
    await db.providers.update_one(
        {"provider_id": provider_id},
        {"$set": {"services_count": services_count, "last_sync": datetime.now(timezone.utc).isoformat()}}
    )
    
    await log_activity("provider_sync", "Services Imported", f"{imported} services from {provider['name']}")
    
    return {"imported": imported, "message": f"Successfully imported {imported} services"}

# ==================== ADMIN BONUS MANAGEMENT ====================

@api_router.get("/admin/bonus/tiers")
async def get_bonus_tiers(request: Request):
    await get_admin_user(request)
    return await db.bonus_tiers.find({}, {"_id": 0}).sort("min_amount", 1).to_list(100)

@api_router.post("/admin/bonus/tiers")
async def create_bonus_tier(request: Request, data: dict = Body(...)):
    await get_admin_user(request)
    
    tier = BonusTier(**data)
    tier_dict = tier.model_dump()
    tier_dict["created_at"] = tier_dict["created_at"].isoformat()
    await db.bonus_tiers.insert_one(tier_dict)
    
    return {"tier_id": tier.tier_id, "message": "Bonus tier created"}

@api_router.put("/admin/bonus/tiers/{tier_id}")
async def update_bonus_tier(request: Request, tier_id: str, data: dict = Body(...)):
    await get_admin_user(request)
    
    result = await db.bonus_tiers.update_one({"tier_id": tier_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tier not found")
    
    return {"message": "Tier updated"}

@api_router.delete("/admin/bonus/tiers/{tier_id}")
async def delete_bonus_tier(request: Request, tier_id: str):
    await get_admin_user(request)
    await db.bonus_tiers.delete_one({"tier_id": tier_id})
    return {"message": "Tier deleted"}

@api_router.get("/admin/bonus/promotions")
async def get_bonus_promotions(request: Request):
    await get_admin_user(request)
    return await db.bonus_promotions.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)

@api_router.post("/admin/bonus/promotions")
async def create_bonus_promotion(request: Request, data: dict = Body(...)):
    await get_admin_user(request)
    
    # Parse dates
    if isinstance(data.get("start_date"), str):
        data["start_date"] = datetime.fromisoformat(data["start_date"].replace("Z", "+00:00"))
    if isinstance(data.get("end_date"), str):
        data["end_date"] = datetime.fromisoformat(data["end_date"].replace("Z", "+00:00"))
    
    promo = BonusPromotion(**data)
    promo_dict = promo.model_dump()
    promo_dict["created_at"] = promo_dict["created_at"].isoformat()
    promo_dict["start_date"] = promo_dict["start_date"].isoformat()
    promo_dict["end_date"] = promo_dict["end_date"].isoformat()
    await db.bonus_promotions.insert_one(promo_dict)
    
    return {"promo_id": promo.promo_id, "message": "Promotion created"}

@api_router.delete("/admin/bonus/promotions/{promo_id}")
async def delete_bonus_promotion(request: Request, promo_id: str):
    await get_admin_user(request)
    await db.bonus_promotions.delete_one({"promo_id": promo_id})
    return {"message": "Promotion deleted"}

@api_router.get("/admin/bonus/settings")
async def get_bonus_settings(request: Request):
    await get_admin_user(request)
    settings = await db.admin_settings.find_one({}, {"_id": 0})
    return settings.get("bonus_settings", BonusSettings().model_dump()) if settings else BonusSettings().model_dump()

@api_router.put("/admin/bonus/settings")
async def update_bonus_settings(request: Request, data: dict = Body(...)):
    await get_admin_user(request)
    await db.admin_settings.update_one({}, {"$set": {"bonus_settings": data}}, upsert=True)
    return {"message": "Bonus settings updated"}

# ==================== ADMIN REPORTS ====================

@api_router.get("/admin/reports/revenue")
async def get_revenue_report(request: Request, start_date: str = None, end_date: str = None):
    await get_admin_user(request)
    
    now = datetime.now(timezone.utc)
    if not start_date:
        start = (now - timedelta(days=30)).replace(hour=0, minute=0, second=0, microsecond=0)
    else:
        start = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
    
    if not end_date:
        end = now
    else:
        end = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
    
    # Get orders in date range
    orders = await db.orders.find({
        "created_at": {"$gte": start.isoformat(), "$lte": end.isoformat()}
    }, {"_id": 0}).to_list(100000)
    
    total_revenue = sum(o.get("charge", 0) for o in orders)
    total_cost = sum(o.get("cost", 0) for o in orders)
    total_profit = total_revenue - total_cost
    avg_order_value = total_revenue / len(orders) if orders else 0
    
    # Revenue by day
    revenue_by_day = {}
    for order in orders:
        created = order.get("created_at", "")
        if isinstance(created, str):
            day = created[:10]
        else:
            day = created.strftime("%Y-%m-%d")
        
        if day not in revenue_by_day:
            revenue_by_day[day] = {"revenue": 0, "cost": 0, "orders": 0}
        revenue_by_day[day]["revenue"] += order.get("charge", 0)
        revenue_by_day[day]["cost"] += order.get("cost", 0)
        revenue_by_day[day]["orders"] += 1
    
    # Payment method breakdown
    deposits = await db.deposits.find({
        "created_at": {"$gte": start.isoformat(), "$lte": end.isoformat()},
        "status": "completed"
    }, {"_id": 0}).to_list(100000)
    
    by_method = {}
    for d in deposits:
        method = d.get("method", "unknown")
        if method not in by_method:
            by_method[method] = {"amount": 0, "bonus": 0, "count": 0}
        by_method[method]["amount"] += d.get("amount", 0)
        by_method[method]["bonus"] += d.get("bonus_amount", 0)
        by_method[method]["count"] += 1
    
    return {
        "period": {"start": start.isoformat(), "end": end.isoformat()},
        "summary": {
            "total_revenue": round(total_revenue, 2),
            "total_cost": round(total_cost, 2),
            "total_profit": round(total_profit, 2),
            "total_orders": len(orders),
            "avg_order_value": round(avg_order_value, 2)
        },
        "by_day": [{"date": k, **v} for k, v in sorted(revenue_by_day.items())],
        "by_payment_method": [{"method": k, **v} for k, v in by_method.items()]
    }

@api_router.get("/admin/reports/orders")
async def get_orders_report(request: Request, start_date: str = None, end_date: str = None):
    await get_admin_user(request)
    
    now = datetime.now(timezone.utc)
    start = datetime.fromisoformat(start_date.replace("Z", "+00:00")) if start_date else (now - timedelta(days=30))
    end = datetime.fromisoformat(end_date.replace("Z", "+00:00")) if end_date else now
    
    orders = await db.orders.find({
        "created_at": {"$gte": start.isoformat(), "$lte": end.isoformat()}
    }, {"_id": 0}).to_list(100000)
    
    # By status
    by_status = {}
    for order in orders:
        status = order.get("status", "unknown")
        by_status[status] = by_status.get(status, 0) + 1
    
    # By service
    by_service = {}
    for order in orders:
        service = order.get("service_name", "unknown")
        if service not in by_service:
            by_service[service] = {"count": 0, "revenue": 0}
        by_service[service]["count"] += 1
        by_service[service]["revenue"] += order.get("charge", 0)
    
    top_services = sorted(by_service.items(), key=lambda x: x[1]["count"], reverse=True)[:20]
    
    # By user
    by_user = {}
    for order in orders:
        user = order.get("user_id", "unknown")
        if user not in by_user:
            by_user[user] = {"count": 0, "spent": 0}
        by_user[user]["count"] += 1
        by_user[user]["spent"] += order.get("charge", 0)
    
    top_users = sorted(by_user.items(), key=lambda x: x[1]["count"], reverse=True)[:20]
    
    return {
        "period": {"start": start.isoformat(), "end": end.isoformat()},
        "summary": {
            "total_orders": len(orders),
            "by_status": by_status
        },
        "top_services": [{"service": k, **v} for k, v in top_services],
        "top_users": [{"user_id": k, **v} for k, v in top_users]
    }

@api_router.get("/admin/reports/users")
async def get_users_report(request: Request, start_date: str = None, end_date: str = None):
    await get_admin_user(request)
    
    now = datetime.now(timezone.utc)
    start = datetime.fromisoformat(start_date.replace("Z", "+00:00")) if start_date else (now - timedelta(days=30))
    end = datetime.fromisoformat(end_date.replace("Z", "+00:00")) if end_date else now
    
    # New users in period
    new_users = await db.users.find({
        "created_at": {"$gte": start.isoformat(), "$lte": end.isoformat()}
    }, {"_id": 0}).to_list(100000)
    
    # Users by day
    by_day = {}
    for user in new_users:
        created = user.get("created_at", "")
        if isinstance(created, str):
            day = created[:10]
        else:
            day = created.strftime("%Y-%m-%d")
        by_day[day] = by_day.get(day, 0) + 1
    
    # Top spenders
    all_users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("total_spent", -1).limit(20).to_list(20)
    
    # Active users (ordered in last 30 days)
    active_threshold = (now - timedelta(days=30)).isoformat()
    active_orders = await db.orders.distinct("user_id", {"created_at": {"$gte": active_threshold}})
    active_users_count = len(active_orders)
    
    # Users who deposited
    deposited_users = await db.deposits.distinct("user_id", {"status": "completed"})
    total_users = await db.users.count_documents({})
    conversion_rate = (len(deposited_users) / total_users * 100) if total_users > 0 else 0
    
    return {
        "period": {"start": start.isoformat(), "end": end.isoformat()},
        "summary": {
            "new_users": len(new_users),
            "active_users": active_users_count,
            "total_users": total_users,
            "conversion_rate": round(conversion_rate, 2)
        },
        "by_day": [{"date": k, "count": v} for k, v in sorted(by_day.items())],
        "top_spenders": [{"user_id": u["user_id"], "name": u.get("name"), "email": u.get("email"), "total_spent": u.get("total_spent", 0)} for u in all_users]
    }

@api_router.get("/admin/reports/payments")
async def get_payments_report(request: Request, start_date: str = None, end_date: str = None):
    await get_admin_user(request)
    
    now = datetime.now(timezone.utc)
    start = datetime.fromisoformat(start_date.replace("Z", "+00:00")) if start_date else (now - timedelta(days=30))
    end = datetime.fromisoformat(end_date.replace("Z", "+00:00")) if end_date else now
    
    deposits = await db.deposits.find({
        "created_at": {"$gte": start.isoformat(), "$lte": end.isoformat()}
    }, {"_id": 0}).to_list(100000)
    
    completed = [d for d in deposits if d.get("status") == "completed"]
    failed = [d for d in deposits if d.get("status") in ["failed", "expired"]]
    
    total_amount = sum(d.get("amount", 0) for d in completed)
    total_bonus = sum(d.get("bonus_amount", 0) for d in completed)
    
    # By method
    by_method = {}
    for d in completed:
        method = d.get("method", "unknown")
        if method not in by_method:
            by_method[method] = {"amount": 0, "bonus": 0, "count": 0}
        by_method[method]["amount"] += d.get("amount", 0)
        by_method[method]["bonus"] += d.get("bonus_amount", 0)
        by_method[method]["count"] += 1
    
    return {
        "period": {"start": start.isoformat(), "end": end.isoformat()},
        "summary": {
            "total_payments": len(deposits),
            "successful": len(completed),
            "failed": len(failed),
            "total_amount": round(total_amount, 2),
            "total_bonus": round(total_bonus, 2)
        },
        "by_method": [{"method": k, **v} for k, v in by_method.items()]
    }

# ==================== ADMIN USERS ====================

@api_router.get("/admin/users")
async def get_admin_users(request: Request, page: int = 1, limit: int = 20, search: Optional[str] = None):
    await get_admin_user(request)
    
    query = {}
    if search:
        query["$or"] = [
            {"email": {"$regex": search, "$options": "i"}},
            {"name": {"$regex": search, "$options": "i"}},
            {"user_id": {"$regex": search, "$options": "i"}}
        ]
    
    skip = (page - 1) * limit
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents(query)
    
    return {"users": users, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@api_router.put("/admin/users/{user_id}")
async def update_admin_user(request: Request, user_id: str, data: dict = Body(...)):
    await get_admin_user(request)
    
    allowed_fields = ["balance", "is_active", "role", "name", "email", "total_spent", "total_orders"]
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.users.update_one({"user_id": user_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User updated"}

@api_router.post("/admin/users/{user_id}/add-balance")
async def add_user_balance(request: Request, user_id: str, amount: float = Body(..., embed=True)):
    admin = await get_admin_user(request)
    
    await db.users.update_one({"user_id": user_id}, {"$inc": {"balance": amount}})
    
    # Log the action
    await log_activity("balance_add", "Balance Added", f"Admin added ${amount} to user {user_id}", admin["user_id"], user_id)
    
    return {"message": f"Added ${amount} to user balance"}

# ==================== ADMIN ORDERS ====================

@api_router.get("/admin/orders")
async def get_admin_orders(
    request: Request,
    page: int = 1,
    limit: int = 20,
    status: Optional[str] = None,
    user_id: Optional[str] = None,
    provider_id: Optional[str] = None
):
    await get_admin_user(request)
    
    query = {}
    if status:
        query["status"] = status
    if user_id:
        query["user_id"] = user_id
    if provider_id:
        query["provider_id"] = provider_id
    
    skip = (page - 1) * limit
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.orders.count_documents(query)
    
    return {"orders": orders, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@api_router.put("/admin/orders/{order_id}")
async def update_admin_order(request: Request, order_id: str, data: dict = Body(...)):
    await get_admin_user(request)
    
    allowed_fields = ["status", "start_count", "remains", "provider_order_id"]
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.orders.update_one({"order_id": order_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": "Order updated"}

@api_router.post("/admin/orders/{order_id}/refund")
async def refund_order(request: Request, order_id: str):
    admin = await get_admin_user(request)
    
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.get("status") == "refunded":
        raise HTTPException(status_code=400, detail="Order already refunded")
    
    # Refund to user
    await db.users.update_one({"user_id": order["user_id"]}, {"$inc": {"balance": order["charge"]}})
    await db.orders.update_one({"order_id": order_id}, {"$set": {"status": "refunded", "updated_at": datetime.now(timezone.utc).isoformat()}})
    
    await log_activity("order_refund", "Order Refunded", f"Order {order_id} refunded ${order['charge']}", admin["user_id"], order_id)
    
    return {"message": f"Refunded ${order['charge']} to user"}

@api_router.post("/admin/orders/{order_id}/resend")
async def resend_order(request: Request, order_id: str, background_tasks: BackgroundTasks):
    """Resend order to provider"""
    await get_admin_user(request)
    
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    service = await db.services.find_one({"service_id": order["service_id"]}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    background_tasks.add_task(send_order_to_provider, order_id, service, order["link"], order["quantity"])
    
    return {"message": "Order resend initiated"}

# ==================== ADMIN SERVICES ====================

@api_router.post("/admin/categories")
async def create_category(request: Request, data: dict = Body(...)):
    await get_admin_user(request)
    
    category = ServiceCategory(**data)
    await db.service_categories.insert_one(category.model_dump())
    
    return {"category_id": category.category_id, "message": "Category created"}

@api_router.put("/admin/categories/{category_id}")
async def update_category(request: Request, category_id: str, data: dict = Body(...)):
    await get_admin_user(request)
    
    result = await db.service_categories.update_one({"category_id": category_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {"message": "Category updated"}

@api_router.delete("/admin/categories/{category_id}")
async def delete_category(request: Request, category_id: str):
    await get_admin_user(request)
    await db.service_categories.delete_one({"category_id": category_id})
    return {"message": "Category deleted"}

@api_router.post("/admin/services")
async def create_service(request: Request, data: dict = Body(...)):
    await get_admin_user(request)
    
    service = Service(**data)
    srv_dict = service.model_dump()
    srv_dict["created_at"] = srv_dict["created_at"].isoformat()
    await db.services.insert_one(srv_dict)
    
    return {"service_id": service.service_id, "message": "Service created"}

@api_router.put("/admin/services/{service_id}")
async def update_service(request: Request, service_id: str, data: dict = Body(...)):
    await get_admin_user(request)
    
    result = await db.services.update_one({"service_id": service_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    
    return {"message": "Service updated"}

@api_router.delete("/admin/services/{service_id}")
async def delete_service(request: Request, service_id: str):
    await get_admin_user(request)
    await db.services.update_one({"service_id": service_id}, {"$set": {"is_active": False}})
    return {"message": "Service deleted"}

# ==================== ADMIN TICKETS ====================

@api_router.get("/admin/tickets")
async def get_admin_tickets(request: Request, status: Optional[str] = None, priority: Optional[str] = None):
    await get_admin_user(request)
    
    query = {}
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    
    return await db.tickets.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)

@api_router.post("/admin/tickets/{ticket_id}/reply")
async def admin_reply_ticket(request: Request, ticket_id: str, message: str = Body(..., embed=True)):
    admin = await get_admin_user(request)
    
    ticket = await db.tickets.find_one({"ticket_id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    msg = TicketMessage(ticket_id=ticket_id, user_id=admin["user_id"], message=message, is_admin=True)
    msg_dict = msg.model_dump()
    msg_dict["created_at"] = msg_dict["created_at"].isoformat()
    await db.ticket_messages.insert_one(msg_dict)
    
    await db.tickets.update_one({"ticket_id": ticket_id}, {"$set": {"status": "answered"}})
    
    return {"message": "Reply sent"}

@api_router.put("/admin/tickets/{ticket_id}/close")
async def close_ticket(request: Request, ticket_id: str):
    await get_admin_user(request)
    await db.tickets.update_one({"ticket_id": ticket_id}, {"$set": {"status": "closed"}})
    return {"message": "Ticket closed"}

# ==================== ADMIN SETTINGS ====================

@api_router.get("/admin/settings")
async def get_admin_settings(request: Request):
    await get_admin_user(request)
    settings = await db.admin_settings.find_one({}, {"_id": 0})
    if not settings:
        settings = AdminSettings().model_dump()
    return settings

@api_router.put("/admin/settings")
async def update_admin_settings(request: Request, data: dict = Body(...)):
    await get_admin_user(request)
    await db.admin_settings.update_one({}, {"$set": data}, upsert=True)
    return {"message": "Settings updated"}

# ==================== SMM API (For Resellers) ====================

@api_router.post("/v2")
async def smm_api(request: Request):
    body = await request.json()
    key = body.get("key")
    action = body.get("action")
    
    user = await db.users.find_one({"api_key": key}, {"_id": 0})
    if not user:
        return {"error": "Invalid API key"}
    
    if action == "balance":
        return {"balance": str(user.get("balance", 0)), "currency": "USD"}
    
    elif action == "services":
        services = await db.services.find({"is_active": True}, {"_id": 0}).to_list(500)
        return [{"service": s["service_id"], "name": s["name"], "rate": str(s["rate"]), "min": str(s["min_order"]), "max": str(s["max_order"]), "category": s.get("category_id")} for s in services]
    
    elif action == "add":
        service_id = body.get("service")
        link = body.get("link")
        quantity = int(body.get("quantity", 0))
        
        if not all([service_id, link, quantity]):
            return {"error": "Missing required fields"}
        
        service = await db.services.find_one({"service_id": service_id}, {"_id": 0})
        if not service:
            return {"error": "Service not found"}
        
        charge = (quantity / 1000) * service["rate"]
        if user.get("balance", 0) < charge:
            return {"error": "Insufficient balance"}
        
        order = Order(
            user_id=user["user_id"],
            service_id=service_id,
            service_name=service["name"],
            link=link,
            quantity=quantity,
            charge=charge,
            cost=(quantity / 1000) * service.get("cost", 0),
            profit=charge - (quantity / 1000) * service.get("cost", 0)
        )
        
        await db.users.update_one({"user_id": user["user_id"]}, {"$inc": {"balance": -charge, "total_spent": charge, "total_orders": 1}})
        
        order_dict = order.model_dump()
        order_dict["created_at"] = order_dict["created_at"].isoformat()
        order_dict["updated_at"] = order_dict["updated_at"].isoformat()
        await db.orders.insert_one(order_dict)
        
        return {"order": order.order_id}
    
    elif action == "status":
        order_id = body.get("order")
        order = await db.orders.find_one({"order_id": order_id, "user_id": user["user_id"]}, {"_id": 0})
        if not order:
            return {"error": "Order not found"}
        
        return {
            "charge": str(order["charge"]),
            "start_count": str(order.get("start_count", "")),
            "status": order["status"].capitalize(),
            "remains": str(order.get("remains", ""))
        }
    
    return {"error": "Invalid action"}

# ==================== APP SETUP ====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    # Create admin user if not exists
    admin_email = "admin@kalia.com"
    admin = await db.users.find_one({"email": admin_email}, {"_id": 0})
    if not admin:
        admin_user = {
            "user_id": f"admin_{uuid.uuid4().hex[:12]}",
            "email": admin_email,
            "name": "Admin",
            "password_hash": hash_password("Hanumanji22@"),
            "balance": 10000.0,
            "total_spent": 0.0,
            "total_orders": 0,
            "role": "admin",
            "is_active": True,
            "is_first_deposit": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
        logger.info("Admin user created")
    
    # Seed sample data
    categories_count = await db.service_categories.count_documents({})
    if categories_count == 0:
        await seed_sample_data()
    
    # Create mock provider if not exists
    mock_provider = await db.providers.find_one({"is_mock": True}, {"_id": 0})
    if not mock_provider:
        await create_mock_provider()

async def create_mock_provider():
    """Create a mock SMM provider for testing"""
    provider = Provider(
        name="Mock SMM Provider",
        api_url="https://mock-smm-api.com/api/v2",
        api_key="mock_api_key_12345",
        alias="Demo Provider",
        balance=999.99,
        currency="USD",
        status="active",
        services_count=25,
        is_mock=True,
        notes="This is a mock provider for testing. Replace with real API credentials."
    )
    
    provider_dict = provider.model_dump()
    provider_dict["created_at"] = provider_dict["created_at"].isoformat()
    provider_dict["last_balance_check"] = datetime.now(timezone.utc).isoformat()
    await db.providers.insert_one(provider_dict)
    logger.info("Mock provider created")

async def seed_sample_data():
    """Seed sample services and categories"""
    categories = [
        {"category_id": "cat_instagram", "name": "Instagram", "platform": "instagram", "icon": "instagram", "order": 1},
        {"category_id": "cat_youtube", "name": "YouTube", "platform": "youtube", "icon": "youtube", "order": 2},
        {"category_id": "cat_tiktok", "name": "TikTok", "platform": "tiktok", "icon": "music", "order": 3},
        {"category_id": "cat_twitter", "name": "Twitter/X", "platform": "twitter", "icon": "twitter", "order": 4},
        {"category_id": "cat_facebook", "name": "Facebook", "platform": "facebook", "icon": "facebook", "order": 5},
        {"category_id": "cat_spotify", "name": "Spotify", "platform": "spotify", "icon": "music", "order": 6},
        {"category_id": "cat_telegram", "name": "Telegram", "platform": "telegram", "icon": "send", "order": 7},
        {"category_id": "cat_linkedin", "name": "LinkedIn", "platform": "linkedin", "icon": "linkedin", "order": 8},
    ]
    
    for cat in categories:
        cat["is_active"] = True
        await db.service_categories.insert_one(cat)
    
    services = [
        {"service_id": "srv_ig_followers", "name": "Instagram Followers [High Quality]", "category_id": "cat_instagram", "platform": "instagram", "rate": 2.50, "cost": 1.50, "min_order": 100, "max_order": 100000, "avg_time": "0-24 hours", "is_refillable": True, "is_popular": True},
        {"service_id": "srv_ig_likes", "name": "Instagram Likes [Fast]", "category_id": "cat_instagram", "platform": "instagram", "rate": 1.00, "cost": 0.60, "min_order": 50, "max_order": 50000, "avg_time": "0-6 hours", "is_popular": True},
        {"service_id": "srv_ig_views", "name": "Instagram Reel Views", "category_id": "cat_instagram", "platform": "instagram", "rate": 0.50, "cost": 0.25, "min_order": 100, "max_order": 1000000, "avg_time": "0-1 hour", "is_new": True},
        {"service_id": "srv_ig_comments", "name": "Instagram Comments [Custom]", "category_id": "cat_instagram", "platform": "instagram", "rate": 5.00, "cost": 3.00, "min_order": 10, "max_order": 5000, "avg_time": "1-12 hours"},
        {"service_id": "srv_yt_views", "name": "YouTube Views [High Retention]", "category_id": "cat_youtube", "platform": "youtube", "rate": 3.00, "cost": 1.80, "min_order": 500, "max_order": 1000000, "avg_time": "0-24 hours", "is_popular": True},
        {"service_id": "srv_yt_subs", "name": "YouTube Subscribers [Real]", "category_id": "cat_youtube", "platform": "youtube", "rate": 8.00, "cost": 5.00, "min_order": 100, "max_order": 100000, "avg_time": "1-7 days", "is_refillable": True},
        {"service_id": "srv_yt_likes", "name": "YouTube Likes", "category_id": "cat_youtube", "platform": "youtube", "rate": 2.00, "cost": 1.20, "min_order": 50, "max_order": 100000, "avg_time": "0-12 hours"},
        {"service_id": "srv_tt_followers", "name": "TikTok Followers [Premium]", "category_id": "cat_tiktok", "platform": "tiktok", "rate": 3.50, "cost": 2.20, "min_order": 100, "max_order": 500000, "avg_time": "0-24 hours", "is_popular": True},
        {"service_id": "srv_tt_likes", "name": "TikTok Likes [Fast]", "category_id": "cat_tiktok", "platform": "tiktok", "rate": 0.80, "cost": 0.45, "min_order": 50, "max_order": 100000, "avg_time": "0-2 hours", "is_new": True},
        {"service_id": "srv_tt_views", "name": "TikTok Views [Real]", "category_id": "cat_tiktok", "platform": "tiktok", "rate": 0.30, "cost": 0.15, "min_order": 500, "max_order": 10000000, "avg_time": "0-1 hour"},
        {"service_id": "srv_tw_followers", "name": "Twitter/X Followers", "category_id": "cat_twitter", "platform": "twitter", "rate": 4.00, "cost": 2.50, "min_order": 100, "max_order": 100000, "avg_time": "1-24 hours"},
        {"service_id": "srv_tw_likes", "name": "Twitter/X Likes", "category_id": "cat_twitter", "platform": "twitter", "rate": 1.50, "cost": 0.90, "min_order": 50, "max_order": 50000, "avg_time": "0-6 hours"},
        {"service_id": "srv_fb_likes", "name": "Facebook Page Likes", "category_id": "cat_facebook", "platform": "facebook", "rate": 5.00, "cost": 3.20, "min_order": 100, "max_order": 100000, "avg_time": "1-48 hours"},
        {"service_id": "srv_fb_followers", "name": "Facebook Followers", "category_id": "cat_facebook", "platform": "facebook", "rate": 3.00, "cost": 1.90, "min_order": 100, "max_order": 100000, "avg_time": "1-24 hours"},
        {"service_id": "srv_sp_plays", "name": "Spotify Plays [Premium]", "category_id": "cat_spotify", "platform": "spotify", "rate": 2.00, "cost": 1.10, "min_order": 1000, "max_order": 10000000, "avg_time": "1-7 days"},
        {"service_id": "srv_sp_followers", "name": "Spotify Followers", "category_id": "cat_spotify", "platform": "spotify", "rate": 4.00, "cost": 2.40, "min_order": 100, "max_order": 100000, "avg_time": "1-3 days"},
        {"service_id": "srv_tg_members", "name": "Telegram Group Members", "category_id": "cat_telegram", "platform": "telegram", "rate": 1.50, "cost": 0.85, "min_order": 100, "max_order": 200000, "avg_time": "0-24 hours"},
        {"service_id": "srv_tg_views", "name": "Telegram Post Views", "category_id": "cat_telegram", "platform": "telegram", "rate": 0.20, "cost": 0.10, "min_order": 100, "max_order": 1000000, "avg_time": "0-1 hour"},
    ]
    
    for srv in services:
        srv["is_active"] = True
        srv["profit"] = srv["rate"] - srv["cost"]
        srv["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.services.insert_one(srv)
    
    # Create default bonus tiers
    bonus_tiers = [
        {"tier_id": "tier_1", "min_amount": 10, "max_amount": 49.99, "bonus_percent": 3, "is_active": True},
        {"tier_id": "tier_2", "min_amount": 50, "max_amount": 99.99, "bonus_percent": 5, "is_active": True},
        {"tier_id": "tier_3", "min_amount": 100, "max_amount": 199.99, "bonus_percent": 8, "is_active": True},
        {"tier_id": "tier_4", "min_amount": 200, "max_amount": 499.99, "bonus_percent": 10, "is_active": True},
        {"tier_id": "tier_5", "min_amount": 500, "max_amount": 999999, "bonus_percent": 15, "is_active": True},
    ]
    
    for tier in bonus_tiers:
        tier["created_at"] = datetime.now(timezone.utc).isoformat()
        tier["payment_methods"] = []
        tier["bonus_type"] = "percentage"
        await db.bonus_tiers.insert_one(tier)
    
    # Create default bonus settings
    await db.admin_settings.update_one(
        {},
        {"$set": {
            "bonus_settings": {
                "enabled": True,
                "first_deposit_bonus": True,
                "first_deposit_percent": 10,
                "first_deposit_min": 10
            }
        }},
        upsert=True
    )
    
    logger.info("Sample data seeded")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
