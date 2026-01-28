# Testing and Validation Guide

This guide covers how to test and validate the Range Booking Automation System.

## Local Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Local Database

Install PostgreSQL locally or use Docker:

```bash
# Using Docker
docker run --name range-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=range_control \
  -p 5432:5432 \
  -d postgres:15
```

### 3. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your local settings:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=range_control
DATABASE_USER=postgres
DATABASE_PASSWORD=password
TIMEZONE=America/New_York
NODE_ENV=development
PORT=3000
```

### 4. Run Migrations

```bash
npm run build
npm run migrate
```

### 5. Load Sample Data (Optional)

```bash
psql -h localhost -U postgres -d range_control -f src/db/seed.sql
```

### 6. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## Manual Testing

### Test 1: Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-28T...",
  "database": "connected"
}
```

### Test 2: Create Resources

```bash
curl -X POST http://localhost:3000/api/resources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bay 1",
    "type": "bay",
    "description": "100-yard rifle range",
    "capacity": 10
  }'
```

### Test 3: List Resources

```bash
curl http://localhost:3000/api/resources
```

### Test 4: Create Booking Request

```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "group_name": "Alpha Team",
    "contact_name": "John Doe",
    "contact_email": "john@example.com",
    "ro_name": "Jane Smith",
    "ro_qualification": "Certified Range Officer",
    "requested_date": "2024-04-01",
    "start_time": "09:00",
    "end_time": "12:00",
    "resource_ids": [1],
    "participant_count": 8,
    "attestations": {
      "safety": true,
      "waiver": true,
      "insurance": true
    }
  }'
```

Save the `request_id` from the response for next tests.

### Test 5: View Booking

```bash
curl http://localhost:3000/api/bookings/REQ-2024-XXXXXXXX
```

### Test 6: Check Conflicts

```bash
curl http://localhost:3000/api/bookings/1/conflicts
```

### Test 7: Approve Booking

```bash
curl -X POST http://localhost:3000/api/bookings/1/approve \
  -H "Content-Type: application/json" \
  -d '{
    "actor": "admin-test",
    "reason": "All requirements verified"
  }'
```

### Test 8: Create Conflicting Booking

Create another booking for the same time and resource:

```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "group_name": "Bravo Team",
    "contact_name": "Mike Johnson",
    "contact_email": "mike@example.com",
    "ro_name": "Sarah Williams",
    "ro_qualification": "Senior RO",
    "requested_date": "2024-04-01",
    "start_time": "10:00",
    "end_time": "13:00",
    "resource_ids": [1],
    "participant_count": 6,
    "attestations": {
      "safety": true,
      "waiver": true,
      "insurance": true
    }
  }'
```

### Test 9: Try Normal Approval (Should Fail)

```bash
curl -X POST http://localhost:3000/api/bookings/2/approve \
  -H "Content-Type: application/json" \
  -d '{
    "actor": "admin-test",
    "reason": "Test"
  }'
```

Expected: Error about conflicts detected

### Test 10: Override Approve

```bash
curl -X POST http://localhost:3000/api/bookings/2/override \
  -H "Content-Type: application/json" \
  -d '{
    "actor": "admin-test",
    "reason": "Approval",
    "override_reason": "Coordinated with existing group - different positions"
  }'
```

### Test 11: Test Bump Functionality

Create a third booking:

```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "group_name": "Charlie Team",
    "contact_name": "Alice Brown",
    "contact_email": "alice@example.com",
    "ro_name": "Bob Taylor",
    "ro_qualification": "Master RO",
    "requested_date": "2024-04-01",
    "start_time": "09:30",
    "end_time": "11:30",
    "resource_ids": [1],
    "participant_count": 10,
    "attestations": {
      "safety": true,
      "waiver": true,
      "insurance": true
    }
  }'
```

Then bump the conflicting bookings:

```bash
curl -X POST http://localhost:3000/api/bookings/3/bump \
  -H "Content-Type: application/json" \
  -d '{
    "actor": "admin-test",
    "reason": "Priority approval",
    "override_reason": "Emergency qualification requirement"
  }'
```

