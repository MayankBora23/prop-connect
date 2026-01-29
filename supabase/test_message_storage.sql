-- Test script to debug WhatsApp message storage issues

-- 1. Check if enum exists
SELECT n.nspname AS schema_name, t.typname AS type_name, e.enumlabel AS enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON t.typnamespace = n.oid
WHERE t.typname = 'message_direction'
ORDER BY e.enumsortorder;

-- 2. Check if table exists and its structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'whatsapp_messages'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'whatsapp_messages';

-- 4. Test manual insert (should work with service role)
-- Replace with actual conversation_id and company_id
INSERT INTO whatsapp_messages (conversation_id, direction, body, status, company_id)
VALUES ('test-conversation-id', 'outbound'::message_direction, 'Test AI message', 'sent', 'test-company-id');

-- 5. Check if insert worked
SELECT * FROM whatsapp_messages WHERE body = 'Test AI message';

-- 6. Check current auth context (run this in webhook to debug)
-- This will show what auth.uid() and auth.role() return
SELECT
  auth.uid() as current_user_id,
  auth.role() as current_role,
  auth.jwt() as jwt_claims;

-- 7. Check recent messages
SELECT
  wm.id,
  wm.created_at,
  wm.direction,
  LEFT(wm.body, 50) as message_preview,
  wm.status,
  wm.conversation_id,
  wm.company_id
FROM whatsapp_messages wm
ORDER BY wm.created_at DESC
LIMIT 10;