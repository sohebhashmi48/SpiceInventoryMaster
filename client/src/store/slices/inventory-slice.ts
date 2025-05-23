import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Inventory, Spice, Category, InsertInventory } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

interface InventoryState {
  inventory: Inventory[];
  spices: Spice[];
  categories: Category[];
  lowStockItems: Inventory[];
  expiringItems: Inventory[];
  loading: boolean;
  error: string | null;
}

const initialState: InventoryState = {
  inventory: [],
  spices: [],
  categories: [],
  lowStockItems: [],
  expiringItems: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchInventory = createAsyncThunk(
  'inventory/fetchInventory',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/inventory');
      if (!response.ok) throw new Error('Failed to fetch inventory');
      return await response.json();
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchSpices = createAsyncThunk(
  'inventory/fetchSpices',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      return await response.json();
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchCategories = createAsyncThunk(
  'inventory/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return await response.json();
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchLowStockItems = createAsyncThunk(
  'inventory/fetchLowStockItems',
  async (threshold: number, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/inventory/alerts/low-stock?threshold=${threshold}`);
      if (!response.ok) throw new Error('Failed to fetch low stock items');
      return await response.json();
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchExpiringItems = createAsyncThunk(
  'inventory/fetchExpiringItems',
  async (days: number, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/inventory/alerts/expiring?days=${days}`);
      if (!response.ok) throw new Error('Failed to fetch expiring items');
      return await response.json();
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const addInventoryItem = createAsyncThunk(
  'inventory/addInventoryItem',
  async (item: InsertInventory, { rejectWithValue }) => {
    try {
      const res = await apiRequest("POST", "/api/inventory", item);
      return await res.json();
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const updateInventoryItem = createAsyncThunk(
  'inventory/updateInventoryItem',
  async ({ id, data }: { id: number; data: Partial<Inventory> }, { rejectWithValue }) => {
    try {
      const res = await apiRequest("PATCH", `/api/inventory/${id}`, data);
      return await res.json();
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const deleteInventoryItem = createAsyncThunk(
  'inventory/deleteInventoryItem',
  async (id: number, { rejectWithValue }) => {
    try {
      await apiRequest("DELETE", `/api/inventory/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch inventory
      .addCase(fetchInventory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventory.fulfilled, (state, action: PayloadAction<Inventory[]>) => {
        state.loading = false;
        state.inventory = action.payload;
      })
      .addCase(fetchInventory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch spices
      .addCase(fetchSpices.fulfilled, (state, action: PayloadAction<Spice[]>) => {
        state.spices = action.payload;
      })

      // Fetch categories
      .addCase(fetchCategories.fulfilled, (state, action: PayloadAction<Category[]>) => {
        state.categories = action.payload;
      })

      // Fetch low stock items
      .addCase(fetchLowStockItems.fulfilled, (state, action: PayloadAction<Inventory[]>) => {
        state.lowStockItems = action.payload;
      })

      // Fetch expiring items
      .addCase(fetchExpiringItems.fulfilled, (state, action: PayloadAction<Inventory[]>) => {
        state.expiringItems = action.payload;
      })

      // Add inventory item
      .addCase(addInventoryItem.fulfilled, (state, action: PayloadAction<Inventory>) => {
        state.inventory.push(action.payload);
      })

      // Update inventory item
      .addCase(updateInventoryItem.fulfilled, (state, action: PayloadAction<Inventory>) => {
        const index = state.inventory.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.inventory[index] = action.payload;
        }
      })

      // Delete inventory item
      .addCase(deleteInventoryItem.fulfilled, (state, action: PayloadAction<number>) => {
        state.inventory = state.inventory.filter(item => item.id !== action.payload);
      });
  },
});

export const { clearError } = inventorySlice.actions;
export default inventorySlice.reducer;
