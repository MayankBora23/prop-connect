-- Test without RLS to confirm the issue is with policies

-- Temporarily disable RLS
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

SELECT 'RLS disabled - test notification creation now' as status;

-- After testing, run this to re-enable:
-- ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
-- Then apply proper policies
