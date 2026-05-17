# Orders & refills (MongoDB)

## `orders` documents (additional fields)

| Field | Type | Notes |
|-------|------|--------|
| `provider_id` | string | Provider document id / `provider_id` from service |
| `provider_order_id` | string | Id returned by provider `action=add` |
| `provider_charge` | number | Provider-reported cost/charge for the order (nullable) |

## `refills` documents (minimal log)

```json
{
  "order_id": "ord_…",
  "provider_order_id": "12345",
  "status": "completed | failed",
  "created_at": "ISO-8601 string"
}
```

`refill_requests` also receives an extended row for the admin Refills UI (user_id, service_name, provider_response, etc.).

## Example `GET /api/orders` row

```json
{
  "id": "ord_1710000000000",
  "user": "usr_…",
  "service_name": "Instagram Followers [HQ]",
  "charge": 12.5,
  "provider_charge": 8.2,
  "provider_order_id": "987654321",
  "status": "completed",
  "remains": 0,
  "created_at": "2025-03-18T12:00:00.000Z",
  "order_id": "ord_1710000000000",
  "refill_enabled": true
}
```
