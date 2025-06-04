import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  createdAt?: string;
}

export interface CustomerBill {
  id: number;
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
  paymentMethod: 'Cash' | 'Card' | 'Bank Transfer' | 'Credit' | 'UPI';
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt?: string;
  items?: CustomerBillItem[];
}

export interface CreateCustomerBillData {
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
  paymentMethod: 'Cash' | 'Card' | 'Bank Transfer' | 'Credit' | 'UPI';
  status: 'pending' | 'completed' | 'cancelled';
  items: CustomerBillItem[];
}

export interface CustomerBillsResponse {
  data: CustomerBill[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Get all customer bills with pagination and filtering
export function useCustomerBills(options?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}) {
  const queryParams = new URLSearchParams();

  if (options?.page) queryParams.append('page', options.page.toString());
  if (options?.limit) queryParams.append('limit', options.limit.toString());
  if (options?.search) queryParams.append('search', options.search);
  if (options?.status) queryParams.append('status', options.status);
  if (options?.startDate) queryParams.append('startDate', options.startDate);
  if (options?.endDate) queryParams.append('endDate', options.endDate);

  return useQuery({
    queryKey: ['customer-bills', options],
    queryFn: async () => {
      const url = `/api/customer-bills${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiRequest<CustomerBillsResponse>(url);
      return response;
    },
  });
}

// Get a single customer bill by ID
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
    mutationFn: async (data: CreateCustomerBillData) => {
      const response = await apiRequest<CustomerBill>('/api/customer-bills', {
        method: 'POST',
        data,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-bills'] });
      toast({
        title: 'Bill created',
        description: 'The customer bill has been created successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating bill',
        description: error.message || 'An error occurred while creating the customer bill.',
        variant: 'destructive',
      });
    },
  });
}

// Update an existing customer bill
export function useUpdateCustomerBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CreateCustomerBillData> }) => {
      const response = await apiRequest<CustomerBill>(`/api/customer-bills/${id}`, {
        method: 'PUT',
        data,
      });
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer-bills'] });
      queryClient.invalidateQueries({ queryKey: ['customer-bills', variables.id] });
      toast({
        title: 'Bill updated',
        description: 'The customer bill has been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating bill',
        description: error.message || 'An error occurred while updating the customer bill.',
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
      const response = await apiRequest<{ success: boolean }>(`/api/customer-bills/${id}`, {
        method: 'DELETE',
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-bills'] });
      toast({
        title: 'Bill deleted',
        description: 'The customer bill has been deleted successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting bill',
        description: error.message || 'An error occurred while deleting the customer bill.',
        variant: 'destructive',
      });
    },
  });
}
