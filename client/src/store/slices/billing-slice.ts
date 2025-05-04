import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Invoice, InvoiceItem, Transaction, InsertInvoice, InsertTransaction } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

interface BillingState {
  invoices: Invoice[];
  selectedInvoice: Invoice | null;
  invoiceItems: InvoiceItem[];
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
}

const initialState: BillingState = {
  invoices: [],
  selectedInvoice: null,
  invoiceItems: [],
  transactions: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchInvoices = createAsyncThunk(
  'billing/fetchInvoices',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/invoices');
      if (!response.ok) throw new Error('Failed to fetch invoices');
      return await response.json();
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchInvoiceById = createAsyncThunk(
  'billing/fetchInvoiceById',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/invoices/${id}`);
      if (!response.ok) throw new Error('Failed to fetch invoice');
      return await response.json();
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchInvoiceItems = createAsyncThunk(
  'billing/fetchInvoiceItems',
  async (invoiceId: number, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`);
      if (!response.ok) throw new Error('Failed to fetch invoice items');
      const data = await response.json();
      return data.items || [];
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchTransactions = createAsyncThunk(
  'billing/fetchTransactions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/transactions');
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return await response.json();
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const createInvoice = createAsyncThunk(
  'billing/createInvoice',
  async (invoice: InsertInvoice & { items: any[] }, { rejectWithValue }) => {
    try {
      const res = await apiRequest("POST", "/api/invoices", invoice);
      return await res.json();
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const updateInvoiceStatus = createAsyncThunk(
  'billing/updateInvoiceStatus',
  async ({ id, status }: { id: number; status: string }, { rejectWithValue }) => {
    try {
      const res = await apiRequest("PATCH", `/api/invoices/${id}/status`, { status });
      return await res.json();
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const createTransaction = createAsyncThunk(
  'billing/createTransaction',
  async (transaction: InsertTransaction, { rejectWithValue }) => {
    try {
      const res = await apiRequest("POST", "/api/transactions", transaction);
      return await res.json();
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

const billingSlice = createSlice({
  name: 'billing',
  initialState,
  reducers: {
    clearSelectedInvoice: (state) => {
      state.selectedInvoice = null;
      state.invoiceItems = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch invoices
      .addCase(fetchInvoices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInvoices.fulfilled, (state, action: PayloadAction<Invoice[]>) => {
        state.loading = false;
        state.invoices = action.payload;
      })
      .addCase(fetchInvoices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch invoice by id
      .addCase(fetchInvoiceById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInvoiceById.fulfilled, (state, action: PayloadAction<Invoice>) => {
        state.loading = false;
        state.selectedInvoice = action.payload;
      })
      .addCase(fetchInvoiceById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch invoice items
      .addCase(fetchInvoiceItems.fulfilled, (state, action: PayloadAction<InvoiceItem[]>) => {
        state.invoiceItems = action.payload;
      })
      
      // Fetch transactions
      .addCase(fetchTransactions.fulfilled, (state, action: PayloadAction<Transaction[]>) => {
        state.transactions = action.payload;
      })
      
      // Create invoice
      .addCase(createInvoice.fulfilled, (state, action: PayloadAction<Invoice & { items: InvoiceItem[] }>) => {
        state.invoices.push(action.payload);
        if (action.payload.items) {
          state.invoiceItems = [...state.invoiceItems, ...action.payload.items];
        }
      })
      
      // Update invoice status
      .addCase(updateInvoiceStatus.fulfilled, (state, action: PayloadAction<Invoice>) => {
        const index = state.invoices.findIndex(invoice => invoice.id === action.payload.id);
        if (index !== -1) {
          state.invoices[index] = action.payload;
        }
        if (state.selectedInvoice?.id === action.payload.id) {
          state.selectedInvoice = action.payload;
        }
      })
      
      // Create transaction
      .addCase(createTransaction.fulfilled, (state, action: PayloadAction<Transaction>) => {
        state.transactions.push(action.payload);
      });
  },
});

export const { clearSelectedInvoice, clearError } = billingSlice.actions;
export default billingSlice.reducer;
