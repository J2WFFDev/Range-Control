-- Range Booking Automation Database Schema
-- PostgreSQL Database Schema for Range Control System

-- Resources table: physical range resources (bays, buildings, targets)
CREATE TABLE IF NOT EXISTS resources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'bay', 'building', 'target'
    description TEXT,
    capacity INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Resource calendars: maps resources to Google Calendar IDs
CREATE TABLE IF NOT EXISTS resource_calendars (
    id SERIAL PRIMARY KEY,
    resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    calendar_id VARCHAR(255) NOT NULL UNIQUE,
    calendar_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Booking requests: all booking requests with full details
CREATE TABLE IF NOT EXISTS requests (
    id SERIAL PRIMARY KEY,
    request_id VARCHAR(50) NOT NULL UNIQUE, -- unique external ID
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'denied', 'bumped', 'rescheduled'
    
    -- Requester information
    group_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    
    -- Range Officer information
    ro_name VARCHAR(255) NOT NULL,
    ro_qualification VARCHAR(255) NOT NULL,
    ro_whitelisted BOOLEAN DEFAULT false,
    
    -- Scheduling details
    requested_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    start_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    end_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Session details
    participant_count INTEGER NOT NULL,
    session_details TEXT,
    
    -- Attestations (stored as JSON or boolean flags)
    safety_attestation BOOLEAN NOT NULL DEFAULT false,
    waiver_attestation BOOLEAN NOT NULL DEFAULT false,
    insurance_attestation BOOLEAN NOT NULL DEFAULT false,
    attestation_details JSONB,
    
    -- Calendar integration
    calendar_event_ids JSONB, -- array of {resource_id, calendar_id, event_id}
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255),
    
    -- Constraints
    CONSTRAINT valid_time_range CHECK (end_timestamp > start_timestamp)
);

-- Request resources: many-to-many relationship between requests and resources
CREATE TABLE IF NOT EXISTS request_resources (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(request_id, resource_id)
);

-- Approvals: tracks all approval/denial actions
CREATE TABLE IF NOT EXISTS approvals (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'approve', 'deny', 'override_approve', 'override_bump'
    actor VARCHAR(255) NOT NULL, -- who made the decision
    reason TEXT,
    override_reason TEXT, -- specific reason for override/bump
    approved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Conflict information at time of approval
    had_conflicts BOOLEAN DEFAULT false,
    conflict_details JSONB -- list of conflicting request IDs and details
);

-- Reschedules: tracks rescheduling actions
CREATE TABLE IF NOT EXISTS reschedules (
    id SERIAL PRIMARY KEY,
    original_request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    new_request_id INTEGER REFERENCES requests(id) ON DELETE SET NULL,
    
    -- Original time
    original_start TIMESTAMP WITH TIME ZONE NOT NULL,
    original_end TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- New time
    new_start TIMESTAMP WITH TIME ZONE NOT NULL,
    new_end TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Actor and reason
    rescheduled_by VARCHAR(255) NOT NULL,
    reason TEXT,
    rescheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit log: comprehensive append-only log of all state changes
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES requests(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    actor VARCHAR(255) NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    reason TEXT,
    metadata JSONB, -- additional context about the action
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address VARCHAR(50),
    user_agent TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_request_id ON requests(request_id);
CREATE INDEX IF NOT EXISTS idx_requests_timestamps ON requests(start_timestamp, end_timestamp);
CREATE INDEX IF NOT EXISTS idx_requests_date ON requests(requested_date);
CREATE INDEX IF NOT EXISTS idx_request_resources_request ON request_resources(request_id);
CREATE INDEX IF NOT EXISTS idx_request_resources_resource ON request_resources(resource_id);
CREATE INDEX IF NOT EXISTS idx_approvals_request ON approvals(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_request ON audit_log(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_resources_active ON resources(is_active);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resource_calendars_updated_at BEFORE UPDATE ON resource_calendars
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
