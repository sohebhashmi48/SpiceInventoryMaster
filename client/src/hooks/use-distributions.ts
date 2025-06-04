import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import { toast } from '../components/ui/use-toast';

export interface DistributionItem {
  id?: number;
  distributionId?: number;
  spiceId: number;
  itemName: string;
  quantity: string;
  unit: string;
  rate: string;
  gstPercentage: string;
  gstAmount: string;
  amount: string;
  createdAt?: string;
}

export interface Distribution {
  id: number;
  billNo: string;
  catererId: number;
  distributionDate: string;
  totalAmount: string;
  totalGstAmount: string;
  grandTotal: string;
  amountPaid: string;
  paymentMode?: string;
  paymentDate?: string;
  balanceDue: string;
  notes?: string;
  status: string;
  createdAt: string;
  items?: DistributionItem[];
}

export interface DistributionFormValues {
  billNo: string;
  catererId: number;
  distributionDate: string;
  totalAmount: string;
  totalGstAmount: string;
  grandTotal: string;
  amountPaid: string;
  paymentMode?: string;
  paymentDate?: string;
  balanceDue: string;
  notes?: string;
  status?: string;
  items: DistributionItem[];
}

export function useDistributions() {
  return useQuery({
    queryKey: ['distributions'],
    queryFn: async () => {
      const response = await apiRequest<Distribution[]>('/api/distributions');
      return response;
    },
  });
}

export function useDistribution(id: number) {
  return useQuery({
    queryKey: ['distributions', id],
    queryFn: async () => {
      if (!id) return undefined;
      const response = await apiRequest<Distribution>(`/api/distributions/${id}`);
      return response;
    },
    enabled: !!id,
  });
}

export function useDistributionItems(distributionId: number) {
  return useQuery({
    queryKey: ['distributionItems', distributionId],
    queryFn: async () => {
      if (!distributionId) return [];
      const response = await apiRequest<DistributionItem[]>(`/api/distributions/${distributionId}/items`);
      return response;
    },
    enabled: !!distributionId,
  });
}

export function useDistributionsByCaterer(catererId: number) {
  return useQuery({
    queryKey: ['distributions', 'caterer', catererId],
    queryFn: async () => {
      if (!catererId) return [];
      const response = await apiRequest<Distribution[]>(`/api/distributions/caterer/${catererId}`);
      return response;
    },
    enabled: !!catererId,
  });
}

export function useCreateDistribution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: DistributionFormValues) => {
      const response = await apiRequest<Distribution>('/api/distributions', {
        method: 'POST',
        data,
      });
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['distributions'] });
      queryClient.invalidateQueries({ queryKey: ['distributions', 'caterer', data.catererId] });
      queryClient.invalidateQueries({ queryKey: ['caterers'] });
      queryClient.invalidateQueries({ queryKey: ['caterers', data.catererId] });
      queryClient.invalidateQueries({ queryKey: ['caterers', data.catererId, 'balance'] });
      queryClient.invalidateQueries({ queryKey: ['spices'] });
      queryClient.invalidateQueries({ queryKey: ['payment-reminders'] });

      toast({
        title: 'Distribution created',
        description: 'The distribution has been created successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating distribution',
        description: error.message || 'An error occurred while creating the distribution.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateDistributionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      const response = await apiRequest<Distribution>(`/api/distributions/${id}/status`, {
        method: 'PATCH',
        data: { status },
      });
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['distributions'] });
      queryClient.invalidateQueries({ queryKey: ['distributions', data.id] });
      queryClient.invalidateQueries({ queryKey: ['distributions', 'caterer', data.catererId] });

      toast({
        title: 'Distribution status updated',
        description: 'The distribution status has been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating distribution status',
        description: error.message || 'An error occurred while updating the distribution status.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteDistribution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      try {
        // First get the distribution to have the data for invalidation
        const distribution = await apiRequest<Distribution>(`/api/distributions/${id}`);

        // Then delete it
        await apiRequest<{ success: boolean }>(`/api/distributions/${id}`, {
          method: 'DELETE',
        });

        return distribution;
      } catch (error) {
        console.error('Error deleting distribution:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['distributions'] });
      if (data && data.catererId) {
        queryClient.invalidateQueries({ queryKey: ['distributions', 'caterer', data.catererId] });
        queryClient.invalidateQueries({ queryKey: ['caterers', data.catererId] });
        queryClient.invalidateQueries({ queryKey: ['caterers', data.catererId, 'balance'] });
      }
      queryClient.invalidateQueries({ queryKey: ['caterers'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['caterer-payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment-reminders'] });

      toast({
        title: 'Distribution deleted',
        description: 'The distribution has been deleted successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting distribution',
        description: error.message || 'An error occurred while deleting the distribution.',
        variant: 'destructive',
      });
    },
  });
}
