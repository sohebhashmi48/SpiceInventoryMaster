import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import { toast } from '../components/ui/use-toast';

export interface Spice {
  id: number;
  name: string;
  description?: string;
  category?: string;
  price: number;
  marketPrice?: number;
  retailPrice?: number;
  catererPrice?: number;
  unit: string;
  quantity: number;
  minQuantity?: number;
  image?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateSpiceData {
  name: string;
  description?: string;
  category?: string;
  price: number;
  marketPrice?: number;
  retailPrice?: number;
  catererPrice?: number;
  unit: string;
  quantity: number;
  minQuantity?: number;
  image?: string;
}

export interface UpdateSpiceData extends Partial<CreateSpiceData> {
  id: number;
}

// Get all spices
export function useSpices() {
  return useQuery({
    queryKey: ['spices'],
    queryFn: async () => {
      const response = await apiRequest<Spice[]>('/api/products');
      return response;
    },
  });
}

// Get a single spice by ID
export function useSpice(id: number) {
  return useQuery({
    queryKey: ['spices', id],
    queryFn: async () => {
      if (!id) return undefined;
      const response = await apiRequest<Spice>(`/api/products/${id}`);
      return response;
    },
    enabled: !!id,
  });
}

// Create a new spice
export function useCreateSpice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSpiceData) => {
      const response = await apiRequest<Spice>('/api/products', {
        method: 'POST',
        data,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spices'] });
      toast({
        title: 'Product created',
        description: 'The product has been created successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating product',
        description: error.message || 'An error occurred while creating the product.',
        variant: 'destructive',
      });
    },
  });
}

// Update an existing spice
export function useUpdateSpice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateSpiceData) => {
      const response = await apiRequest<Spice>(`/api/products/${data.id}`, {
        method: 'PUT',
        data,
      });
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['spices'] });
      queryClient.invalidateQueries({ queryKey: ['spices', variables.id] });
      toast({
        title: 'Product updated',
        description: 'The product has been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating product',
        description: error.message || 'An error occurred while updating the product.',
        variant: 'destructive',
      });
    },
  });
}

// Delete a spice
export function useDeleteSpice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest<{ success: boolean }>(`/api/products/${id}`, {
        method: 'DELETE',
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spices'] });
      toast({
        title: 'Product deleted',
        description: 'The product has been deleted successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting product',
        description: error.message || 'An error occurred while deleting the product.',
        variant: 'destructive',
      });
    },
  });
}

// Update spice inventory quantity
export function useUpdateSpiceQuantity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quantity }: { id: number; quantity: number }) => {
      const response = await apiRequest<Spice>(`/api/products/${id}/quantity`, {
        method: 'PATCH',
        data: { quantity },
      });
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['spices'] });
      queryClient.invalidateQueries({ queryKey: ['spices', variables.id] });
      toast({
        title: 'Inventory updated',
        description: 'The product quantity has been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating inventory',
        description: error.message || 'An error occurred while updating the product quantity.',
        variant: 'destructive',
      });
    },
  });
}
