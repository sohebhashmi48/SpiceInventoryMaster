import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Vendor, InsertVendor } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

interface VendorState {
  vendors: Vendor[];
  selectedVendor: Vendor | null;
  loading: boolean;
  error: string | null;
}

const initialState: VendorState = {
  vendors: [],
  selectedVendor: null,
  loading: false,
  error: null,
};

// Async thunks
export const fetchVendors = createAsyncThunk(
  'vendors/fetchVendors',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/vendors');
      if (!response.ok) throw new Error('Failed to fetch vendors');
      return await response.json();
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchVendorById = createAsyncThunk(
  'vendors/fetchVendorById',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/vendors/${id}`);
      if (!response.ok) throw new Error('Failed to fetch vendor');
      return await response.json();
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const addVendor = createAsyncThunk(
  'vendors/addVendor',
  async (vendor: InsertVendor, { rejectWithValue }) => {
    try {
      const res = await apiRequest("POST", "/api/vendors", vendor);
      return await res.json();
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const updateVendor = createAsyncThunk(
  'vendors/updateVendor',
  async ({ id, data }: { id: number; data: Partial<Vendor> }, { rejectWithValue }) => {
    try {
      const res = await apiRequest("PATCH", `/api/vendors/${id}`, data);
      return await res.json();
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const deleteVendor = createAsyncThunk(
  'vendors/deleteVendor',
  async (id: number, { rejectWithValue }) => {
    try {
      await apiRequest("DELETE", `/api/vendors/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

const vendorSlice = createSlice({
  name: 'vendors',
  initialState,
  reducers: {
    clearSelectedVendor: (state) => {
      state.selectedVendor = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch vendors
      .addCase(fetchVendors.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVendors.fulfilled, (state, action: PayloadAction<Vendor[]>) => {
        state.loading = false;
        state.vendors = action.payload;
      })
      .addCase(fetchVendors.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch vendor by id
      .addCase(fetchVendorById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVendorById.fulfilled, (state, action: PayloadAction<Vendor>) => {
        state.loading = false;
        state.selectedVendor = action.payload;
      })
      .addCase(fetchVendorById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Add vendor
      .addCase(addVendor.fulfilled, (state, action: PayloadAction<Vendor>) => {
        state.vendors.push(action.payload);
      })
      
      // Update vendor
      .addCase(updateVendor.fulfilled, (state, action: PayloadAction<Vendor>) => {
        const index = state.vendors.findIndex(vendor => vendor.id === action.payload.id);
        if (index !== -1) {
          state.vendors[index] = action.payload;
        }
        if (state.selectedVendor?.id === action.payload.id) {
          state.selectedVendor = action.payload;
        }
      })
      
      // Delete vendor
      .addCase(deleteVendor.fulfilled, (state, action: PayloadAction<number>) => {
        state.vendors = state.vendors.filter(vendor => vendor.id !== action.payload);
        if (state.selectedVendor?.id === action.payload) {
          state.selectedVendor = null;
        }
      });
  },
});

export const { clearSelectedVendor, clearError } = vendorSlice.actions;
export default vendorSlice.reducer;
