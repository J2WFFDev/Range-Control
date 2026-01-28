# Range-Control System Architecture

## Overview

This document outlines the technical architecture for deploying the Range-Control booking system to Railway.

---

## Current State (Python Library)

```
range_booking_automation.py
├── Classes
│   ├── RangeBookingAutomation (main system)
│   ├── Booking (data model)
│   ├── Resource (data model)
│   ├── User (data model)
│   └── AuditLogEntry (data model)
├── Enums
│   ├── BookingStatus
│   ├── UserRole
│   └── ActionType
└── Business Logic
    ├── Booking management
    ├── Conflict detection
    ├── Approval workflow
    └── Audit trail
```

**Current Limitations:**
- In-memory storage (no persistence)
- No API layer
- No authentication
- No frontend
- Single-instance only

---

## Target Architecture (Railway Deployment)

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Users                                │
│                (Browser/Mobile App)                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Railway Edge (CDN + SSL)                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  - User Dashboard                                     │   │
│  │  - Calendar View                                      │   │
│  │  - Staff Management Interface                        │   │
│  │  - Admin Panel                                        │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ REST API (JSON)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend API (FastAPI/Flask)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  API Layer                                            │   │
│  │  ├── Authentication (JWT)                            │   │
│  │  ├── Authorization (RBAC)                            │   │
│  │  ├── Input Validation                                │   │
│  │  └── Error Handling                                  │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  Business Logic Layer                                │   │
│  │  ├── RangeBookingAutomation (existing)               │   │
│  │  ├── Conflict Resolution                             │   │
│  │  ├── Approval Workflow                               │   │
│  │  └── Audit Trail                                     │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  Data Access Layer                                   │   │
│  │  ├── SQLAlchemy ORM                                  │   │
│  │  ├── Repository Pattern                              │   │
│  │  └── Database Migrations (Alembic)                   │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ SQL
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           Database (PostgreSQL on Railway)                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Tables:                                              │   │
│  │  ├── users                                            │   │
│  │  ├── resources                                        │   │
│  │  ├── bookings                                         │   │
│  │  └── audit_logs                                       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Backend

**Framework**: FastAPI (recommended)
- Automatic OpenAPI documentation
- Built-in data validation with Pydantic
- Async support
- Type hints
- Fast performance

**Alternative**: Flask with Flask-RESTX
- Simpler, more mature
- Good for smaller teams
- Extensive ecosystem

**Database**: PostgreSQL
- Provided by Railway
- Relational data model fits perfectly
- ACID compliance
- Strong indexing

**ORM**: SQLAlchemy 2.0
- Modern async support
- Type hints support
- Flexible querying

**Migrations**: Alembic
- Integrated with SQLAlchemy
- Version control for schema
- Automatic migration generation

**Authentication**: 
- python-jose (JWT)
- passlib (password hashing)
- OAuth2 with Password flow

### Frontend

**Framework**: React (recommended)
- Large ecosystem
- Component reusability
- Good Railway integration

**Alternative Options**:
- Next.js (SSR + React)
- Vue 3 + Vite
- Svelte Kit

**UI Library**:
- Material-UI or Ant Design
- TailwindCSS for styling
- FullCalendar for resource scheduling

**State Management**:
- React Query (API data)
- Zustand or Redux (app state)

### DevOps

**Hosting**: Railway
- Backend API service
- PostgreSQL database
- Frontend (static or SSR)

**CI/CD**: GitHub Actions
- Automated testing
- Linting
- Deployment

**Monitoring**:
- Railway built-in logs
- Optional: Sentry for errors
- Optional: Datadog/New Relic

---

## Database Schema

### Entity Relationship Diagram

