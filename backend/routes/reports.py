from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone, timedelta
import csv
import io

from middleware.auth import get_admin_user

router = APIRouter(prefix="/admin/reports", tags=["Admin Reports"])
db = None

def init_router(database):
    global db
    db = database
    return router

def parse_date(date_str: str, default_days_ago: int = 30):
    """Parse date string or return default"""
    if date_str:
        return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    return datetime.now(timezone.utc) - timedelta(days=default_days_ago)


def _deposit_created_at_range_filter(start: datetime, end: datetime) -> dict:
    """created_at may be stored as ISO string (Node) or BSON datetime (some inserts)."""
    start_s = start.isoformat()
    end_s = end.isoformat()
    return {
        "$or": [
            {"created_at": {"$gte": start_s, "$lte": end_s}},
            {"created_at": {"$gte": start, "$lte": end}},
        ]
    }


def _deposit_row_amount(d: dict) -> float:
    u = d.get("amount_usd")
    if u is not None and u != "":
        try:
            v = float(u)
            if v == v:
                return v
        except (TypeError, ValueError):
            pass
    for key in ("amount_inr", "amount_php", "amount"):
        val = d.get(key)
        if val is None or val == "":
            continue
        try:
            return float(val)
        except (TypeError, ValueError):
            continue
    return 0.0


def _deposit_bonus(d: dict) -> float:
    for key in ("bonus_amount", "bonus"):
        v = d.get(key)
        if v is None:
            continue
        try:
            return float(v)
        except (TypeError, ValueError):
            continue
    return 0.0


def _deposit_sort_ts(d: dict) -> float:
    c = d.get("created_at")
    if isinstance(c, datetime):
        return c.timestamp()
    if isinstance(c, str):
        try:
            return datetime.fromisoformat(c.replace("Z", "+00:00")).timestamp()
        except Exception:
            return 0.0
    try:
        if c is not None and hasattr(c, "timestamp"):
            return float(c.timestamp())
    except Exception:
        pass
    return 0.0


@router.get("/revenue")
async def get_revenue_report(request: Request, start_date: str = None, end_date: str = None):
    await get_admin_user(request, db)
    
    now = datetime.now(timezone.utc)
    start = parse_date(start_date, 30) if start_date else (now - timedelta(days=30)).replace(hour=0, minute=0, second=0, microsecond=0)
    end = parse_date(end_date, 0) if end_date else now
    
    orders = await db.orders.find({
        "created_at": {"$gte": start.isoformat(), "$lte": end.isoformat()}
    }, {"_id": 0}).to_list(100000)
    
    total_revenue = sum(o.get("charge", 0) for o in orders)
    total_cost = sum(o.get("cost", 0) for o in orders)
    total_profit = total_revenue - total_cost
    profit_margin = (total_profit / total_revenue * 100) if total_revenue > 0 else 0
    avg_order_value = total_revenue / len(orders) if orders else 0
    
    # Revenue by day
    revenue_by_day = {}
    for order in orders:
        created = order.get("created_at", "")
        if isinstance(created, str):
            day = created[:10]
        else:
            day = created.strftime("%Y-%m-%d")
        
        if day not in revenue_by_day:
            revenue_by_day[day] = {"revenue": 0, "cost": 0, "profit": 0, "orders": 0}
        revenue_by_day[day]["revenue"] += order.get("charge", 0)
        revenue_by_day[day]["cost"] += order.get("cost", 0)
        revenue_by_day[day]["profit"] += order.get("profit", 0)
        revenue_by_day[day]["orders"] += 1
    
    # Payment method breakdown
    deposits = await db.deposits.find({
        "created_at": {"$gte": start.isoformat(), "$lte": end.isoformat()},
        "status": "completed"
    }, {"_id": 0}).to_list(100000)
    
    by_method = {}
    total_bonuses = 0
    for d in deposits:
        method = d.get("method", "unknown")
        if method not in by_method:
            by_method[method] = {"amount": 0, "bonus": 0, "count": 0}
        by_method[method]["amount"] += d.get("amount", 0)
        by_method[method]["bonus"] += d.get("bonus_amount", 0)
        by_method[method]["count"] += 1
        total_bonuses += d.get("bonus_amount", 0)
    
    return {
        "period": {"start": start.isoformat(), "end": end.isoformat()},
        "summary": {
            "total_revenue": round(total_revenue, 2),
            "total_cost": round(total_cost, 2),
            "total_profit": round(total_profit, 2),
            "profit_margin": round(profit_margin, 2),
            "total_orders": len(orders),
            "avg_order_value": round(avg_order_value, 2),
            "total_bonuses_given": round(total_bonuses, 2)
        },
        "by_day": [{"date": k, **{kk: round(vv, 2) if isinstance(vv, float) else vv for kk, vv in v.items()}} for k, v in sorted(revenue_by_day.items())],
        "by_payment_method": [{"method": k, **{kk: round(vv, 2) if isinstance(vv, float) else vv for kk, vv in v.items()}} for k, v in by_method.items()]
    }

