export type SearchableValue = string | number | null | undefined;

export function filterBySearch<T>(
  items: T[] | undefined | null,
  search: string,
  getValues: (item: T) => SearchableValue[]
): T[] {
  const list = items ?? [];
  const query = search.trim().toLowerCase();
  if (!query) return list;

  return list.filter((item) =>
    getValues(item).some(
      (value) => value != null && String(value).toLowerCase().includes(query)
    )
  );
}

const SEARCH_PLACEHOLDERS: Record<string, string> = {
  leads: 'Search leads...',
  properties: 'Search properties...',
  employees: 'Search employees...',
  purchased: 'Search purchased deals...',
  visits: 'Search site visits...',
  followups: 'Search follow-ups...',
  team: 'Search team members...',
  templates: 'Search templates...',
  students: 'Search students...',
  courses: 'Search courses...',
  batches: 'Search batches...',
  teachers: 'Search teachers...',
  enrollments: 'Search enrollments...',
  vehicles: 'Search vehicles...',
  'test-drives': 'Search test drives...',
  bookings: 'Search bookings...',
  deals: 'Search deals...',
  demos: 'Search demos...',
  companies: 'Search companies...',
};

const TABS_WITHOUT_HEADER_SEARCH = new Set([
  'dashboard',
  'inbox',
  'whatsapp-inbox',
  'support',
  'telephony',
  'workspace',
  'analytics',
  'billing',
  'credits',
  'profile-settings',
  'company-settings',
  'reports',
  'employee-attendance',
  'attendance',
  'fees',
]);

export function getSearchPlaceholder(activeTab: string): string {
  return SEARCH_PLACEHOLDERS[activeTab] ?? 'Search...';
}

export function shouldShowHeaderSearch(activeTab: string, industry?: string): boolean {
  if (TABS_WITHOUT_HEADER_SEARCH.has(activeTab)) return false;
  if (industry === 'internal_crm' && activeTab === 'leads') return false;
  return activeTab in SEARCH_PLACEHOLDERS;
}
