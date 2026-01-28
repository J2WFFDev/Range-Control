# Range Booking Automation System

A centralized, authoritative system for managing bookings for shared range resources (bays, buildings, targets) with built-in safety, qualification, and operational priority controls.

## Overview

The Range Booking Automation system addresses the unique requirements of Range Control operations by providing:

- **Centralized booking intake** with required safety and qualification data
- **Approval workflow** with traceable decisions and authority levels
- **Deterministic conflict detection** across multiple resources
- **Explicit override and "bump" authority** for Range Control
- **Permanent audit trail** stored in PostgreSQL
- **Accurate local-time handling** with timezone support
- **Integration with Google Calendar** for scheduling visualization

## Key Features

### 🎯 Core Capabilities

- **Multi-resource conflict detection**: Prevents double-booking across bays, buildings, and targets
- **Approval workflow**: Pending → Approved/Denied with full authority controls
- **Override authority**: Range Control can approve despite conflicts or bump existing bookings
- **Audit trail**: Every action is logged with actor, timestamp, and reason
- **Time handling**: Local timezone support for scheduling
- **Calendar integration**: Google Calendar sync (optional)

### 🔒 Safety & Authorization

- **Required attestations**: Safety, waiver, and insurance confirmations
- **Range Officer qualification tracking**: RO name and credentials required
- **Whitelist support**: Auto-approval for pre-approved ROs
- **Role-based access**: Requester, Range Officer, and Admin roles

### 📊 Operational Priority

- **Bump authority**: Explicitly mark and track bumped reservations
- **Reschedule suggestions**: Automatic alternative time slot generation
- **Conflict resolution**: Clear visibility into conflicts with decision support
- **Long-term auditability**: "Who approved this and why?" is always answerable

## Technology Stack

- **Backend**: Node.js with TypeScript and Express
- **Database**: PostgreSQL (deployed on Railway)
- **Calendar**: Google Calendar API
- **Runtime**: Node.js 20+

## Quick Start

### Prerequisites

- Node.js 20 or higher
- PostgreSQL database
- (Optional) Google Calendar API credentials

### Installation

1. Clone the repository:
```bash
git clone https://github.com/J2WFFDev/Range-Control.git
cd Range-Control
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials and settings
```

4. Run database migrations:
```bash
npm run build
npm run migrate
```

5. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## API Documentation

### Base URL
```
http://localhost:3000/api
```

### Endpoints

#### Bookings

**Create Booking Request**
```http
POST /api/bookings
Content-Type: application/json

{
  "group_name": "Alpha Team",
  "contact_name": "John Doe",
  "contact_email": "john@example.com",
  "contact_phone": "555-0100",
  "ro_name": "Jane Smith",
  "ro_qualification": "Certified Range Officer",
  "requested_date": "2024-03-15",
  "start_time": "09:00",
  "end_time": "12:00",
  "resource_ids": [1, 2],
  "participant_count": 15,
  "session_details": "Rifle qualification training",
  "attestations": {
    "safety": true,
    "waiver": true,
    "insurance": true
  }
}
```

**List Bookings**
```http
GET /api/bookings?status=pending&from_date=2024-03-01&limit=20
```

**Get Booking Details**
```http
GET /api/bookings/:id
```

**Check Conflicts**
```http
GET /api/bookings/:id/conflicts
```

**Get Time Slot Suggestions**
```http
GET /api/bookings/:id/suggestions?days=7
```

**Approve Booking** (normal - blocked on conflicts)
```http
POST /api/bookings/:id/approve
Content-Type: application/json

{
  "actor": "admin-user",
  "reason": "All requirements met"
}
```

**Deny Booking**
```http
POST /api/bookings/:id/deny
Content-Type: application/json

{
  "actor": "admin-user",
  "reason": "Insufficient qualification"
}
```

**Override Approve** (approve despite conflicts)
```http
POST /api/bookings/:id/override
Content-Type: application/json

{
  "actor": "admin-user",
  "reason": "Standard approval",
  "override_reason": "Priority operation - coordinated with conflicting parties"
}
```

