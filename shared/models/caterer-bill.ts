export interface CatererBillItem {
  id?: number;
  billId?: number;
  productId: number;
  productName: string;
  quantity: number;
  unit: string;
  rate: number;
  gstPercentage: number;
  gstAmount: number;
  amount: number;
}

export interface CatererBill {
  id?: number;
  billNo: string;
  billDate: string;
  dueDate: string;
  catererId: number;
  catererName?: string;
  totalAmount: number;
  totalGstAmount: number;
  grandTotal: number;
  status: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
  items: CatererBillItem[];
  paidAmount?: number;
  balanceDue?: number;
  paymentHistory?: CatererPayment[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CatererPayment {
  id?: number;
  billId: number;
  paymentDate: string;
  amount: number;
  paymentMethod: 'cash' | 'bank' | 'upi' | 'credit' | 'other';
  referenceNo?: string;
  notes?: string;
  createdAt?: string;
}

export interface CatererBillSummary {
  totalBills: number;
  totalAmount: number;
  totalPaid: number;
  totalDue: number;
  overdueAmount: number;
  overdueBills: number;
}
