// Time handling utilities for local timezone support

// Parse time string in HH:MM format
export function parseTime(timeStr: string): { hours: number; minutes: number } {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid time format: ${timeStr}. Expected HH:MM`);
  }
  
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time values: ${timeStr}`);
  }
  
  return { hours, minutes };
}

// Combine date string and time string into a timestamp in specified timezone
export function combineDateTime(
  dateStr: string,
  timeStr: string,
  timezone: string = 'America/New_York'
): Date {
  const { hours, minutes } = parseTime(timeStr);
  
  // Parse date
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
  
  // Create a date string in the local timezone
  // Format: YYYY-MM-DDTHH:MM:SS
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hoursStr = String(hours).padStart(2, '0');
  const minutesStr = String(minutes).padStart(2, '0');
  
  const localDateTimeStr = `${year}-${month}-${day}T${hoursStr}:${minutesStr}:00`;
  
  // For proper timezone handling, we would use a library like date-fns-tz
  // For now, we'll create a UTC date and adjust for the timezone offset
  // This is a simplified approach - in production, use a proper timezone library
  
  // Create date in local time (browser/system timezone)
  const localDate = new Date(localDateTimeStr);
  
  // Get timezone offset for the configured timezone
  // Note: This is simplified. In production, use a library like date-fns-tz or luxon
  // that properly handles DST and timezone conversions
  const offset = getTimezoneOffset(timezone);
  
  // Adjust for timezone
  const utcDate = new Date(localDate.getTime() - offset * 60000);
  
  return utcDate;
}

// Get timezone offset in minutes (simplified - doesn't handle DST properly)
// In production, use a proper timezone library
function getTimezoneOffset(timezone: string): number {
  // This is a simplified mapping. Use a proper library in production.
  const offsets: Record<string, number> = {
    'America/New_York': -300, // EST (UTC-5), doesn't account for DST
    'America/Chicago': -360, // CST (UTC-6)
    'America/Denver': -420, // MST (UTC-7)
    'America/Los_Angeles': -480, // PST (UTC-8)
    'UTC': 0,
  };
  
  return offsets[timezone] || 0;
}

// Format timestamp for display in local timezone
export function formatTimestamp(
  timestamp: Date,
  timezone: string = 'America/New_York'
): string {
  // In production, use a proper timezone library
  // For now, return ISO string
  return timestamp.toISOString();
}

// Format date for display
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Format time for display (HH:MM)
export function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}
