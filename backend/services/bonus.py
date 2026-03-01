from datetime import datetime, timezone
from typing import Dict

async def calculate_bonus(db, user: Dict, amount: float, method: str) -> float:
    """Calculate bonus for a deposit based on tiers and promotions"""
    settings = await db.admin_settings.find_one({}, {"_id": 0})
    bonus_settings = settings.get("bonus_settings", {}) if settings else {}
    
    if not bonus_settings.get("enabled", True):
        return 0.0
    
    total_bonus = 0.0
    
    # Check first deposit bonus
    if user.get("is_first_deposit") and bonus_settings.get("first_deposit_bonus"):
        if amount >= bonus_settings.get("first_deposit_min", 0):
            total_bonus = amount * (bonus_settings.get("first_deposit_percent", 0) / 100)
    
    # Check tiered bonuses
    tiers = await db.bonus_tiers.find({"is_active": True}).sort("min_amount", 1).to_list(100)
    for tier in tiers:
        if tier["min_amount"] <= amount <= tier["max_amount"]:
            if not tier.get("payment_methods") or method in tier["payment_methods"]:
                tier_bonus = amount * (tier["bonus_percent"] / 100)
                total_bonus = max(total_bonus, tier_bonus)
                break
    
    # Check active promotions
    now = datetime.now(timezone.utc)
    promotions = await db.bonus_promotions.find({"is_active": True}).to_list(100)
    for promo in promotions:
        start = promo.get("start_date")
        end = promo.get("end_date")
        if isinstance(start, str):
            start = datetime.fromisoformat(start)
        if isinstance(end, str):
            end = datetime.fromisoformat(end)
        
        if start <= now <= end and amount >= promo.get("min_deposit", 0):
            promo_bonus = amount * (promo["bonus_percent"] / 100)
            if promo.get("max_bonus"):
                promo_bonus = min(promo_bonus, promo["max_bonus"])
            total_bonus = max(total_bonus, promo_bonus)
    
    return round(total_bonus, 2)
