/** Format property area without duplicating sq.ft when already present. */
export function formatPropertyArea(area: string | number | null | undefined): string {
  if (area == null || area === '') return '';
  const areaStr = String(area).trim();
  if (!areaStr) return '';
  const lower = areaStr.toLowerCase();
  if (lower.includes('sq') || lower.includes('ft')) {
    return areaStr;
  }
  return `${areaStr} sq.ft`;
}

export function formatPropertyAreaLine(area: string | number | null | undefined): string {
  const formatted = formatPropertyArea(area);
  return formatted ? `${formatted}\n` : '';
}

export function getPropertyArea(property: { area?: string | number | null; area_sqft?: string | number | null }): string | number | null | undefined {
  return property.area ?? property.area_sqft ?? null;
}

export function parsePropertyPrice(price: string | number | null | undefined): number {
  if (price == null || price === '') return 0;
  const str = String(price).trim().toLowerCase().replace(/,/g, '').replace(/₹/g, '');
  const numericOnly = Number(str.replace(/[^\d.]/g, ''));
  if (Number.isNaN(numericOnly)) return 0;
  if (str.includes('crore') || /\bcr\b/.test(str)) return numericOnly * 10000000;
  if (str.includes('lakh') || str.includes('lac') || str.endsWith('l')) return numericOnly * 100000;
  if (str.endsWith('k')) return numericOnly * 1000;
  return numericOnly;
}

export function formatPropertyPrice(price: string | number | null | undefined): string {
  if (price == null || price === '') return 'Price on request';
  const str = String(price).trim();
  const lower = str.toLowerCase();
  if (lower.includes('₹') || lower.includes('cr') || lower.endsWith('l') || lower.includes(' lakh')) {
    return str.startsWith('₹') ? str : `₹${str}`;
  }
  const num = Number(str.replace(/[^\d.]/g, ''));
  if (Number.isNaN(num)) return str.startsWith('₹') ? str : `₹${str}`;
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  return `₹${num.toLocaleString('en-IN')}`;
}

type PropertyMessageInput = {
  title: string;
  description?: string | null;
  bhk?: string | number | null;
  area?: string | number | null;
  area_sqft?: string | number | null;
  price?: string | number | null;
  location?: string | null;
  city?: string | null;
  address?: string | null;
  amenities?: string[] | null;
  property_type?: string | null;
  status?: string | null;
};

export function buildPropertyWhatsAppMessage(property: PropertyMessageInput): string {
  const bhk = property.bhk;
  const bhkLine = bhk
    ? `${typeof bhk === 'string' ? bhk : `${bhk} BHK`}\n`
    : '';

  return (
    `*${property.title}*\n\n` +
    `${property.description ? `${property.description}\n\n` : ''}` +
    bhkLine +
    formatPropertyAreaLine(getPropertyArea(property)) +
    `${property.price ? `${formatPropertyPrice(property.price)}\n\n` : ''}` +
    `📍 *Location:*\n` +
    `${property.location || property.city || property.address || 'Location not specified'}\n` +
    `${property.amenities?.length ? `\n✨ *Amenities:*\n${property.amenities.join(', ')}\n` : ''}` +
    `${property.property_type ? `\n🏢 *Type:* ${property.property_type}\n` : ''}` +
    `${property.status ? `\n📊 *Status:* ${property.status.charAt(0).toUpperCase() + property.status.slice(1)}\n` : ''}` +
    `\n📞 *Contact us for more details!*`
  );
}
