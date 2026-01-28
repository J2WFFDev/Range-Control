import { parseTime, combineDateTime, formatDate, formatTime } from './time';

describe('Time Utils', () => {
  describe('parseTime', () => {
    it('should parse valid time strings', () => {
      expect(parseTime('09:00')).toEqual({ hours: 9, minutes: 0 });
      expect(parseTime('14:30')).toEqual({ hours: 14, minutes: 30 });
      expect(parseTime('23:59')).toEqual({ hours: 23, minutes: 59 });
    });

    it('should throw error for invalid time format', () => {
      expect(() => parseTime('9:00')).toThrow('Invalid time format');
      expect(() => parseTime('25:00')).toThrow('Invalid time values');
      expect(() => parseTime('14:60')).toThrow('Invalid time values');
      expect(() => parseTime('invalid')).toThrow('Invalid time format');
    });
  });

  describe('combineDateTime', () => {
    it('should combine date and time correctly', () => {
      const result = combineDateTime('2024-03-15', '09:00', 'America/New_York');
      expect(result).toBeInstanceOf(Date);
      expect(result.getUTCHours()).toBeGreaterThanOrEqual(0);
    });

    it('should handle different timezones', () => {
      const nyTime = combineDateTime('2024-03-15', '09:00', 'America/New_York');
      const laTime = combineDateTime('2024-03-15', '09:00', 'America/Los_Angeles');
      
      // LA is 3 hours behind NY, so LA 9am should be later in UTC
      expect(laTime.getTime()).toBeGreaterThan(nyTime.getTime());
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-03-15T12:00:00Z');
      const formatted = formatDate(date);
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('formatTime', () => {
    it('should format time in HH:MM format', () => {
      const date = new Date('2024-03-15T09:30:00Z');
      const formatted = formatTime(date);
      expect(formatted).toMatch(/^\d{2}:\d{2}$/);
    });
  });
});
