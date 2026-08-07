/**
 * Simple client-side CSV parser that correctly handles quoted values,
 * commas inside quotes, and escaped quotes.
 * Automatically strips UTF-8 BOM (\uFEFF) and zero-width spaces (\u200B)
 * so files exported from this app can be cleanly re-imported.
 */
export function parseCSV(text: string): Record<string, string>[] {
  // Strip UTF-8 BOM and zero-width spaces that may appear from Excel/exported CSVs
  const cleanText = text.replace(/^\uFEFF/, '').replace(/\u200B/g, '');

  const lines: string[][] = [];
  let row: string[] = [""];
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        row[row.length - 1] += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push("");
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      lines.push(row);
      row = [""];
    } else {
      row[row.length - 1] += char;
    }
  }
  if (row.length > 1 || row[0] !== "") {
    lines.push(row);
  }

  if (lines.length === 0) return [];

  const headers = lines[0].map(h => h.trim());

  const result: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i];
    if (values.length === 1 && values[0] === "") continue;
    
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (header) {
        obj[header] = (values[index] || "").trim();
      }
    });
    result.push(obj);
  }
  return result;
}

/**
 * Normalize a phone number to E.164 format for WhatsApp (Twilio & Meta).
 *
 * Handles the following common Indian formats:
 *   09876543210   → +919876543210   (leading 0 replaced with +91)
 *   9876543210    → +919876543210   (bare 10-digit — assumes India)
 *   919876543210  → +919876543210   (missing leading +)
 *   +919876543210 → +919876543210   (already correct, unchanged)
 *
 * International numbers that already start with + are returned as-is.
 */
export function normalizePhone(raw: string): string {
  if (!raw) return raw;
  // Strip zero-width space (added for Excel export), spaces, and dashes
  let phone = raw.replace(/\u200B/g, '').replace(/[\s\-().]/g, '').trim();
  if (!phone) return phone;

  // Already in E.164 format
  if (phone.startsWith('+')) return phone;

  // Indian local format: starts with 0 followed by 10 digits → +91XXXXXXXXXX
  if (phone.startsWith('0') && phone.length === 11) {
    return '+91' + phone.slice(1);
  }

  // Bare 10-digit Indian number → +91XXXXXXXXXX
  if (/^\d{10}$/.test(phone)) {
    return '+91' + phone;
  }

  // Country code without + (e.g. 919876543210) → +919876543210
  if (/^\d{11,15}$/.test(phone)) {
    return '+' + phone;
  }

  // Fallback: return as-is (let the API report the error)
  return phone;
}


/**
 * Safe CSV formatting function for values.
 * Values starting with \u200B (zero-width space) are always quoted to force text format in Excel.
 */
function escapeCSVValue(val: any): string {
  if (val === null || val === undefined) return '';
  const stringVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
  // Always quote values that start with zero-width space (phone numbers) or contain special chars
  if (
    stringVal.startsWith('\u200B') ||
    stringVal.includes(',') ||
    stringVal.includes('"') ||
    stringVal.includes('\n') ||
    stringVal.includes('\r')
  ) {
    return `"${stringVal.replace(/"/g, '""')}"`;
  }
  return stringVal;
}

/**
 * Generate CSV string from headers and rows of objects.
 */
export function generateCSV(headers: { key: string; label: string }[], data: any[]): string {
  const headerRow = headers.map(h => escapeCSVValue(h.label)).join(',');
  const dataRows = data.map(item => {
    return headers.map(h => escapeCSVValue(item[h.key])).join(',');
  });
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Triggers a browser download of a CSV file.
 * Prepends a UTF-8 BOM so Excel opens the file with correct encoding and text formatting.
 */
export function downloadCSV(csvContent: string, fileName: string) {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
