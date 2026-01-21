-- Temporarily disable RLS to test if that's the issue
-- WARNING: This disables security - only use for testing!

ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- Now try creating a notification - it should work
-- Then re-enable RLS:
-- ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
