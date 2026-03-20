-- Fix: allow internal CRM staff (admin/manager within internal_crm tenant)
-- to view/update/reply to tickets across all tenant companies.
-- This matches the "Admin Support Dashboard" requirement while keeping client isolation.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_ticket_status') THEN
    RAISE EXCEPTION 'support_ticket_status enum not found - run base support migration first.';
  END IF;
END $$;

-- Helper condition (inlined in policies):
-- internal_crm_staff_condition :=
--   exists(company in user's tenant where industry='internal_crm')
--   AND has_role_level(auth.uid(), 'manager')

-- 1) support_tickets SELECT
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
    AND public.has_role_level(auth.uid(), 'manager')
  )
  OR (
    company_id = public.get_user_company_id(auth.uid())
    AND (
      user_id = auth.uid()
      OR public.has_role_level(auth.uid(), 'admin')
    )
  )
);

-- 2) support_tickets UPDATE
DROP POLICY IF EXISTS support_tickets_update_admin ON public.support_tickets;
CREATE POLICY "support_tickets_update_admin"
ON public.support_tickets FOR UPDATE
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR (
    EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.id = public.get_user_company_id(auth.uid())
        AND c.industry = 'internal_crm'
    )
    AND public.has_role_level(auth.uid(), 'manager')
  )
  OR (
    company_id = public.get_user_company_id(auth.uid())
    AND public.has_role_level(auth.uid(), 'admin')
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
  OR (
    EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.id = public.get_user_company_id(auth.uid())
        AND c.industry = 'internal_crm'
    )
    AND public.has_role_level(auth.uid(), 'manager')
  )
  OR (
    company_id = public.get_user_company_id(auth.uid())
    AND public.has_role_level(auth.uid(), 'admin')
  )
);

-- 3) support_ticket_messages SELECT
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
    AND public.has_role_level(auth.uid(), 'manager')
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

-- 4) support_ticket_messages INSERT
DROP POLICY IF EXISTS support_ticket_messages_insert ON public.support_ticket_messages;
CREATE POLICY "support_ticket_messages_insert"
ON public.support_ticket_messages FOR INSERT
WITH CHECK (
  sender_user_id = auth.uid()
  AND (
    (
      sender_type = 'client'
      AND EXISTS (
        SELECT 1
        FROM public.support_tickets t
        WHERE t.id = ticket_id
          AND t.company_id = public.get_user_company_id(auth.uid())
          AND t.user_id = auth.uid()
      )
    )
    OR
    (
      sender_type = 'admin'
      AND (
        public.has_role(auth.uid(), 'super_admin')
        OR (
          EXISTS (
            SELECT 1
            FROM public.companies c
            WHERE c.id = public.get_user_company_id(auth.uid())
              AND c.industry = 'internal_crm'
          )
          AND public.has_role_level(auth.uid(), 'manager')
        )
        OR (
          public.has_role_level(auth.uid(), 'admin')
          AND EXISTS (
            SELECT 1
            FROM public.support_tickets t
            WHERE t.id = ticket_id
              AND t.company_id = public.get_user_company_id(auth.uid())
          )
        )
      )
    )
  )
);

-- 5) support_ticket_internal_notes SELECT
DROP POLICY IF EXISTS support_ticket_internal_notes_select_admin ON public.support_ticket_internal_notes;
CREATE POLICY "support_ticket_internal_notes_select_admin"
ON public.support_ticket_internal_notes FOR SELECT
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR (
    EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.id = public.get_user_company_id(auth.uid())
        AND c.industry = 'internal_crm'
    )
    AND public.has_role_level(auth.uid(), 'manager')
  )
  OR (
    EXISTS (
      SELECT 1
      FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND t.company_id = public.get_user_company_id(auth.uid())
    )
    AND public.has_role_level(auth.uid(), 'admin')
  )
);

-- 6) support_ticket_internal_notes INSERT
DROP POLICY IF EXISTS support_ticket_internal_notes_insert_admin ON public.support_ticket_internal_notes;
CREATE POLICY "support_ticket_internal_notes_insert_admin"
ON public.support_ticket_internal_notes FOR INSERT
WITH CHECK (
  admin_user_id = auth.uid()
  AND (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      EXISTS (
        SELECT 1
        FROM public.companies c
        WHERE c.id = public.get_user_company_id(auth.uid())
          AND c.industry = 'internal_crm'
      )
      AND public.has_role_level(auth.uid(), 'manager')
    )
    OR (
      public.has_role_level(auth.uid(), 'admin')
      AND EXISTS (
        SELECT 1
        FROM public.support_tickets t
        WHERE t.id = ticket_id
          AND t.company_id = public.get_user_company_id(auth.uid())
      )
    )
  )
);

