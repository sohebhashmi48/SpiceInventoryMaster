import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import { toast } from '../components/ui/use-toast';

export interface InventoryItem {
  id: number;
  productId: number;
  supplierId: number;
  batchNumber: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  expiryDate: string;
  purchaseDate: string;
  barcode?: string;
  notes?: string;
  status: string;
  productUnit?: string;
}

export interface CreateInventoryData {
  productId: number;
  supplierId: number;
  batchNumber: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  expiryDate: string;
  purchaseDate?: string;
  barcode?: string;
  notes?: string;
  status?: string;
}

export interface UpdateInventoryData extends Partial<CreateInventoryData> {
  id: number;
}

// Get all inventory items
export function useInventory() {
  return useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const response = await apiRequest<InventoryItem[]>('/api/inventory');
      return response;
    },
  });
}

// Get inventory items by product ID
export function useInventoryByProduct(productId: number) {
  return useQuery({
    queryKey: ['inventory', 'product', productId],
    queryFn: async () => {
      if (!productId) return [];
      const response = await apiRequest<InventoryItem[]>(`/api/inventory/product/${productId}`);
      return response;
    },
    enabled: !!productId,
  });
}

// Get a single inventory item by ID
export function useInventoryItem(id: number) {
  return useQuery({
    queryKey: ['inventory', id],
    queryFn: async () => {
      if (!id) return undefined;
      const response = await apiRequest<InventoryItem>(`/api/inventory/${id}`);
      return response;
    },
    enabled: !!id,
  });
}

// Create a new inventory item
export function useCreateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateInventoryData) => {
      const response = await apiRequest<InventoryItem>('/api/inventory', {
        method: 'POST',
        data,
      });
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'product', data.productId] });
      queryClient.invalidateQueries({ queryKey: ['spices'] });
      toast({
        title: 'Inventory item created',
        description: 'The inventory item has been created successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating inventory item',
        description: error.message || 'An error occurred while creating the inventory item.',
        variant: 'destructive',
      });
    },
  });
}

// Update an existing inventory item
export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateInventoryData) => {
      const response = await apiRequest<InventoryItem>(`/api/inventory/${data.id}`, {
        method: 'PATCH',
        data,
      });
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', data.id] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'product', data.productId] });
      queryClient.invalidateQueries({ queryKey: ['spices'] });
      // Invalidate inventory history since item was updated
      queryClient.invalidateQueries({ queryKey: ['inventory-history'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-history-all'] });
      toast({
        title: 'Inventory item updated',
        description: 'The inventory item has been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating inventory item',
        description: error.message || 'An error occurred while updating the inventory item.',
        variant: 'destructive',
      });
    },
  });
}

// Update inventory quantity (for batch selection in caterer billing)
export function useUpdateInventoryQuantity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quantity, isAddition = false }: { id: number; quantity: number; isAddition?: boolean }) => {
      const response = await apiRequest<InventoryItem>(`/api/inventory/${id}/quantity`, {
        method: 'PATCH',
        data: { quantity, isAddition },
      });
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', data.id] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'product', data.productId] });
      queryClient.invalidateQueries({ queryKey: ['spices'] });
      // Invalidate inventory history since quantity was updated
      queryClient.invalidateQueries({ queryKey: ['inventory-history'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-history-all'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating inventory quantity',
        description: error.message || 'An error occurred while updating the inventory quantity.',
        variant: 'destructive',
      });
    },
  });
}

// Delete an inventory item
export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest<{ success: boolean }>(`/api/inventory/${id}`, {
        method: 'DELETE',
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['spices'] });
      toast({
        title: 'Inventory item deleted',
        description: 'The inventory item has been deleted successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting inventory item',
        description: error.message || 'An error occurred while deleting the inventory item.',
        variant: 'destructive',
      });
    },
  });
}
