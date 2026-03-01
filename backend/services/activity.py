from datetime import datetime, timezone
from models.schemas import ActivityLog

async def log_activity(db, activity_type: str, title: str, description: str, user_id: str = None, reference_id: str = None):
    """Log an activity to the database"""
    log = ActivityLog(
        type=activity_type, 
        title=title, 
        description=description, 
        user_id=user_id, 
        reference_id=reference_id
    )
    log_dict = log.model_dump()
    log_dict["created_at"] = log_dict["created_at"].isoformat()
    await db.activity_logs.insert_one(log_dict)
