from fastapi import APIRouter, HTTPException, Request, Body
from datetime import datetime, timezone

from models.schemas import TicketCreate, Ticket, TicketMessage
from middleware.auth import get_current_user
from services.activity import log_activity

router = APIRouter(prefix="/tickets", tags=["Tickets"])
db = None

def init_router(database):
    global db
    db = database
    return router

@router.post("")
async def create_ticket(request: Request, ticket_data: TicketCreate):
    user = await get_current_user(request, db)
    
    ticket = Ticket(
        user_id=user["user_id"],
        subject=ticket_data.subject,
        priority=ticket_data.priority
    )
    
    ticket_dict = ticket.model_dump()
    ticket_dict["created_at"] = ticket_dict["created_at"].isoformat()
    await db.tickets.insert_one(ticket_dict)
    
    message = TicketMessage(
        ticket_id=ticket.ticket_id,
        user_id=user["user_id"],
        message=ticket_data.message
    )
    message_dict = message.model_dump()
    message_dict["created_at"] = message_dict["created_at"].isoformat()
    await db.ticket_messages.insert_one(message_dict)
    
    await log_activity(db, "new_ticket", "New Ticket", f"#{ticket.ticket_id} - {ticket_data.subject}", user["user_id"], ticket.ticket_id)
    
    return {"ticket_id": ticket.ticket_id, "message": "Ticket created successfully"}

@router.get("")
async def get_tickets(request: Request):
    user = await get_current_user(request, db)
    return await db.tickets.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)

@router.get("/{ticket_id}")
async def get_ticket(request: Request, ticket_id: str):
    user = await get_current_user(request, db)
    ticket = await db.tickets.find_one({"ticket_id": ticket_id, "user_id": user["user_id"]}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    messages = await db.ticket_messages.find({"ticket_id": ticket_id}, {"_id": 0}).sort("created_at", 1).to_list(100)
    return {"ticket": ticket, "messages": messages}

@router.post("/{ticket_id}/reply")
async def reply_ticket(request: Request, ticket_id: str, message: str = Body(..., embed=True)):
    user = await get_current_user(request, db)
    ticket = await db.tickets.find_one({"ticket_id": ticket_id, "user_id": user["user_id"]}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    msg = TicketMessage(ticket_id=ticket_id, user_id=user["user_id"], message=message)
    msg_dict = msg.model_dump()
    msg_dict["created_at"] = msg_dict["created_at"].isoformat()
    await db.ticket_messages.insert_one(msg_dict)
    
    await db.tickets.update_one({"ticket_id": ticket_id}, {"$set": {"status": "open"}})
    return {"message": "Reply sent"}
