import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import { toast } from '../components/ui/use-toast';

export interface CatererPayment {
  id: number;
  catererId: number;
  catererName?: string;
  distributionId?: number;
  amount: string;
  paymentDate: string;
  paymentMode: string;
  referenceNo?: string;
  notes?: string;
  receiptImage?: string | null;
  createdAt: string;
}

export interface CatererPaymentFormValues {
  catererId: number;
  distributionId?: number;
  amount: number | string;
  paymentDate: Date | string;
  paymentMode: string;
  referenceNo?: string;
  notes?: string;
  receiptImage?: string | null;
}

export function useCatererPayments() {
  return useQuery({
    queryKey: ['catererPayments'], // Remove timestamp to prevent infinite re-renders
    queryFn: async () => {
      try {
        const response = await apiRequest<CatererPayment[]>('/api/caterer-payments');
        return response;
      } catch (error) {
        console.error("Error fetching caterer payments:", error);
        throw error;
      }
    },
  });
}

export function useCatererPayment(id: number) {
  return useQuery({
    queryKey: ['catererPayments', id],
    queryFn: async () => {
      if (!id) return undefined;
      const response = await apiRequest<CatererPayment>(`/api/caterer-payments/${id}`);
      return response;
    },
    enabled: !!id,
  });
}

export function useCatererPaymentsByCaterer(catererId: number) {
  return useQuery({
    queryKey: ['catererPayments', 'caterer', catererId], // Remove timestamp to prevent infinite re-renders
    queryFn: async () => {
      if (!catererId) return [];
      const response = await apiRequest<CatererPayment[]>(`/api/caterer-payments/caterer/${catererId}`);
      return response;
    },
    enabled: !!catererId,
  });
}

export function useCatererPaymentsByDistribution(distributionId: number) {
  return useQuery({
    queryKey: ['catererPayments', 'distribution', distributionId],
    queryFn: async () => {
      if (!distributionId) return [];
      const response = await apiRequest<CatererPayment[]>(`/api/caterer-payments/distribution/${distributionId}`);
      return response;
    },
    enabled: !!distributionId,
  });
}

export function useCreateCatererPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CatererPaymentFormValues) => {
      const response = await apiRequest<CatererPayment>('/api/caterer-payments', {
        method: 'POST',
        data,
      });
      return response;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['catererPayments'] });
      queryClient.invalidateQueries({ queryKey: ['catererPayments', 'caterer', variables.catererId] });

      // Also invalidate the distribution and caterer data since payment affects them
      queryClient.invalidateQueries({ queryKey: ['caterers'] });
      queryClient.invalidateQueries({ queryKey: ['caterers', variables.catererId] });

      if (variables.distributionId) {
        queryClient.invalidateQueries({ queryKey: ['distributions'] });
        queryClient.invalidateQueries({ queryKey: ['distributions', variables.distributionId] });
        queryClient.invalidateQueries({ queryKey: ['distributions', 'caterer', variables.catererId] });
      }

      toast({
        title: 'Payment recorded',
        description: 'The payment has been recorded successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error recording payment',
        description: error.message || 'An error occurred while recording the payment.',
        variant: 'destructive',
      });
    },
  });
}
