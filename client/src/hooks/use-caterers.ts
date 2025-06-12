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
  shopCardImage?: string;
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
      if (!id) {
        console.log("useCaterer: ID is falsy, returning undefined", id);
        return undefined;
      }
      console.log("useCaterer: Fetching caterer with ID:", id);
      try {
        const response = await apiRequest<Caterer>(`/api/caterers/${id}`);
        console.log("useCaterer: Received response:", response);
        return response;
      } catch (error) {
        console.error("useCaterer: Error fetching caterer:", error);
        throw error;
      }
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

export interface DeleteCatererOptions {
  force?: boolean;
  cascade?: boolean;
}

export interface RelatedRecordsError {
  error: string;
  relatedRecords: {
    bills: number;
    payments: number;
    total: number;
  };
}

export function useDeleteCaterer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, options }: { id: number; options?: DeleteCatererOptions }) => {
      // Validate the ID before making the request
      if (!id || isNaN(id)) {
        throw new Error('Invalid caterer ID. Please try again.');
      }

      console.log(`Deleting caterer with ID: ${id}, options:`, options);

      // Build query parameters for options
      const queryParams = new URLSearchParams();
      if (options?.force) {
        queryParams.append('force', 'true');
      }
      if (options?.cascade) {
        queryParams.append('cascade', 'true');
      }

      const queryString = queryParams.toString();
      const url = queryString ? `/api/caterers/${id}?${queryString}` : `/api/caterers/${id}`;

      const response = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          console.log('Error response from server:', errorData);

          // Check if this is a related records error
          if (response.status === 400 &&
              (errorData.error?.includes('related') ||
               errorData.error?.includes('Cannot delete caterer'))) {

            console.log('Detected related records error');

            // Create a RelatedRecordsError with the counts
            // If we don't have detailed counts, use default values
            const relatedRecordsError: RelatedRecordsError = {
              error: errorData.error || 'Cannot delete caterer with related records',
              relatedRecords: {
                bills: errorData.relatedRecords?.bills || 1,
                payments: errorData.relatedRecords?.payments || 0,
                total: errorData.relatedRecords?.total || 1
              }
            };

            console.log('Created related records error object:', relatedRecordsError);
            throw relatedRecordsError;
          }

          throw new Error(errorData.error || errorData.message || 'Failed to delete caterer');
        } catch (parseError) {
          console.error('Error parsing JSON response:', parseError);
          if (response.status === 400) {
            // If we can't parse the JSON but it's a 400 error, assume it's related records
            const relatedRecordsError: RelatedRecordsError = {
              error: 'Cannot delete caterer with related records',
              relatedRecords: {
                bills: 1,
                payments: 0,
                total: 1
              }
            };
            throw relatedRecordsError;
          }
          throw new Error('Failed to delete caterer: ' + response.statusText);
        }
      }

      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['caterers'] });
      queryClient.invalidateQueries({ queryKey: ['caterers', id] });
      queryClient.invalidateQueries({ queryKey: ['distributions'] });

      toast({
        title: 'Caterer deleted',
        description: 'The caterer has been deleted successfully.',
      });
    },
    onError: (error: any) => {
      console.error('Error deleting caterer:', error);

      // Don't show toast for related records errors - they'll be handled by the component
      if (error.relatedRecords) {
        console.log('Related records error detected, will be handled by component:', error);
        return;
      }

      toast({
        title: 'Error deleting caterer',
        description: error.message || 'An error occurred while deleting the caterer.',
        variant: 'destructive',
      });
    },
  });
}

export interface CatererBalance {
  balanceDue: number;
  totalBilled: number;
  totalOrders: number;
  totalPaid: number;
  lastPaymentDate?: string;
}

export function useCatererBalance(id: number, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: ['caterers', id, 'balance'],
    queryFn: async () => {
      if (!id) {
        return undefined;
      }
      const response = await apiRequest<CatererBalance>(`/api/caterers/${id}/balance`);
      return response;
    },
    enabled: !!id,
    refetchInterval: options?.refetchInterval,
  });
}

// Sync caterer balance mutation
export function useSyncCatererBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (catererId: number) => {
      const response = await apiRequest(`/api/caterers/${catererId}/sync-balance`, {
        method: 'POST',
      });
      return response;
    },
    onSuccess: (data, catererId) => {
      // Invalidate and refetch caterer data
      queryClient.invalidateQueries({ queryKey: ['caterers'] });
      queryClient.invalidateQueries({ queryKey: ['caterers', catererId] });
      queryClient.invalidateQueries({ queryKey: ['caterers', catererId, 'balance'] });

      toast({
        title: "Balance Synced",
        description: `Balance updated successfully. New balance: ₹${data.newBalance?.balanceDue?.toLocaleString() || '0'}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Sync Failed",
        description: "Failed to sync balance. Please try again.",
        variant: "destructive",
      });
    },
  });
}

// Sync all caterer balances mutation
export function useSyncAllCatererBalances() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/caterers/sync-all-balances', {
        method: 'POST',
      });
      return response;
    },
    onSuccess: (data) => {
      // Invalidate and refetch all caterer data
      queryClient.invalidateQueries({ queryKey: ['caterers'] });

      const syncedCount = data.results?.filter((r: any) => r.synced).length || 0;
      const totalCount = data.results?.length || 0;

      toast({
        title: "All Balances Synced",
        description: `Successfully synced ${syncedCount} out of ${totalCount} caterers`,
      });
    },
    onError: (error) => {
      toast({
        title: "Sync Failed",
        description: "Failed to sync all balances. Please try again.",
        variant: "destructive",
      });
    },
  });
}
