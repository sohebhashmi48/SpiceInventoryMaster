// This file re-exports the functions from use-spices.ts for compatibility
// with components that expect a useProducts hook

import {
  useSpices,
  useSpice,
  useCreateSpice,
  useUpdateSpice,
  useDeleteSpice,
  useUpdateSpiceQuantity,
  Spice,
  CreateSpiceData,
  UpdateSpiceData
} from './use-spices';

// Re-export the functions with new names
export const useProducts = useSpices;
export const useProduct = useSpice;
export const useCreateProduct = useCreateSpice;
export const useUpdateProduct = useUpdateSpice;
export const useDeleteProduct = useDeleteSpice;
export const useUpdateProductQuantity = useUpdateSpiceQuantity;

// Re-export the types
export type Product = Spice;
export type CreateProductData = CreateSpiceData;
export type UpdateProductData = UpdateSpiceData;
