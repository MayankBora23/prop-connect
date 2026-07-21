CREATE POLICY "internal_crm can read all wallet transactions"
  ON wallet_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN companies c ON c.id = p.company_id
      WHERE p.user_id = auth.uid()
      AND c.industry = 'internal_crm'
    )
  );

CREATE POLICY "internal_crm can read all payment history"
  ON subscription_payment_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN companies c ON c.id = p.company_id
      WHERE p.user_id = auth.uid()
      AND c.industry = 'internal_crm'
    )
  );