@router.get("/revenue/export")
async def export_revenue_report(request: Request, start_date: str = None, end_date: str = None):
    await get_admin_user(request, db)
    
    report = await get_revenue_report(request, start_date, end_date)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(["Revenue Report"])
    writer.writerow(["Period", report["period"]["start"], "to", report["period"]["end"]])
    writer.writerow([])
    writer.writerow(["Summary"])
    writer.writerow(["Total Revenue", report["summary"]["total_revenue"]])
    writer.writerow(["Total Cost", report["summary"]["total_cost"]])
    writer.writerow(["Total Profit", report["summary"]["total_profit"]])
    writer.writerow(["Profit Margin %", report["summary"]["profit_margin"]])
    writer.writerow(["Total Orders", report["summary"]["total_orders"]])
    writer.writerow(["Avg Order Value", report["summary"]["avg_order_value"]])
    writer.writerow([])
    writer.writerow(["Daily Breakdown"])
    writer.writerow(["Date", "Revenue", "Cost", "Profit", "Orders"])
    for day in report["by_day"]:
        writer.writerow([day["date"], day["revenue"], day["cost"], day["profit"], day["orders"]])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=revenue_report.csv"}
    )

@router.get("/profit")
async def get_profit_report(request: Request, start_date: str = None, end_date: str = None):
    await get_admin_user(request, db)
    
    now = datetime.now(timezone.utc)
    start = parse_date(start_date, 30) if start_date else (now - timedelta(days=30)).replace(hour=0, minute=0, second=0, microsecond=0)
    end = parse_date(end_date, 0) if end_date else now
    
    orders = await db.orders.find({
        "created_at": {"$gte": start.isoformat(), "$lte": end.isoformat()}
    }, {"_id": 0}).to_list(100000)
    
    gross_revenue = sum(o.get("charge", 0) for o in orders)
    provider_costs = sum(o.get("cost", 0) for o in orders)
    net_profit = gross_revenue - provider_costs
    profit_margin = (net_profit / gross_revenue * 100) if gross_revenue > 0 else 0
    
    # Profit by day
    profit_by_day = {}
    for order in orders:
        created = order.get("created_at", "")
        if isinstance(created, str):
            day = created[:10]
        else:
            day = created.strftime("%Y-%m-%d")
        
        if day not in profit_by_day:
            profit_by_day[day] = {"gross": 0, "cost": 0, "net": 0}
        profit_by_day[day]["gross"] += order.get("charge", 0)
        profit_by_day[day]["cost"] += order.get("cost", 0)
        profit_by_day[day]["net"] += order.get("profit", 0)
    
    # Profit by service
    profit_by_service = {}
    for order in orders:
        service = order.get("service_name", "Unknown")
        if service not in profit_by_service:
            profit_by_service[service] = {"revenue": 0, "cost": 0, "profit": 0, "orders": 0}
        profit_by_service[service]["revenue"] += order.get("charge", 0)
        profit_by_service[service]["cost"] += order.get("cost", 0)
        profit_by_service[service]["profit"] += order.get("profit", 0)
        profit_by_service[service]["orders"] += 1
    
    top_profitable = sorted(profit_by_service.items(), key=lambda x: x[1]["profit"], reverse=True)[:10]
    
    return {
        "period": {"start": start.isoformat(), "end": end.isoformat()},
        "summary": {
            "gross_revenue": round(gross_revenue, 2),
            "provider_costs": round(provider_costs, 2),
            "net_profit": round(net_profit, 2),
            "profit_margin": round(profit_margin, 2)
        },
        "by_day": [{"date": k, **{kk: round(vv, 2) for kk, vv in v.items()}} for k, v in sorted(profit_by_day.items())],
        "top_profitable_services": [{"service": k, **{kk: round(vv, 2) if isinstance(vv, float) else vv for kk, vv in v.items()}} for k, v in top_profitable]
    }

