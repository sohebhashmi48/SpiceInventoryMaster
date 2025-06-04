import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import { toast } from '../components/ui/use-toast';

export interface CustomerBillItem {
  id?: number;
  billId?: number;
  productId: number;
  productName: string;
  quantity: number;
  unit: string;
  pricePerKg: number;
  marketPricePerKg: number;
  total: number;
}

export interface CustomerBill {
  id?: number;
  billNo: string;
  billDate: string;
  clientName: string;
  clientMobile: string;
  clientEmail?: string;
  clientAddress?: string;
  totalAmount: number;
  marketTotal: number;
  savings: number;
  itemCount: number;
  status: 'completed' | 'draft';
  items: CustomerBillItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerBillFormValues {
  billNo: string;
  billDate: string;
  clientName: string;
  clientMobile: string;
  clientEmail?: string;
  clientAddress?: string;
  totalAmount: number;
  marketTotal: number;
  savings: number;
  itemCount: number;
  status: 'completed' | 'draft';
  items: CustomerBillItem[];
}

// Get all customer bills
export function useCustomerBills() {
  return useQuery({
    queryKey: ['customer-bills'],
    queryFn: async () => {
      const response = await apiRequest<CustomerBill[]>('/api/customer-bills');
      return response;
    },
  });
}

// Get a specific customer bill
export function useCustomerBill(id: number) {
  return useQuery({
    queryKey: ['customer-bills', id],
    queryFn: async () => {
      if (!id) return undefined;
      const response = await apiRequest<CustomerBill>(`/api/customer-bills/${id}`);
      return response;
    },
    enabled: !!id,
  });
}

// Create a new customer bill
export function useCreateCustomerBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CustomerBillFormValues) => {
      const response = await apiRequest<CustomerBill>('/api/customer-bills', {
        method: 'POST',
        data,
      });
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customer-bills'] });
      
      toast({
        title: 'Bill created successfully',
        description: `Bill ${data.billNo} has been created for ${data.clientName}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating bill',
        description: error.message || 'An error occurred while creating the bill.',
        variant: 'destructive',
      });
    },
  });
}

// Update an existing customer bill
export function useUpdateCustomerBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CustomerBillFormValues> }) => {
      const response = await apiRequest<CustomerBill>(`/api/customer-bills/${id}`, {
        method: 'PUT',
        data,
      });
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customer-bills'] });
      queryClient.invalidateQueries({ queryKey: ['customer-bills', data.id] });
      
      toast({
        title: 'Bill updated successfully',
        description: `Bill ${data.billNo} has been updated.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating bill',
        description: error.message || 'An error occurred while updating the bill.',
        variant: 'destructive',
      });
    },
  });
}

// Delete a customer bill
export function useDeleteCustomerBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/customer-bills/${id}`, {
        method: 'DELETE',
      });
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-bills'] });
      
      toast({
        title: 'Bill deleted successfully',
        description: 'The customer bill has been deleted.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting bill',
        description: error.message || 'An error occurred while deleting the bill.',
        variant: 'destructive',
      });
    },
  });
}