```
┌──────────────────┐
│      users       │
├──────────────────┤
│ id (PK)          │
│ email            │
│ password_hash    │
│ name             │
│ role             │──────┐
│ created_at       │      │
│ updated_at       │      │
└──────────────────┘      │
                          │
                          │ (requester_id)
                          │
┌──────────────────┐      │      ┌──────────────────┐
│    resources     │      │      │     bookings     │
├──────────────────┤      │      ├──────────────────┤
│ id (PK)          │      │      │ id (PK)          │
│ name             │──────┼──────│ resource_id (FK) │
│ resource_type    │      └──────│ requester_id (FK)│
│ description      │             │ start_time       │
│ created_at       │             │ end_time         │
│ updated_at       │             │ status           │
└──────────────────┘             │ purpose          │
                                 │ priority         │
                                 │ created_at       │
                                 │ updated_at       │
                                 └──────────────────┘
                                          │
                                          │ (booking_id)
                                          │
                                 ┌────────▼──────────┐
                                 │    audit_logs     │
                                 ├───────────────────┤
                                 │ id (PK)           │
                                 │ booking_id (FK)   │
                                 │ actor_id (FK)     │
                                 │ action            │
                                 │ details           │
                                 │ previous_state    │
                                 │ timestamp         │
                                 └───────────────────┘
```

### SQL Schema

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Resources table
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_resources_type ON resources(resource_type);

-- Bookings table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES resources(id),
    requester_id UUID NOT NULL REFERENCES users(id),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status VARCHAR(50) NOT NULL,
    purpose TEXT,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

CREATE INDEX idx_bookings_resource ON bookings(resource_id);
CREATE INDEX idx_bookings_requester ON bookings(requester_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_time ON bookings(start_time, end_time);

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    actor_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    details TEXT,
    previous_state JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_booking ON audit_logs(booking_id);
CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
```

---

## API Design

### API Structure

```
/api/v1
├── /auth
│   ├── POST   /register
│   ├── POST   /login
│   ├── POST   /refresh
│   └── POST   /logout
├── /users
│   ├── GET    /users
│   ├── GET    /users/{id}
│   ├── POST   /users
│   ├── PUT    /users/{id}
│   └── DELETE /users/{id}
├── /resources
│   ├── GET    /resources
│   ├── GET    /resources/{id}
│   ├── POST   /resources
│   ├── PUT    /resources/{id}
│   └── DELETE /resources/{id}
├── /bookings
│   ├── GET    /bookings
│   ├── GET    /bookings/{id}
│   ├── POST   /bookings
│   ├── PUT    /bookings/{id}
│   ├── DELETE /bookings/{id}
│   └── /bookings/{id}
│       ├── POST /approve
│       ├── POST /deny
│       ├── POST /reschedule
│       └── POST /bump
└── /audit
    └── GET    /audit-logs
```

### Example API Endpoints

#### Create Booking

```http
POST /api/v1/bookings
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "resource_id": "uuid",
  "start_time": "2024-02-01T10:00:00Z",
  "end_time": "2024-02-01T12:00:00Z",
  "purpose": "Training session",
  "priority": 1
}

Response 201:
{
  "id": "uuid",
  "resource_id": "uuid",
  "requester_id": "uuid",
  "start_time": "2024-02-01T10:00:00Z",
  "end_time": "2024-02-01T12:00:00Z",
  "status": "pending",
  "purpose": "Training session",
  "priority": 1,
  "created_at": "2024-01-28T10:00:00Z"
}
```

#### Approve Booking

```http
POST /api/v1/bookings/{id}/approve
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "force_override": false
}

Response 200:
{
  "id": "uuid",
  "status": "approved",
  "updated_at": "2024-01-28T11:00:00Z"
}

Response 409 (Conflict):
{
  "error": "Booking conflicts with existing bookings",
  "conflicts": [
    {
      "id": "uuid",
      "start_time": "2024-02-01T10:00:00Z",
      "end_time": "2024-02-01T12:00:00Z"
    }
  ]
}
```

---

## Security Architecture

### Authentication Flow

```
1. User Registration
   ├── POST /api/v1/auth/register
   ├── Password hashed with bcrypt
   ├── User created in database
   └── Return success (no auto-login)

2. User Login
   ├── POST /api/v1/auth/login
   ├── Validate credentials
   ├── Generate JWT access token (15 min expiry)
   ├── Generate JWT refresh token (7 day expiry)
   └── Return both tokens

3. Authenticated Request
   ├── Include: Authorization: Bearer <access_token>
   ├── Verify JWT signature
   ├── Check token expiration
   ├── Extract user info from token
   └── Process request with user context

4. Token Refresh
   ├── POST /api/v1/auth/refresh
   ├── Include refresh token
   ├── Validate refresh token
   ├── Generate new access token
   └── Return new access token