@router.get("/profit/export")
async def export_profit_report(request: Request, start_date: str = None, end_date: str = None):
    await get_admin_user(request, db)
    
    report = await get_profit_report(request, start_date, end_date)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(["Profit Report"])
    writer.writerow(["Period", report["period"]["start"], "to", report["period"]["end"]])
    writer.writerow([])
    writer.writerow(["Summary"])
    writer.writerow(["Gross Revenue", report["summary"]["gross_revenue"]])
    writer.writerow(["Provider Costs", report["summary"]["provider_costs"]])
    writer.writerow(["Net Profit", report["summary"]["net_profit"]])
    writer.writerow(["Profit Margin %", report["summary"]["profit_margin"]])
    writer.writerow([])
    writer.writerow(["Daily Breakdown"])
    writer.writerow(["Date", "Gross Revenue", "Provider Cost", "Net Profit"])
    for day in report["by_day"]:
        writer.writerow([day["date"], day["gross"], day["cost"], day["net"]])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=profit_report.csv"}
    )

@router.get("/orders")
async def get_orders_report(request: Request, start_date: str = None, end_date: str = None):
    await get_admin_user(request, db)
    
    now = datetime.now(timezone.utc)
    start = parse_date(start_date, 30) if start_date else (now - timedelta(days=30))
    end = parse_date(end_date, 0) if end_date else now
    
    orders = await db.orders.find({
        "created_at": {"$gte": start.isoformat(), "$lte": end.isoformat()}
    }, {"_id": 0}).to_list(100000)
    
    # By status
    by_status = {}
    for order in orders:
        status = order.get("status", "unknown")
        by_status[status] = by_status.get(status, 0) + 1
    
    # By service
    by_service = {}
    for order in orders:
        service = order.get("service_name", "unknown")
        if service not in by_service:
            by_service[service] = {"count": 0, "revenue": 0}
        by_service[service]["count"] += 1
        by_service[service]["revenue"] += order.get("charge", 0)
    
    top_services = sorted(by_service.items(), key=lambda x: x[1]["count"], reverse=True)[:10]
    
    # By user
    by_user = {}
    for order in orders:
        user = order.get("user_id", "unknown")
        if user not in by_user:
            by_user[user] = {"count": 0, "spent": 0}
        by_user[user]["count"] += 1
        by_user[user]["spent"] += order.get("charge", 0)
    
    top_users = sorted(by_user.items(), key=lambda x: x[1]["count"], reverse=True)[:10]
    
    # Orders by day
    by_day = {}
    for order in orders:
        created = order.get("created_at", "")
        if isinstance(created, str):
            day = created[:10]
        else:
            day = created.strftime("%Y-%m-%d")
        by_day[day] = by_day.get(day, 0) + 1
    
    return {
        "period": {"start": start.isoformat(), "end": end.isoformat()},
        "summary": {
            "total_orders": len(orders),
            "by_status": by_status
        },
        "by_day": [{"date": k, "orders": v} for k, v in sorted(by_day.items())],
        "top_services": [{"service": k, **{kk: round(vv, 2) if isinstance(vv, float) else vv for kk, vv in v.items()}} for k, v in top_services],
        "top_users": [{"user_id": k, **{kk: round(vv, 2) if isinstance(vv, float) else vv for kk, vv in v.items()}} for k, v in top_users]
    }

