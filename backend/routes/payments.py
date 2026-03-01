from fastapi import APIRouter, HTTPException, Request, Query, Body
from datetime import datetime, timezone
import uuid

from models.schemas import DepositCreate, Deposit
from middleware.auth import get_current_user
from services.bonus import calculate_bonus
from services.activity import log_activity

router = APIRouter(prefix="/deposits", tags=["Deposits"])
db = None

def init_router(database):
    global db
    db = database
    return router

@router.get("/bonus-preview")
async def preview_bonus(request: Request, amount: float, method: str):
    """Preview bonus before making deposit"""
    user = await get_current_user(request, db)
    bonus = await calculate_bonus(db, user, amount, method)
    return {"amount": amount, "bonus": bonus, "total": amount + bonus}

@router.post("")
async def create_deposit(request: Request, deposit_data: DepositCreate):
    user = await get_current_user(request, db)
    
    if deposit_data.amount < 1:
        raise HTTPException(status_code=400, detail="Minimum deposit: $1")
    
    bonus_amount = await calculate_bonus(db, user, deposit_data.amount, deposit_data.method)
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
    
    await log_activity(db, "new_payment", "New Payment", f"${deposit_data.amount} via {deposit_data.method} (Bonus: ${bonus_amount})", user["user_id"], deposit.deposit_id)
    
    return {
        "deposit_id": deposit.deposit_id,
        "amount": deposit_data.amount,
        "bonus": bonus_amount,
        "total": total_amount,
        "method": deposit_data.method,
        "status": "completed",
        "message": f"Deposit successful! Bonus: ${bonus_amount}"
    }

@router.get("")
async def get_deposits(request: Request, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100)):
    user = await get_current_user(request, db)
    skip = (page - 1) * limit
    
    deposits = await db.deposits.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.deposits.count_documents({"user_id": user["user_id"]})
    
    return {"deposits": deposits, "total": total, "page": page, "pages": (total + limit - 1) // limit}
