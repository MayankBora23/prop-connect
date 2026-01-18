import { useState } from 'react';
import { useFees, useCreateFee, useUpdateFee } from '@/hooks/useFees';
import { useEnrollments } from '@/hooks/useEnrollments';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Edit, Plus, DollarSign, Calendar, CreditCard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AddFeeDialog } from './AddFeeDialog';
import { EditFeeDialog } from './EditFeeDialog';

function FeeCard({ fee, enrollment, onEdit }: { fee: any; enrollment: any; onEdit: (fee: any) => void }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      case 'partial': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CreditCard className='w-4 h-4' />;
      case 'pending': return <Calendar className='w-4 h-4' />;
      case 'overdue': return <Calendar className='w-4 h-4' />;
      case 'partial': return <DollarSign className='w-4 h-4' />;
      default: return <DollarSign className='w-4 h-4' />;
    }
  };

  return (
    <Card className='hover:shadow-md transition-shadow'>
      <CardHeader className='pb-3'>
        <div className='flex items-start justify-between'>
          <div>
            <CardTitle className='text-lg font-semibold'>
              â‚¹{fee.amount?.toLocaleString()}
            </CardTitle>
            <CardDescription className='text-sm'>
              {fee.fee_type || 'Fee Payment'}
            </CardDescription>
          </div>
          <Badge variant='outline' className={lex items-center gap-1 }>
            {getStatusIcon(fee.status)}
            {fee.status.charAt(0).toUpperCase() + fee.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className='space-y-2'>
        <div className='text-sm text-muted-foreground'>
          <strong>Due:</strong> {format(new Date(fee.due_date), 'MMM d, yyyy')}
        </div>
        {fee.paid_date && (
          <div className='text-sm text-muted-foreground'>
            <strong>Paid:</strong> {format(new Date(fee.paid_date), 'MMM d, yyyy')}
          </div>
        )}
        {fee.payment_method && (
          <div className='text-sm text-muted-foreground'>
            <strong>Method:</strong> {fee.payment_method}
          </div>
        )}
        <div className='flex justify-end pt-2'>
          <Button
            size='sm'
            variant='outline'
            onClick={() => onEdit(fee)}
            className='h-8'
          >
            <Edit className='w-4 h-4 mr-1' />
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function FeesView() {
  const [selectedEnrollment, setSelectedEnrollment] = useState<string>('all');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState<any>(null);

  const { data: enrollments, isLoading: enrollmentsLoading } = useEnrollments();
  const { data: allFees, isLoading: feesLoading } = useFees();

  // Filter fees based on selected enrollment
  const filteredFees = allFees?.filter(fee => {
    if (selectedEnrollment === 'all') return true;
    return fee.enrollment_id === selectedEnrollment;
  }) || [];

  // Group fees by enrollment
  const feesByEnrollment = filteredFees.reduce((acc: any, fee: any) => {
    const enrollmentId = fee.enrollment_id;
    if (!acc[enrollmentId]) {
      acc[enrollmentId] = {
        enrollment: enrollments?.find((e: any) => e.id === enrollmentId),
        fees: []
      };
    }
    acc[enrollmentId].fees.push(fee);
    return acc;
  }, {});

  const handleEditFee = (fee: any) => {
    setSelectedFee(fee);
    setEditDialogOpen(true);
  };

  const handleAddFee = () => {
    setAddDialogOpen(true);
  };

  const isLoading = enrollmentsLoading || feesLoading;

  return (
    <div className='space-y-6 animate-fade-in'>
      {/* Header with Filters */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold text-foreground'>Fees Management</h2>
          <p className='text-muted-foreground'>Manage student fees and payments</p>
        </div>
        <div className='flex items-center gap-4'>
          <Select value={selectedEnrollment} onValueChange={setSelectedEnrollment}>
            <SelectTrigger className='w-64'>
              <SelectValue placeholder='Filter by enrollment' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Enrollments</SelectItem>
              {enrollments?.map((enrollment: any) => (
                <SelectItem key={enrollment.id} value={enrollment.id}>
                  {enrollment.students?.name} - {enrollment.batches?.courses?.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleAddFee} className='flex items-center gap-2'>
            <Plus className='w-4 h-4' />
            Add Fee
          </Button>
        </div>
      </div>

      {/* Fees Grid */}
      {isLoading ? (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className='h-6 w-24' />
                <Skeleton className='h-4 w-32' />
              </CardHeader>
              <CardContent>
                <Skeleton className='h-4 w-full mb-2' />
                <Skeleton className='h-4 w-3/4 mb-2' />
                <Skeleton className='h-4 w-1/2' />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : Object.keys(feesByEnrollment).length === 0 ? (
        <Card className='p-8 text-center'>
          <div className='flex flex-col items-center gap-4'>
            <DollarSign className='w-12 h-12 text-muted-foreground' />
            <div>
              <h3 className='text-lg font-semibold text-foreground'>No Fees Found</h3>
              <p className='text-muted-foreground'>
                {selectedEnrollment === 'all'
                  ? 'No fee records found. Start by adding fees for enrolled students.'
                  : 'No fees found for the selected enrollment.'
                }
              </p>
            </div>
            <Button onClick={handleAddFee}>
              <Plus className='w-4 h-4 mr-2' />
              Add First Fee
            </Button>
          </div>
        </Card>
      ) : (
        <div className='space-y-8'>
          {Object.entries(feesByEnrollment).map(([enrollmentId, data]: [string, any]) => (
            <div key={enrollmentId} className='space-y-4'>
              {/* Enrollment Header */}
              <div className='flex items-center gap-4 p-4 bg-secondary/50 rounded-lg'>
                <div className='flex-1'>
                  <h3 className='font-semibold text-lg text-foreground'>
                    {data.enrollment?.students?.name}
                  </h3>
                  <p className='text-muted-foreground'>
                    {data.enrollment?.batches?.courses?.name} - {data.enrollment?.batches?.name}
                  </p>
                </div>
                <div className='text-right'>
                  <p className='text-sm text-muted-foreground'>Total Fees</p>
                  <p className='font-semibold'>â‚¹{data.enrollment?.total_fees?.toLocaleString() || '0'}</p>
                </div>
              </div>

              {/* Fees Grid for this enrollment */}
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                {data.fees.map((fee: any) => (
                  <FeeCard
                    key={fee.id}
                    fee={fee}
                    enrollment={data.enrollment}
                    onEdit={handleEditFee}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Fee Dialog */}
      <AddFeeDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />

      {/* Edit Fee Dialog */}
      <EditFeeDialog
        fee={selectedFee}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </div>
  );
}
