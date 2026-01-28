import { Router, Request, Response } from 'express';
import * as bookingService from '../services/booking.service.js';
import type { CreateBookingRequest, ApprovalActionInput, RescheduleInput } from '../types/index.js';

const router = Router();

// Helper to extract actor from request (placeholder for auth)
function getActor(req: Request): string {
  // TODO: Extract from auth token
  const actor = req.body.actor || req.headers['x-actor'] as string;
  if (!actor) {
    throw new Error('Actor/user identification is required');
  }
  return actor;
}

// Helper to get IP and user agent
function getRequestMeta(req: Request) {
  return {
    ip_address: req.ip || req.headers['x-forwarded-for'] as string,
    user_agent: req.headers['user-agent']
  };
}

// POST /api/bookings - Create a new booking request
router.post('/', async (req: Request, res: Response) => {
  try {
    const data: CreateBookingRequest = req.body;
    
    // Validate required fields
    if (!data.group_name || !data.contact_name || !data.contact_email) {
      return res.status(400).json({ error: 'Missing required requester information' });
    }
    
    if (!data.ro_name || !data.ro_qualification) {
      return res.status(400).json({ error: 'Missing required Range Officer information' });
    }
    
    if (!data.requested_date || !data.start_time || !data.end_time) {
      return res.status(400).json({ error: 'Missing required scheduling information' });
    }
    
    if (!data.resource_ids || data.resource_ids.length === 0) {
      return res.status(400).json({ error: 'At least one resource must be selected' });
    }
    
    if (!data.participant_count || data.participant_count < 1) {
      return res.status(400).json({ error: 'Participant count must be at least 1' });
    }
    
    if (!data.attestations || !data.attestations.safety || !data.attestations.waiver || !data.attestations.insurance) {
      return res.status(400).json({ error: 'All attestations (safety, waiver, insurance) are required' });
    }
    
    const booking = await bookingService.createBookingRequest(data);
    
    res.status(201).json({
      success: true,
      data: booking,
      message: booking.status === 'approved' 
        ? 'Booking auto-approved (RO whitelisted)' 
        : 'Booking request submitted for approval'
    });
  } catch (error: any) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: error.message || 'Failed to create booking request' });
  }
});

// GET /api/bookings - List bookings with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters = {
      status: req.query.status as string,
      resource_id: req.query.resource_id ? parseInt(req.query.resource_id as string) : undefined,
      from_date: req.query.from_date ? new Date(req.query.from_date as string) : undefined,
      to_date: req.query.to_date ? new Date(req.query.to_date as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0
    };
    
    const bookings = await bookingService.listBookings(filters);
    
    res.json({
      success: true,
      data: bookings,
      count: bookings.length
    });
  } catch (error: any) {
    console.error('Error listing bookings:', error);
    res.status(500).json({ error: error.message || 'Failed to list bookings' });
  }
});

// GET /api/bookings/:id - Get booking by ID or request_id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const booking = await bookingService.getBookingById(id);
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    res.json({
      success: true,
      data: booking
    });
  } catch (error: any) {
    console.error('Error getting booking:', error);
    res.status(500).json({ error: error.message || 'Failed to get booking' });
  }
});

// GET /api/bookings/:id/conflicts - Check conflicts for a booking
router.get('/:id/conflicts', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const booking = await bookingService.getBookingById(id);
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    const resourceIds = booking.resources.map(r => r.id);
    const conflictCheck = await bookingService.checkConflicts(
      booking.start_timestamp,
      booking.end_timestamp,
      resourceIds,
      booking.id
    );
    
    res.json({
      success: true,
      data: conflictCheck
    });
  } catch (error: any) {
    console.error('Error checking conflicts:', error);
    res.status(500).json({ error: error.message || 'Failed to check conflicts' });
  }
});

