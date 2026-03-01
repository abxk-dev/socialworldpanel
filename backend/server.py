from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query, Body
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'social-world-panel-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24 * 7  # 7 days

app = FastAPI(title="Social World Panel API", version="1.0.0")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserBase(BaseModel):
    email: EmailStr
    name: str

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
    rate: float  # Rate per 1000
    min_order: int = 100
    max_order: int = 10000
    type: str = "default"  # default, package, subscription
    avg_time: Optional[str] = None  # Average completion time
    platform: str  # instagram, youtube, tiktok, etc.
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
    status: str = "pending"  # pending, in_progress, completed, partial, cancelled
    start_count: Optional[int] = None
    remains: Optional[int] = None
    drip_feed: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DepositCreate(BaseModel):
    amount: float
    method: str  # paytm, cryptomus, stripe

class Deposit(BaseModel):
    deposit_id: str = Field(default_factory=lambda: f"dep_{uuid.uuid4().hex[:8]}")
    user_id: str
    amount: float
    method: str
    status: str = "pending"  # pending, completed, failed
    transaction_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TicketCreate(BaseModel):
    subject: str
    message: str
    order_id: Optional[str] = None

class Ticket(BaseModel):
    ticket_id: str = Field(default_factory=lambda: f"tkt_{uuid.uuid4().hex[:8]}")
    user_id: str
    subject: str
    status: str = "open"  # open, answered, closed
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TicketMessage(BaseModel):
    message_id: str = Field(default_factory=lambda: f"msg_{uuid.uuid4().hex[:8]}")
    ticket_id: str
    user_id: str
    message: str
    is_admin: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AdminSettings(BaseModel):
    panel_name: str = "Social World Panel"
    panel_logo: Optional[str] = None
    favicon: Optional[str] = None
    maintenance_mode: bool = False
    registration_enabled: bool = True
    free_balance_new_users: float = 0.0
    default_currency: str = "USD"
    google_analytics_id: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None

class BlogPost(BaseModel):
    post_id: str = Field(default_factory=lambda: f"post_{uuid.uuid4().hex[:8]}")
    title: str
    slug: str
    content: str
    excerpt: Optional[str] = None
    featured_image: Optional[str] = None
    category: Optional[str] = None
    tags: List[str] = []
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    is_published: bool = False
    author_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(request: Request) -> Dict[str, Any]:
    # Check cookie first
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
    
    # Check Authorization header
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

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Get settings for free balance
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
        "role": "user",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user)
    
    token = create_token(user_id, user_data.email)
    
    user_response = UserResponse(
        user_id=user_id,
        email=user_data.email,
        name=user_data.name,
        balance=free_balance,
        role="user",
        created_at=datetime.now(timezone.utc),
        is_active=True
    )
    
    return TokenResponse(access_token=token, user=user_response)

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
    
    user_response = UserResponse(
        user_id=user["user_id"],
        email=user["email"],
        name=user.get("name", ""),
        picture=user.get("picture"),
        balance=user.get("balance", 0.0),
        role=user.get("role", "user"),
        created_at=created_at,
        is_active=user.get("is_active", True)
    )
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/session")
async def process_session(request: Request, response: Response, session_id: str = Body(..., embed=True)):
    """Process OAuth session_id from Emergent Auth"""
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
    external_session_token = session_data.get("session_token")
    
    # Find or create user
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user info
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        user = existing_user
    else:
        # Get free balance for new users
        settings = await db.admin_settings.find_one({}, {"_id": 0})
        free_balance = settings.get("free_balance_new_users", 0.0) if settings else 0.0
        
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "balance": free_balance,
            "role": "user",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user)
    
    # Create session
    session_token = f"sess_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Set cookie
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

# ==================== SERVICE ROUTES ====================

@api_router.get("/services/categories")
async def get_categories():
    categories = await db.service_categories.find({"is_active": True}, {"_id": 0}).sort("order", 1).to_list(100)
    return categories

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
    
    services = await db.services.find(query, {"_id": 0}).sort("service_id", 1).to_list(500)
    return services

