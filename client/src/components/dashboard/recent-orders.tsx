import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  CheckCircle,
  Package,
  Truck,
  XCircle,
  Eye,
  ArrowRight,
  RefreshCw,
  Users
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useLocation } from 'wouter';

interface RecentOrder {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  status: string;
  order_source: string;
  created_at: string;
  item_count: number;
}

interface RecentOrdersProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export default function RecentOrders({ autoRefresh = true, refreshInterval = 30000 }: RecentOrdersProps) {
  const [, setLocation] = useLocation();

  // Fetch recent orders
  const { data: recentOrders, isLoading, refetch } = useQuery<RecentOrder[]>({
    queryKey: ['recent-orders'],
    queryFn: async () => {
      const response = await fetch('/api/orders?limit=5&page=1');
      if (!response.ok) {
        throw new Error('Failed to fetch recent orders');
      }
      const data = await response.json();
      return data.orders || [];
    },
    refetchInterval: autoRefresh ? refreshInterval : false,
    refetchIntervalInBackground: true
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-3 w-3" />;
      case 'confirmed': return <CheckCircle className="h-3 w-3" />;
      case 'processing': return <Package className="h-3 w-3" />;
      case 'out_for_delivery': return <Truck className="h-3 w-3" />;
      case 'delivered': return <CheckCircle className="h-3 w-3" />;
      case 'cancelled': return <XCircle className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const getStatusColor = (status: string) => {
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

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'showcase': return { label: 'Online', color: 'bg-green-50 text-green-700' };
      case 'admin': return { label: 'Admin', color: 'bg-blue-50 text-blue-700' };
      case 'phone': return { label: 'Phone', color: 'bg-purple-50 text-purple-700' };
      case 'walk_in': return { label: 'Walk-in', color: 'bg-orange-50 text-orange-700' };
      default: return { label: 'Unknown', color: 'bg-gray-50 text-gray-700' };
    }
  };

  const handleViewOrder = (orderId: number) => {
    // Navigate to orders page and highlight the specific order
    setLocation(`/orders`);
    // Note: The highlight functionality can be implemented later if needed
  };

  const handleViewAllOrders = () => {
    setLocation('/orders');
  };

  return (
    <div className="h-full">
      <div className="flex flex-row items-center justify-between space-y-0 p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl shadow-lg">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Recent Orders</h2>
            <p className="text-slate-600">Latest customer orders</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewAllOrders}
          >
            View All
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      <div className="px-6 pb-6 max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 rounded-lg h-16"></div>
              </div>
            ))}
          </div>
        ) : !recentOrders || recentOrders.length === 0 ? (
          <div className="text-center py-6">
            <Package className="h-8 w-8 text-gray-400 mx-auto mb-3" />
            <h3 className="text-base font-medium text-gray-900 mb-1">No recent orders</h3>
            <p className="text-sm text-gray-500">New orders will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="border rounded-lg p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => handleViewOrder(order.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">
                      #{order.order_number}
                    </span>
                    <Badge className={`${getStatusColor(order.status)} flex items-center gap-1 text-xs`}>
                      {getStatusIcon(order.status)}
                      {order.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className={`${getSourceBadge(order.order_source).color} text-xs`}>
                      {getSourceBadge(order.order_source).label}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Eye className="h-3 w-3" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{order.customer_name}</p>
                    <p className="text-gray-500">{order.customer_phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{formatCurrency(order.total_amount)}</p>
                    <p className="text-xs text-gray-500">
                      {order.item_count} item{order.item_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                
                <div className="mt-2 text-xs text-gray-500">
                  {formatDate(order.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
