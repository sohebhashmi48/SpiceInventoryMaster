import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import { toast } from '../components/ui/use-toast';

export interface Category {
  id: number;
  name: string;
  description?: string;
  imagePath?: string;
}

export interface CreateCategoryData {
  name: string;
  description?: string;
  imagePath?: string;
}

export interface UpdateCategoryData extends Partial<CreateCategoryData> {
  id: number;
}

// Get all categories
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await apiRequest<Category[]>('/api/categories');
      return response;
    },
  });
}

// Get a single category by ID
export function useCategory(id: number) {
  return useQuery({
    queryKey: ['categories', id],
    queryFn: async () => {
      if (!id) return undefined;
      const response = await apiRequest<Category>(`/api/categories/${id}`);
      return response;
    },
    enabled: !!id,
  });
}

// Create a new category
export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCategoryData) => {
      const response = await apiRequest<Category>('/api/categories', {
        method: 'POST',
        data,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({
        title: 'Category created',
        description: 'The category has been created successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating category',
        description: error.message || 'An error occurred while creating the category.',
        variant: 'destructive',
      });
    },
  });
}

// Update an existing category
export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateCategoryData) => {
      const response = await apiRequest<Category>(`/api/categories/${data.id}`, {
        method: 'PUT',
        data,
      });
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories', variables.id] });
      toast({
        title: 'Category updated',
        description: 'The category has been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating category',
        description: error.message || 'An error occurred while updating the category.',
        variant: 'destructive',
      });
    },
  });
}

// Delete a category
export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest<{ success: boolean }>(`/api/categories/${id}`, {
        method: 'DELETE',
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({
        title: 'Category deleted',
        description: 'The category has been deleted successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting category',
        description: error.message || 'An error occurred while deleting the category.',
        variant: 'destructive',
      });
    },
  });
}
