import asyncio
import random
import httpx
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class MockSMMProvider:
    """Simulates a real SMM API provider like JustAnotherPanel"""
    
    MOCK_SERVICES = [
        {"service": "1001", "name": "Instagram Followers [HQ] [Fast]", "type": "Default", "category": "Instagram Followers", "rate": "1.50", "min": "100", "max": "100000", "refill": True, "cancel": True},
        {"service": "1002", "name": "Instagram Likes [Real] [Non Drop]", "type": "Default", "category": "Instagram Likes", "rate": "0.80", "min": "50", "max": "50000", "refill": False, "cancel": True},
        {"service": "1003", "name": "Instagram Views [Fast Start]", "type": "Default", "category": "Instagram Views", "rate": "0.30", "min": "100", "max": "10000000", "refill": False, "cancel": False},
        {"service": "1004", "name": "Instagram Reel Views [Real]", "type": "Default", "category": "Instagram Views", "rate": "0.50", "min": "500", "max": "5000000", "refill": False, "cancel": False},
        {"service": "1005", "name": "Instagram Comments [Custom]", "type": "Custom Comments", "category": "Instagram Comments", "rate": "4.00", "min": "10", "max": "10000", "refill": False, "cancel": True},
        {"service": "2001", "name": "YouTube Views [High Retention]", "type": "Default", "category": "YouTube Views", "rate": "2.00", "min": "500", "max": "1000000", "refill": False, "cancel": True},
        {"service": "2002", "name": "YouTube Subscribers [Real]", "type": "Default", "category": "YouTube Subscribers", "rate": "6.00", "min": "100", "max": "100000", "refill": True, "cancel": True},
        {"service": "2003", "name": "YouTube Likes", "type": "Default", "category": "YouTube Likes", "rate": "1.50", "min": "50", "max": "100000", "refill": False, "cancel": True},
        {"service": "2004", "name": "YouTube Watch Time [4000 Hours]", "type": "Default", "category": "YouTube Watch Time", "rate": "150.00", "min": "1", "max": "10", "refill": False, "cancel": False},
        {"service": "3001", "name": "TikTok Followers [Fast]", "type": "Default", "category": "TikTok Followers", "rate": "2.50", "min": "100", "max": "500000", "refill": True, "cancel": True},
        {"service": "3002", "name": "TikTok Likes [Real]", "type": "Default", "category": "TikTok Likes", "rate": "0.60", "min": "50", "max": "100000", "refill": False, "cancel": True},
        {"service": "3003", "name": "TikTok Views [Instant]", "type": "Default", "category": "TikTok Views", "rate": "0.20", "min": "500", "max": "10000000", "refill": False, "cancel": False},
        {"service": "3004", "name": "TikTok Shares", "type": "Default", "category": "TikTok Engagement", "rate": "1.00", "min": "100", "max": "50000", "refill": False, "cancel": True},
        {"service": "4001", "name": "Twitter/X Followers [HQ]", "type": "Default", "category": "Twitter Followers", "rate": "3.00", "min": "100", "max": "100000", "refill": True, "cancel": True},
        {"service": "4002", "name": "Twitter/X Likes", "type": "Default", "category": "Twitter Likes", "rate": "1.20", "min": "50", "max": "50000", "refill": False, "cancel": True},
        {"service": "4003", "name": "Twitter/X Retweets", "type": "Default", "category": "Twitter Engagement", "rate": "1.50", "min": "50", "max": "50000", "refill": False, "cancel": True},
        {"service": "5001", "name": "Facebook Page Likes", "type": "Default", "category": "Facebook Likes", "rate": "4.00", "min": "100", "max": "100000", "refill": True, "cancel": True},
        {"service": "5002", "name": "Facebook Post Likes", "type": "Default", "category": "Facebook Likes", "rate": "1.00", "min": "50", "max": "50000", "refill": False, "cancel": True},
        {"service": "5003", "name": "Facebook Followers", "type": "Default", "category": "Facebook Followers", "rate": "2.50", "min": "100", "max": "100000", "refill": True, "cancel": True},
        {"service": "6001", "name": "Telegram Members [Real]", "type": "Default", "category": "Telegram Members", "rate": "1.20", "min": "100", "max": "200000", "refill": False, "cancel": True},
        {"service": "6002", "name": "Telegram Post Views", "type": "Default", "category": "Telegram Views", "rate": "0.15", "min": "100", "max": "1000000", "refill": False, "cancel": False},
        {"service": "7001", "name": "Spotify Plays [Premium]", "type": "Default", "category": "Spotify Plays", "rate": "1.50", "min": "1000", "max": "10000000", "refill": False, "cancel": True},
        {"service": "7002", "name": "Spotify Followers", "type": "Default", "category": "Spotify Followers", "rate": "3.00", "min": "100", "max": "100000", "refill": True, "cancel": True},
        {"service": "8001", "name": "LinkedIn Followers", "type": "Default", "category": "LinkedIn Followers", "rate": "5.00", "min": "100", "max": "50000", "refill": True, "cancel": True},
        {"service": "8002", "name": "LinkedIn Post Likes", "type": "Default", "category": "LinkedIn Engagement", "rate": "2.00", "min": "50", "max": "10000", "refill": False, "cancel": True},
    ]
    
    @classmethod
    async def get_balance(cls) -> Dict[str, Any]:
        await asyncio.sleep(0.3)
        return {"balance": str(round(random.uniform(500, 2000), 2)), "currency": "USD"}
    
    @classmethod
    async def get_services(cls) -> List[Dict[str, Any]]:
        await asyncio.sleep(0.5)
        return cls.MOCK_SERVICES
    
    @classmethod
    async def place_order(cls, service: str, link: str, quantity: int) -> Dict[str, Any]:
        await asyncio.sleep(0.4)
        order_id = random.randint(100000, 999999)
        return {"order": order_id}
    
    @classmethod
    async def get_order_status(cls, order_id: str) -> Dict[str, Any]:
        await asyncio.sleep(0.3)
        statuses = ["Pending", "In progress", "Processing", "Completed", "Partial"]
        weights = [0.1, 0.2, 0.2, 0.4, 0.1]
        status = random.choices(statuses, weights=weights)[0]
        
        start_count = random.randint(100, 10000)
        remains = 0 if status == "Completed" else random.randint(0, 500)
        
        return {
            "charge": str(round(random.uniform(0.5, 10), 2)),
            "start_count": str(start_count),
            "status": status,
            "remains": str(remains)
        }

async def call_provider_api(provider: Dict[str, Any], action: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
    """Call provider API - supports both mock and real providers"""
    
    if provider.get("is_mock"):
        if action == "balance":
            return await MockSMMProvider.get_balance()
        elif action == "services":
            return await MockSMMProvider.get_services()
        elif action == "add":
            return await MockSMMProvider.place_order(params.get("service"), params.get("link"), params.get("quantity"))
        elif action == "status":
            return await MockSMMProvider.get_order_status(params.get("order"))
        else:
            return {"error": "Invalid action"}
    else:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                data = {"key": provider["api_key"], "action": action}
                if params:
                    data.update(params)
                response = await client.post(provider["api_url"], data=data)
                return response.json()
        except Exception as e:
            logger.error(f"Provider API error: {e}")
            return {"error": str(e)}
