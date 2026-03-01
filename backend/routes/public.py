from fastapi import APIRouter
import random

router = APIRouter(prefix="/public", tags=["Public"])
db = None

def init_router(database):
    global db
    db = database
    return router

@router.get("/stats")
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

@router.get("/services")
async def get_public_services():
    return await db.services.find({"is_active": True}, {"_id": 0}).limit(20).to_list(20)

@router.get("/categories")
async def get_public_categories():
    return await db.service_categories.find({"is_active": True}, {"_id": 0}).sort("order", 1).to_list(50)

@router.get("/promotions")
async def get_active_promotions():
    """Get active bonus promotions for display"""
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    
    promotions = await db.bonus_promotions.find({"is_active": True}, {"_id": 0}).to_list(10)
    active = []
    for promo in promotions:
        start = promo.get("start_date")
        end = promo.get("end_date")
        if isinstance(start, str):
            start = datetime.fromisoformat(start)
        if isinstance(end, str):
            end = datetime.fromisoformat(end)
        
        if start <= now <= end:
            active.append(promo)
    
    return active
