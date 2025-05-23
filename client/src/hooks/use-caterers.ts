import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import { toast } from '../components/ui/use-toast';

export interface Caterer {
  id: number;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstNumber?: string;
  isActive?: boolean;
  paymentTerms?: string;
  creditLimit?: number;
  balanceDue?: number;
  totalPaid?: number;
  totalBilled?: number;
  totalOrders?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CatererFormValues {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstNumber?: string;
  isActive?: boolean;
  creditLimit?: number;
  notes?: string;
}

export function useCaterers() {
  return useQuery({
    queryKey: ['caterers'],
    queryFn: async () => {
      const response = await apiRequest<Caterer[]>('/api/caterers');
      return response;
    },
  });
}

export function useCaterer(id: number) {
  return useQuery({
    queryKey: ['caterers', id],
    queryFn: async () => {
      if (!id) return undefined;
      const response = await apiRequest<Caterer>(`/api/caterers/${id}`);
      return response;
    },
    enabled: !!id,
  });
}

export function useCreateCaterer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CatererFormValues) => {
      const response = await apiRequest<Caterer>('/api/caterers', {
        method: 'POST',
        data,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caterers'] });

      toast({
        title: 'Caterer created',
        description: 'The caterer has been created successfully.',
      });
    },
    onError: (error: any) => {
      console.error('Error creating caterer:', error);
      toast({
        title: 'Error creating caterer',
        description: error.message || 'An error occurred while creating the caterer.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateCaterer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<CatererFormValues> & { id: number }) => {
      const { id, ...updateData } = data;
      const response = await apiRequest<Caterer>(`/api/caterers/${id}`, {
        method: 'PATCH',
        data: updateData,
      });
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['caterers'] });
      queryClient.invalidateQueries({ queryKey: ['caterers', data.id] });

      toast({
        title: 'Caterer updated',
        description: 'The caterer has been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating caterer',
        description: error.message || 'An error occurred while updating the caterer.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteCaterer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest<{ success: boolean }>(`/api/caterers/${id}`, {
        method: 'DELETE',
      });
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['caterers'] });
      queryClient.invalidateQueries({ queryKey: ['caterers', id] });

      toast({
        title: 'Caterer deleted',
        description: 'The caterer has been deleted successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting caterer',
        description: error.message || 'An error occurred while deleting the caterer.',
        variant: 'destructive',
      });
    },
  });
}
