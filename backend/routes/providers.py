from fastapi import APIRouter, HTTPException, Request, Body
from datetime import datetime, timezone
import time

from models.schemas import Provider, Service
from middleware.auth import get_admin_user
from services.mock_provider import call_provider_api
from services.activity import log_activity

router = APIRouter(prefix="/admin/providers", tags=["Admin Providers"])
db = None

def init_router(database):
    global db
    db = database
    return router

@router.get("")
async def get_providers(request: Request):
    await get_admin_user(request, db)
    return await db.providers.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)

@router.post("")
async def create_provider(request: Request, data: dict = Body(...)):
    await get_admin_user(request, db)
    
    provider = Provider(**data)
    provider_dict = provider.model_dump()
    provider_dict["created_at"] = provider_dict["created_at"].isoformat()
    if provider_dict.get("last_balance_check"):
        provider_dict["last_balance_check"] = provider_dict["last_balance_check"].isoformat()
    if provider_dict.get("last_sync"):
        provider_dict["last_sync"] = provider_dict["last_sync"].isoformat()
    
    await db.providers.insert_one(provider_dict)
    
    return {"provider_id": provider.provider_id, "message": "Provider created"}

@router.put("/{provider_id}")
async def update_provider(request: Request, provider_id: str, data: dict = Body(...)):
    await get_admin_user(request, db)
    
    result = await db.providers.update_one({"provider_id": provider_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    return {"message": "Provider updated"}

@router.delete("/{provider_id}")
async def delete_provider(request: Request, provider_id: str):
    await get_admin_user(request, db)
    await db.providers.delete_one({"provider_id": provider_id})
    return {"message": "Provider deleted"}

@router.post("/{provider_id}/test")
async def test_provider_connection(request: Request, provider_id: str):
    """Test provider connection"""
    await get_admin_user(request, db)
    
    provider = await db.providers.find_one({"provider_id": provider_id}, {"_id": 0})
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    try:
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

@router.post("/{provider_id}/refresh-balance")
async def refresh_provider_balance(request: Request, provider_id: str):
    """Refresh provider balance"""
    await get_admin_user(request, db)
    
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

@router.get("/{provider_id}/services")
async def get_provider_services(request: Request, provider_id: str):
    """Get services from provider API"""
    await get_admin_user(request, db)
    
    provider = await db.providers.find_one({"provider_id": provider_id}, {"_id": 0})
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    result = await call_provider_api(provider, "services")
    
    if isinstance(result, list):
        return {"services": result, "count": len(result)}
    
    return {"error": result.get("error", "Failed to get services"), "services": []}

@router.get("/{provider_id}/logs")
async def get_provider_logs(request: Request, provider_id: str, limit: int = 10):
    """Get provider activity logs"""
    await get_admin_user(request, db)
    
    logs = await db.provider_logs.find({"provider_id": provider_id}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return logs

@router.post("/{provider_id}/import-services")
async def import_provider_services(request: Request, provider_id: str, data: dict = Body(...)):
    """Import selected services from provider"""
    await get_admin_user(request, db)
    
    provider = await db.providers.find_one({"provider_id": provider_id}, {"_id": 0})
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    service_ids = data.get("service_ids", [])
    markup = data.get("markup", 100)
    
    result = await call_provider_api(provider, "services")
    if not isinstance(result, list):
        raise HTTPException(status_code=400, detail="Failed to get services from provider")
    
    imported = 0
    for srv in result:
        if srv["service"] in service_ids or not service_ids:
            rate = float(srv["rate"]) * (1 + markup / 100)
            
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
    
    services_count = await db.services.count_documents({"provider_id": provider_id})
    await db.providers.update_one(
        {"provider_id": provider_id},
        {"$set": {"services_count": services_count, "last_sync": datetime.now(timezone.utc).isoformat()}}
    )
    
    await log_activity(db, "provider_sync", "Services Imported", f"{imported} services from {provider['name']}")
    
    return {"imported": imported, "message": f"Successfully imported {imported} services"}

@router.post("/{provider_id}/sync-prices")
async def sync_provider_prices(request: Request, provider_id: str, data: dict = Body(...)):
    """Sync prices from provider (update existing services)"""
    await get_admin_user(request, db)
    
    provider = await db.providers.find_one({"provider_id": provider_id}, {"_id": 0})
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    markup = data.get("markup", 100)
    
    result = await call_provider_api(provider, "services")
    if not isinstance(result, list):
        raise HTTPException(status_code=400, detail="Failed to get services from provider")
    
    provider_services = {srv["service"]: srv for srv in result}
    
    updated = 0
    services = await db.services.find({"provider_id": provider_id}, {"_id": 0}).to_list(1000)
    
    for service in services:
        provider_srv = provider_services.get(service.get("provider_service_id"))
        if provider_srv:
            new_cost = float(provider_srv["rate"])
            new_rate = new_cost * (1 + markup / 100)
            
            await db.services.update_one(
                {"service_id": service["service_id"]},
                {"$set": {"cost": new_cost, "rate": round(new_rate, 2)}}
            )
            updated += 1
    
    await db.providers.update_one(
        {"provider_id": provider_id},
        {"$set": {"last_sync": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"updated": updated, "message": f"Updated {updated} service prices"}
