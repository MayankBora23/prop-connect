import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Upload, Download, FileText, CheckCircle2, ArrowRight, ArrowLeft, ChevronDown } from 'lucide-react';
import { parseCSV, generateCSV, downloadCSV } from '@/lib/csvUtils';
import * as XLSX from 'xlsx';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FieldDef {
  key: string;        // canonical key that onImport rows will use
  label: string;      // human readable label
  required: boolean;
  aliases: string[];  // candidate header names (normalized: lowercase, no special chars)
}

interface ImportCSVDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Receives rows re-keyed by the mapping step (e.g. row['Name'], row['Phone']) */
  onImport: (data: Record<string, string>[]) => Promise<void>;
  sampleHeaders: string[];
  title: string;
  description?: string;
  templateFileName?: string;
  /** Custom field definitions for the mapping step */
  fieldDefs?: FieldDef[];
}

// ─── Default field defs for Real-Estate / General Leads ──────────────────────

export const DEFAULT_LEAD_FIELD_DEFS: FieldDef[] = [
  {
    key: 'Name',
    label: 'Name',
    required: true,
    aliases: ['name', 'fullname', 'leadname', 'customername', 'clientname', 'contactname', 'firstname', 'studentname'],
  },
  {
    key: 'Phone',
    label: 'Phone / Mobile',
    required: true,
    aliases: ['phone', 'phoneno', 'phonenumber', 'mobile', 'mobileno', 'mobilenumber', 'contact', 'contactno', 'contactnumber', 'cell', 'whatsapp', 'whatsappno', 'ph', 'number'],
  },
  {
    key: 'Email',
    label: 'Email',
    required: false,
    aliases: ['email', 'emailaddress', 'emailid', 'mail'],
  },
  {
    key: 'Budget',
    label: 'Budget',
    required: false,
    aliases: ['budget', 'budgetrange', 'amount', 'price'],
  },
  {
    key: 'Location',
    label: 'Location / City',
    required: false,
    aliases: ['location', 'address', 'city', 'area', 'locality', 'place'],
  },
  {
    key: 'Property Type',
    label: 'Property Type',
    required: false,
    aliases: ['propertytype', 'property', 'requirement', 'type'],
  },
  {
    key: 'Source',
    label: 'Source',
    required: false,
    aliases: ['source', 'leadsource', 'referral', 'channel'],
  },
  {
    key: 'Stage',
    label: 'Stage / Status',
    required: false,
    aliases: ['stage', 'status', 'leadstage', 'leadstatus'],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizeKey = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');

function autoDetect(fieldDef: FieldDef, csvHeaders: string[]): string {
  // Exact alias match first
  for (const h of csvHeaders) {
    if (fieldDef.aliases.includes(normalizeKey(h))) return h;
  }
  // Partial/contains match as fallback
  for (const h of csvHeaders) {
    const nk = normalizeKey(h);
    if (fieldDef.aliases.some(a => nk.includes(a) || a.includes(nk))) return h;
  }
  return '';
}

// ─── Component ───────────────────────────────────────────────────────────────

type Step = 'upload' | 'map';

export function ImportCSVDialog({
  open,
  onOpenChange,
  onImport,
  sampleHeaders,
  title,
  description = 'Upload a CSV file to import multiple records at once.',
  templateFileName = 'template.csv',
  fieldDefs = DEFAULT_LEAD_FIELD_DEFS,
}: ImportCSVDialogProps) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Record<string, string>[] | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) resetState();
  }, [open]);

  // ── File processing ───────────────────────────────────────────────────────

  const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.xls'];

  const processFile = (f: File) => {
    const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      toast.error('Please select a CSV or Excel (.xlsx / .xls) file');
      return;
    }
    setFile(f);

    const handleParsed = (parsed: Record<string, string>[]) => {
      if (parsed.length === 0) {
        toast.error('No valid data found in file');
        return;
      }
      const headers = Object.keys(parsed[0]);
      setParsedData(parsed);
      setCsvHeaders(headers);
      const auto: Record<string, string> = {};
      for (const fd of fieldDefs) {
        auto[fd.key] = autoDetect(fd, headers);
      }
      setMapping(auto);
      setStep('map');
      toast.success(`Parsed ${parsed.length} rows — map the columns below`);
    };

    if (ext === '.csv') {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const text = ev.target?.result as string;
          handleParsed(parseCSV(text));
        } catch (err) {
          console.error(err);
          toast.error('Failed to parse CSV file');
        }
      };
      reader.readAsText(f);
    } else {
      // Excel: .xlsx or .xls
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = new Uint8Array(ev.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, {
            defval: '',
            raw: false,  // format numbers/dates as strings
          });
          handleParsed(rows);
        } catch (err) {
          console.error(err);
          toast.error('Failed to parse Excel file');
        }
      };
      reader.readAsArrayBuffer(f);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  };

  // ── Template ──────────────────────────────────────────────────────────────

  const downloadTemplate = () => {
    const sampleHeadersObj = sampleHeaders.map(h => ({ key: h, label: h }));
    const sampleRow: Record<string, string> = {};
    sampleHeaders.forEach(h => {
      if (h.toLowerCase().includes('phone') || h.toLowerCase().includes('mobile')) sampleRow[h] = '9876543210';
      else if (h.toLowerCase().includes('email')) sampleRow[h] = 'example@email.com';
      else if (h.toLowerCase().includes('name')) sampleRow[h] = 'John Doe';
      else if (h.toLowerCase().includes('budget')) sampleRow[h] = '50 Lakhs';
      else sampleRow[h] = 'Sample Value';
    });
    downloadCSV(generateCSV(sampleHeadersObj, [sampleRow]), templateFileName);
  };

  // ── Import ────────────────────────────────────────────────────────────────

  const handleConfirmImport = async () => {
    if (!parsedData) return;

    const missing = fieldDefs.filter(fd => fd.required && !mapping[fd.key]);
    if (missing.length > 0) {
      toast.error(`Please map required fields: ${missing.map(f => f.label).join(', ')}`);
      return;
    }

    // Re-key each row using the mapping
    const remapped = parsedData.map(row => {
      const out: Record<string, string> = {};
      for (const fd of fieldDefs) {
        const csvCol = mapping[fd.key];
        if (csvCol && row[csvCol] !== undefined) {
          out[fd.key] = row[csvCol];
        }
      }
      return out;
    });

    setIsImporting(true);
    try {
      await onImport(remapped);
      toast.success(`Successfully imported ${remapped.length} records`);
      onOpenChange(false);
      resetState();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to import data');
    } finally {
      setIsImporting(false);
    }
  };

  const resetState = () => {
    setStep('upload');
    setFile(null);
    setParsedData(null);
    setCsvHeaders([]);
    setMapping({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const requiredMapped = fieldDefs.filter(fd => fd.required).every(fd => !!mapping[fd.key]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!isImporting) {
        onOpenChange(val);
        if (!val) resetState();
      }
    }}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 pb-1">
          {(['upload', 'map'] as Step[]).map((s, i) => {
            const labels = ['1. Upload', '2. Map Columns'];
            const active = step === s;
            const done = step === 'map' && s === 'upload';
            return (
              <div key={s} className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-all
                  ${active ? 'bg-primary text-primary-foreground shadow-sm' : done ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
                  {labels[i]}
                </span>
                {i < 1 && <ChevronDown className="h-3 w-3 -rotate-90 text-muted-foreground" />}
              </div>
            );
          })}
        </div>

        {/* ── STEP 1: Upload ── */}
        {step === 'upload' && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/40">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div className="text-left">
                  <p className="text-sm font-medium">Need a template?</p>
                  <p className="text-xs text-muted-foreground">Download our pre-formatted CSV template</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate} type="button">
                <Download className="h-4 w-4 mr-2" />
                Template
              </Button>
            </div>

            <div
              className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors bg-secondary/20"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                disabled={isImporting}
              />
              <div className="p-3 bg-background rounded-full shadow-sm mb-3">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Drag &amp; drop your CSV, or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">
                CSV, Excel (.xlsx) or .xls — column names don't need to match
              </p>
            </div>

            {sampleHeaders.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">Template columns:</p>
                <div className="flex flex-wrap gap-1.5">
                  {sampleHeaders.map(h => (
                    <span key={h} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground border">
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Map Columns ── */}
        {step === 'map' && parsedData && (
          <div className="space-y-3 py-2">
            <div className="p-3 rounded-lg border bg-blue-500/10 border-blue-200/50 text-blue-700 dark:text-blue-300 text-sm">
              <strong>{parsedData.length} rows</strong> found in <strong>{file?.name}</strong>.
              &nbsp;Map your CSV columns to the correct fields.
            </div>

            {/* Mapping rows */}
            <div className="space-y-2.5">
              {fieldDefs.map(fd => (
                <div key={fd.key} className="grid grid-cols-[1fr_20px_1fr] items-center gap-2">
                  {/* Field label */}
                  <div className="text-right">
                    <span className={`text-sm font-medium ${fd.required ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {fd.label}
                      {fd.required && <span className="text-destructive ml-0.5">*</span>}
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  {/* CSV column selector */}
                  <div className="relative w-full max-w-[200px]">
                    <select
                      value={mapping[fd.key] ?? ''}
                      onChange={e => setMapping(prev => ({ ...prev, [fd.key]: e.target.value }))}
                      className={`w-full text-sm rounded-md border px-3 py-1.5 pr-8 bg-background appearance-none outline-none
                        focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer truncate
                        ${fd.required && !mapping[fd.key] ? 'border-destructive/60' : 'border-input'}`}
                    >
                      <option value="">— skip —</option>
                      {csvHeaders.map(h => (
                        <option key={h} value={h} className="truncate max-w-[300px]">
                          {h.length > 50 ? `${h.substring(0, 50)}...` : h}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>

            {/* First-row preview */}
            {parsedData[0] && Object.values(mapping).some(val => val !== '') && (
              <div className="p-3 rounded-lg border bg-muted/40 text-xs space-y-1 max-h-[160px] overflow-y-auto">
                <p className="font-semibold text-muted-foreground mb-1">Preview — first row:</p>
                {fieldDefs.filter(fd => mapping[fd.key]).map(fd => (
                  <div key={fd.key} className="flex gap-2 py-0.5">
                    <span className="text-muted-foreground w-28 shrink-0">{fd.label}:</span>
                    <span className="font-medium break-all whitespace-pre-wrap flex-1">{parsedData[0][mapping[fd.key]] || '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 mt-2">
          {step === 'upload' && (
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isImporting}>
              Cancel
            </Button>
          )}
          {step === 'map' && (
            <>
              <Button variant="outline" onClick={() => { setStep('upload'); setFile(null); setParsedData(null); setCsvHeaders([]); }}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={handleConfirmImport} disabled={!requiredMapped || isImporting}>
                {isImporting
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <CheckCircle2 className="mr-2 h-4 w-4" />
                }
                Import {parsedData?.length} Records
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