**Override and Bump** (approve and bump conflicting bookings)
```http
POST /api/bookings/:id/bump
Content-Type: application/json

{
  "actor": "admin-user",
  "reason": "Approval",
  "override_reason": "Emergency training requirement - contacted affected groups"
}
```

**Reschedule Booking**
```http
POST /api/bookings/:id/reschedule
Content-Type: application/json

{
  "actor": "admin-user",
  "new_date": "2024-03-16",
  "new_start_time": "09:00",
  "new_end_time": "12:00",
  "reason": "Conflict resolution"
}
```

#### Resources

**List Resources**
```http
GET /api/resources
```

**Get Resource**
```http
GET /api/resources/:id
```

**Create Resource**
```http
POST /api/resources
Content-Type: application/json

{
  "name": "Bay 1",
  "type": "bay",
  "description": "100-yard rifle range",
  "capacity": 20
}
```

**Update Resource**
```http
PATCH /api/resources/:id
Content-Type: application/json

{
  "is_active": false
}
```

#### Audit Trail

**Get Audit Logs**
```http
GET /api/audit?actor=admin-user&from_date=2024-03-01&limit=50
```

**Get Audit Trail for Booking**
```http
GET /api/audit/:request_id
```

## Database Schema

The system uses PostgreSQL with the following core tables:

- **resources**: Physical resources (bays, buildings, targets)
- **resource_calendars**: Maps resources to Google Calendar IDs
- **requests**: All booking requests with full details
- **request_resources**: Many-to-many relationship between requests and resources
- **approvals**: Tracks all approval/denial actions
- **reschedules**: Tracks rescheduling actions
- **audit_log**: Comprehensive append-only log of all state changes

See `src/db/schema.sql` for complete schema definition.

## Deployment

### Railway Deployment

1. Create a new project on Railway
2. Add PostgreSQL database service
3. Connect your GitHub repository
4. Set environment variables:
   - `DATABASE_URL` (auto-configured by Railway)
   - `PORT` (auto-configured by Railway)
   - `NODE_ENV=production`
   - `TIMEZONE=America/New_York`
5. Deploy!

Railway will automatically:
- Install dependencies
- Build TypeScript code
- Run migrations
- Start the server

### Environment Variables

Required:
- `DATABASE_URL` or individual DB credentials
- `TIMEZONE` (default: America/New_York)

Optional:
- `GOOGLE_CALENDAR_CREDENTIALS_PATH`
- `GOOGLE_CALENDAR_ENABLED`
- `SMTP_*` (for email notifications - future enhancement)

## Development

### Project Structure

```
Range-Control/
├── src/
│   ├── db/              # Database connection and migrations
│   ├── models/          # (Reserved for future ORM models)
│   ├── routes/          # API route handlers
│   ├── services/        # Business logic
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   ├── middleware/      # Express middleware (future)
│   └── index.ts         # Application entry point
├── dist/                # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── README.md
```

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start production server
- `npm run migrate` - Run database migrations
- `npm test` - Run tests (when implemented)

## System Design Principles

This system is designed as a **control platform**, not just a booking convenience tool. Key principles:

1. **Authority over convenience**: Range Control always has final say
2. **Transparency**: All decisions are traceable and explainable
3. **Safety first**: Required attestations and qualification tracking
4. **No silent failures**: Conflicts are explicit, overrides are documented
5. **Auditability**: Complete history of who did what and why
6. **Operational reality**: Supports real-world decisions when priorities conflict

## Booking States

- **pending**: Awaiting approval
- **approved**: Approved and scheduled
- **denied**: Rejected with reason
- **bumped**: Was approved but explicitly bumped by higher priority booking
- **rescheduled**: Moved to different time

## Approval Actions

- **approve**: Standard approval (blocked if conflicts exist)
- **deny**: Reject the request
- **override_approve**: Approve despite conflicts (parallel booking)
- **override_bump**: Approve and mark conflicting bookings as "bumped"

## Future Enhancements

- [ ] Email/SMS notifications
- [ ] Automatic waiver verification (beyond attestation)
- [ ] Payment processing integration
- [ ] Real-time calendar sync
- [ ] Mobile app
- [ ] Advanced reporting and analytics
- [ ] Integration with access control systems

## License

ISC

## Support

For issues and questions, please open a GitHub issue or contact Range Control.
