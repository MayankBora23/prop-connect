-- Fix: in internal_crm tenant, allow ALL roles to VIEW tickets + messages

-- support_tickets_select
DROP POLICY IF EXISTS support_tickets_select ON public.support_tickets;
CREATE POLICY "support_tickets_select"
ON public.support_tickets FOR SELECT
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR (
    EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.id = public.get_user_company_id(auth.uid())
        AND c.industry = 'internal_crm'
    )
  )
  OR (
    company_id = public.get_user_company_id(auth.uid())
    AND (
      user_id = auth.uid()
      OR public.has_role_level(auth.uid(), 'admin')
    )
  )
);

-- support_ticket_messages_select
DROP POLICY IF EXISTS support_ticket_messages_select ON public.support_ticket_messages;
CREATE POLICY "support_ticket_messages_select"
ON public.support_ticket_messages FOR SELECT
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR (
    EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.id = public.get_user_company_id(auth.uid())
        AND c.industry = 'internal_crm'
    )
  )
  OR EXISTS (
    SELECT 1
    FROM public.support_tickets t
    WHERE t.id = ticket_id
      AND t.company_id = public.get_user_company_id(auth.uid())
      AND (
        t.user_id = auth.uid()
        OR public.has_role_level(auth.uid(), 'admin')
      )
  )
);

