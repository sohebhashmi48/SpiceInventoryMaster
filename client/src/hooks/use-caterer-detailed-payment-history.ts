import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';

export interface DetailedPaymentHistoryItem {
  id: number;
  distributionId: number;
  productId: number;
  productName: string;
  itemName: string;
  quantity: string;
  unit: string;
  rate: string;
  gstPercentage: string;
  gstAmount: string;
  amount: string;
}

export interface DetailedPaymentHistoryPayment {
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

export interface DetailedPaymentHistoryBill {
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
  items: DetailedPaymentHistoryItem[];
  payments: DetailedPaymentHistoryPayment[];
}

export function useCatererDetailedPaymentHistory(catererId: number) {
  return useQuery({
    queryKey: ['catererDetailedPaymentHistory', catererId],
    queryFn: async () => {
      if (!catererId) return [];
      const response = await apiRequest<DetailedPaymentHistoryBill[]>(
        `/api/caterers/${catererId}/detailed-payment-history`
      );
      return response;
    },
    enabled: !!catererId,
  });
}
