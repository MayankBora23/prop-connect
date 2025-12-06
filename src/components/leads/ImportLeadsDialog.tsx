import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Upload, FileText, AlertCircle, CheckCircle2, Download } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { parseCSVToLeads, readFileAsText, downloadCSV } from '@/lib/csvUtils';
import type { Lead } from '@/data/mockData';

interface ImportLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (leads: Partial<Lead>[]) => Promise<void>;
}

export function ImportLeadsDialog({ open, onOpenChange, onImport }: ImportLeadsDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [parsedLeads, setParsedLeads] = useState<Partial<Lead>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setSuccess(null);
    setIsProcessing(true);

    try {
      const csvText = await readFileAsText(selectedFile);
      const leads = parseCSVToLeads(csvText);
      
      if (leads.length === 0) {
        setError('No valid leads found in CSV file. Please check the format.');
        setParsedLeads([]);
      } else {
        setParsedLeads(leads);
        setSuccess(`Found ${leads.length} lead(s) to import`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV file');
      setParsedLeads([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (parsedLeads.length === 0) {
      setError('No leads to import');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      await onImport(parsedLeads);
      setSuccess(`Successfully imported ${parsedLeads.length} lead(s)`);
      setTimeout(() => {
        onOpenChange(false);
        reset();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import leads');
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setParsedLeads([]);
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      reset();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Leads from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with lead data. Required columns: Name, Phone, Email
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 ml-2 text-primary"
              onClick={() => {
                const template = 'Name,Phone,Email,Budget,Location,Property Type,Source,Stage,Assigned To,Tags,Notes,Created At,Last Contact\n"John Doe","+91 98765 43210","john@example.com","₹50L - ₹75L","Whitefield, Bangalore","3 BHK","Website","new","Agent Name","Hot Lead; Premium","Interested in east-facing property","2024-01-15","2024-01-15"';
                downloadCSV(template, 'leads_import_template.csv');
              }}
            >
              <Download className="w-3 h-3 mr-1" />
              Download Template
            </Button>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="csv-file-input"
            />
            <label
              htmlFor="csv-file-input"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <Upload className="w-8 h-8 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {file ? file.name : 'Click to select CSV file'}
              </span>
              <span className="text-xs text-muted-foreground">
                CSV files only
              </span>
            </label>
          </div>

          {isProcessing && (
            <div className="text-center text-sm text-muted-foreground">
              Processing file...
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-success/10 border-success">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertDescription className="text-success">{success}</AlertDescription>
            </Alert>
          )}

          {parsedLeads.length > 0 && (
            <div className="border rounded-lg p-4 bg-secondary/50">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Preview ({parsedLeads.length} leads)</span>
              </div>
              <div className="max-h-40 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">Phone</th>
                      <th className="text-left p-2">Email</th>
                      <th className="text-left p-2">Stage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedLeads.slice(0, 5).map((lead, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-2">{lead.name}</td>
                        <td className="p-2">{lead.phone}</td>
                        <td className="p-2">{lead.email}</td>
                        <td className="p-2">{lead.stage || 'new'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedLeads.length > 5 && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    ... and {parsedLeads.length - 5} more
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={parsedLeads.length === 0 || isProcessing}
          >
            {isProcessing ? 'Importing...' : `Import ${parsedLeads.length} Lead(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

