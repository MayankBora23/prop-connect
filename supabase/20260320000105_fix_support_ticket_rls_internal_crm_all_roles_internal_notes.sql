-- Allow internal_crm tenant users (all roles) to INSERT/SELECT internal notes

-- support_ticket_internal_notes SELECT
DROP POLICY IF EXISTS support_ticket_internal_notes_select_admin ON public.support_ticket_internal_notes;
CREATE POLICY "support_ticket_internal_notes_select_admin"
ON public.support_ticket_internal_notes FOR SELECT
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = public.get_user_company_id(auth.uid())
      AND c.industry = 'internal_crm'
  )
  OR (
    -- Fallback: same-company admins can read
    EXISTS (
      SELECT 1
      FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND t.company_id = public.get_user_company_id(auth.uid())
    )
    AND public.has_role_level(auth.uid(), 'admin')
  )
);

-- support_ticket_internal_notes INSERT
DROP POLICY IF EXISTS support_ticket_internal_notes_insert_admin ON public.support_ticket_internal_notes;
CREATE POLICY "support_ticket_internal_notes_insert_admin"
ON public.support_ticket_internal_notes FOR INSERT
WITH CHECK (
  admin_user_id = auth.uid()
  AND (
    public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.id = public.get_user_company_id(auth.uid())
        AND c.industry = 'internal_crm'
    )
  )
);