@router.get("/orders/export")
async def export_orders_report(request: Request, start_date: str = None, end_date: str = None):
    await get_admin_user(request, db)
    
    report = await get_orders_report(request, start_date, end_date)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(["Orders Report"])
    writer.writerow(["Period", report["period"]["start"], "to", report["period"]["end"]])
    writer.writerow([])
    writer.writerow(["Summary"])
    writer.writerow(["Total Orders", report["summary"]["total_orders"]])
    writer.writerow([])
    writer.writerow(["By Status"])
    for status, count in report["summary"]["by_status"].items():
        writer.writerow([status, count])
    writer.writerow([])
    writer.writerow(["Top Services"])
    writer.writerow(["Service", "Orders", "Revenue"])
    for svc in report["top_services"]:
        writer.writerow([svc["service"], svc["count"], svc["revenue"]])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=orders_report.csv"}
    )

@router.get("/payments")
async def get_payments_report(
    request: Request,
    start_date: str = None,
    end_date: str = None,
    method: str = None,
    status: str = None,
    limit: int = Query(1000, ge=1, le=2000),
):
    await get_admin_user(request, db)

    now = datetime.now(timezone.utc)
    start = parse_date(start_date, 30) if start_date else (now - timedelta(days=30)).replace(hour=0, minute=0, second=0, microsecond=0)
    end = parse_date(end_date, 0) if end_date else now

    parts = [_deposit_created_at_range_filter(start, end)]
    if method:
        parts.append({"$or": [{"method": method}, {"payment_type": method}]})
    if status:
        parts.append({"status": status})
    query = {"$and": parts} if len(parts) > 1 else parts[0]

    deposits = await db.deposits.find(query).to_list(100000)
    deposits.sort(key=_deposit_sort_ts, reverse=True)

    total_amount = sum(_deposit_row_amount(d) for d in deposits)
    total_bonus = sum(_deposit_bonus(d) for d in deposits)
    credited_ok = {"completed", "success"}
    total_credited = sum(
        _deposit_row_amount(d) + _deposit_bonus(d)
        for d in deposits
        if str(d.get("status") or "").lower() in credited_ok
    )

    by_method = {}
    for d in deposits:
        key = d.get("payment_type") or d.get("method") or "unknown"
        label = str(key).replace("_", " ")
        if key not in by_method:
            by_method[key] = {"method": label, "amount": 0.0, "bonus": 0.0, "count": 0}
        by_method[key]["amount"] += _deposit_row_amount(d)
        by_method[key]["bonus"] += _deposit_bonus(d)
        by_method[key]["count"] += 1

    by_status = {}
    for d in deposits:
        s = str(d.get("status", "unknown"))
        by_status[s] = by_status.get(s, 0) + 1

    recent_raw = deposits[:limit]
    user_ids = list({d.get("user_id") for d in recent_raw if d.get("user_id")})
    users_by_id = {}
    if user_ids:
        urows = await db.users.find(
            {"user_id": {"$in": user_ids}},
            {"user_id": 1, "username": 1, "email": 1},
        ).to_list(len(user_ids) + 10)
        users_by_id = {u["user_id"]: u for u in urows}

    def _serialize_created(c):
        if isinstance(c, datetime):
            return c.isoformat()
        return c

    recent_deposits = []
    for d in recent_raw:
        uid = d.get("user_id")
        u = users_by_id.get(uid) if uid else None
        oid = d.get("_id")
        dep_id = d.get("deposit_id") or (str(oid) if oid is not None else "")
        pt = d.get("payment_type") or d.get("method") or "unknown"
        recent_deposits.append(
            {
                "deposit_id": dep_id,
                "user_id": uid,
                "username": d.get("username") or (u or {}).get("username") or "",
                "email": d.get("user_email") or d.get("email") or (u or {}).get("email"),
                "amount": round(_deposit_row_amount(d), 4),
                "bonus_amount": round(_deposit_bonus(d), 4),
                "status": d.get("status", "unknown"),
                "method": pt,
                "source": str(pt).replace("_", " "),
                "created_at": _serialize_created(d.get("created_at")),
            }
        )

    by_method_list = sorted(
        [
            {
                "method": v["method"],
                "amount": round(v["amount"], 2),
                "bonus": round(v["bonus"], 2),
                "count": v["count"],
            }
            for v in by_method.values()
        ],
        key=lambda x: x["amount"],
        reverse=True,
    )

    return {
        "success": True,
        "period": {"start": start.isoformat(), "end": end.isoformat()},
        "summary": {
            "total_deposits": len(deposits),
            "total_amount": round(total_amount, 2),
            "total_bonus": round(total_bonus, 2),
            "total_credited": round(total_credited, 2),
            "total_count": len(deposits),
            "by_status": by_status,
        },
        "by_method": by_method_list,
        "by_day": [],
        "recent_deposits": recent_deposits,
    }

