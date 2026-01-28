import pool from '../db/connection.js';
import type {
  BookingRequest,
  CreateBookingRequest,
  BookingDetail,
  ConflictInfo,
  ConflictCheckResult,
  ApprovalActionInput,
  RescheduleInput,
  TimeSlotSuggestion,
  Resource
} from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';
import { parseTime, combineDateTime } from '../utils/time.js';
import { logAudit } from './audit.service.js';
import * as calendarService from './calendar.service.js';

// Generate unique request ID
function generateRequestId(): string {
  const date = new Date();
  const year = date.getFullYear();
  const uuid = uuidv4().split('-')[0].toUpperCase();
  return `REQ-${year}-${uuid}`;
}

// Check if RO is whitelisted (placeholder - would check against whitelist table)
async function isRoWhitelisted(roName: string): Promise<boolean> {
  // TODO: Implement whitelist check against database
  // For now, return false (no auto-approval)
  return false;
}

// Create a new booking request
export async function createBookingRequest(
  data: CreateBookingRequest
): Promise<BookingRequest> {
  const requestId = generateRequestId();
  const roWhitelisted = await isRoWhitelisted(data.ro_name);
  
  // Parse time and combine with date in configured timezone
  const timezone = process.env.TIMEZONE || 'America/New_York';
  const startTimestamp = combineDateTime(data.requested_date, data.start_time, timezone);
  const endTimestamp = combineDateTime(data.requested_date, data.end_time, timezone);
  
  // Validate time range
  if (endTimestamp <= startTimestamp) {
    throw new Error('End time must be after start time');
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Insert request
    const insertQuery = `
      INSERT INTO requests (
        request_id, status, group_name, contact_name, contact_email, contact_phone,
        ro_name, ro_qualification, ro_whitelisted,
        requested_date, start_time, end_time, start_timestamp, end_timestamp,
        participant_count, session_details,
        safety_attestation, waiver_attestation, insurance_attestation, attestation_details,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *
    `;
    
    const values = [
      requestId,
      roWhitelisted ? 'approved' : 'pending',
      data.group_name,
      data.contact_name,
      data.contact_email,
      data.contact_phone || null,
      data.ro_name,
      data.ro_qualification,
      roWhitelisted,
      data.requested_date,
      data.start_time,
      data.end_time,
      startTimestamp,
      endTimestamp,
      data.participant_count,
      data.session_details || null,
      data.attestations.safety,
      data.attestations.waiver,
      data.attestations.insurance,
      JSON.stringify(data.attestations.details || {}),
      data.created_by || 'system'
    ];
    
    const result = await client.query(insertQuery, values);
    const request = result.rows[0];
    
    // Insert request-resource relationships
    for (const resourceId of data.resource_ids) {
      await client.query(
        'INSERT INTO request_resources (request_id, resource_id) VALUES ($1, $2)',
        [request.id, resourceId]
      );
    }
    
    // Log audit entry
    await logAudit({
      request_id: request.id,
      action: 'booking_created',
      actor: data.created_by || 'system',
      new_status: request.status,
      metadata: { request_id: requestId, resource_ids: data.resource_ids }
    }, client);
    
    // If auto-approved, log approval
    if (roWhitelisted) {
      await client.query(
        `INSERT INTO approvals (request_id, action, actor, reason, approved_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [request.id, 'approve', 'system', 'Auto-approved: RO whitelisted']
      );
      
      await logAudit({
        request_id: request.id,
        action: 'auto_approved',
        actor: 'system',
        new_status: 'approved',
        reason: 'RO whitelisted'
      }, client);
    }
    
    await client.query('COMMIT');
    
    return request;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Get booking by ID or request_id
export async function getBookingById(id: number | string): Promise<BookingDetail | null> {
  const isNumeric = typeof id === 'number' || !isNaN(Number(id));
  const query = `
    SELECT r.*, 
           COALESCE(
             json_agg(
               json_build_object(
                 'id', res.id,
                 'name', res.name,
                 'type', res.type,
                 'description', res.description,
                 'capacity', res.capacity,
                 'is_active', res.is_active
               )
             ) FILTER (WHERE res.id IS NOT NULL),
             '[]'
           ) as resources
    FROM requests r
    LEFT JOIN request_resources rr ON r.id = rr.request_id
    LEFT JOIN resources res ON rr.resource_id = res.id
    WHERE ${isNumeric ? 'r.id = $1' : 'r.request_id = $1'}
    GROUP BY r.id
  `;
  
  const result = await pool.query(query, [id]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const booking = result.rows[0];
  return booking;
}

// Check for conflicts with existing bookings
export async function checkConflicts(
  startTimestamp: Date,
  endTimestamp: Date,
  resourceIds: number[],
  excludeRequestId?: number
): Promise<ConflictCheckResult> {
  const query = `
    SELECT 
      r.id, r.request_id, r.group_name, r.ro_name,
      r.start_timestamp, r.end_timestamp,
      res.id as resource_id, res.name as resource_name
    FROM requests r
    JOIN request_resources rr ON r.id = rr.request_id
    JOIN resources res ON rr.resource_id = res.id
    WHERE r.status IN ('approved', 'pending')
      AND rr.resource_id = ANY($1::int[])
      AND (
        (r.start_timestamp < $3 AND r.end_timestamp > $2)
        OR (r.start_timestamp >= $2 AND r.start_timestamp < $3)
        OR (r.end_timestamp > $2 AND r.end_timestamp <= $3)
      )
      ${excludeRequestId ? 'AND r.id != $4' : ''}
    ORDER BY r.start_timestamp
  `;
  
  const params = excludeRequestId 
    ? [resourceIds, startTimestamp, endTimestamp, excludeRequestId]
    : [resourceIds, startTimestamp, endTimestamp];
  
  const result = await pool.query(query, params);
  
  const conflicts: ConflictInfo[] = result.rows.map(row => ({
    request_id: row.request_id,
    resource_id: row.resource_id,
    resource_name: row.resource_name,
    start_timestamp: row.start_timestamp,
    end_timestamp: row.end_timestamp,
    group_name: row.group_name,
    ro_name: row.ro_name
  }));
  
  // Get nearby bookings for context (within same day)
  const dayStart = new Date(startTimestamp);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(startTimestamp);
  dayEnd.setHours(23, 59, 59, 999);
  
  const nearbyQuery = `
    SELECT DISTINCT r.*
    FROM requests r
    JOIN request_resources rr ON r.id = rr.request_id
    WHERE r.status IN ('approved', 'pending')
      AND rr.resource_id = ANY($1::int[])
      AND r.start_timestamp >= $2
      AND r.start_timestamp <= $3
      ${excludeRequestId ? 'AND r.id != $4' : ''}
    ORDER BY r.start_timestamp
    LIMIT 10
  `;
  
  const nearbyParams = excludeRequestId
    ? [resourceIds, dayStart, dayEnd, excludeRequestId]
    : [resourceIds, dayStart, dayEnd];
  
  const nearbyResult = await pool.query(nearbyQuery, nearbyParams);
  
  // Fetch full details for nearby bookings
  const nearbyBookings: BookingDetail[] = await Promise.all(
    nearbyResult.rows.map(row => getBookingById(row.id) as Promise<BookingDetail>)
  );
  
  return {
    has_conflicts: conflicts.length > 0,
    conflicts,
    nearby_bookings: nearbyBookings.filter(b => b !== null)
  };
}

// Approve a booking (normal - blocked on conflicts)
export async function approveBooking(
  requestId: number | string,
  input: ApprovalActionInput
): Promise<BookingDetail> {
  const booking = await getBookingById(requestId);
  if (!booking) {
    throw new Error('Booking not found');
  }
  
  if (booking.status !== 'pending') {
    throw new Error(`Cannot approve booking with status: ${booking.status}`);
  }
  
  // Check for conflicts
  const resourceIds = booking.resources.map(r => r.id);
  const conflictCheck = await checkConflicts(
    booking.start_timestamp,
    booking.end_timestamp,
    resourceIds,
    booking.id
  );
  
  if (conflictCheck.has_conflicts) {
    throw new Error(
      `Cannot approve: conflicts detected with ${conflictCheck.conflicts.length} booking(s). ` +
      `Use override approval if you want to proceed.`
    );
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Update booking status
    await client.query(
      'UPDATE requests SET status = $1, updated_at = NOW() WHERE id = $2',
      ['approved', booking.id]
    );
    
    // Record approval
    await client.query(
      `INSERT INTO approvals (request_id, action, actor, reason, had_conflicts, conflict_details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [booking.id, 'approve', input.actor, input.reason, false, JSON.stringify([])]
    );
    
    // Log audit
    await logAudit({
      request_id: booking.id,
      action: 'approved',
      actor: input.actor,
      old_status: 'pending',
      new_status: 'approved',
      reason: input.reason,
      ip_address: input.ip_address,
      user_agent: input.user_agent
    }, client);
    
    await client.query('COMMIT');
    
    // Get updated booking
    const updatedBooking = (await getBookingById(booking.id))!;
    
    // Create calendar events (async, don't block on errors)
    calendarService.createCalendarEvents(updatedBooking).catch(err => {
      console.error('Failed to create calendar events:', err);
    });
    
    return updatedBooking;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Deny a booking
export async function denyBooking(
  requestId: number | string,
  input: ApprovalActionInput
): Promise<BookingDetail> {
  const booking = await getBookingById(requestId);
  if (!booking) {
    throw new Error('Booking not found');
  }
  
  if (booking.status !== 'pending') {
    throw new Error(`Cannot deny booking with status: ${booking.status}`);
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Update booking status
    await client.query(
      'UPDATE requests SET status = $1, updated_at = NOW() WHERE id = $2',
      ['denied', booking.id]
    );
    
    // Record denial
    await client.query(
      `INSERT INTO approvals (request_id, action, actor, reason)
       VALUES ($1, $2, $3, $4)`,
      [booking.id, 'deny', input.actor, input.reason]
    );
    
    // Log audit
    await logAudit({
      request_id: booking.id,
      action: 'denied',
      actor: input.actor,
      old_status: 'pending',
      new_status: 'denied',
      reason: input.reason,
      ip_address: input.ip_address,
      user_agent: input.user_agent
    }, client);
    
    await client.query('COMMIT');
    
    return (await getBookingById(booking.id))!;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Override approve (approve despite conflicts)
export async function overrideApproveBooking(
  requestId: number | string,
  input: ApprovalActionInput
): Promise<BookingDetail> {
  const booking = await getBookingById(requestId);
  if (!booking) {
    throw new Error('Booking not found');
  }
  
  if (booking.status !== 'pending') {
    throw new Error(`Cannot approve booking with status: ${booking.status}`);
  }
  
  if (!input.override_reason) {
    throw new Error('Override reason is required for override approval');
  }
  
  // Check conflicts (for logging purposes)
  const resourceIds = booking.resources.map(r => r.id);
  const conflictCheck = await checkConflicts(
    booking.start_timestamp,
    booking.end_timestamp,
    resourceIds,
    booking.id
  );
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Update booking status
    await client.query(
      'UPDATE requests SET status = $1, updated_at = NOW() WHERE id = $2',
      ['approved', booking.id]
    );
    
    // Record override approval
    await client.query(
      `INSERT INTO approvals (request_id, action, actor, reason, override_reason, had_conflicts, conflict_details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        booking.id, 
        'override_approve', 
        input.actor, 
        input.reason,
        input.override_reason,
        conflictCheck.has_conflicts,
        JSON.stringify(conflictCheck.conflicts)
      ]
    );
    
    // Log audit
    await logAudit({
      request_id: booking.id,
      action: 'override_approved',
      actor: input.actor,
      old_status: 'pending',
      new_status: 'approved',
      reason: `Override: ${input.override_reason}`,
      metadata: { conflicts: conflictCheck.conflicts },
      ip_address: input.ip_address,
      user_agent: input.user_agent
    }, client);
    
    await client.query('COMMIT');
    
    // Get updated booking
    const updatedBooking = (await getBookingById(booking.id))!;
    
    // Create calendar events (async, don't block on errors)
    calendarService.createCalendarEvents(updatedBooking).catch(err => {
      console.error('Failed to create calendar events:', err);
    });
    
    return updatedBooking;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Override and bump (approve and mark conflicting bookings as bumped)
export async function overrideAndBumpBooking(
  requestId: number | string,
  input: ApprovalActionInput
): Promise<BookingDetail> {
  const booking = await getBookingById(requestId);
  if (!booking) {
    throw new Error('Booking not found');
  }
  
  if (booking.status !== 'pending') {
    throw new Error(`Cannot approve booking with status: ${booking.status}`);
  }
  
  if (!input.override_reason) {
    throw new Error('Override reason is required for bump action');
  }
  
  // Check conflicts
  const resourceIds = booking.resources.map(r => r.id);
  const conflictCheck = await checkConflicts(
    booking.start_timestamp,
    booking.end_timestamp,
    resourceIds,
    booking.id
  );
  
  if (!conflictCheck.has_conflicts) {
    throw new Error('No conflicts found to bump');
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Mark all conflicting bookings as bumped
    const conflictingIds = [...new Set(conflictCheck.conflicts.map(c => c.request_id))];
    const bumpedBookings = [];
    
    for (const conflictRequestId of conflictingIds) {
      const conflictBooking = await getBookingById(conflictRequestId);
      if (conflictBooking && conflictBooking.status === 'approved') {
        // Update status to bumped
        await client.query(
          'UPDATE requests SET status = $1, updated_at = NOW() WHERE request_id = $2',
          ['bumped', conflictRequestId]
        );
        
        // Log audit for bumped booking
        await logAudit({
          request_id: conflictBooking.id,
          action: 'bumped',
          actor: input.actor,
          old_status: 'approved',
          new_status: 'bumped',
          reason: `Bumped by ${booking.request_id}: ${input.override_reason}`,
          metadata: { bumped_by: booking.request_id },
          ip_address: input.ip_address,
          user_agent: input.user_agent
        }, client);
        
        bumpedBookings.push(conflictBooking);
      }
    }
    
    // Update booking status to approved
    await client.query(
      'UPDATE requests SET status = $1, updated_at = NOW() WHERE id = $2',
      ['approved', booking.id]
    );
    
    // Record override and bump approval
    await client.query(
      `INSERT INTO approvals (request_id, action, actor, reason, override_reason, had_conflicts, conflict_details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        booking.id,
        'override_bump',
        input.actor,
        input.reason,
        input.override_reason,
        true,
        JSON.stringify(conflictCheck.conflicts)
      ]
    );
    
    // Log audit
    await logAudit({
      request_id: booking.id,
      action: 'override_and_bump',
      actor: input.actor,
      old_status: 'pending',
      new_status: 'approved',
      reason: `Override and bump: ${input.override_reason}`,
      metadata: { 
        bumped_bookings: conflictingIds,
        conflicts: conflictCheck.conflicts 
      },
      ip_address: input.ip_address,
      user_agent: input.user_agent
    }, client);
    
    await client.query('COMMIT');
    
    // Get updated booking
    const updatedBooking = (await getBookingById(booking.id))!;
    
    // Mark bumped calendar events as cancelled (async, don't block on errors)
    for (const bumpedBooking of bumpedBookings) {
      if (bumpedBooking.calendar_event_ids && bumpedBooking.calendar_event_ids.length > 0) {
        calendarService.markCalendarEventCancelled(
          bumpedBooking.calendar_event_ids,
          `Bumped by ${booking.request_id}: ${input.override_reason}`
        ).catch(err => {
          console.error(`Failed to mark calendar events as bumped for ${bumpedBooking.request_id}:`, err);
        });
      }
    }
    
    // Create calendar events for new booking (async, don't block on errors)
    calendarService.createCalendarEvents(updatedBooking).catch(err => {
      console.error('Failed to create calendar events:', err);
    });
    
    return updatedBooking;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Reschedule a booking
export async function rescheduleBooking(
  requestId: number | string,
  rescheduleInput: RescheduleInput
): Promise<BookingDetail> {
  const booking = await getBookingById(requestId);
  if (!booking) {
    throw new Error('Booking not found');
  }
  
  // Parse new time
  const timezone = process.env.TIMEZONE || 'America/New_York';
  const newStartTimestamp = combineDateTime(
    rescheduleInput.new_date,
    rescheduleInput.new_start_time,
    timezone
  );
  const newEndTimestamp = combineDateTime(
    rescheduleInput.new_date,
    rescheduleInput.new_end_time,
    timezone
  );
  
  if (newEndTimestamp <= newStartTimestamp) {
    throw new Error('New end time must be after new start time');
  }
  
  // Check conflicts for new time
  const resourceIds = booking.resources.map(r => r.id);
  const conflictCheck = await checkConflicts(
    newStartTimestamp,
    newEndTimestamp,
    resourceIds,
    booking.id
  );
  
  if (conflictCheck.has_conflicts) {
    throw new Error(
      `Cannot reschedule: conflicts detected at new time with ${conflictCheck.conflicts.length} booking(s)`
    );
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Record reschedule
    await client.query(
      `INSERT INTO reschedules (
        original_request_id, original_start, original_end,
        new_start, new_end, rescheduled_by, reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        booking.id,
        booking.start_timestamp,
        booking.end_timestamp,
        newStartTimestamp,
        newEndTimestamp,
        rescheduleInput.actor,
        rescheduleInput.reason
      ]
    );
    
    // Update booking with new times
    await client.query(
      `UPDATE requests 
       SET requested_date = $1, start_time = $2, end_time = $3,
           start_timestamp = $4, end_timestamp = $5,
           status = 'rescheduled', updated_at = NOW()
       WHERE id = $6`,
      [
        rescheduleInput.new_date,
        rescheduleInput.new_start_time,
        rescheduleInput.new_end_time,
        newStartTimestamp,
        newEndTimestamp,
        booking.id
      ]
    );
    
    // Log audit
    await logAudit({
      request_id: booking.id,
      action: 'rescheduled',
      actor: rescheduleInput.actor,
      old_status: booking.status,
      new_status: 'rescheduled',
      reason: rescheduleInput.reason,
      metadata: {
        old_time: {
          start: booking.start_timestamp,
          end: booking.end_timestamp
        },
        new_time: {
          start: newStartTimestamp,
          end: newEndTimestamp
        }
      }
    }, client);
    
    await client.query('COMMIT');
    
    // Get updated booking
    const updatedBooking = (await getBookingById(booking.id))!;
    
    // Update calendar events with new time (async, don't block on errors)
    if (booking.calendar_event_ids && booking.calendar_event_ids.length > 0) {
      calendarService.updateCalendarEvents(updatedBooking, booking.calendar_event_ids).catch(err => {
        console.error('Failed to update calendar events during reschedule:', err);
      });
    }
    
    return updatedBooking;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// List bookings with filters
export async function listBookings(filters?: {
  status?: string;
  from_date?: Date;
  to_date?: Date;
  resource_id?: number;
  limit?: number;
  offset?: number;
}): Promise<BookingDetail[]> {
  let query = `
    SELECT DISTINCT r.*
    FROM requests r
    LEFT JOIN request_resources rr ON r.id = rr.request_id
    WHERE 1=1
  `;
  
  const params: any[] = [];
  let paramIndex = 1;
  
  if (filters?.status) {
    query += ` AND r.status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }
  
  if (filters?.from_date) {
    query += ` AND r.start_timestamp >= $${paramIndex}`;
    params.push(filters.from_date);
    paramIndex++;
  }
  
  if (filters?.to_date) {
    query += ` AND r.end_timestamp <= $${paramIndex}`;
    params.push(filters.to_date);
    paramIndex++;
  }
  
  if (filters?.resource_id) {
    query += ` AND rr.resource_id = $${paramIndex}`;
    params.push(filters.resource_id);
    paramIndex++;
  }
  
  query += ` ORDER BY r.start_timestamp DESC`;
  
  if (filters?.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
    paramIndex++;
  }
  
  if (filters?.offset) {
    query += ` OFFSET $${paramIndex}`;
    params.push(filters.offset);
    paramIndex++;
  }
  
  const result = await pool.query(query, params);
  
  // Fetch full details for each booking
  const bookings = await Promise.all(
    result.rows.map(row => getBookingById(row.id) as Promise<BookingDetail>)
  );
  
  return bookings.filter(b => b !== null);
}

// Get suggested time slots
export async function getSuggestedTimeSlots(
  requestId: number | string,
  daysAhead: number = 7
): Promise<TimeSlotSuggestion[]> {
  const booking = await getBookingById(requestId);
  if (!booking) {
    throw new Error('Booking not found');
  }
  
  const duration = booking.end_timestamp.getTime() - booking.start_timestamp.getTime();
  const resourceIds = booking.resources.map(r => r.id);
  
  const suggestions: TimeSlotSuggestion[] = [];
  const timezone = process.env.TIMEZONE || 'America/New_York';
  
  // Check same time slot for next several days
  for (let i = 1; i <= daysAhead; i++) {
    const newDate = new Date(booking.requested_date);
    newDate.setDate(newDate.getDate() + i);
    
    const newStartTimestamp = combineDateTime(
      newDate.toISOString().split('T')[0],
      booking.start_time,
      timezone
    );
    const newEndTimestamp = new Date(newStartTimestamp.getTime() + duration);
    
    const conflictCheck = await checkConflicts(
      newStartTimestamp,
      newEndTimestamp,
      resourceIds
    );
    
    suggestions.push({
      date: newDate.toISOString().split('T')[0],
      start_time: booking.start_time,
      end_time: booking.end_time,
      start_timestamp: newStartTimestamp,
      end_timestamp: newEndTimestamp,
      available: !conflictCheck.has_conflicts,
      conflicts: conflictCheck.conflicts
    });
  }
  
  return suggestions;
}
