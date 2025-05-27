import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CatererBill, CatererPayment } from '../../shared/models/caterer-bill';

// Get all bills
export function useCatererBills() {
  return useQuery<CatererBill[]>({
    queryKey: ['/api/caterer-bills'],
    queryFn: async () => {
      const response = await fetch('/api/caterer-bills', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch caterer bills');
      }
      return response.json();
    },
  });
}

// Get bills for a specific caterer
export function useCatererBillsByCaterer(catererId: number) {
  return useQuery<CatererBill[]>({
    queryKey: [`/api/caterers/${catererId}/bills`],
    queryFn: async () => {
      const response = await fetch(`/api/caterers/${catererId}/bills`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch bills for caterer ${catererId}`);
      }
      return response.json();
    },
    enabled: !!catererId,
  });
}

// Get a single bill by ID
export function useCatererBill(billId: number) {
  return useQuery<CatererBill>({
    queryKey: [`/api/caterer-bills/${billId}`],
    queryFn: async () => {
      const response = await fetch(`/api/caterer-bills/${billId}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch bill ${billId}`);
      }
      return response.json();
    },
    enabled: !!billId,
  });
}

// Create a new bill
export function useCreateCatererBill() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (bill: CatererBill) => {
      const response = await fetch('/api/caterer-bills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(bill),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create bill');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/caterer-bills'] });
    },
  });
}

// Update an existing bill
export function useUpdateCatererBill() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (bill: CatererBill) => {
      if (!bill.id) throw new Error('Bill ID is required for update');
      
      const response = await fetch(`/api/caterer-bills/${bill.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(bill),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update bill');
      }
      
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/caterer-bills'] });
      queryClient.invalidateQueries({ queryKey: [`/api/caterer-bills/${variables.id}`] });
      if (variables.catererId) {
        queryClient.invalidateQueries({ queryKey: [`/api/caterers/${variables.catererId}/bills`] });
      }
    },
  });
}

// Delete a bill
export function useDeleteCatererBill() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (billId: number) => {
      const response = await fetch(`/api/caterer-bills/${billId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete bill');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/caterer-bills'] });
    },
  });
}

// Add a payment to a bill
export function useAddCatererPayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payment: CatererPayment) => {
      const response = await fetch(`/api/caterer-bills/${payment.billId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payment),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add payment');
      }
      
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/caterer-bills'] });
      queryClient.invalidateQueries({ queryKey: [`/api/caterer-bills/${variables.billId}`] });
    },
  });
}