@router.get("/payments/export")
async def export_payments_report(request: Request, start_date: str = None, end_date: str = None):
    await get_admin_user(request, db)
    
    report = await get_payments_report(request, start_date, end_date)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(["Payments Report"])
    writer.writerow(["Period", report["period"]["start"], "to", report["period"]["end"]])
    writer.writerow([])
    writer.writerow(["Summary"])
    writer.writerow(["Total Deposits", report["summary"]["total_deposits"]])
    writer.writerow(["Total Amount", report["summary"]["total_amount"]])
    writer.writerow(["Total Bonus Given", report["summary"]["total_bonus"]])
    writer.writerow(["Total Credited", report["summary"]["total_credited"]])
    writer.writerow([])
    writer.writerow(["By Payment Method"])
    writer.writerow(["Method", "Amount", "Bonus", "Count"])
    for m in report["by_method"]:
        writer.writerow([m["method"], m["amount"], m["bonus"], m["count"]])
    writer.writerow([])
    writer.writerow(["Recent Deposits"])
    writer.writerow(["ID", "User", "Amount", "Bonus", "Method", "Status", "Date"])
    for d in report["recent_deposits"][:100]:
        writer.writerow([d.get("deposit_id"), d.get("user_id"), d.get("amount"), d.get("bonus_amount"), d.get("method"), d.get("status"), d.get("created_at")])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=payments_report.csv"}
    )

@router.get("/users")
async def get_users_report(request: Request, start_date: str = None, end_date: str = None):
    await get_admin_user(request, db)
    
    now = datetime.now(timezone.utc)
    start = parse_date(start_date, 30) if start_date else (now - timedelta(days=30))
    end = parse_date(end_date, 0) if end_date else now
    
    # New users in period
    new_users = await db.users.find({
        "created_at": {"$gte": start.isoformat(), "$lte": end.isoformat()}
    }, {"_id": 0, "password_hash": 0}).to_list(100000)
    
    # Users by day
    by_day = {}
    for user in new_users:
        created = user.get("created_at", "")
        if isinstance(created, str):
            day = created[:10]
        else:
            day = created.strftime("%Y-%m-%d")
        by_day[day] = by_day.get(day, 0) + 1
    
    # Top spenders
    all_users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("total_spent", -1).limit(20).to_list(20)
    
    # Active users (ordered in period)
    orders_in_period = await db.orders.find({
        "created_at": {"$gte": start.isoformat(), "$lte": end.isoformat()}
    }, {"_id": 0}).to_list(100000)
    
    active_user_ids = set(o.get("user_id") for o in orders_in_period)
    
    # Total stats
    total_users = await db.users.count_documents({})
    total_balance_pipeline = [{"$group": {"_id": None, "total": {"$sum": "$balance"}}}]
    balance_result = await db.users.aggregate(total_balance_pipeline).to_list(1)
    total_balance = balance_result[0]["total"] if balance_result else 0
    
    return {
        "period": {"start": start.isoformat(), "end": end.isoformat()},
        "summary": {
            "total_users": total_users,
            "new_users_in_period": len(new_users),
            "active_users_in_period": len(active_user_ids),
            "total_user_balance": round(total_balance, 2)
        },
        "by_day": [{"date": k, "users": v} for k, v in sorted(by_day.items())],
        "top_spenders": [{"user_id": u.get("user_id"), "email": u.get("email"), "name": u.get("name"), "total_spent": round(u.get("total_spent", 0), 2), "total_orders": u.get("total_orders", 0)} for u in all_users[:10]]
    }
