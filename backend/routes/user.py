from fastapi import APIRouter, HTTPException, Request, Body, Query
from pydantic import EmailStr
from datetime import datetime, timezone
import uuid

from middleware.auth import get_current_user

router = APIRouter(prefix="/user", tags=["User"])
db = None

def init_router(database):
    global db
    db = database
    return router

@router.get("/profile")
async def get_user_profile(request: Request):
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

@router.put("/profile")
async def update_profile(request: Request, name: str = Body(None), email: EmailStr = Body(None)):
    user = await get_current_user(request, db)
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if name:
        update_data["name"] = name
    if email:
        update_data["email"] = email
    
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": update_data})
    return {"message": "Profile updated"}

@router.get("/stats")
async def get_user_stats(request: Request):
    user = await get_current_user(request, db)
    
    total_orders = await db.orders.count_documents({"user_id": user["user_id"]})
    pending_orders = await db.orders.count_documents({"user_id": user["user_id"], "status": "pending"})
    completed_orders = await db.orders.count_documents({"user_id": user["user_id"], "status": "completed"})
    
    return {
        "balance": user.get("balance", 0.0),
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "completed_orders": completed_orders
    }

@router.get("/api-key")
async def get_api_key(request: Request):
    user = await get_current_user(request, db)
    api_key = user.get("api_key")
    if not api_key:
        api_key = f"swp_{uuid.uuid4().hex}"
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"api_key": api_key}})
    return {"api_key": api_key}

@router.post("/api-key/regenerate")
async def regenerate_api_key(request: Request):
    user = await get_current_user(request, db)
    api_key = f"swp_{uuid.uuid4().hex}"
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"api_key": api_key}})
    return {"api_key": api_key}
