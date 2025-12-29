import { useState } from 'react';
import { useReturns, useUpdateReturn } from '@/hooks/useReturns';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Filter, Download, Upload, RotateCcw, CheckCircle, XCircle, Clock, Package, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const returnApprovalSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  notes: z.string().optional(),
});

type ReturnApprovalFormData = z.infer<typeof returnApprovalSchema>;

export function ReturnsView() {
  const { data: returns, isLoading } = useReturns();
  const updateReturn = useUpdateReturn();
  const [searchQuery, setSearchQuery] = useState('');
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<any>(null);
  const { toast } = useToast();

  const form = useForm<ReturnApprovalFormData>({
    resolver: zodResolver(returnApprovalSchema),
    defaultValues: {
      status: 'approved',
      notes: '',
    },
  });

  // Filter returns based on search query
  const filteredReturns = returns?.filter(returnItem =>
    returnItem.return_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    returnItem.sales_orders?.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    returnItem.sales_orders?.online_customers?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'received': return 'bg-blue-100 text-blue-800';
      case 'refunded': return 'bg-purple-100 text-purple-800';
      case 'requested': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'received': return <Package className="w-4 h-4" />;
      case 'refunded': return <CheckCircle className="w-4 h-4" />;
      case 'requested': return <Clock className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const handleReturnApproval = async (data: ReturnApprovalFormData) => {
    if (!selectedReturn) return;

    try {
      await updateReturn.mutateAsync({
        id: selectedReturn.id,
        status: data.status,
        notes: data.notes || selectedReturn.notes,
        approved_date: data.status === 'approved' ? new Date().toISOString() : undefined,
      });

      toast({
        title: 'Success',
        description: `Return ${data.status === 'approved' ? 'approved' : 'rejected'} successfully`,
      });

      form.reset();
      setApprovalDialogOpen(false);
      setSelectedReturn(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update return',
        variant: 'destructive',
      });
    }
  };

  const openApprovalDialog = (returnItem: any) => {
    setSelectedReturn(returnItem);
    form.setValue('status', 'approved');
    form.setValue('notes', returnItem.notes || '');
    setApprovalDialogOpen(true);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Returns</h2>
          <Badge variant="secondary" className="text-xs">
            {returns?.length || 0} total
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <input
            placeholder="Search returns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm w-64"
          />
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

      {/* Returns Table */}
      <div className="card-elevated overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Return #</TableHead>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                </TableRow>
              ))
            ) : filteredReturns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <RotateCcw className="w-12 h-12 text-muted-foreground/50" />
                    <p>No returns found</p>
                    <p className="text-sm">Customer returns will appear here</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredReturns.map((returnItem) => (
                <TableRow key={returnItem.id}>
                  <TableCell className="font-mono text-sm">
                    {returnItem.return_number || `RTN-${returnItem.id.slice(-8)}`}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {returnItem.sales_orders?.order_number || returnItem.order_id.slice(-8)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">
                        {returnItem.sales_orders?.online_customers?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ₹{returnItem.refund_amount?.toLocaleString() || '0'}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(returnItem.return_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">
                      {(returnItem.return_items as any[])?.length || 0} items
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {returnItem.return_reason || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(returnItem.status)}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(returnItem.status)}
                        {returnItem.status}
                      </div>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {returnItem.status === 'requested' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openApprovalDialog(returnItem)}
                          className="h-8 px-3"
                        >
                          Review
                        </Button>
                      )}
                      {returnItem.status === 'approved' && (
                        <Badge variant="outline" className="text-green-600">
                          Approved
                        </Badge>
                      )}
                      {returnItem.status === 'rejected' && (
                        <Badge variant="outline" className="text-red-600">
                          Rejected
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Return Approval Dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Review Return Request</DialogTitle>
            <DialogDescription>
              Review and approve or reject return #{selectedReturn?.return_number || selectedReturn?.id.slice(-8)}
            </DialogDescription>
          </DialogHeader>

          {selectedReturn && (
            <div className="space-y-4">
              <div className="bg-secondary/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Return Details</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>Order:</strong> {selectedReturn.sales_orders?.order_number}</p>
                  <p><strong>Customer:</strong> {selectedReturn.sales_orders?.online_customers?.name}</p>
                  <p><strong>Reason:</strong> {selectedReturn.return_reason || 'Not specified'}</p>
                  <p><strong>Refund Amount:</strong> ₹{selectedReturn.refund_amount?.toLocaleString()}</p>
                  <p><strong>Items:</strong> {(selectedReturn.return_items as any[])?.length || 0} items</p>
                </div>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleReturnApproval)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Decision</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select decision" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="approved">Approve Return</SelectItem>
                            <SelectItem value="rejected">Reject Return</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Add notes about the decision..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setApprovalDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateReturn.isPending}>
                      {updateReturn.isPending ? 'Processing...' : 'Submit Decision'}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
