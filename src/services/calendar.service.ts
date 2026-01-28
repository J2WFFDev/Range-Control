import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db/connection.js';
import type { BookingDetail, CalendarEventRef } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if Google Calendar is enabled
const CALENDAR_ENABLED = process.env.GOOGLE_CALENDAR_ENABLED === 'true';

// Initialize Google Calendar API client
let calendar: any = null;

async function initCalendar() {
  if (!CALENDAR_ENABLED) {
    console.log('Google Calendar integration is disabled');
    return null;
  }

  try {
    const credentialsPath = process.env.GOOGLE_CALENDAR_CREDENTIALS_PATH || 
                           path.join(process.cwd(), 'google-credentials.json');
    
    if (!fs.existsSync(credentialsPath)) {
      console.warn('Google Calendar credentials file not found. Calendar integration disabled.');
      return null;
    }

    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    calendar = google.calendar({ version: 'v3', auth });
    console.log('Google Calendar API initialized successfully');
    return calendar;
  } catch (error) {
    console.error('Failed to initialize Google Calendar API:', error);
    return null;
  }
}

// Get calendar client (lazy initialization)
async function getCalendar() {
  if (!calendar && CALENDAR_ENABLED) {
    calendar = await initCalendar();
  }
  return calendar;
}

// Get resource calendar mapping
async function getResourceCalendarId(resourceId: number): Promise<string | null> {
  const result = await pool.query(
    'SELECT calendar_id FROM resource_calendars WHERE resource_id = $1',
    [resourceId]
  );
  
  return result.rows[0]?.calendar_id || null;
}

// Format booking for calendar event
function formatCalendarEvent(booking: BookingDetail) {
  const summary = `${booking.group_name} - ${booking.ro_name}`;
  const description = `
Booking ID: ${booking.request_id}
Group: ${booking.group_name}
Contact: ${booking.contact_name} (${booking.contact_email})
Range Officer: ${booking.ro_name}
Qualification: ${booking.ro_qualification}
Participants: ${booking.participant_count}
Session: ${booking.session_details || 'N/A'}
Resources: ${booking.resources.map(r => r.name).join(', ')}
Status: ${booking.status}
  `.trim();

  return {
    summary,
    description,
    start: {
      dateTime: booking.start_timestamp.toISOString(),
      timeZone: process.env.TIMEZONE || 'America/New_York',
    },
    end: {
      dateTime: booking.end_timestamp.toISOString(),
      timeZone: process.env.TIMEZONE || 'America/New_York',
    },
    attendees: [
      { email: booking.contact_email }
    ],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 }, // 1 day before
        { method: 'email', minutes: 60 }, // 1 hour before
      ],
    },
  };
}

// Create calendar events for approved booking
export async function createCalendarEvents(booking: BookingDetail): Promise<CalendarEventRef[]> {
  const cal = await getCalendar();
  if (!cal) {
    console.log('Calendar not available, skipping event creation');
    return [];
  }

  const eventRefs: CalendarEventRef[] = [];
  const event = formatCalendarEvent(booking);

  // Create event in each resource's calendar
  for (const resource of booking.resources) {
    try {
      const calendarId = await getResourceCalendarId(resource.id);
      
      if (!calendarId) {
        console.warn(`No calendar mapping found for resource ${resource.name} (ID: ${resource.id})`);
        continue;
      }

      const response = await cal.events.insert({
        calendarId,
        requestBody: event,
      });

      if (response.data.id) {
        eventRefs.push({
          resource_id: resource.id,
          calendar_id: calendarId,
          event_id: response.data.id,
        });

        console.log(`Created calendar event ${response.data.id} for ${resource.name}`);
      }
    } catch (error) {
      console.error(`Failed to create calendar event for resource ${resource.name}:`, error);
      // Continue with other resources even if one fails
    }
  }

  // Store event IDs in database
  if (eventRefs.length > 0) {
    await pool.query(
      'UPDATE requests SET calendar_event_ids = $1 WHERE id = $2',
      [JSON.stringify(eventRefs), booking.id]
    );
  }

  return eventRefs;
}

// Update calendar events when booking is rescheduled
export async function updateCalendarEvents(
  booking: BookingDetail,
  oldEventRefs: CalendarEventRef[]
): Promise<CalendarEventRef[]> {
  const cal = await getCalendar();
  if (!cal) {
    console.log('Calendar not available, skipping event update');
    return [];
  }

  const event = formatCalendarEvent(booking);
  const updatedRefs: CalendarEventRef[] = [];

  for (const ref of oldEventRefs) {
    try {
      await cal.events.update({
        calendarId: ref.calendar_id,
        eventId: ref.event_id,
        requestBody: event,
      });

      updatedRefs.push(ref);
      console.log(`Updated calendar event ${ref.event_id}`);
    } catch (error) {
      console.error(`Failed to update calendar event ${ref.event_id}:`, error);
    }
  }

  return updatedRefs;
}

// Delete calendar events when booking is cancelled or bumped
export async function deleteCalendarEvents(eventRefs: CalendarEventRef[]): Promise<void> {
  const cal = await getCalendar();
  if (!cal) {
    console.log('Calendar not available, skipping event deletion');
    return;
  }

  for (const ref of eventRefs) {
    try {
      await cal.events.delete({
        calendarId: ref.calendar_id,
        eventId: ref.event_id,
      });

      console.log(`Deleted calendar event ${ref.event_id}`);
    } catch (error) {
      // Event might already be deleted, log but don't fail
      console.warn(`Failed to delete calendar event ${ref.event_id}:`, error);
    }
  }
}

// Mark calendar event as cancelled (but keep for record)
export async function markCalendarEventCancelled(
  eventRefs: CalendarEventRef[],
  reason: string
): Promise<void> {
  const cal = await getCalendar();
  if (!cal) {
    return;
  }

  for (const ref of eventRefs) {
    try {
      // Get current event
      const response = await cal.events.get({
        calendarId: ref.calendar_id,
        eventId: ref.event_id,
      });

      const event = response.data;
      
      // Update with cancellation notice
      event.summary = `[BUMPED] ${event.summary}`;
      event.description = `${event.description}\n\n--- BUMPED ---\nReason: ${reason}`;
      event.colorId = '11'; // Red color for cancelled events

      await cal.events.update({
        calendarId: ref.calendar_id,
        eventId: ref.event_id,
        requestBody: event,
      });

      console.log(`Marked calendar event ${ref.event_id} as bumped`);
    } catch (error) {
      console.error(`Failed to mark calendar event ${ref.event_id} as bumped:`, error);
    }
  }
}

// Create or update resource calendar mapping
export async function mapResourceToCalendar(
  resourceId: number,
  calendarId: string,
  calendarName?: string
): Promise<void> {
  await pool.query(
    `INSERT INTO resource_calendars (resource_id, calendar_id, calendar_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (calendar_id) 
     DO UPDATE SET resource_id = $1, calendar_name = $3`,
    [resourceId, calendarId, calendarName]
  );
  
  console.log(`Mapped resource ${resourceId} to calendar ${calendarId}`);
}

// List all calendar mappings
export async function listCalendarMappings() {
  const result = await pool.query(`
    SELECT rc.*, r.name as resource_name, r.type as resource_type
    FROM resource_calendars rc
    JOIN resources r ON rc.resource_id = r.id
    ORDER BY r.type, r.name
  `);
  
  return result.rows;
}
