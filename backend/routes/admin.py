from fastapi import APIRouter, HTTPException, Request, Body, Query, UploadFile, File
from fastapi.responses import FileResponse
from datetime import datetime, timezone, timedelta
import random
import csv
import io
import os
import uuid
import base64

from middleware.auth import get_admin_user
from models.schemas import BonusTier, BonusPromotion, BonusSettings, TicketMessage, Service, ServiceCategory

router = APIRouter(prefix="/admin", tags=["Admin"])
db = None

def init_router(database):
    global db
    db = database
    return router

# ==================== DASHBOARD ====================

@router.get("/dashboard")
async def get_admin_dashboard(request: Request):
    await get_admin_user(request, db)
    
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    month_start = today_start - timedelta(days=30)
    
    total_users = await db.users.count_documents({})
    new_users_today = await db.users.count_documents({"created_at": {"$gte": today_start.isoformat()}})
    total_orders = await db.orders.count_documents({})
    pending_orders = await db.orders.count_documents({"status": "pending"})
    processing_orders = await db.orders.count_documents({"status": "processing"})
    completed_orders = await db.orders.count_documents({"status": "completed"})
    failed_orders = await db.orders.count_documents({"status": "failed"})
    cancelled_orders = await db.orders.count_documents({"status": "cancelled"})
    
    revenue_pipeline = [{"$group": {"_id": None, "total": {"$sum": "$charge"}, "cost": {"$sum": "$cost"}}}]
    revenue_result = await db.orders.aggregate(revenue_pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    total_cost = revenue_result[0]["cost"] if revenue_result else 0
    total_profit = total_revenue - total_cost
    
    today_orders = await db.orders.find({"created_at": {"$gte": today_start.isoformat()}}, {"_id": 0}).to_list(10000)
    revenue_today = sum(o.get("charge", 0) for o in today_orders)
    profit_today = sum(o.get("profit", 0) for o in today_orders)
    orders_today = len(today_orders)
    
    week_orders = await db.orders.find({"created_at": {"$gte": week_start.isoformat()}}, {"_id": 0}).to_list(10000)
    revenue_week = sum(o.get("charge", 0) for o in week_orders)
    
    month_orders = await db.orders.find({"created_at": {"$gte": month_start.isoformat()}}, {"_id": 0}).to_list(10000)
    revenue_month = sum(o.get("charge", 0) for o in month_orders)
    
    providers = await db.providers.find({}, {"_id": 0}).to_list(100)
    active_providers = len([p for p in providers if p.get("status") == "active"])
    low_balance_providers = [p for p in providers if p.get("balance", 0) < 10]
    
    recent_orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    recent_deposits = await db.deposits.find({}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    
    return {
        "total_users": total_users,
        "new_users_today": new_users_today,
        "total_orders": total_orders,
        "orders_today": orders_today,
        "pending_orders": pending_orders,
        "processing_orders": processing_orders,
        "completed_orders": completed_orders,
        "failed_orders": failed_orders,
        "cancelled_orders": cancelled_orders,
        "revenue_today": round(revenue_today, 2),
        "profit_today": round(profit_today, 2),
        "revenue_week": round(revenue_week, 2),
        "revenue_month": round(revenue_month, 2),
        "revenue_total": round(total_revenue, 2),
        "total_cost": round(total_cost, 2),
        "total_profit": round(total_profit, 2),
        "active_providers": active_providers,
        "providers": providers,
        "low_balance_providers": low_balance_providers,
        "recent_orders": recent_orders,
        "recent_deposits": recent_deposits
    }

@router.get("/dashboard/charts")
async def get_admin_charts(request: Request):
    """Get chart data for admin dashboard"""
    await get_admin_user(request, db)
    
    now = datetime.now(timezone.utc)
    
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
        {"$limit": 5}
    ]
    top_services = await db.orders.aggregate(top_services_pipeline).to_list(5)
    top_services = [{"name": s["_id"] or "Unknown", "orders": s["count"], "revenue": round(s["revenue"], 2)} for s in top_services]
    
    # Orders by status
    status_pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    orders_by_status = await db.orders.aggregate(status_pipeline).to_list(10)
    orders_by_status = [{"status": s["_id"] or "unknown", "count": s["count"]} for s in orders_by_status]
    
    # Revenue by payment method
    payment_pipeline = [
        {"$match": {"status": "completed"}},
        {"$group": {"_id": "$method", "amount": {"$sum": "$total_amount"}, "count": {"$sum": 1}}}
    ]
    revenue_by_method = await db.deposits.aggregate(payment_pipeline).to_list(10)
    revenue_by_method = [{"method": r["_id"] or "unknown", "amount": round(r["amount"], 2), "count": r["count"]} for r in revenue_by_method]
    
    return {
        "revenue_by_day": revenue_by_day,
        "users_by_day": users_by_day,
        "top_services": top_services,
        "orders_by_status": orders_by_status,
        "revenue_by_method": revenue_by_method
    }

@router.get("/activity-feed")
async def get_activity_feed(request: Request, limit: int = 20):
    """Get recent activity feed"""
    await get_admin_user(request, db)
    
    activities = await db.activity_logs.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return activities

# ==================== BONUS MANAGEMENT ====================

@router.get("/bonus/tiers")
async def get_bonus_tiers(request: Request):
    await get_admin_user(request, db)
    return await db.bonus_tiers.find({}, {"_id": 0}).sort("min_amount", 1).to_list(100)

@router.post("/bonus/tiers")
async def create_bonus_tier(request: Request, data: dict = Body(...)):
    await get_admin_user(request, db)
    
    tier = BonusTier(**data)
    tier_dict = tier.model_dump()
    tier_dict["created_at"] = tier_dict["created_at"].isoformat()
    await db.bonus_tiers.insert_one(tier_dict)
    
    return {"tier_id": tier.tier_id, "message": "Bonus tier created"}

@router.put("/bonus/tiers/{tier_id}")
async def update_bonus_tier(request: Request, tier_id: str, data: dict = Body(...)):
    await get_admin_user(request, db)
    
    result = await db.bonus_tiers.update_one({"tier_id": tier_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tier not found")
    
    return {"message": "Tier updated"}

@router.delete("/bonus/tiers/{tier_id}")
async def delete_bonus_tier(request: Request, tier_id: str):
    await get_admin_user(request, db)
    await db.bonus_tiers.delete_one({"tier_id": tier_id})
    return {"message": "Tier deleted"}

@router.get("/bonus/promotions")
async def get_bonus_promotions(request: Request):
    await get_admin_user(request, db)
    return await db.bonus_promotions.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)

@router.post("/bonus/promotions")
async def create_bonus_promotion(request: Request, data: dict = Body(...)):
    await get_admin_user(request, db)
    
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

@router.put("/bonus/promotions/{promo_id}")
async def update_bonus_promotion(request: Request, promo_id: str, data: dict = Body(...)):
    await get_admin_user(request, db)
    
    if isinstance(data.get("start_date"), str):
        data["start_date"] = data["start_date"]
    if isinstance(data.get("end_date"), str):
        data["end_date"] = data["end_date"]
    
    result = await db.bonus_promotions.update_one({"promo_id": promo_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Promotion not found")
    
    return {"message": "Promotion updated"}

@router.delete("/bonus/promotions/{promo_id}")
async def delete_bonus_promotion(request: Request, promo_id: str):
    await get_admin_user(request, db)
    await db.bonus_promotions.delete_one({"promo_id": promo_id})
    return {"message": "Promotion deleted"}

@router.get("/bonus/settings")
async def get_bonus_settings(request: Request):
    await get_admin_user(request, db)
    settings = await db.admin_settings.find_one({}, {"_id": 0})
    return settings.get("bonus_settings", BonusSettings().model_dump()) if settings else BonusSettings().model_dump()

@router.put("/bonus/settings")
async def update_bonus_settings(request: Request, data: dict = Body(...)):
    await get_admin_user(request, db)
    await db.admin_settings.update_one({}, {"$set": {"bonus_settings": data}}, upsert=True)
    return {"message": "Bonus settings updated"}

# ==================== SERVICES MANAGEMENT ====================

@router.get("/services")
async def admin_get_services(request: Request, page: int = Query(1, ge=1), limit: int = Query(50, ge=1, le=200)):
    await get_admin_user(request, db)
    skip = (page - 1) * limit
    services = await db.services.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.services.count_documents({})
    return {"services": services, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@router.post("/services")
async def admin_create_service(request: Request, data: dict = Body(...)):
    await get_admin_user(request, db)
    service = Service(**data)
    srv_dict = service.model_dump()
    srv_dict["created_at"] = srv_dict["created_at"].isoformat()
    await db.services.insert_one(srv_dict)
    return {"service_id": service.service_id, "message": "Service created"}

@router.put("/services/{service_id}")
async def admin_update_service(request: Request, service_id: str, data: dict = Body(...)):
    await get_admin_user(request, db)
    result = await db.services.update_one({"service_id": service_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"message": "Service updated"}

@router.delete("/services/{service_id}")
async def admin_delete_service(request: Request, service_id: str):
    await get_admin_user(request, db)
    await db.services.delete_one({"service_id": service_id})
    return {"message": "Service deleted"}

@router.get("/categories")
async def admin_get_categories(request: Request):
    await get_admin_user(request, db)
    return await db.service_categories.find({}, {"_id": 0}).sort("order", 1).to_list(100)

@router.post("/categories")
async def admin_create_category(request: Request, data: dict = Body(...)):
    await get_admin_user(request, db)
    category = ServiceCategory(**data)
    cat_dict = category.model_dump()
    await db.service_categories.insert_one(cat_dict)
    return {"category_id": category.category_id, "message": "Category created"}

# ==================== ORDERS MANAGEMENT ====================

@router.get("/orders")
async def admin_get_orders(request: Request, status: str = None, page: int = Query(1, ge=1), limit: int = Query(50, ge=1, le=200)):
    await get_admin_user(request, db)
    query = {}
    if status:
        query["status"] = status
    skip = (page - 1) * limit
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.orders.count_documents(query)
    return {"orders": orders, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@router.put("/orders/{order_id}")
async def admin_update_order(request: Request, order_id: str, data: dict = Body(...)):
    await get_admin_user(request, db)
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.orders.update_one({"order_id": order_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Order updated"}

@router.post("/orders/{order_id}/refund")
async def admin_refund_order(request: Request, order_id: str):
    await get_admin_user(request, db)
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    await db.users.update_one({"user_id": order["user_id"]}, {"$inc": {"balance": order["charge"]}})
    await db.orders.update_one({"order_id": order_id}, {"$set": {"status": "refunded", "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"message": "Order refunded"}

# ==================== USERS MANAGEMENT ====================

@router.get("/users")
async def admin_get_users(request: Request, page: int = Query(1, ge=1), limit: int = Query(50, ge=1, le=200)):
    await get_admin_user(request, db)
    skip = (page - 1) * limit
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents({})
    return {"users": users, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@router.get("/users/{user_id}")
async def admin_get_user(request: Request, user_id: str):
    await get_admin_user(request, db)
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    orders = await db.orders.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).limit(20).to_list(20)
    deposits = await db.deposits.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).limit(20).to_list(20)
    
    return {"user": user, "orders": orders, "deposits": deposits}

@router.put("/users/{user_id}")
async def admin_update_user(request: Request, user_id: str, data: dict = Body(...)):
    await get_admin_user(request, db)
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.users.update_one({"user_id": user_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User updated"}

@router.post("/users/{user_id}/add-balance")
async def admin_add_balance(request: Request, user_id: str, amount: float = Body(..., embed=True)):
    await get_admin_user(request, db)
    result = await db.users.update_one({"user_id": user_id}, {"$inc": {"balance": amount}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": f"Added ${amount} to user balance"}

# ==================== TICKETS MANAGEMENT ====================

@router.get("/tickets")
async def admin_get_tickets(request: Request, status: str = None, page: int = Query(1, ge=1), limit: int = Query(50, ge=1, le=200)):
    await get_admin_user(request, db)
    query = {}
    if status:
        query["status"] = status
    skip = (page - 1) * limit
    tickets = await db.tickets.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.tickets.count_documents(query)
    return {"tickets": tickets, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@router.get("/tickets/{ticket_id}")
async def admin_get_ticket(request: Request, ticket_id: str):
    await get_admin_user(request, db)
    ticket = await db.tickets.find_one({"ticket_id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    messages = await db.ticket_messages.find({"ticket_id": ticket_id}, {"_id": 0}).sort("created_at", 1).to_list(100)
    user = await db.users.find_one({"user_id": ticket["user_id"]}, {"_id": 0, "password_hash": 0})
    
    return {"ticket": ticket, "messages": messages, "user": user}

@router.post("/tickets/{ticket_id}/reply")
async def admin_reply_ticket(request: Request, ticket_id: str, message: str = Body(..., embed=True)):
    admin = await get_admin_user(request, db)
    
    ticket = await db.tickets.find_one({"ticket_id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    msg = TicketMessage(ticket_id=ticket_id, user_id=admin["user_id"], message=message, is_admin=True)
    msg_dict = msg.model_dump()
    msg_dict["created_at"] = msg_dict["created_at"].isoformat()
    await db.ticket_messages.insert_one(msg_dict)
    
    await db.tickets.update_one({"ticket_id": ticket_id}, {"$set": {"status": "answered"}})
    return {"message": "Reply sent"}

@router.put("/tickets/{ticket_id}/status")
async def admin_update_ticket_status(request: Request, ticket_id: str, status: str = Body(..., embed=True)):
    await get_admin_user(request, db)
    result = await db.tickets.update_one({"ticket_id": ticket_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {"message": "Ticket status updated"}

# ==================== SETTINGS ====================

@router.get("/settings")
async def admin_get_settings(request: Request):
    await get_admin_user(request, db)
    settings = await db.admin_settings.find_one({}, {"_id": 0})
    return settings or {}

@router.put("/settings")
async def admin_update_settings(request: Request, data: dict = Body(...)):
    await get_admin_user(request, db)
    await db.admin_settings.update_one({}, {"$set": data}, upsert=True)
    return {"message": "Settings updated"}
