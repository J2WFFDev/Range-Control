# API Usage Examples

This document provides practical examples of using the Range Booking Automation API.

## Setup

```bash
# Base URL for all API calls
BASE_URL="http://localhost:3000/api"
```

## 1. View Available Resources

Before creating a booking, see what resources are available:

```bash
curl -X GET "$BASE_URL/resources" | json_pp
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Bay 1",
      "type": "bay",
      "description": "100-yard rifle range with 10 firing positions",
      "capacity": 10,
      "is_active": true
    }
  ]
}
```

## 2. Create a Booking Request

Submit a new booking request:

```bash
curl -X POST "$BASE_URL/bookings" \
  -H "Content-Type: application/json" \
  -d '{
    "group_name": "Alpha Team Training",
    "contact_name": "John Doe",
    "contact_email": "john.doe@example.com",
    "contact_phone": "555-0100",
    "ro_name": "Jane Smith",
    "ro_qualification": "Certified Range Safety Officer",
    "requested_date": "2024-03-20",
    "start_time": "09:00",
    "end_time": "12:00",
    "resource_ids": [1, 6],
    "participant_count": 8,
    "session_details": "Annual rifle qualification",
    "attestations": {
      "safety": true,
      "waiver": true,
      "insurance": true
    },
    "created_by": "john.doe@example.com"
  }' | json_pp
```

Response:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "request_id": "REQ-2024-A1B2C3D4",
    "status": "pending",
    "group_name": "Alpha Team Training",
    ...
  },
  "message": "Booking request submitted for approval"
}
```

## 3. View Booking Details

```bash
curl -X GET "$BASE_URL/bookings/REQ-2024-A1B2C3D4" | json_pp
```

## 4. Check for Conflicts

Before approving, check if there are any conflicts:

```bash
curl -X GET "$BASE_URL/bookings/1/conflicts" | json_pp
```

Response:
```json
{
  "success": true,
  "data": {
    "has_conflicts": false,
    "conflicts": [],
    "nearby_bookings": []
  }
}
```

## 5. Approve a Booking (No Conflicts)

```bash
curl -X POST "$BASE_URL/bookings/1/approve" \
  -H "Content-Type: application/json" \
  -d '{
    "actor": "range-admin",
    "reason": "All requirements verified"
  }' | json_pp
```

## 6. Handle Conflicts

If there's a conflict, you have several options:

### Option A: Deny the Request

```bash
curl -X POST "$BASE_URL/bookings/2/deny" \
  -H "Content-Type: application/json" \
  -d '{
    "actor": "range-admin",
    "reason": "Time slot unavailable - conflicts with existing booking"
  }' | json_pp
```

### Option B: Override Approve (Parallel Booking)

Approve despite conflicts (both bookings exist):

```bash
curl -X POST "$BASE_URL/bookings/2/override" \
  -H "Content-Type: application/json" \
  -d '{
    "actor": "range-admin",
    "reason": "Approval for training",
    "override_reason": "Coordinated with Alpha Team - using different firing positions"
  }' | json_pp
```

### Option C: Override and Bump (Priority Booking)

Approve and mark conflicting bookings as bumped:

```bash
curl -X POST "$BASE_URL/bookings/2/bump" \
  -H "Content-Type: application/json" \
  -d '{
    "actor": "range-admin",
    "reason": "Priority approval",
    "override_reason": "Emergency qualification requirement - contacted affected groups"
  }' | json_pp
```

### Option D: Reschedule

Move to a different time:

```bash
# First, get suggestions
curl -X GET "$BASE_URL/bookings/2/suggestions?days=7" | json_pp

# Then reschedule
curl -X POST "$BASE_URL/bookings/2/reschedule" \
  -H "Content-Type: application/json" \
  -d '{
    "actor": "range-admin",
    "new_date": "2024-03-21",
    "new_start_time": "09:00",
    "new_end_time": "12:00",
    "reason": "Resolved conflict by moving to next day"
  }' | json_pp