```

### Authorization (RBAC)

```python
Permissions by Role:

USER:
  - Create bookings (own)
  - View bookings (own)
  - Cancel bookings (own)
  - View resources

STAFF:
  - All USER permissions
  - View all bookings
  - Approve/deny bookings
  - Reschedule bookings
  - Bump bookings
  - View audit logs

ADMIN:
  - All STAFF permissions
  - Manage users
  - Manage resources
  - System configuration
  - Full audit log access
```

---

## Deployment Pipeline

### Development Workflow

```
1. Local Development
   ├── Run: uvicorn app.main:app --reload
   ├── Database: Docker PostgreSQL
   ├── Frontend: npm run dev
   └── Tests: pytest

2. Create Pull Request
   ├── GitHub Actions runs:
   │   ├── Linting (flake8, black)
   │   ├── Type checking (mypy)
   │   ├── Unit tests
   │   ├── Integration tests
   │   └── Security scan
   └── Deploy preview to Railway (staging)

3. Code Review
   ├── Team reviews code
   ├── Automated checks pass
   └── Approve and merge

4. Deployment
   ├── Merge to main branch
   ├── Railway auto-deploys
   ├── Database migrations run
   ├── Health checks pass
   └── Production live
```

### Railway Deployment

```yaml
# railway.toml
[build]
builder = "NIXPACKS"
buildCommand = "pip install -r requirements.txt"

[deploy]
startCommand = "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

---

## Performance Considerations

### Optimization Strategies

1. **Database**
   - Connection pooling (SQLAlchemy)
   - Proper indexing on frequently queried columns
   - Eager loading to prevent N+1 queries
   - Query result caching (Redis optional)

2. **API**
   - Pagination for list endpoints
   - Field selection/projection
   - Response compression (gzip)
   - Rate limiting per user/IP

3. **Frontend**
   - Code splitting
   - Lazy loading components
   - CDN for static assets
   - Browser caching

4. **Caching Strategy**
   - HTTP caching headers
   - API response caching
   - Database query caching
   - Static asset caching

---

## Monitoring and Observability

### Metrics to Track

```
Application Metrics:
- Request rate (req/sec)
- Response time (p50, p95, p99)
- Error rate
- Active users

Business Metrics:
- Bookings created per day
- Approval rate
- Conflict rate
- Resource utilization

Infrastructure Metrics:
- CPU usage
- Memory usage
- Database connections
- Disk I/O
```

### Logging Strategy

```python
# Structured logging format
{
  "timestamp": "2024-01-28T10:00:00Z",
  "level": "INFO",
  "service": "range-control-api",
  "trace_id": "uuid",
  "user_id": "uuid",
  "endpoint": "/api/v1/bookings",
  "method": "POST",
  "status_code": 201,
  "duration_ms": 45,
  "message": "Booking created successfully"
}
```

---

## Disaster Recovery

### Backup Strategy

```
Database Backups:
- Automated daily backups (Railway)
- Retention: 30 days
- Point-in-time recovery
- Weekly backup verification

Application State:
- Configuration in version control
- Environment variables in Railway
- Infrastructure as code

Recovery Procedures:
1. Database restore from backup
2. Redeploy from main branch
3. Run migrations if needed
4. Verify data integrity
5. Update DNS if necessary
```

---

## Next Steps for Implementation

### Phase 1: Backend API (Weeks 1-3)

1. Create FastAPI application structure
2. Set up SQLAlchemy models
3. Implement authentication (JWT)
4. Create CRUD endpoints
5. Add business logic layer
6. Write tests

### Phase 2: Database (Weeks 2-4)

1. Design schema
2. Create Alembic migrations
3. Set up PostgreSQL on Railway
4. Implement repository pattern
5. Add indexes and constraints

### Phase 3: Frontend (Weeks 4-7)

1. Initialize React app
2. Set up routing
3. Create components
4. Integrate API client
5. Add state management
6. Implement authentication flow

### Phase 4: Deployment (Weeks 8-9)

1. Configure Railway services
2. Set up CI/CD pipeline
3. Configure monitoring
4. Load testing
5. Security audit

---

**This architecture provides a scalable, maintainable foundation for the Range-Control system on Railway.**
