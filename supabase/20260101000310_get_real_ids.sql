-- Get real user and company IDs for testing
-- Run this to get actual IDs to use in tests

-- Get all users with their company info
SELECT
  p.user_id,
  p.name,
  p.email,
  p.company_id,
  c.name as company_name
FROM profiles p
LEFT JOIN companies c ON p.company_id = c.id
ORDER BY p.created_at DESC;

-- Get the most recent user (likely the one you're testing with)
SELECT
  p.user_id,
  p.name,
  p.email,
  p.company_id,
  c.name as company_name
FROM profiles p
LEFT JOIN companies c ON p.company_id = c.id
ORDER BY p.created_at DESC
LIMIT 1;
