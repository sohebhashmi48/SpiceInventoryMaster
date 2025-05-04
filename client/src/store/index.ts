import { configureStore } from '@reduxjs/toolkit';
import inventoryReducer from './slices/inventory-slice';
import vendorReducer from './slices/vendor-slice';
import billingReducer from './slices/billing-slice';

export const store = configureStore({
  reducer: {
    inventory: inventoryReducer,
    vendors: vendorReducer,
    billing: billingReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
