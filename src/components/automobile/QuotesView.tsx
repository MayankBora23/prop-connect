import { useQuotes } from '@/hooks/useQuotes';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Filter, Download, Upload, FileCheck, DollarSign, Edit, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useDeleteQuote } from '@/hooks/useQuotes';
import { toast } from 'sonner';

export function QuotesView() {
  const { data: quotes, isLoading } = useQuotes();
  const deleteQuote = useDeleteQuote();

  const handleDelete = async (quoteId: string, quoteNumber: string) => {
    try {
      await deleteQuote.mutateAsync(quoteId);
      toast.success(`Quote ${quoteNumber} has been deleted successfully`);
    } catch (error) {
      toast.error(`Failed to delete quote ${quoteNumber}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Quotes</h2>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Quotes List */}
      <div className="card-elevated overflow-hidden">
        <table className="w-full">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quote #</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vehicle</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Amount</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Valid Until</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-10 w-40" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-20" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-6 w-16" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-16" /></td>
                </tr>
              ))
            ) : (quotes || []).length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No quotes found. Create your first quote to get started.
                </td>
              </tr>
            ) : (
              (quotes || []).map((quote) => (
                <tr key={quote.id} className="hover:bg-secondary/50 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">
                        {quote.quote_number || `Q-${quote.id.slice(-6)}`}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-xs">
                        {quote.auto_leads?.name.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {quote.auto_leads?.name || 'Unknown Customer'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {quote.auto_leads?.phone}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-foreground">
                      {quote.vehicles?.year} {quote.vehicles?.brand} {quote.vehicles?.model}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">
                        ₹{quote.total_amount.toLocaleString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={getStatusColor(quote.status)}>
                      {quote.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Quote</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete quote {quote.quote_number || `Q-${quote.id.slice(-6)}`}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(quote.id, quote.quote_number || `Q-${quote.id.slice(-6)}`)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
