-- Check if the company_id constraint is causing issues

-- Verify the company exists
SELECT id, name FROM companies WHERE id = '0e0d71b1-748e-4c8e-a6c6-14b585946f30';

-- Check the foreign key constraint
SELECT
    tc.table_schema,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE
    tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name='notifications';

-- Test manual insert with verified company_id
-- INSERT INTO public.notifications (user_id, type, title, message, company_id, read)
-- VALUES ('b8e94e32-741d-40ee-a1c7-2fce43aa5770', 'task_assigned', 'Test', 'Test', '0e0d71b1-748e-4c8e-a6c6-14b585946f30', false);
