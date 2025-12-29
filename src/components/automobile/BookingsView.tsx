import { useState } from 'react';
import { useBookings } from '@/hooks/useBookings';
import { useAutoLeads } from '@/hooks/useAutoLeads';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Filter, Download, Upload, Check, X, Edit, Trash2, FileText, Printer } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useDeleteBooking, useUpdateBooking } from '@/hooks/useBookings';
import { useUpdateAutoLead } from '@/hooks/useAutoLeads';
import { ScheduleBookingDialog } from './ScheduleBookingDialog';
import { EditBookingDialog } from './EditBookingDialog';
import { BookingBillDialog } from './BookingBillDialog';
import { toast } from 'sonner';
import type { BookingWithRelations } from '@/hooks/useAutoTypes';

export function BookingsView() {
  const { data: bookings, isLoading: bookingsLoading } = useBookings();
  const { data: leads, isLoading: leadsLoading } = useAutoLeads();
  const deleteBooking = useDeleteBooking();
  const updateBooking = useUpdateBooking();
  const updateAutoLead = useUpdateAutoLead();

  const [scheduleBookingOpen, setScheduleBookingOpen] = useState(false);
  const [editBookingOpen, setEditBookingOpen] = useState(false);
  const [billBookingOpen, setBillBookingOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithRelations | null>(null);
  const [selectedLeadForScheduling, setSelectedLeadForScheduling] = useState<{ id: string; name: string; phone?: string; email?: string } | null>(null);

  // Get leads that are in "booking_done" stage (delivered/sold)
  const bookingDoneLeads = leads?.filter(lead => lead.status === 'booking_done') || [];

  // Filter bookings by status
  const confirmedBookings = (bookings || []).filter(b => b.status === 'confirmed');
  const completedBookings = (bookings || []).filter(b => b.status === 'completed');
  const cancelledBookings = (bookings || []).filter(b => b.status === 'cancelled');

  const isLoading = bookingsLoading || leadsLoading;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-orange-100 text-orange-800';
      case 'pending': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDelete = async (bookingId: string, bookingNumber: string) => {
    try {
      await deleteBooking.mutateAsync(bookingId);
      toast.success(`Booking ${bookingNumber} has been deleted successfully`);
    } catch (error) {
      toast.error(`Failed to delete booking ${bookingNumber}`);
    }
  };

  const handleStatusUpdate = async (bookingId: string, newStatus: 'completed' | 'confirmed' | 'cancelled', customerName: string) => {
    try {
      // Update booking status
      await updateBooking.mutateAsync({
        id: bookingId,
        status: newStatus,
      });

      // If booking is completed, also update the lead status to "delivered_sold"
      if (newStatus === 'completed') {
        const booking = bookings?.find(b => b.id === bookingId);
        if (booking?.lead_id) {
          await updateAutoLead.mutateAsync({
            id: booking.lead_id,
            status: 'delivered_sold',
          });
        }
      }

      toast.success(`Booking marked as ${newStatus === 'completed' ? 'Sold' : newStatus}`, {
        description: `Booking for ${customerName} has been updated.`,
      });
    } catch (error: any) {
      console.error('Status update error:', error);
      toast.error('Failed to update booking status', {
        description: error?.message || 'Please try again.',
      });
    }
  };

  const handleCreateBooking = (lead: any) => {
    setSelectedLeadForScheduling({
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
    });
    setScheduleBookingOpen(true);
  };

  const handleBookingScheduled = () => {
    // Refresh the leads data to update the "ready for booking" section
    setSelectedLeadForScheduling(null);
  };


  const handleEditBooking = (booking: BookingWithRelations) => {
    setSelectedBooking(booking);
    setEditBookingOpen(true);
  };

  const handleGenerateBill = (booking: BookingWithRelations) => {
    setSelectedBooking(booking);
    setBillBookingOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Bookings</h2>
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

      {/* Leads Ready for Booking */}
      {bookingDoneLeads.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Check className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-900">Leads Ready for Booking</h3>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {bookingDoneLeads.length}
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bookingDoneLeads.map((lead) => (
              <div key={lead.id} className="bg-white p-4 rounded-lg border border-blue-200 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                    {lead.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground text-sm">{lead.name}</h4>
                    <p className="text-xs text-muted-foreground">{lead.phone}</p>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>📧 {lead.email || 'No email'}</p>
                  <p>🚗 {lead.preferred_brand || 'No preference'} {lead.preferred_model || ''}</p>
                  <p>💰 ₹{lead.budget_min?.toLocaleString()} - ₹{lead.budget_max?.toLocaleString()}</p>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 gradient-primary border-0"
                    onClick={() => handleCreateBooking(lead)}
                  >
                    Create Booking
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmed Bookings */}
      <div className="card-elevated overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Confirmed Bookings ({confirmedBookings.length})
          </h3>
        </div>
        <table className="w-full">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Booking #</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vehicle</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Amount</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {confirmedBookings.length > 0 ? (
              confirmedBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-secondary/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-foreground">
                      {booking.booking_number || `B-${booking.id.slice(-6)}`}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-xs">
                        {booking.auto_leads?.name.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {booking.auto_leads?.name || 'Unknown Customer'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {booking.auto_leads?.phone}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-foreground">
                      {booking.vehicles?.year} {booking.vehicles?.brand} {booking.vehicles?.model}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-foreground">
                      ₹{booking.total_amount.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => handleStatusUpdate(booking.id, 'completed', booking.auto_leads?.name || 'Unknown Customer')}
                        disabled={updateBooking.isPending}
                        title="Mark as Sold"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleStatusUpdate(booking.id, 'cancelled', booking.auto_leads?.name || 'Unknown Customer')}
                        disabled={updateBooking.isPending}
                        title="Mark as Cancelled"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => handleEditBooking(booking)}
                        title="Edit Booking"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No confirmed bookings
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Sold Bookings (Completed) */}
      <div className="card-elevated overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Sold Bookings ({completedBookings.length})
          </h3>
        </div>
        <table className="w-full">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Booking #</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vehicle</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Amount</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {completedBookings.length > 0 ? (
              completedBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-secondary/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-foreground">
                      {booking.booking_number || `B-${booking.id.slice(-6)}`}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-xs">
                        {booking.auto_leads?.name.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {booking.auto_leads?.name || 'Unknown Customer'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {booking.auto_leads?.phone}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-foreground">
                      {booking.vehicles?.year} {booking.vehicles?.brand} {booking.vehicles?.model}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-foreground">
                      ₹{booking.total_amount.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => handleGenerateBill(booking)}
                        title="Generate Bill"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => handleEditBooking(booking)}
                        title="Edit Booking"
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
                            <AlertDialogTitle>Delete Booking</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete booking {booking.booking_number || `B-${booking.id.slice(-6)}`}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(booking.id, booking.booking_number || `B-${booking.id.slice(-6)}`)}
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
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No sold bookings
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bill Dialog */}
      <BookingBillDialog
        booking={selectedBooking}
        open={billBookingOpen}
        onOpenChange={(open) => {
          setBillBookingOpen(open);
          if (!open) setSelectedBooking(null);
        }}
      />

      {/* Cancelled Bookings */}
      <div className="card-elevated overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Cancelled Bookings ({cancelledBookings.length})
          </h3>
        </div>
        <table className="w-full">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Booking #</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vehicle</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Amount</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {cancelledBookings.length > 0 ? (
              cancelledBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-secondary/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-foreground">
                      {booking.booking_number || `B-${booking.id.slice(-6)}`}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-xs">
                        {booking.auto_leads?.name.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {booking.auto_leads?.name || 'Unknown Customer'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {booking.auto_leads?.phone}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-foreground">
                      {booking.vehicles?.year} {booking.vehicles?.brand} {booking.vehicles?.model}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-foreground">
                      ₹{booking.total_amount.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => handleEditBooking(booking)}
                        title="Edit Booking"
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
                            <AlertDialogTitle>Delete Booking</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete booking {booking.booking_number || `B-${booking.id.slice(-6)}`}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(booking.id, booking.booking_number || `B-${booking.id.slice(-6)}`)}
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
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No cancelled bookings
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Dialogs */}
      <ScheduleBookingDialog
        lead={selectedLeadForScheduling}
        open={scheduleBookingOpen}
        onOpenChange={(open) => {
          setScheduleBookingOpen(open);
          if (!open) setSelectedLeadForScheduling(null);
        }}
        onBooked={handleBookingScheduled}
      />

      <EditBookingDialog
        booking={selectedBooking}
        open={editBookingOpen}
        onOpenChange={(open) => {
          setEditBookingOpen(open);
          if (!open) setSelectedBooking(null);
        }}
      />
    </div>
  );
}
