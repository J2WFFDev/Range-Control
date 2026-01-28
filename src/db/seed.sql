-- Sample data for Range Booking Automation System
-- Run this after schema.sql to populate initial resources

-- Insert sample resources
INSERT INTO resources (name, type, description, capacity) VALUES
  ('Bay 1', 'bay', '100-yard rifle range with 10 firing positions', 10),
  ('Bay 2', 'bay', '200-yard rifle range with 8 firing positions', 8),
  ('Bay 3', 'bay', 'Pistol range with 15 firing positions', 15),
  ('Main Building', 'building', 'Main operations and classroom building', 50),
  ('Storage Building', 'building', 'Equipment and ammunition storage', null),
  ('Target Set A', 'target', 'Paper targets for rifle qualification', null),
  ('Target Set B', 'target', 'Steel targets for pistol training', null),
  ('Target Set C', 'target', 'Moving target system', null)
ON CONFLICT DO NOTHING;

-- Note: In a real deployment, you would also add:
-- 1. Resource calendar mappings (resource_calendars table)
-- 2. Whitelisted Range Officers (separate whitelist table - to be created)
-- 3. Admin users (when authentication is implemented)

-- The system is now ready to accept booking requests!
