# Architecture Documentation

## System Overview

The Range Booking Automation System is a Node.js/TypeScript backend API that provides centralized management of range resource bookings with advanced conflict detection, approval workflows, and audit capabilities.

## Technology Stack

### Backend
- **Runtime**: Node.js 20+
- **Language**: TypeScript 5.3
- **Framework**: Express.js 4.18
- **Database**: PostgreSQL (via Railway)
- **External APIs**: Google Calendar API

### Key Libraries
- `pg` - PostgreSQL client
- `googleapis` - Google Calendar integration
- `uuid` - Unique ID generation
- `dotenv` - Environment configuration
- `cors` - Cross-origin resource sharing

## Architecture Patterns

### Layered Architecture

```
┌─────────────────────────────────────┐
│         API Routes Layer            │  ← HTTP endpoints
├─────────────────────────────────────┤
│      Business Logic Layer           │  ← Services
├─────────────────────────────────────┤
│       Data Access Layer             │  ← Database queries
├─────────────────────────────────────┤
│         PostgreSQL Database         │  ← Persistent storage
└─────────────────────────────────────┘
```

### Directory Structure

```
src/
├── index.ts              # Application entry point
├── db/
│   ├── connection.ts     # Database connection pool
│   ├── migrate.ts        # Migration runner
│   ├── schema.sql        # Database schema
│   └── seed.sql          # Sample data
├── routes/               # API route handlers
│   ├── bookings.ts       # Booking endpoints
│   ├── resources.ts      # Resource endpoints
│   ├── audit.ts          # Audit endpoints
│   └── calendar.ts       # Calendar endpoints
├── services/             # Business logic
│   ├── booking.service.ts    # Booking operations
│   ├── resource.service.ts   # Resource operations
│   ├── audit.service.ts      # Audit logging
│   └── calendar.service.ts   # Calendar integration
├── types/                # TypeScript definitions
│   └── index.ts          # Core types
├── utils/                # Utility functions
│   └── time.ts           # Time handling
└── middleware/           # Express middleware
    └── auth.ts           # Authentication (placeholder)
```

## Core Components

### 1. Booking Service

**Responsibilities:**
- Create booking requests
- Conflict detection across resources
- Approval workflow management
- Override and bump logic
- Reschedule operations
- Time slot suggestions

**Key Functions:**
```typescript
createBookingRequest(data: CreateBookingRequest): Promise<BookingRequest>
checkConflicts(start, end, resources, exclude?): Promise<ConflictCheckResult>
approveBooking(id, input): Promise<BookingDetail>
overrideApproveBooking(id, input): Promise<BookingDetail>
overrideAndBumpBooking(id, input): Promise<BookingDetail>
rescheduleBooking(id, input): Promise<BookingDetail>
```

### 2. Calendar Service

**Responsibilities:**
- Google Calendar API integration
- Create/update/delete calendar events
- Resource-to-calendar mapping
- Mark events as bumped

**Key Functions:**
```typescript
createCalendarEvents(booking): Promise<CalendarEventRef[]>
updateCalendarEvents(booking, refs): Promise<CalendarEventRef[]>
deleteCalendarEvents(refs): Promise<void>
markCalendarEventCancelled(refs, reason): Promise<void>
```

### 3. Audit Service

**Responsibilities:**
- Log all state changes
- Maintain audit trail
- Query audit logs

**Key Functions:**
```typescript
logAudit(entry): Promise<void>
getAuditTrail(requestId): Promise<AuditLogEntry[]>
getAuditLogs(filters): Promise<AuditLogEntry[]>
```

### 4. Resource Service

**Responsibilities:**
- Manage range resources
- CRUD operations for resources

## Database Schema

### Entity Relationship Diagram

```
┌───────────┐       ┌──────────────────┐       ┌───────────┐
│ resources │◄──────┤ request_resources├──────►│ requests  │
└───────────┘       └──────────────────┘       └─────┬─────┘
      │                                              │
      │                                         ┌────┴─────┐
      ▼                                         │          │
┌──────────────────┐                      ┌────▼───┐  ┌───▼──────┐
│resource_calendars│                      │approvals│  │reschedules│
└──────────────────┘                      └─────────┘  └──────────┘
                                                │
                                            ┌───▼──────┐
                                            │audit_log │
                                            └──────────┘
```

### Key Tables

**requests** - Core booking requests
- Stores all booking information
- Links to resources via request_resources
- Tracks status transitions
- Contains attestation data

**resources** - Physical resources (bays, buildings, targets)
- Defines available resources
- Links to Google Calendar via resource_calendars

**approvals** - Decision records
- Captures approval/denial actions
- Records override reasons
- Stores conflict information at decision time

**audit_log** - Comprehensive audit trail
- Every state change logged
- Actor, timestamp, reason tracked
- Immutable append-only log

## Data Flow

### Booking Creation Flow

```
User Request
    ↓
[POST /api/bookings]
    ↓
Validate Input
    ↓
Generate Request ID
    ↓
Check RO Whitelist
    ↓
Calculate Timestamps
    ↓
Begin Transaction
    ↓
Insert Request
    ↓
Link Resources
    ↓
Log Audit Entry
    ↓
Commit Transaction
    ↓
Return Booking
```

### Approval Flow

```
Admin Decision
    ↓
[POST /api/bookings/:id/approve]
    ↓
Load Booking
    ↓
Check Conflicts
    ↓
┌──────────────┐
│Has Conflicts?│
└──┬───────┬───┘
   │Yes    │No
   ↓       ↓
[Error] [Approve]
           ↓
    Update Status
           ↓
    Record Approval
           ↓
    Log Audit
           ↓
    Create Calendar Events
           ↓
    Return Updated Booking
```

