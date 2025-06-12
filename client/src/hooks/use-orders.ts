import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for order management
export interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  delivery_address: string;
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'processing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method: 'cash_on_delivery' | 'online' | 'upi' | 'card';
  notes?: string;
  whatsapp_sent: boolean;
  whatsapp_message?: string;
  order_source: 'showcase' | 'admin' | 'phone' | 'walk_in';
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  delivered_at?: string;
  item_count: number;
  items_summary: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id?: number;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  product_image?: string;
  created_at: string;
}

export interface OrderDetails extends Order {
  items: OrderItem[];
}

export interface OrderFilters {
  status?: string;
  source?: string;
  page?: number;
  limit?: number;
  date?: string; // Format: YYYY-MM-DD
}

export interface OrdersResponse {
  orders: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Hook for fetching orders
export function useOrders(filters: OrderFilters = {}) {
  return useQuery<OrdersResponse>({
    queryKey: ['orders', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filters.status && filters.status !== 'all') {
        params.append('status', filters.status);
      }
      if (filters.source && filters.source !== 'all') {
        params.append('source', filters.source);
      }
      if (filters.page) {
        params.append('page', filters.page.toString());
      }
      if (filters.limit) {
        params.append('limit', filters.limit.toString());
      }
      if (filters.date) {
        params.append('date', filters.date);
      }

      const response = await fetch(`/api/orders?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      return response.json();
    }
  });
}

// Hook for fetching single order details
export function useOrderDetails(orderId: number | string) {
  return useQuery<OrderDetails>({
    queryKey: ['order-details', orderId],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${orderId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }
      return response.json();
    },
    enabled: !!orderId
  });
}

// Hook for order mutations
export function useOrderMutations() {
  const queryClient = useQueryClient();

  // Create order mutation
  const createOrder = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await fetch('/api/public/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });

  // Update order status mutation
  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, status, notes }: { orderId: number; status: string; notes?: string }) => {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, notes }),
      });

      if (!response.ok) {
        throw new Error('Failed to update order status');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-details', variables.orderId] });
      // If order was marked as delivered, inventory was deducted, so refresh inventory history
      if (variables.status === 'delivered') {
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        queryClient.invalidateQueries({ queryKey: ['inventory-history'] });
        queryClient.invalidateQueries({ queryKey: ['inventory-history-all'] });
      }
    }
  });

  // Approve order mutation
  const approveOrder = useMutation({
    mutationFn: async (orderId: number) => {
      const response = await fetch(`/api/orders/${orderId}/approve`, {
        method: 'PUT',
      });

      if (!response.ok) {
        throw new Error('Failed to approve order');
      }
      return response.json();
    },
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-details', orderId] });
    }
  });

  return {
    createOrder,
    updateOrderStatus,
    approveOrder
  };
}

// Add a new interface for OrderStatsFilters
export interface OrderStatsFilters {
  date?: string; // Optional date to filter stats for a specific day
}

// Hook for order statistics
export function useOrderStats(filters: OrderStatsFilters = {}) {
  return useQuery({
    queryKey: ['order-stats', filters.date], // Include date in queryKey to refetch when date changes
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.date) {
        params.append('date', filters.date);
      }
      const response = await fetch(`/api/orders?limit=1000&${params}`); // Get orders for stats
      if (!response.ok) {
        throw new Error('Failed to fetch order stats');
      }
      const data = await response.json();
      
      const orders = data.orders || [];
      
      return {
        total: orders.length,
        pending: orders.filter((o: Order) => o.status === 'pending').length,
        confirmed: orders.filter((o: Order) => o.status === 'confirmed').length,
        processing: orders.filter((o: Order) => o.status === 'processing').length,
        out_for_delivery: orders.filter((o: Order) => o.status === 'out_for_delivery').length,
        delivered: orders.filter((o: Order) => o.status === 'delivered').length,
        cancelled: orders.filter((o: Order) => o.status === 'cancelled').length,
        totalRevenue: orders
          .filter((o: Order) => o.status === 'delivered')
          .reduce((sum: number, o: Order) => sum + o.total_amount, 0),
        todayOrders: orders.filter((o: Order) => {
          const today = new Date().toDateString();
          const orderDate = new Date(o.created_at).toDateString();
          return today === orderDate;
        }).length
      };
    }
  });
}

// Utility functions
export const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'confirmed': return 'bg-blue-100 text-blue-800';
    case 'processing': return 'bg-purple-100 text-purple-800';
    case 'out_for_delivery': return 'bg-orange-100 text-orange-800';
    case 'delivered': return 'bg-green-100 text-green-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getSourceBadge = (source: string) => {
  switch (source) {
    case 'showcase': return { label: 'Online', color: 'bg-green-50 text-green-700' };
    case 'admin': return { label: 'Admin', color: 'bg-blue-50 text-blue-700' };
    case 'phone': return { label: 'Phone', color: 'bg-purple-50 text-purple-700' };
    case 'walk_in': return { label: 'Walk-in', color: 'bg-orange-50 text-orange-700' };
    default: return { label: 'Unknown', color: 'bg-gray-50 text-gray-700' };
  }
};
