import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Calendar, CheckCircle, Clock } from 'lucide-react';
import { useEnrollmentInstallments, useCreateInstallments, useUpdateInstallment, useMarkFullPayment } from '@/hooks/useEnrollments';
import { toast } from 'sonner';

interface InstallmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollment: {
    id: string;
    total_fees: number;
    fees_paid: number;
    fees_pending: number;
  } | null;
  studentName: string;
}

export function InstallmentDialog({ open, onOpenChange, enrollment, studentName }: InstallmentDialogProps) {
  const [numberOfMonths, setNumberOfMonths] = useState<string>('');
  const [monthlyAmount, setMonthlyAmount] = useState<number>(0);

  const { data: installments, isLoading: installmentsLoading } = useEnrollmentInstallments(enrollment?.id || null);
  const createInstallments = useCreateInstallments();
  const updateInstallment = useUpdateInstallment();
  const markFullPayment = useMarkFullPayment();

  // Calculate monthly amount when number of months changes
  useEffect(() => {
    if (enrollment && numberOfMonths && parseInt(numberOfMonths) > 0) {
      const months = parseInt(numberOfMonths);
      const pendingAmount = enrollment.fees_pending || enrollment.total_fees;
      setMonthlyAmount(Math.ceil(pendingAmount / months));
    } else {
      setMonthlyAmount(0);
    }
  }, [numberOfMonths, enrollment]);

  const handleGenerateInstallments = async () => {
    if (!enrollment || !numberOfMonths || parseInt(numberOfMonths) <= 0) {
      toast.error('Please enter a valid number of months');
      return;
    }

    const months = parseInt(numberOfMonths);
    const pendingAmount = enrollment.fees_pending || enrollment.total_fees;

    if (pendingAmount <= 0) {
      toast.error('No pending fees to create installments for');
      return;
    }

    // Generate installment plan
    const installmentData = [];
    const startDate = new Date();

    for (let i = 0; i < months; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      installmentData.push({
        enrollment_id: enrollment.id,
        amount_due: monthlyAmount,
        status: 'pending' as const,
        due_date: dueDate.toISOString().split('T')[0], // YYYY-MM-DD format
      });
    }

    try {
      await createInstallments.mutateAsync(installmentData);
      toast.success(`Created ${months} installments successfully`);
      setNumberOfMonths('');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to create installments');
    }
  };

  const handleMarkPaid = async (installmentId: string) => {
    try {
      await updateInstallment.mutateAsync({ id: installmentId, status: 'paid' });
      toast.success('Installment marked as paid');
    } catch (error) {
      toast.error('Failed to mark installment as paid');
    }
  };

  const handleMarkFullPayment = async () => {
    if (!enrollment) return;

    try {
      await markFullPayment.mutateAsync(enrollment.id);
      toast.success('Full payment marked successfully');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to mark full payment');
    }
  };

  if (!enrollment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fee Management - {studentName}</DialogTitle>
          <DialogDescription>
            Manage installments and payments for this enrollment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Fee Summary */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
              <div className="grid grid-cols-3 gap-4 flex-1">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Fees</p>
                  <p className="text-lg font-semibold">₹{enrollment.total_fees?.toLocaleString() || '0'}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Paid</p>
                  <p className="text-lg font-semibold text-green-600">₹{enrollment.fees_paid?.toLocaleString() || '0'}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-lg font-semibold text-orange-600">₹{enrollment.fees_pending?.toLocaleString() || '0'}</p>
                </div>
              </div>
              <div className="ml-4">
                <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                  enrollment.fees_pending === 0
                    ? 'bg-green-100 text-green-800'
                    : 'bg-orange-100 text-orange-800'
                }`}>
                  {enrollment.fees_pending === 0 ? 'Fees Paid' : 'Fees Pending'}
                </span>
              </div>
            </div>

            {/* Full Payment Button */}
            {(enrollment.fees_pending > 0) && (
              <div className="flex justify-center">
                <Button
                  onClick={handleMarkFullPayment}
                  disabled={markFullPayment.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {markFullPayment.isPending ? 'Processing...' : 'Mark Full Payment'}
                </Button>
              </div>
            )}
          </div>

          {/* Installment Calculator */}
          {(!installments || installments.length === 0) && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Create Installment Plan</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="months">Number of Months</Label>
                  <Input
                    id="months"
                    type="number"
                    min="1"
                    max="24"
                    value={numberOfMonths}
                    onChange={(e) => setNumberOfMonths(e.target.value)}
                    placeholder="Enter months"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Monthly Amount</Label>
                  <div className="p-2 bg-secondary rounded-md">
                    <p className="text-lg font-semibold">₹{monthlyAmount.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Existing Installments */}
          {installments && installments.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Installment Schedule</h3>
              <div className="space-y-3">
                {installments.map((installment) => (
                  <div key={installment.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {installment.status === 'paid' ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <Clock className="w-4 h-4 text-orange-500" />
                        )}
                        <Badge variant={installment.status === 'paid' ? 'default' : 'secondary'}>
                          {installment.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="font-medium">₹{installment.amount_due.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {installment.status === 'paid'
                            ? format(new Date(installment.updated_at), 'MMM d, yyyy')
                            : `Due: ${format(new Date(installment.due_date), 'MMM d, yyyy')}`
                          }
                        </p>
                      </div>
                    </div>
                    {installment.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handleMarkPaid(installment.id)}
                        disabled={updateInstallment.isPending}
                      >
                        Mark Paid
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {(!installments || installments.length === 0) && (
            <Button onClick={handleGenerateInstallments} disabled={createInstallments.isPending}>
              {createInstallments.isPending ? 'Creating...' : 'Generate Installments'}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}