### Override and Bump Flow

```
Admin Override
    ↓
[POST /api/bookings/:id/bump]
    ↓
Load Booking
    ↓
Check Conflicts
    ↓
Begin Transaction
    ↓
For Each Conflict:
  - Mark as Bumped
  - Log Audit
  - Mark Calendar Event
    ↓
Approve New Booking
    ↓
Create Calendar Events
    ↓
Commit Transaction
    ↓
Return Result
```

## Security Model

### Current State (Placeholder)
- Simple header-based authentication
- Role extraction from headers
- Rate limiting implemented

### Production Requirements
- JWT-based authentication
- Session management
- Role-based access control (RBAC)
- API key management
- Request signing
- HTTPS enforcement

### Audit Trail Security
- Immutable logs
- Actor tracking on all changes
- IP address and user agent logging
- Timestamp verification
- No deletion of audit records

## Conflict Detection Algorithm

```typescript
function checkConflicts(start, end, resources, exclude?) {
  // Query: Find bookings that overlap in time AND share resources
  
  // Time overlap conditions:
  // 1. Existing booking starts before new ends AND ends after new starts
  // OR
  // 2. Existing booking starts during new booking
  // OR
  // 3. Existing booking ends during new booking
  
  // Resource overlap:
  // ANY of the requested resources match
  
  // Exclude:
  // Skip the current booking if rescheduling
  
  return {
    has_conflicts: boolean,
    conflicts: ConflictInfo[],
    nearby_bookings: BookingDetail[]
  }
}
```

## Time Handling

### Timezone Strategy

1. **Input**: Local time (HH:MM) + Date
2. **Processing**: Combine with configured timezone
3. **Storage**: UTC timestamps in database
4. **Output**: Can be displayed in any timezone

### Example
```
Input:  "2024-03-15", "09:00", timezone="America/New_York"
        ↓
Process: Combine to local datetime
        ↓
Store:  "2024-03-15T14:00:00Z" (UTC)
        ↓
Display: Can convert to any timezone as needed
```

## Calendar Integration

### Google Calendar Flow

1. **On Approval**:
   - Format booking as calendar event
   - Create event in each resource's calendar
   - Store event IDs in database

2. **On Bump**:
   - Mark existing events as [BUMPED]
   - Update event description with reason
   - Change event color to red

3. **On Reschedule**:
   - Update existing calendar events
   - Keep event IDs the same

### Event Format
```javascript
{
  summary: "Group Name - RO Name",
  description: "Booking details...",
  start: { dateTime: ISO8601, timeZone: "..." },
  end: { dateTime: ISO8601, timeZone: "..." },
  attendees: [{ email: "..." }],
  reminders: { ... }
}
```

## Error Handling

### Strategy
- Database transactions for data integrity
- Rollback on errors
- Detailed error messages in development
- Generic messages in production
- All errors logged to console

### Example
```typescript
try {
  await client.query('BEGIN');
  // operations
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

## Performance Considerations

### Database
- Connection pooling (max 20 connections)
- Indexes on frequently queried columns
- Efficient conflict detection query
- Batch operations where possible

### API
- Rate limiting (100 requests/minute default)
- Async calendar operations (non-blocking)
- Pagination on list endpoints
- Selective field loading

## Monitoring and Observability

### Logging
- All requests logged with timestamp and method
- Query execution time tracked
- Errors logged with full context
- Audit log provides complete history

### Health Checks
- `/health` endpoint checks database connectivity
- Returns status and timestamp
- Can be used for uptime monitoring

## Scalability

### Current Limits
- Single server instance
- Connection pool: 20 connections
- No caching layer
- Synchronous processing

### Future Enhancements
- Horizontal scaling with load balancer
- Redis for caching and sessions
- Message queue for async tasks
- Read replicas for reporting

## Deployment Architecture

```
GitHub Repository
    ↓
Railway Platform
    ├── Application Server (Node.js)
    │   └── Express API
    └── PostgreSQL Database
    
External:
    └── Google Calendar API
```

## API Design Principles

1. **RESTful**: Standard HTTP methods and status codes
2. **Consistent**: Uniform response format
3. **Documented**: Clear endpoint descriptions
4. **Versioned**: Ready for future API versions
5. **Secure**: Authentication and authorization ready
6. **Auditable**: All changes tracked

## Testing Strategy

### Unit Tests
- Time utility functions
- Business logic in services
- Data validation

### Integration Tests
- API endpoints
- Database operations
- Workflow scenarios

### Manual Testing
- Conflict detection edge cases
- Override and bump scenarios
- Calendar integration

## Future Architecture Considerations

### Microservices
- Separate booking service
- Separate calendar service
- Separate notification service
- API gateway for routing

### Event-Driven
- Booking events published to message bus
- Calendar service subscribes to events
- Notification service subscribes to events
- Async processing of non-critical tasks

### Caching
- Redis for session storage
- Cache conflict detection results
- Cache resource lists
- Invalidate on updates

## Maintenance

### Database Migrations
- Forward-only migrations
- Version controlled in code
- Tested before deployment
- Rollback strategy documented

### Dependency Updates
- Regular security updates
- Test before deploying
- Monitor for breaking changes
- Keep dependencies minimal

### Backup Strategy
- Daily database backups
- Audit log never deleted
- Export critical data regularly
- Test restore procedures
