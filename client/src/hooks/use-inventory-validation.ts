import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';

export interface InventoryValidationItem {
  productId: number;
  batchIds: number[];
  quantities: number[];
}

export interface BatchValidation {
  batchId: number;
  isValid: boolean;
  availableQuantity: number;
  requiredQuantity: number;
  error?: string;
}

export interface ProductValidation {
  productId: number;
  isValid: boolean;
  batchValidations: BatchValidation[];
}

export interface InventoryValidationResult {
  isValid: boolean;
  validationResults: ProductValidation[];
}

export function useInventoryValidation() {
  return useMutation({
    mutationFn: async (items: InventoryValidationItem[]): Promise<InventoryValidationResult> => {
      const response = await apiRequest<InventoryValidationResult>('/api/inventory/validate', {
        method: 'POST',
        data: { items },
      });
      return response;
    },
  });
}
