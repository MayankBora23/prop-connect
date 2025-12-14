-- Drop the restrictive policy and recreate as permissive
DROP POLICY IF EXISTS "Anyone can create a company during signup" ON public.companies;

-- Create a permissive INSERT policy that allows anyone to create a company
CREATE POLICY "Anyone can create a company during signup" 
ON public.companies 
FOR INSERT 
TO authenticated, anon
WITH CHECK (true);