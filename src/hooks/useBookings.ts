import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from './useCompany';
import { BookingWithRelations } from './useAutoTypes';

// Cast supabase to any to bypass type checking for automobile tables
const supabaseAny = supabase as any;

export type Booking = BookingWithRelations;
export type BookingInsert = Omit<Booking, 'id' | 'created_at' | 'updated_at' | 'company_id'>;
export type BookingUpdate = Partial<BookingInsert>;

export function useBookings() {
  const { data: company } = useCurrentCompany();

  return useQuery({
    queryKey: ['bookings', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabaseAny
        .from('bookings')
        .select(`
          *,
          auto_leads (
            id,
            name,
            phone,
            email
          ),
          vehicles (
            id,
            brand,
            model,
            year,
            fuel_type,
            variant
          )
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BookingWithRelations[];
    },
    enabled: !!company?.id,
  });
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: async () => {
      const { data, error } = await supabaseAny
        .from('bookings')
        .select(`
          *,
          auto_leads (
            id,
            name,
            phone,
            email,
            preferred_brand,
            preferred_model
          ),
          vehicles (
            id,
            brand,
            model,
            year,
            fuel_type,
            transmission,
            price,
            variant
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as BookingWithRelations;
    },
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  return useMutation({
    mutationFn: async (booking: BookingInsert) => {
      if (!company?.id) throw new Error('No company found');

      const { data, error } = await supabaseAny
        .from('bookings')
        .insert({
          ...booking,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as BookingWithRelations;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: BookingUpdate & { id: string }) => {
      // First, get the current booking to check status change
      const { data: currentBooking, error: fetchError } = await supabaseAny
        .from('bookings')
        .select('status, vehicle_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const newStatus = updates.status;
      const oldStatus = currentBooking.status;

      // Update the booking first
      const { data, error } = await supabaseAny
        .from('bookings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Handle vehicle quantity management
      if (newStatus && newStatus !== oldStatus) {
        const vehicleId = currentBooking.vehicle_id;

        // If status changed to confirmed or completed, decrease quantity
        if ((newStatus === 'confirmed' || newStatus === 'completed') &&
            (oldStatus !== 'confirmed' && oldStatus !== 'completed')) {
          await supabaseAny.rpc('decrement_vehicle_quantity', { vehicle_id: vehicleId });
        }
        // If status changed from confirmed/completed to something else, increase quantity
        else if ((oldStatus === 'confirmed' || oldStatus === 'completed') &&
                 (newStatus !== 'confirmed' && newStatus !== 'completed')) {
          await supabaseAny.rpc('increment_vehicle_quantity', { vehicle_id: vehicleId });
        }
      }

      return data as BookingWithRelations;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] }); // Invalidate vehicles to update quantity
    },
  });
}

export function useDeleteBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseAny
        .from('bookings')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
