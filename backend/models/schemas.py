from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

# ==================== AUTH MODELS ====================

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

# ==================== SERVICE MODELS ====================

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
    cost: float = 0.0
    is_refillable: bool = False
    is_drip_feed: bool = False
    is_active: bool = True
    is_popular: bool = False
    is_new: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== ORDER MODELS ====================

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
    cost: float = 0.0
    profit: float = 0.0
    status: str = "pending"
    provider_id: Optional[str] = None
    provider_order_id: Optional[str] = None
    start_count: Optional[int] = None
    remains: Optional[int] = None
    drip_feed: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== DEPOSIT MODELS ====================

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

# ==================== TICKET MODELS ====================

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

# ==================== PROVIDER MODELS ====================

class Provider(BaseModel):
    provider_id: str = Field(default_factory=lambda: f"prov_{uuid.uuid4().hex[:8]}")
    name: str
    api_url: str
    api_key: str
    alias: Optional[str] = None
    balance: float = 0.0
    currency: str = "USD"
    status: str = "active"
    services_count: int = 0
    last_balance_check: Optional[datetime] = None
    last_sync: Optional[datetime] = None
    notes: Optional[str] = None
    is_mock: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProviderLog(BaseModel):
    log_id: str = Field(default_factory=lambda: f"plog_{uuid.uuid4().hex[:8]}")
    provider_id: str
    action: str
    request: Optional[Dict[str, Any]] = None
    response: Optional[Dict[str, Any]] = None
    status: str = "success"
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== BONUS MODELS ====================

class BonusTier(BaseModel):
    tier_id: str = Field(default_factory=lambda: f"tier_{uuid.uuid4().hex[:8]}")
    min_amount: float
    max_amount: float
    bonus_percent: float
    bonus_type: str = "percentage"
    payment_methods: List[str] = []
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

# ==================== SETTINGS MODELS ====================

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

# ==================== ACTIVITY LOG ====================

class ActivityLog(BaseModel):
    log_id: str = Field(default_factory=lambda: f"act_{uuid.uuid4().hex[:8]}")
    type: str
    title: str
    description: str
    user_id: Optional[str] = None
    reference_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