### Test 12: View Audit Trail

```bash
# All audit logs
curl http://localhost:3000/api/audit

# Audit trail for specific booking
curl http://localhost:3000/api/audit/1
```

### Test 13: Test Reschedule

Get suggestions:

```bash
curl http://localhost:3000/api/bookings/1/suggestions?days=7
```

Reschedule:

```bash
curl -X POST http://localhost:3000/api/bookings/1/reschedule \
  -H "Content-Type: application/json" \
  -d '{
    "actor": "admin-test",
    "new_date": "2024-04-02",
    "new_start_time": "09:00",
    "new_end_time": "12:00",
    "reason": "Conflict resolution"
  }'
```

## Automated Testing

### Run Unit Tests

```bash
npm test
```

### Run Tests with Coverage

```bash
npm test -- --coverage
```

## Database Validation

### Check Table Creation

```bash
psql -h localhost -U postgres -d range_control -c "\dt"
```

Expected tables:
- approvals
- audit_log
- request_resources
- requests
- reschedules
- resource_calendars
- resources

### Verify Data Integrity

```bash
# Check requests
psql -h localhost -U postgres -d range_control -c "SELECT request_id, status, group_name FROM requests;"

# Check audit log
psql -h localhost -U postgres -d range_control -c "SELECT action, actor, timestamp FROM audit_log ORDER BY timestamp DESC LIMIT 10;"

# Check conflicts
psql -h localhost -U postgres -d range_control -c "
SELECT r1.request_id, r1.group_name, r1.start_timestamp, r1.end_timestamp
FROM requests r1
JOIN request_resources rr1 ON r1.id = rr1.request_id
JOIN request_resources rr2 ON rr1.resource_id = rr2.resource_id
JOIN requests r2 ON rr2.request_id = r2.id
WHERE r1.id != r2.id
  AND r1.status IN ('approved', 'pending')
  AND r2.status IN ('approved', 'pending')
  AND r1.start_timestamp < r2.end_timestamp
  AND r1.end_timestamp > r2.start_timestamp;
"
```

## Conflict Detection Validation

### Test Case 1: Exact Overlap

Booking A: 09:00 - 12:00
Booking B: 09:00 - 12:00
Expected: Conflict

### Test Case 2: Partial Overlap (Start)

Booking A: 09:00 - 12:00
Booking B: 10:00 - 13:00
Expected: Conflict

### Test Case 3: Partial Overlap (End)

Booking A: 10:00 - 13:00
Booking B: 09:00 - 12:00
Expected: Conflict

### Test Case 4: Contained

Booking A: 09:00 - 15:00
Booking B: 10:00 - 12:00
Expected: Conflict

### Test Case 5: No Overlap

Booking A: 09:00 - 12:00
Booking B: 13:00 - 15:00
Expected: No conflict

### Test Case 6: Adjacent (No Overlap)

Booking A: 09:00 - 12:00
Booking B: 12:00 - 15:00
Expected: No conflict (different resources) or Conflict (same resource)

## Performance Testing

### Load Test with curl

```bash
# Create 100 bookings
for i in {1..100}; do
  curl -X POST http://localhost:3000/api/bookings \
    -H "Content-Type: application/json" \
    -d "{
      \"group_name\": \"Team $i\",
      \"contact_name\": \"User $i\",
      \"contact_email\": \"user$i@example.com\",
      \"ro_name\": \"RO $i\",
      \"ro_qualification\": \"Certified\",
      \"requested_date\": \"2024-04-01\",
      \"start_time\": \"$(printf %02d $((9 + i % 6))):00\",
      \"end_time\": \"$(printf %02d $((10 + i % 6))):00\",
      \"resource_ids\": [1],
      \"participant_count\": 5,
      \"attestations\": {
        \"safety\": true,
        \"waiver\": true,
        \"insurance\": true
      }
    }" &
done
wait
```

### Query Performance