// GET /api/bookings/:id/suggestions - Get suggested alternative time slots
router.get('/:id/suggestions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const daysAhead = req.query.days ? parseInt(req.query.days as string) : 7;
    
    const suggestions = await bookingService.getSuggestedTimeSlots(id, daysAhead);
    
    res.json({
      success: true,
      data: suggestions
    });
  } catch (error: any) {
    console.error('Error getting suggestions:', error);
    res.status(500).json({ error: error.message || 'Failed to get time slot suggestions' });
  }
});

// POST /api/bookings/:id/approve - Approve booking (normal - blocked on conflicts)
router.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const meta = getRequestMeta(req);
    
    const input: ApprovalActionInput = {
      actor: getActor(req),
      reason: req.body.reason,
      ...meta
    };
    
    const booking = await bookingService.approveBooking(id, input);
    
    res.json({
      success: true,
      data: booking,
      message: 'Booking approved successfully'
    });
  } catch (error: any) {
    console.error('Error approving booking:', error);
    res.status(400).json({ error: error.message || 'Failed to approve booking' });
  }
});

// POST /api/bookings/:id/deny - Deny booking
router.post('/:id/deny', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const meta = getRequestMeta(req);
    
    const input: ApprovalActionInput = {
      actor: getActor(req),
      reason: req.body.reason,
      ...meta
    };
    
    if (!input.reason) {
      return res.status(400).json({ error: 'Reason is required for denial' });
    }
    
    const booking = await bookingService.denyBooking(id, input);
    
    res.json({
      success: true,
      data: booking,
      message: 'Booking denied'
    });
  } catch (error: any) {
    console.error('Error denying booking:', error);
    res.status(400).json({ error: error.message || 'Failed to deny booking' });
  }
});

// POST /api/bookings/:id/override - Override approve (approve despite conflicts)
router.post('/:id/override', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const meta = getRequestMeta(req);
    
    const input: ApprovalActionInput = {
      actor: getActor(req),
      reason: req.body.reason,
      override_reason: req.body.override_reason,
      ...meta
    };
    
    if (!input.override_reason) {
      return res.status(400).json({ error: 'Override reason is required' });
    }
    
    const booking = await bookingService.overrideApproveBooking(id, input);
    
    res.json({
      success: true,
      data: booking,
      message: 'Booking approved with override'
    });
  } catch (error: any) {
    console.error('Error override approving booking:', error);
    res.status(400).json({ error: error.message || 'Failed to override approve booking' });
  }
});

// POST /api/bookings/:id/bump - Override and bump (approve and mark conflicts as bumped)
router.post('/:id/bump', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const meta = getRequestMeta(req);
    
    const input: ApprovalActionInput = {
      actor: getActor(req),
      reason: req.body.reason,
      override_reason: req.body.override_reason,
      ...meta
    };
    
    if (!input.override_reason) {
      return res.status(400).json({ error: 'Override reason is required for bump action' });
    }
    
    const booking = await bookingService.overrideAndBumpBooking(id, input);
    
    res.json({
      success: true,
      data: booking,
      message: 'Booking approved and conflicting bookings bumped'
    });
  } catch (error: any) {
    console.error('Error bumping booking:', error);
    res.status(400).json({ error: error.message || 'Failed to bump booking' });
  }
});

// POST /api/bookings/:id/reschedule - Reschedule booking to new time
router.post('/:id/reschedule', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const input: RescheduleInput = {
      new_date: req.body.new_date,
      new_start_time: req.body.new_start_time,
      new_end_time: req.body.new_end_time,
      actor: getActor(req),
      reason: req.body.reason
    };
    
    if (!input.new_date || !input.new_start_time || !input.new_end_time) {
      return res.status(400).json({ error: 'New date and time are required' });
    }
    
    const booking = await bookingService.rescheduleBooking(id, input);
    
    res.json({
      success: true,
      data: booking,
      message: 'Booking rescheduled successfully'
    });
  } catch (error: any) {
    console.error('Error rescheduling booking:', error);
    res.status(400).json({ error: error.message || 'Failed to reschedule booking' });
  }
});

export default router;