@api_router.get("/services/{service_id}")
async def get_service(service_id: str):
    service = await db.services.find_one({"service_id": service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service

# ==================== ORDER ROUTES ====================

@api_router.post("/orders")
async def create_order(request: Request, order_data: OrderCreate):
    user = await get_current_user(request)
    
    service = await db.services.find_one({"service_id": order_data.service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    if order_data.quantity < service.get("min_order", 100):
        raise HTTPException(status_code=400, detail=f"Minimum order: {service.get('min_order', 100)}")
    
    if order_data.quantity > service.get("max_order", 10000):
        raise HTTPException(status_code=400, detail=f"Maximum order: {service.get('max_order', 10000)}")
    
    # Calculate charge
    rate_per_1000 = service.get("rate", 0)
    charge = (order_data.quantity / 1000) * rate_per_1000
    
    # Check balance
    if user.get("balance", 0) < charge:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Create order
    order = Order(
        user_id=user["user_id"],
        service_id=service["service_id"],
        service_name=service["name"],
        link=order_data.link,
        quantity=order_data.quantity,
        charge=charge,
        drip_feed=order_data.drip_feed
    )
    
    # Deduct balance
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$inc": {"balance": -charge}}
    )
    
    # Save order
    order_dict = order.model_dump()
    order_dict["created_at"] = order_dict["created_at"].isoformat()
    order_dict["updated_at"] = order_dict["updated_at"].isoformat()
    await db.orders.insert_one(order_dict)
    
    return {"order_id": order.order_id, "charge": charge, "message": "Order placed successfully"}

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
        raise HTTPException(status_code=400, detail="Refill not available for this service")
    
    # Create refill (free refill as a new order)
    refill_order = Order(
        user_id=user["user_id"],
        service_id=order["service_id"],
        service_name=order["service_name"],
        link=order["link"],
        quantity=order["quantity"],
        charge=0.0,  # Free refill
        status="pending"
    )
    
    order_dict = refill_order.model_dump()
    order_dict["created_at"] = order_dict["created_at"].isoformat()
    order_dict["updated_at"] = order_dict["updated_at"].isoformat()
    order_dict["is_refill"] = True
    order_dict["original_order_id"] = order_id
    await db.orders.insert_one(order_dict)
    
    return {"message": "Refill order placed", "order_id": refill_order.order_id}

# ==================== DEPOSIT ROUTES ====================

@api_router.post("/deposits")
async def create_deposit(request: Request, deposit_data: DepositCreate):
    user = await get_current_user(request)
    
    if deposit_data.amount < 1:
        raise HTTPException(status_code=400, detail="Minimum deposit: $1")
    
    deposit = Deposit(
        user_id=user["user_id"],
        amount=deposit_data.amount,
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
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$inc": {"balance": deposit_data.amount}}
    )
    
    return {
        "deposit_id": deposit.deposit_id,
        "amount": deposit_data.amount,
        "method": deposit_data.method,
        "status": "completed",  # Mock
        "message": "Deposit successful (Demo Mode)"
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
        subject=ticket_data.subject
    )
    
    ticket_dict = ticket.model_dump()
    ticket_dict["created_at"] = ticket_dict["created_at"].isoformat()
    await db.tickets.insert_one(ticket_dict)
    
    # Add initial message
    message = TicketMessage(
        ticket_id=ticket.ticket_id,
        user_id=user["user_id"],
        message=ticket_data.message
    )
    message_dict = message.model_dump()
    message_dict["created_at"] = message_dict["created_at"].isoformat()
    await db.ticket_messages.insert_one(message_dict)
    
    return {"ticket_id": ticket.ticket_id, "message": "Ticket created successfully"}

@api_router.get("/tickets")
async def get_tickets(request: Request):
    user = await get_current_user(request)
    tickets = await db.tickets.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return tickets

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
    
    msg = TicketMessage(
        ticket_id=ticket_id,
        user_id=user["user_id"],
        message=message
    )
    msg_dict = msg.model_dump()
    msg_dict["created_at"] = msg_dict["created_at"].isoformat()
    await db.ticket_messages.insert_one(msg_dict)
    
    # Update ticket status to open
    await db.tickets.update_one({"ticket_id": ticket_id}, {"$set": {"status": "open"}})
    
    return {"message": "Reply sent"}

# ==================== API KEY ROUTES ====================

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

# ==================== PUBLIC STATS ====================

@api_router.get("/public/stats")
async def get_public_stats():
    total_orders = await db.orders.count_documents({})
    total_users = await db.users.count_documents({})
    total_services = await db.services.count_documents({"is_active": True})
    
    # Add some base numbers for demo
    return {
        "total_orders": total_orders + 125000,
        "total_users": total_users + 45000,
        "total_services": total_services + 500,
        "orders_today": random.randint(500, 1500)
    }

@api_router.get("/public/services")
async def get_public_services():
    services = await db.services.find({"is_active": True}, {"_id": 0}).limit(20).to_list(20)
    return services

@api_router.get("/public/categories")
async def get_public_categories():
    categories = await db.service_categories.find({"is_active": True}, {"_id": 0}).sort("order", 1).to_list(50)
    return categories

# ==================== BLOG ROUTES ====================

@api_router.get("/blog/posts")
async def get_blog_posts(category: Optional[str] = None, tag: Optional[str] = None):
    query = {"is_published": True}
    if category:
        query["category"] = category
    if tag:
        query["tags"] = tag
    
    posts = await db.blog_posts.find(query, {"_id": 0, "content": 0}).sort("created_at", -1).to_list(50)
    return posts

@api_router.get("/blog/posts/{slug}")
async def get_blog_post(slug: str):
    post = await db.blog_posts.find_one({"slug": slug, "is_published": True}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post

# ==================== ADMIN ROUTES ====================

@api_router.get("/admin/dashboard")
async def get_admin_dashboard(request: Request):
    await get_admin_user(request)
    
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)
    
    total_users = await db.users.count_documents({})
    total_orders = await db.orders.count_documents({})
    pending_orders = await db.orders.count_documents({"status": "pending"})
    
    # Revenue calculation (sum of all order charges)
    pipeline = [{"$group": {"_id": None, "total": {"$sum": "$charge"}}}]
    revenue_result = await db.orders.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    # Recent orders
    recent_orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    
    # Recent payments
    recent_deposits = await db.deposits.find({}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    
    return {
        "total_users": total_users,
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "total_revenue": total_revenue,
        "recent_orders": recent_orders,
        "recent_deposits": recent_deposits
    }

@api_router.get("/admin/users")
async def get_admin_users(request: Request, page: int = 1, limit: int = 20, search: Optional[str] = None):
    await get_admin_user(request)
    
    query = {}
    if search:
        query["$or"] = [
            {"email": {"$regex": search, "$options": "i"}},
            {"name": {"$regex": search, "$options": "i"}}
        ]
    
    skip = (page - 1) * limit
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents(query)
    
    return {"users": users, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@api_router.put("/admin/users/{user_id}")
async def update_admin_user(request: Request, user_id: str, data: dict = Body(...)):
    await get_admin_user(request)
    
    allowed_fields = ["balance", "is_active", "role", "name", "email"]
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.users.update_one({"user_id": user_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User updated"}

@api_router.get("/admin/orders")
async def get_admin_orders(
    request: Request,
    page: int = 1,
    limit: int = 20,
    status: Optional[str] = None,
    user_id: Optional[str] = None
):
    await get_admin_user(request)
    
    query = {}
    if status:
        query["status"] = status
    if user_id:
        query["user_id"] = user_id
    
    skip = (page - 1) * limit
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.orders.count_documents(query)
    
    return {"orders": orders, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@api_router.put("/admin/orders/{order_id}")
async def update_admin_order(request: Request, order_id: str, data: dict = Body(...)):
    await get_admin_user(request)
    
    allowed_fields = ["status", "start_count", "remains"]
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.orders.update_one({"order_id": order_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": "Order updated"}

# Service Management
@api_router.post("/admin/categories")
async def create_category(request: Request, data: dict = Body(...)):
    await get_admin_user(request)
    
    category = ServiceCategory(**data)
    cat_dict = category.model_dump()
    await db.service_categories.insert_one(cat_dict)
    
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

# Admin tickets
@api_router.get("/admin/tickets")
async def get_admin_tickets(request: Request, status: Optional[str] = None):
    await get_admin_user(request)
    
    query = {}
    if status:
        query["status"] = status
    
    tickets = await db.tickets.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return tickets

@api_router.post("/admin/tickets/{ticket_id}/reply")
async def admin_reply_ticket(request: Request, ticket_id: str, message: str = Body(..., embed=True)):
    admin = await get_admin_user(request)
    
    ticket = await db.tickets.find_one({"ticket_id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    msg = TicketMessage(
        ticket_id=ticket_id,
        user_id=admin["user_id"],
        message=message,
        is_admin=True
    )
    msg_dict = msg.model_dump()
    msg_dict["created_at"] = msg_dict["created_at"].isoformat()
    await db.ticket_messages.insert_one(msg_dict)
    
    # Update ticket status to answered
    await db.tickets.update_one({"ticket_id": ticket_id}, {"$set": {"status": "answered"}})
    
    return {"message": "Reply sent"}

@api_router.put("/admin/tickets/{ticket_id}/close")
async def close_ticket(request: Request, ticket_id: str):
    await get_admin_user(request)
    await db.tickets.update_one({"ticket_id": ticket_id}, {"$set": {"status": "closed"}})
    return {"message": "Ticket closed"}

# Admin settings
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

# Admin blog
@api_router.post("/admin/blog/posts")
async def create_blog_post(request: Request, data: dict = Body(...)):
    admin = await get_admin_user(request)
    
    post = BlogPost(**data, author_id=admin["user_id"])
    post_dict = post.model_dump()
    post_dict["created_at"] = post_dict["created_at"].isoformat()
    post_dict["updated_at"] = post_dict["updated_at"].isoformat()
    await db.blog_posts.insert_one(post_dict)
    
    return {"post_id": post.post_id, "message": "Post created"}

@api_router.put("/admin/blog/posts/{post_id}")
async def update_blog_post(request: Request, post_id: str, data: dict = Body(...)):
    await get_admin_user(request)
    
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.blog_posts.update_one({"post_id": post_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    
    return {"message": "Post updated"}

@api_router.delete("/admin/blog/posts/{post_id}")
async def delete_blog_post(request: Request, post_id: str):
    await get_admin_user(request)
    await db.blog_posts.delete_one({"post_id": post_id})
    return {"message": "Post deleted"}

# ==================== SMM API (For Resellers) ====================

@api_router.post("/v2")
async def smm_api(request: Request, action: str = Body(...), key: str = Body(...)):
    """Standard SMM Panel API for resellers"""
    # Find user by API key
    user = await db.users.find_one({"api_key": key}, {"_id": 0})
    if not user:
        return {"error": "Invalid API key"}
    
    if action == "balance":
        return {"balance": user.get("balance", 0), "currency": "USD"}
    
    elif action == "services":
        services = await db.services.find({"is_active": True}, {"_id": 0}).to_list(500)
        return [{"service": s["service_id"], "name": s["name"], "rate": s["rate"], "min": s["min_order"], "max": s["max_order"], "category": s.get("category_id")} for s in services]
    
    elif action == "add":
        body = await request.json()
        service_id = body.get("service")
        link = body.get("link")
        quantity = body.get("quantity")
        
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
            charge=charge
        )
        
        await db.users.update_one({"user_id": user["user_id"]}, {"$inc": {"balance": -charge}})
        
        order_dict = order.model_dump()
        order_dict["created_at"] = order_dict["created_at"].isoformat()
        order_dict["updated_at"] = order_dict["updated_at"].isoformat()
        await db.orders.insert_one(order_dict)
        
        return {"order": order.order_id}
    
    elif action == "status":
        body = await request.json()
        order_id = body.get("order")
        
        order = await db.orders.find_one({"order_id": order_id, "user_id": user["user_id"]}, {"_id": 0})
        if not order:
            return {"error": "Order not found"}
        
        return {
            "charge": order["charge"],
            "start_count": order.get("start_count"),
            "status": order["status"],
            "remains": order.get("remains")
        }
    
    return {"error": "Invalid action"}

# Include router
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
            "role": "admin",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
        logger.info("Admin user created")
    
    # Seed sample data if empty
    categories_count = await db.service_categories.count_documents({})
    if categories_count == 0:
        await seed_sample_data()

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
        # Instagram
        {"service_id": "srv_ig_followers", "name": "Instagram Followers [High Quality]", "category_id": "cat_instagram", "platform": "instagram", "rate": 2.50, "min_order": 100, "max_order": 100000, "avg_time": "0-24 hours", "is_refillable": True, "is_popular": True},
        {"service_id": "srv_ig_likes", "name": "Instagram Likes [Fast]", "category_id": "cat_instagram", "platform": "instagram", "rate": 1.00, "min_order": 50, "max_order": 50000, "avg_time": "0-6 hours", "is_popular": True},
        {"service_id": "srv_ig_views", "name": "Instagram Reel Views", "category_id": "cat_instagram", "platform": "instagram", "rate": 0.50, "min_order": 100, "max_order": 1000000, "avg_time": "0-1 hour", "is_new": True},
        {"service_id": "srv_ig_comments", "name": "Instagram Comments [Custom]", "category_id": "cat_instagram", "platform": "instagram", "rate": 5.00, "min_order": 10, "max_order": 5000, "avg_time": "1-12 hours"},
        # YouTube
        {"service_id": "srv_yt_views", "name": "YouTube Views [High Retention]", "category_id": "cat_youtube", "platform": "youtube", "rate": 3.00, "min_order": 500, "max_order": 1000000, "avg_time": "0-24 hours", "is_popular": True},
        {"service_id": "srv_yt_subs", "name": "YouTube Subscribers [Real]", "category_id": "cat_youtube", "platform": "youtube", "rate": 8.00, "min_order": 100, "max_order": 100000, "avg_time": "1-7 days", "is_refillable": True},
        {"service_id": "srv_yt_likes", "name": "YouTube Likes", "category_id": "cat_youtube", "platform": "youtube", "rate": 2.00, "min_order": 50, "max_order": 100000, "avg_time": "0-12 hours"},
        # TikTok
        {"service_id": "srv_tt_followers", "name": "TikTok Followers [Premium]", "category_id": "cat_tiktok", "platform": "tiktok", "rate": 3.50, "min_order": 100, "max_order": 500000, "avg_time": "0-24 hours", "is_popular": True},
        {"service_id": "srv_tt_likes", "name": "TikTok Likes [Fast]", "category_id": "cat_tiktok", "platform": "tiktok", "rate": 0.80, "min_order": 50, "max_order": 100000, "avg_time": "0-2 hours", "is_new": True},
        {"service_id": "srv_tt_views", "name": "TikTok Views [Real]", "category_id": "cat_tiktok", "platform": "tiktok", "rate": 0.30, "min_order": 500, "max_order": 10000000, "avg_time": "0-1 hour"},
        # Twitter
        {"service_id": "srv_tw_followers", "name": "Twitter/X Followers", "category_id": "cat_twitter", "platform": "twitter", "rate": 4.00, "min_order": 100, "max_order": 100000, "avg_time": "1-24 hours"},
        {"service_id": "srv_tw_likes", "name": "Twitter/X Likes", "category_id": "cat_twitter", "platform": "twitter", "rate": 1.50, "min_order": 50, "max_order": 50000, "avg_time": "0-6 hours"},
        # Facebook
        {"service_id": "srv_fb_likes", "name": "Facebook Page Likes", "category_id": "cat_facebook", "platform": "facebook", "rate": 5.00, "min_order": 100, "max_order": 100000, "avg_time": "1-48 hours"},
        {"service_id": "srv_fb_followers", "name": "Facebook Followers", "category_id": "cat_facebook", "platform": "facebook", "rate": 3.00, "min_order": 100, "max_order": 100000, "avg_time": "1-24 hours"},
        # Spotify
        {"service_id": "srv_sp_plays", "name": "Spotify Plays [Premium]", "category_id": "cat_spotify", "platform": "spotify", "rate": 2.00, "min_order": 1000, "max_order": 10000000, "avg_time": "1-7 days"},
        {"service_id": "srv_sp_followers", "name": "Spotify Followers", "category_id": "cat_spotify", "platform": "spotify", "rate": 4.00, "min_order": 100, "max_order": 100000, "avg_time": "1-3 days"},
        # Telegram
        {"service_id": "srv_tg_members", "name": "Telegram Group Members", "category_id": "cat_telegram", "platform": "telegram", "rate": 1.50, "min_order": 100, "max_order": 200000, "avg_time": "0-24 hours"},
        {"service_id": "srv_tg_views", "name": "Telegram Post Views", "category_id": "cat_telegram", "platform": "telegram", "rate": 0.20, "min_order": 100, "max_order": 1000000, "avg_time": "0-1 hour"},
    ]
    
    for srv in services:
        srv["is_active"] = True
        srv["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.services.insert_one(srv)
    
    logger.info("Sample data seeded")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
