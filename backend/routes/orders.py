from fastapi import APIRouter, HTTPException, Request, Query, BackgroundTasks
from typing import Optional, Dict
from datetime import datetime, timezone
import logging

from models.schemas import OrderCreate, Order
from middleware.auth import get_current_user
from services.activity import log_activity
from services.mock_provider import call_provider_api

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/orders", tags=["Orders"])
db = None

def init_router(database):
    global db
    db = database
    return router

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
            await log_activity(db, "failed_order", "Order Failed", f"Order {order_id} - {result.get('error')}", reference_id=order_id)
    except Exception as e:
        logger.error(f"Error sending order to provider: {e}")

@router.post("", status_code=201)
async def create_order(request: Request, order_data: OrderCreate, background_tasks: BackgroundTasks):
    user = await get_current_user(request, db)
    
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
    
    await log_activity(db, "new_order", "New Order", f"Order {order.order_id} - {service['name']}", user["user_id"], order.order_id)
    
    if service.get("provider_id"):
        background_tasks.add_task(send_order_to_provider, order.order_id, service, order_data.link, order_data.quantity)
    
    return {"order_id": order.order_id, "charge": charge, "message": "Order placed successfully"}

@router.get("")
async def get_orders(
    request: Request,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    user = await get_current_user(request, db)
    query = {"user_id": user["user_id"]}
    if status:
        query["status"] = status
    
    skip = (page - 1) * limit
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.orders.count_documents(query)
    
    return {"orders": orders, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@router.get("/{order_id}")
async def get_order(request: Request, order_id: str):
    user = await get_current_user(request, db)
    order = await db.orders.find_one({"order_id": order_id, "user_id": user["user_id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@router.post("/{order_id}/refill")
async def refill_order(request: Request, order_id: str):
    user = await get_current_user(request, db)
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