```bash
# Time a conflict check
time psql -h localhost -U postgres -d range_control -c "
SELECT COUNT(*)
FROM requests r
JOIN request_resources rr ON r.id = rr.request_id
WHERE r.status IN ('approved', 'pending')
  AND rr.resource_id = 1
  AND r.start_timestamp < '2024-04-01T12:00:00Z'
  AND r.end_timestamp > '2024-04-01T09:00:00Z';
"
```

## Integration Testing Scenarios

### Scenario 1: Normal Workflow

1. Create booking request → Status: pending
2. Check conflicts → No conflicts
3. Approve booking → Status: approved
4. Verify audit log → Created + Approved entries

### Scenario 2: Conflict Resolution

1. Create booking A → Approve
2. Create booking B (conflicts with A)
3. Try to approve B → Error
4. Override approve B → Both approved
5. Verify audit log → Override recorded

### Scenario 3: Bump Workflow

1. Create and approve booking A
2. Create booking B (conflicts with A)
3. Bump booking A with B
4. Verify A status: bumped
5. Verify B status: approved
6. Check audit log → Both actions logged

### Scenario 4: Reschedule

1. Create and approve booking
2. Get suggestions for alternative times
3. Reschedule to available slot
4. Verify new time in database
5. Check audit log → Reschedule recorded

## Error Handling Tests

### Test Invalid Input

```bash
# Missing required field
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "group_name": "Test"
  }'
```

Expected: 400 Bad Request

### Test Invalid Time Range

```bash
# End time before start time
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "group_name": "Test",
    "contact_name": "Test",
    "contact_email": "test@example.com",
    "ro_name": "Test RO",
    "ro_qualification": "Cert",
    "requested_date": "2024-04-01",
    "start_time": "15:00",
    "end_time": "12:00",
    "resource_ids": [1],
    "participant_count": 5,
    "attestations": {"safety": true, "waiver": true, "insurance": true}
  }'
```

Expected: 500 with "End time must be after start time"

### Test Non-existent Booking

```bash
curl http://localhost:3000/api/bookings/99999
```

Expected: 404 Not Found

## Google Calendar Testing

If Google Calendar is enabled:

### Test Calendar Event Creation

1. Approve a booking
2. Check Google Calendar for the event
3. Verify event details match booking

### Test Calendar Mapping

```bash
curl http://localhost:3000/api/calendar/mappings
```

### Create Calendar Mapping

```bash
curl -X POST http://localhost:3000/api/calendar/mappings \
  -H "Content-Type: application/json" \
  -d '{
    "resource_id": 1,
    "calendar_id": "test@group.calendar.google.com",
    "calendar_name": "Bay 1 Schedule"
  }'
```

## Checklist for Production Readiness

- [ ] All tests pass
- [ ] Database migrations run successfully
- [ ] Sample data loads correctly
- [ ] All API endpoints respond correctly
- [ ] Conflict detection works accurately
- [ ] Override and bump logic validated
- [ ] Audit trail captures all actions
- [ ] Calendar integration works (if enabled)
- [ ] Error handling is graceful
- [ ] Documentation is complete
- [ ] Environment variables are set
- [ ] Security considerations reviewed
- [ ] Backup strategy in place
- [ ] Monitoring configured

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Database Connection Failed

- Verify PostgreSQL is running
- Check credentials in .env
- Ensure database exists
- Check firewall/network settings

### TypeScript Build Errors

```bash
# Clean and rebuild
rm -rf dist
npm run build
```

### Test Failures

- Check database is seeded
- Verify environment variables
- Clear test data between runs
- Check test isolation

## Continuous Integration

For CI/CD pipelines, create a test script:

```bash
#!/bin/bash
set -e

# Install dependencies
npm install

# Run linter (if configured)
# npm run lint

# Build TypeScript
npm run build

# Run tests
npm test

# Run migrations (on test database)
DATABASE_URL=$TEST_DATABASE_URL npm run migrate

# Integration tests
# npm run test:integration

echo "All tests passed!"
```
