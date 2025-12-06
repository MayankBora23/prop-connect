import type { Lead } from '@/data/mockData';

// Convert leads to CSV format
export function exportLeadsToCSV(leads: Lead[]): string {
  const headers = [
    'Name',
    'Phone',
    'Email',
    'Budget',
    'Location',
    'Property Type',
    'Source',
    'Stage',
    'Assigned To',
    'Tags',
    'Notes',
    'Created At',
    'Last Contact',
  ];

  const rows = leads.map((lead) => [
    lead.name || '',
    lead.phone || '',
    lead.email || '',
    lead.budget || '',
    lead.location || '',
    lead.propertyType || '',
    lead.source || '',
    lead.stage || '',
    lead.assignedTo || '',
    lead.tags?.join('; ') || '',
    lead.notes?.join('; ') || '',
    lead.createdAt || '',
    lead.lastContact || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          // Escape commas and quotes in cell values
          const cellStr = String(cell || '');
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        })
        .join(',')
    ),
  ].join('\n');

  return csvContent;
}

// Download CSV file
export function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Parse CSV file to leads
export function parseCSVToLeads(csvText: string): Partial<Lead>[] {
  const lines = csvText.split('\n').filter((line) => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row');
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, ''));
  const leads: Partial<Lead>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = parseCSVLine(line);
    
    if (values.length === 0) continue;

    const lead: Partial<Lead> = {};

    headers.forEach((header, index) => {
      const value = values[index]?.trim() || '';
      
      switch (header) {
        case 'name':
          lead.name = value;
          break;
        case 'phone':
          lead.phone = value;
          break;
        case 'email':
          lead.email = value;
          break;
        case 'budget':
          lead.budget = value;
          break;
        case 'location':
          lead.location = value;
          break;
        case 'propertytype':
        case 'property_type':
          lead.propertyType = value;
          break;
        case 'source':
          lead.source = value;
          break;
        case 'stage':
          lead.stage = value as Lead['stage'];
          break;
        case 'assignedto':
        case 'assigned_to':
          lead.assignedTo = value;
          break;
        case 'tags':
          lead.tags = value ? value.split(';').map((t) => t.trim()).filter(Boolean) : [];
          break;
        case 'notes':
          lead.notes = value ? value.split(';').map((n) => n.trim()).filter(Boolean) : [];
          break;
        case 'createdat':
        case 'created_at':
          lead.createdAt = value;
          break;
        case 'lastcontact':
        case 'last_contact':
          lead.lastContact = value;
          break;
      }
    });

    // Validate required fields
    if (lead.name && lead.phone && lead.email) {
      leads.push(lead);
    }
  }

  return leads;
}

// Parse a CSV line handling quoted values
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  values.push(current);
  return values;
}

// Read file as text
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(e.target?.result as string);
    };
    reader.onerror = (e) => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsText(file);
  });
}

