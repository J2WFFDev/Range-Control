// Core domain types for Range Booking Automation

export type BookingStatus = 'pending' | 'approved' | 'denied' | 'bumped' | 'rescheduled';

export type ApprovalAction = 'approve' | 'deny' | 'override_approve' | 'override_bump';

export type ResourceType = 'bay' | 'building' | 'target';

// Resource entity
export interface Resource {
  id: number;
  name: string;
  type: ResourceType;
  description?: string;
  capacity?: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Resource Calendar mapping
export interface ResourceCalendar {
  id: number;
  resource_id: number;
  calendar_id: string;
  calendar_name?: string;
  created_at: Date;
  updated_at: Date;
}

// Attestations
export interface Attestations {
  safety: boolean;
  waiver: boolean;
  insurance: boolean;
  details?: Record<string, any>;
}

// Calendar event reference
export interface CalendarEventRef {
  resource_id: number;
  calendar_id: string;
  event_id: string;
}

// Booking Request (main entity)
export interface BookingRequest {
  id: number;
  request_id: string; // unique external ID (e.g., "REQ-2024-001")
  status: BookingStatus;
  
  // Requester info
  group_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  
  // Range Officer info
  ro_name: string;
  ro_qualification: string;
  ro_whitelisted: boolean;
  
  // Scheduling
  requested_date: Date;
  start_time: string; // time only
  end_time: string; // time only
  start_timestamp: Date;
  end_timestamp: Date;
  
  // Session details
  participant_count: number;
  session_details?: string;
  
  // Attestations
  safety_attestation: boolean;
  waiver_attestation: boolean;
  insurance_attestation: boolean;
  attestation_details?: Record<string, any>;
  
  // Calendar integration
  calendar_event_ids?: CalendarEventRef[];
  
  // Metadata
  created_at: Date;
  updated_at: Date;
  created_by?: string;
}

// Booking request input (for creation)
export interface CreateBookingRequest {
  group_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  
  ro_name: string;
  ro_qualification: string;
  
  requested_date: string; // ISO date string
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  
  resource_ids: number[]; // array of resource IDs
  
  participant_count: number;
  session_details?: string;
  
  attestations: Attestations;
  
  created_by?: string;
}

// Request-Resource relationship
export interface RequestResource {
  id: number;
  request_id: number;
  resource_id: number;
  created_at: Date;
}

// Approval record
export interface Approval {
  id: number;
  request_id: number;
  action: ApprovalAction;
  actor: string;
  reason?: string;
  override_reason?: string;
  approved_at: Date;
  had_conflicts: boolean;
  conflict_details?: ConflictInfo[];
}

// Conflict information
export interface ConflictInfo {
  request_id: string;
  resource_id: number;
  resource_name: string;
  start_timestamp: Date;
  end_timestamp: Date;
  group_name: string;
  ro_name: string;
}

// Reschedule record
export interface Reschedule {
  id: number;
  original_request_id: number;
  new_request_id?: number;
  original_start: Date;
  original_end: Date;
  new_start: Date;
  new_end: Date;
  rescheduled_by: string;
  reason?: string;
  rescheduled_at: Date;
}

// Audit log entry
export interface AuditLogEntry {
  id: number;
  request_id?: number;
  action: string;
  actor: string;
  old_status?: BookingStatus;
  new_status?: BookingStatus;
  reason?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  ip_address?: string;
  user_agent?: string;
}

// Approval action input
export interface ApprovalActionInput {
  actor: string;
  reason?: string;
  override_reason?: string;
  ip_address?: string;
  user_agent?: string;
}

// Reschedule input
export interface RescheduleInput {
  new_date: string; // ISO date string
  new_start_time: string; // HH:MM format
  new_end_time: string; // HH:MM format
  actor: string;
  reason?: string;
}

// Booking detail with resources
export interface BookingDetail extends BookingRequest {
  resources: Resource[];
  approvals?: Approval[];
  reschedules?: Reschedule[];
}

// Time slot suggestion
export interface TimeSlotSuggestion {
  date: string;
  start_time: string;
  end_time: string;
  start_timestamp: Date;
  end_timestamp: Date;
  available: boolean;
  conflicts: ConflictInfo[];
}

// Conflict check result
export interface ConflictCheckResult {
  has_conflicts: boolean;
  conflicts: ConflictInfo[];
  nearby_bookings: BookingDetail[];
}
