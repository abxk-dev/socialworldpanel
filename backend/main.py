from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
import os
import logging
from datetime import datetime, timezone
import bcrypt
import uuid

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create FastAPI app
app = FastAPI(title="Social World Panel API", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://socialworldpanel.vercel.app",
        "https://socialworldpanel-git-main-abhishek-kalias-projects-e47b3e05.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create main API router
api_router = APIRouter(prefix="/api")

# Import and initialize routes
from routes import auth, user, services, orders, payments, tickets, providers, admin, reports, public

auth.init_router(db)
user.init_router(db)
services.init_router(db)
orders.init_router(db)
payments.init_router(db)
tickets.init_router(db)
providers.init_router(db)
admin.init_router(db)
reports.init_router(db)
public.init_router(db)

# Include all routers
api_router.include_router(auth.router)
api_router.include_router(user.router)
api_router.include_router(services.router)
api_router.include_router(orders.router)
api_router.include_router(payments.router)
api_router.include_router(tickets.router)
api_router.include_router(providers.router)
api_router.include_router(admin.router)
api_router.include_router(reports.router)
api_router.include_router(public.router)

# Include API router in app
app.include_router(api_router)

# Health check
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "version": "2.0.0"}

# Startup event - seed data
@app.on_event("startup")
async def startup_db_client():
    logger.info("Starting Social World Panel API...")
    
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.users.create_index("created_at")
    await db.orders.create_index("user_id")
    await db.orders.create_index("status")
    await db.orders.create_index("created_at")
    await db.deposits.create_index("user_id")
    await db.deposits.create_index("status")
    await db.deposits.create_index("method")
    await db.deposits.create_index("created_at")
    await db.services.create_index("category_id")
    await db.services.create_index("platform")
    await db.services.create_index("is_active")
    await db.tickets.create_index("user_id")
    await db.tickets.create_index("status")
    await db.providers.create_index("provider_id", unique=True)
    
    # Check if admin exists
    admin_email = os.environ.get('ADMIN_EMAIL', 'admin@kalia.com')
    admin_password = os.environ.get('ADMIN_PASSWORD', 'Hanumanji22@')
    
    admin = await db.users.find_one({"email": admin_email})
    if not admin:
        logger.info("Creating admin user...")
        admin_user = {
            "user_id": f"admin_{uuid.uuid4().hex[:12]}",
            "email": admin_email,
            "name": "Admin",
            "password_hash": bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
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
    
    # Seed categories if not exist
    categories_count = await db.service_categories.count_documents({})
    if categories_count == 0:
        logger.info("Seeding service categories...")
        categories = [
            {"category_id": "cat_instagram", "name": "Instagram", "platform": "instagram", "icon": "instagram", "order": 1, "is_active": True},
            {"category_id": "cat_youtube", "name": "YouTube", "platform": "youtube", "icon": "youtube", "order": 2, "is_active": True},
            {"category_id": "cat_tiktok", "name": "TikTok", "platform": "tiktok", "icon": "tiktok", "order": 3, "is_active": True},
            {"category_id": "cat_twitter", "name": "Twitter/X", "platform": "twitter", "icon": "twitter", "order": 4, "is_active": True},
            {"category_id": "cat_facebook", "name": "Facebook", "platform": "facebook", "icon": "facebook", "order": 5, "is_active": True},
            {"category_id": "cat_telegram", "name": "Telegram", "platform": "telegram", "icon": "telegram", "order": 6, "is_active": True},
            {"category_id": "cat_spotify", "name": "Spotify", "platform": "spotify", "icon": "spotify", "order": 7, "is_active": True},
            {"category_id": "cat_linkedin", "name": "LinkedIn", "platform": "linkedin", "icon": "linkedin", "order": 8, "is_active": True},
        ]
        await db.service_categories.insert_many(categories)
    
    # Seed services if not exist
    services_count = await db.services.count_documents({})
    if services_count == 0:
        logger.info("Seeding sample services...")
        services = [
            {"service_id": "srv_ig_followers_1", "name": "Instagram Followers [HQ]", "category_id": "cat_instagram", "platform": "instagram", "rate": 2.50, "cost": 1.50, "min_order": 100, "max_order": 100000, "type": "default", "avg_time": "0-6 hours", "is_refillable": True},
            {"service_id": "srv_ig_likes_1", "name": "Instagram Likes [Real]", "category_id": "cat_instagram", "platform": "instagram", "rate": 1.20, "cost": 0.80, "min_order": 50, "max_order": 50000, "type": "default", "avg_time": "0-1 hour"},
            {"service_id": "srv_ig_views_1", "name": "Instagram Views [Fast]", "category_id": "cat_instagram", "platform": "instagram", "rate": 0.50, "cost": 0.30, "min_order": 100, "max_order": 10000000, "type": "default", "avg_time": "0-15 minutes"},
            {"service_id": "srv_yt_views_1", "name": "YouTube Views [High Retention]", "category_id": "cat_youtube", "platform": "youtube", "rate": 3.00, "cost": 2.00, "min_order": 500, "max_order": 1000000, "type": "default", "avg_time": "0-24 hours"},
            {"service_id": "srv_yt_subs_1", "name": "YouTube Subscribers [Real]", "category_id": "cat_youtube", "platform": "youtube", "rate": 8.00, "cost": 6.00, "min_order": 100, "max_order": 100000, "type": "default", "avg_time": "0-48 hours", "is_refillable": True},
            {"service_id": "srv_yt_likes_1", "name": "YouTube Likes", "category_id": "cat_youtube", "platform": "youtube", "rate": 2.00, "cost": 1.50, "min_order": 50, "max_order": 100000, "type": "default", "avg_time": "0-6 hours"},
            {"service_id": "srv_tt_followers_1", "name": "TikTok Followers [Fast]", "category_id": "cat_tiktok", "platform": "tiktok", "rate": 3.50, "cost": 2.50, "min_order": 100, "max_order": 500000, "type": "default", "avg_time": "0-12 hours", "is_refillable": True},
            {"service_id": "srv_tt_likes_1", "name": "TikTok Likes [Real]", "category_id": "cat_tiktok", "platform": "tiktok", "rate": 0.90, "cost": 0.60, "min_order": 50, "max_order": 100000, "type": "default", "avg_time": "0-2 hours"},
            {"service_id": "srv_tt_views_1", "name": "TikTok Views [Instant]", "category_id": "cat_tiktok", "platform": "tiktok", "rate": 0.30, "cost": 0.20, "min_order": 500, "max_order": 10000000, "type": "default", "avg_time": "0-5 minutes"},
            {"service_id": "srv_tw_followers_1", "name": "Twitter/X Followers [HQ]", "category_id": "cat_twitter", "platform": "twitter", "rate": 4.00, "cost": 3.00, "min_order": 100, "max_order": 100000, "type": "default", "avg_time": "0-24 hours", "is_refillable": True},
            {"service_id": "srv_tw_likes_1", "name": "Twitter/X Likes", "category_id": "cat_twitter", "platform": "twitter", "rate": 1.50, "cost": 1.20, "min_order": 50, "max_order": 50000, "type": "default", "avg_time": "0-6 hours"},
            {"service_id": "srv_fb_likes_1", "name": "Facebook Page Likes", "category_id": "cat_facebook", "platform": "facebook", "rate": 5.00, "cost": 4.00, "min_order": 100, "max_order": 100000, "type": "default", "avg_time": "0-48 hours", "is_refillable": True},
            {"service_id": "srv_tg_members_1", "name": "Telegram Members [Real]", "category_id": "cat_telegram", "platform": "telegram", "rate": 1.80, "cost": 1.20, "min_order": 100, "max_order": 200000, "type": "default", "avg_time": "0-24 hours"},
            {"service_id": "srv_sp_plays_1", "name": "Spotify Plays [Premium]", "category_id": "cat_spotify", "platform": "spotify", "rate": 2.00, "cost": 1.50, "min_order": 1000, "max_order": 10000000, "type": "default", "avg_time": "0-48 hours"},
            {"service_id": "srv_li_followers_1", "name": "LinkedIn Followers", "category_id": "cat_linkedin", "platform": "linkedin", "rate": 6.00, "cost": 5.00, "min_order": 100, "max_order": 50000, "type": "default", "avg_time": "0-72 hours", "is_refillable": True},
        ]
        
        for srv in services:
            srv["is_active"] = True
            srv["profit"] = srv["rate"] - srv["cost"]
            srv["created_at"] = datetime.now(timezone.utc).isoformat()
            await db.services.insert_one(srv)
    
    # Seed bonus tiers if not exist
    tiers_count = await db.bonus_tiers.count_documents({})
    if tiers_count == 0:
        logger.info("Seeding bonus tiers...")
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
    
    # Seed bonus settings if not exist
    settings = await db.admin_settings.find_one({})
    if not settings:
        logger.info("Seeding admin settings...")
        await db.admin_settings.insert_one({
            "panel_name": "Social World Panel",
            "bonus_settings": {
                "enabled": True,
                "first_deposit_bonus": True,
                "first_deposit_percent": 10,
                "first_deposit_min": 10
            }
        })
    
    # Seed mock provider if not exist
    provider_count = await db.providers.count_documents({})
    if provider_count == 0:
        logger.info("Seeding mock provider...")
        await db.providers.insert_one({
            "provider_id": "prov_mock_1",
            "name": "Mock SMM Provider",
            "api_url": "https://mock-provider.example.com/api/v2",
            "api_key": "mock_api_key_12345",
            "balance": 999.99,
            "currency": "USD",
            "status": "active",
            "services_count": 25,
            "is_mock": True,
            "notes": "This is a mock provider for testing. It simulates real SMM API responses.",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    logger.info("Social World Panel API started successfully!")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
