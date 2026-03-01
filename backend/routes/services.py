from fastapi import APIRouter, HTTPException, Request, Query
from typing import Optional

router = APIRouter(prefix="/services", tags=["Services"])
db = None

def init_router(database):
    global db
    db = database
    return router

@router.get("/categories")
async def get_categories():
    return await db.service_categories.find({"is_active": True}, {"_id": 0}).sort("order", 1).to_list(100)

@router.get("")
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

@router.get("/{service_id}")
async def get_service(service_id: str):
    service = await db.services.find_one({"service_id": service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service
