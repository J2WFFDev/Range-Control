# Range-Control

A controlled scheduling and approval system for managing shared range resources such as bays and facilities.

---

## 🚀 New: Railway Deployment Planning

**Ready to deploy to production?** We've created comprehensive planning documentation:

📖 **[Start Here: QUICKSTART.md](QUICKSTART.md)** - 5-minute guide to get started

### Planning Documents

| Document | Description |
|----------|-------------|
| **[QUICKSTART.md](QUICKSTART.md)** | Quick start guide - read this first! |
| **[PROJECT_PLANNING.md](PROJECT_PLANNING.md)** | Complete project plan with 6 EPICs, user stories, timeline |
| **[RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md)** | Step-by-step Railway deployment guide |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | Technical architecture and system design |
| **[GITHUB_PROJECTS_SETUP.md](GITHUB_PROJECTS_SETUP.md)** | How to set up project management |
| **[SAMPLE_ISSUES.md](SAMPLE_ISSUES.md)** | Ready-to-use GitHub issues for all tasks |

### Project Phases

1. **Phase 1 (Weeks 1-3)**: Railway Infrastructure + Database Foundation
2. **Phase 2 (Weeks 4-7)**: API Development + Database Integration
3. **Phase 3 (Weeks 8-10)**: Frontend + DevOps
4. **Phase 4 (Weeks 11-13)**: Production Readiness

**Total Timeline**: 9-13 weeks | **Total Effort**: ~169 hours

---

## Overview

RangeBookingAutomation is a comprehensive booking management system that provides:

- **Booking Request Management**: Collect and track booking requests for shared resources
- **Approval Workflow**: Staff can approve, deny, or reschedule booking requests
- **Conflict Detection**: Automatically detect scheduling conflicts
- **Conflict Resolution**: Override conflicts when necessary or bump lower-priority bookings
- **Audit Trail**: Complete tracking of all actions and decisions with timestamps
- **Permission Control**: Role-based access (Admin, Staff, User)
- **Time Accuracy**: Proper handling of date/time for scheduling
- **Safety & Accountability**: Clear authority and transparent decision tracking

## Features

### Core Capabilities

1. **Booking Management**
   - Create booking requests for bays and facilities
   - Set booking purpose and priority levels
   - Track booking status (pending, approved, denied, cancelled, bumped)

2. **Staff Actions**
   - Approve bookings (with or without conflict override)
   - Deny bookings with reasons
   - Reschedule bookings to different times
   - Bump lower-priority bookings
   - Cancel bookings

3. **Conflict Handling**
   - Automatic conflict detection for overlapping bookings
   - Force override capability for authorized staff
   - Priority-based booking bumping

4. **Audit Trail**
   - Complete history of all actions
   - Tracks who did what and when
   - Records previous states for changes
   - Filterable by booking, date range, or action type

## Installation

```bash
# Install dependencies
pip install -r requirements.txt
```

## Usage

### Basic Example

```python
from datetime import datetime, timedelta
from range_booking_automation import (
    RangeBookingAutomation,
    Resource,
    User,
    UserRole
)

# Initialize the system
system = RangeBookingAutomation()

# Create a resource
bay1 = Resource(id="bay-1", name="Bay 1", resource_type="bay")
system.register_resource(bay1)

# Create users
staff = User(id="staff-1", name="Jane Smith", role=UserRole.STAFF)
user = User(id="user-1", name="John Doe", role=UserRole.USER)

# Create a booking request
start = datetime.now() + timedelta(hours=1)
end = start + timedelta(hours=2)

booking = system.create_booking_request(
    resource=bay1,
    requester=user,
    start_time=start,
    end_time=end,
    purpose="Training session",
    priority=1
)

# Staff approves the booking
system.approve_booking(booking, staff)

# Check audit trail
audit = system.get_audit_trail(booking_id=booking.id)
for entry in audit:
    print(f"{entry.timestamp}: {entry.action.value} by {entry.actor.name}")
```

### Running the Example

```bash
python example_usage.py
```

This will demonstrate:
- Creating booking requests
- Approval workflow
- Conflict detection
- Overriding conflicts
- Bumping bookings
- Rescheduling
- Cancellation
- Audit trail viewing

## Testing

Run the comprehensive test suite:

```bash
pytest test_range_booking_automation.py -v
```

The test suite covers:
- Booking creation and validation
- Conflict detection
- Approval workflow
- Permission checking
- Rescheduling
- Bumping
- Cancellation
- Audit trail
- Resource queries

## API Reference

### Classes

#### `RangeBookingAutomation`
Main system class for managing bookings.

**Methods:**
- `create_booking_request()` - Create a new booking request
- `approve_booking()` - Approve a booking (staff only)
- `deny_booking()` - Deny a booking (staff only)
- `reschedule_booking()` - Reschedule a booking (staff only)
- `bump_booking()` - Bump a booking for higher priority (staff only)
- `cancel_booking()` - Cancel a booking (requester or staff)
- `check_conflicts()` - Check for scheduling conflicts
- `get_audit_trail()` - Retrieve audit log entries
- `get_bookings_by_resource()` - Query bookings for a resource

#### `Resource`
Represents a bookable resource (bay or facility).

**Attributes:**
- `id` - Unique identifier
- `name` - Resource name
- `resource_type` - Type (bay, facility, etc.)
- `capacity` - Maximum capacity

#### `User`
Represents a system user.

**Attributes:**
- `id` - Unique identifier
- `name` - User name
- `role` - UserRole (ADMIN, STAFF, USER)

#### `Booking`
Represents a booking request.

**Attributes:**
- `id` - Unique identifier
- `resource` - The booked resource
- `requester` - User who made the request
- `start_time` - Booking start time
- `end_time` - Booking end time
- `status` - BookingStatus
- `purpose` - Purpose description
- `priority` - Priority level (higher = more important)

### Enums

- `BookingStatus`: PENDING, APPROVED, DENIED, CANCELLED, BUMPED
- `UserRole`: ADMIN, STAFF, USER
- `ActionType`: CREATE, APPROVE, DENY, RESCHEDULE, OVERRIDE, BUMP, CANCEL

## Security & Permissions

- **Staff and Admin**: Can approve, deny, reschedule, bump bookings
- **Users**: Can create requests and cancel their own bookings
- **All Actions**: Logged in audit trail with actor and timestamp

## Design Principles

1. **Safety First**: Prevent double-booking unless explicitly overridden
2. **Accountability**: All actions tracked in audit log
3. **Clear Authority**: Role-based permissions for sensitive operations
4. **Transparency**: Full visibility into decision history
5. **Flexibility**: Support for overrides and priority-based bumping when needed

## License

MIT
