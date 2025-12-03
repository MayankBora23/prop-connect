import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Property } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties((data as Property[]) || []);
    } catch (error: any) {
      console.error('Error fetching properties:', error);
      toast({
        title: 'Error',
        description: 'Failed to load properties',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createProperty = async (property: Partial<Property>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const insertData = {
        title: property.title!,
        location: property.location!,
        bhk: property.bhk!,
        area: property.area!,
        price: property.price!,
        description: property.description,
        status: property.status || 'available',
        images: property.images || [],
        created_by: user?.id,
      };

      const { data, error } = await supabase
        .from('properties')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      
      setProperties(prev => [data as Property, ...prev]);
      toast({
        title: 'Success',
        description: 'Property created successfully',
      });
      return { data: data as Property, error: null };
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return { data: null, error };
    }
  };

  const updateProperty = async (id: string, updates: Partial<Property>) => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setProperties(prev => prev.map(p => p.id === id ? { ...p, ...data } as Property : p));
      toast({
        title: 'Success',
        description: 'Property updated successfully',
      });
      return { data: data as Property, error: null };
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return { data: null, error };
    }
  };

  const deleteProperty = async (id: string) => {
    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setProperties(prev => prev.filter(p => p.id !== id));
      toast({
        title: 'Success',
        description: 'Property deleted successfully',
      });
      return { error: null };
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  return {
    properties,
    loading,
    fetchProperties,
    createProperty,
    updateProperty,
    deleteProperty,
  };
}
