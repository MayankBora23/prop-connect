/** Human label for `support_tickets.industry_type` / `companies.industry`. */
export function formatIndustryType(value: string | undefined): string {
  switch (value) {
    case 'real_estate':
      return 'Real estate';
    case 'education':
      return 'Education';
    case 'automobile_dealers':
      return 'Automobile dealers';
    case 'internal_crm':
      return 'Internal CRM';
    default:
      return value?.replace(/_/g, ' ') || '—';
  }
}