```

## 7. List Bookings with Filters

```bash
# All pending bookings
curl -X GET "$BASE_URL/bookings?status=pending" | json_pp

# Approved bookings for specific date range
curl -X GET "$BASE_URL/bookings?status=approved&from_date=2024-03-01&to_date=2024-03-31" | json_pp

# Bookings for specific resource
curl -X GET "$BASE_URL/bookings?resource_id=1" | json_pp
```

## 8. View Audit Trail

View complete history for a booking:

```bash
curl -X GET "$BASE_URL/audit/1" | json_pp
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "request_id": 1,
      "action": "booking_created",
      "actor": "john.doe@example.com",
      "new_status": "pending",
      "timestamp": "2024-03-15T10:00:00Z"
    },
    {
      "id": 2,
      "request_id": 1,
      "action": "approved",
      "actor": "range-admin",
      "old_status": "pending",
      "new_status": "approved",
      "reason": "All requirements verified",
      "timestamp": "2024-03-15T10:15:00Z"
    }
  ]
}
```

View all audit logs:

```bash
curl -X GET "$BASE_URL/audit?limit=50&actor=range-admin" | json_pp
```

## 9. Workflow Example: Complete Booking Process

```bash
# 1. Create booking request
REQUEST=$(curl -s -X POST "$BASE_URL/bookings" \
  -H "Content-Type: application/json" \
  -d '{
    "group_name": "Bravo Team",
    "contact_name": "Mike Johnson",
    "contact_email": "mike@example.com",
    "ro_name": "Sarah Williams",
    "ro_qualification": "Senior Range Officer",
    "requested_date": "2024-03-22",
    "start_time": "14:00",
    "end_time": "17:00",
    "resource_ids": [2, 7],
    "participant_count": 6,
    "session_details": "Pistol training session",
    "attestations": {
      "safety": true,
      "waiver": true,
      "insurance": true
    }
  }')

REQUEST_ID=$(echo $REQUEST | jq -r '.data.request_id')
echo "Created booking: $REQUEST_ID"

# 2. Check conflicts
curl -s -X GET "$BASE_URL/bookings/$REQUEST_ID/conflicts" | json_pp

# 3. Approve if no conflicts
curl -s -X POST "$BASE_URL/bookings/$REQUEST_ID/approve" \
  -H "Content-Type: application/json" \
  -d '{
    "actor": "range-admin",
    "reason": "Approved for training"
  }' | json_pp

# 4. View audit trail
curl -s -X GET "$BASE_URL/audit" | json_pp
```

## 10. Admin Operations

### Create a New Resource

```bash
curl -X POST "$BASE_URL/resources" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bay 4",
    "type": "bay",
    "description": "Long-range precision rifle bay (500 yards)",
    "capacity": 5
  }' | json_pp
```

### Deactivate a Resource

```bash
curl -X PATCH "$BASE_URL/resources/4" \
  -H "Content-Type: application/json" \
  -d '{
    "is_active": false
  }' | json_pp
```

## Error Handling

The API returns standard HTTP status codes:

- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Invalid input
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

Example error response:
```json
{
  "error": "Cannot approve: conflicts detected with 1 booking(s). Use override approval if you want to proceed."
}
```

## Testing Tips

1. **Use the health endpoint** to verify the server is running:
   ```bash
   curl http://localhost:3000/health
   ```

2. **Use json_pp or jq** to format JSON responses for readability

3. **Check the database** directly if needed:
   ```bash
   psql $DATABASE_URL -c "SELECT * FROM requests ORDER BY created_at DESC LIMIT 5;"
   ```

4. **View server logs** to debug issues - all actions are logged

## Next Steps

- Set up Google Calendar integration for visual scheduling
- Configure email notifications for booking status changes
- Implement user authentication for multi-user access
- Set up automated backups of the audit log
