import { Router, Request, Response } from 'express';
import * as calendarService from '../services/calendar.service.js';

const router = Router();

// GET /api/calendar/mappings - List all calendar mappings
router.get('/mappings', async (req: Request, res: Response) => {
  try {
    const mappings = await calendarService.listCalendarMappings();
    
    res.json({
      success: true,
      data: mappings,
      count: mappings.length
    });
  } catch (error: any) {
    console.error('Error listing calendar mappings:', error);
    res.status(500).json({ error: error.message || 'Failed to list calendar mappings' });
  }
});

// POST /api/calendar/mappings - Create or update calendar mapping
router.post('/mappings', async (req: Request, res: Response) => {
  try {
    const { resource_id, calendar_id, calendar_name } = req.body;
    
    if (!resource_id || !calendar_id) {
      return res.status(400).json({ error: 'resource_id and calendar_id are required' });
    }
    
    await calendarService.mapResourceToCalendar(
      parseInt(resource_id),
      calendar_id,
      calendar_name
    );
    
    res.json({
      success: true,
      message: 'Calendar mapping created/updated successfully'
    });
  } catch (error: any) {
    console.error('Error creating calendar mapping:', error);
    res.status(500).json({ error: error.message || 'Failed to create calendar mapping' });
  }
});

export default router;
