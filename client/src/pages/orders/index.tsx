import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Eye,
  Phone,
  MapPin,
  Calendar,
  Search,
  RefreshCw,
  CalendarDays,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useOrders, useOrderStats, useOrderMutations, getStatusColor, getSourceBadge, Order } from '@/hooks/use-orders';
import OrderDetailsModal from '@/components/orders/order-details-modal';
import OrderConfirmationDialog from '@/components/orders/order-confirmation-dialog';
import { format } from 'date-fns';
import { useLocation } from 'wouter';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';

export default function OrdersPage() {
  const [, setLocation] = useLocation();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateFilter, setDateFilter] = useState<'today' | 'all' | 'custom'>('today');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'today' | 'all'>('today');

  // Confirmation dialog state
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean;
    order: Order | null;
    action: 'approve' | 'confirm' | 'process' | 'ship' | 'deliver' | 'cancel';
  }>({
    isOpen: false,
    order: null,
    action: 'approve'
  });

  // Build date filter for API for the 'All Orders' tab
  const getDateFilter = () => {
    if (dateFilter === 'today') {
      return format(new Date(), 'yyyy-MM-dd');
    } else if (dateFilter === 'custom') {
      return format(selectedDate, 'yyyy-MM-dd');
    }
    return undefined;
  };

  // Fetch orders for 'All Orders' tab
  const { data: allOrdersData, isLoading: isLoadingAllOrders, refetch: refetchAllOrders } = useOrders({
    status: statusFilter,
    source: sourceFilter,
    page: currentPage,
    limit: 20,
    date: getDateFilter()
  });

  // Fetch orders for 'Today's Orders' tab (always today)
  const { data: todayOrdersData, isLoading: isLoadingTodayOrders, refetch: refetchTodayOrders } = useOrders({
    date: format(new Date(), 'yyyy-MM-dd'),
    limit: 20,
  });

  const { data: stats, refetch: refetchStats } = useOrderStats({
    date: format(new Date(), 'yyyy-MM-dd'),
  });
  const { approveOrder, updateOrderStatus } = useOrderMutations();

  const orders = allOrdersData?.orders || [];
  const pagination = allOrdersData?.pagination;

  // Filter orders by search query (applies to 'All Orders' tab data)
  const filteredOrders = orders.filter((order: Order) =>
    order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customer_phone.includes(searchQuery)
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'confirmed': return <CheckCircle className="h-4 w-4" />;
      case 'processing': return <Package className="h-4 w-4" />;
      case 'out_for_delivery': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  };

  const handleOrderAction = (order: Order, action: 'approve' | 'confirm' | 'process' | 'ship' | 'deliver' | 'cancel') => {
    setConfirmationDialog({
      isOpen: true,
      order,
      action
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmationDialog.order) return;

    try {
      const { order, action } = confirmationDialog;

      if (action === 'approve') {
        await approveOrder.mutateAsync(order.id);
        toast({
          title: 'Order Approved',
          description: 'The order has been approved successfully.',
        });
      } else {
        // Map action to status
        const statusMap = {
          confirm: 'confirmed',
          process: 'processing',
          ship: 'out_for_delivery',
          deliver: 'delivered',
          cancel: 'cancelled'
        };

        await updateOrderStatus.mutateAsync({
          orderId: order.id,
          status: statusMap[action as keyof typeof statusMap]
        });

        toast({
          title: 'Order Updated',
          description: `Order has been ${action}ed successfully.`,
        });
      }

      setConfirmationDialog({ isOpen: false, order: null, action: 'approve' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update order. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDateFilterChange = (value: 'today' | 'all' | 'custom') => {
    setDateFilter(value);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  // Fetch today's profit (summary only)
  const { data: profitData, isLoading: isProfitLoading } = useQuery({
    queryKey: ['orders-profit-summary'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/daily-profit');
      if (!response.ok) throw new Error('Failed to fetch profit');
      return response.json();
    },
    refetchInterval: 60000, // auto-refresh every minute
    refetchIntervalInBackground: true
  });

  // Global refresh handler
  const handleGlobalRefresh = () => {
    refetchAllOrders();
    refetchTodayOrders();
    refetchStats();
  };

  // Helper to render orders list (reused in both tabs)
  function OrdersList({ orders, isLoading }: { orders: Order[]; isLoading: boolean }) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>
            {orders.length} order{orders.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 rounded-lg h-20"></div>
                </div>
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
              <p className="text-gray-500">No orders match your current filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order: Order) => (
                <div key={order.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">#{order.order_number}</h3>
                        <Badge className={`${getStatusColor(order.status)} flex items-center gap-1`}>
                          {getStatusIcon(order.status)}
                          {order.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className={getSourceBadge(order.order_source).color}>
                          {getSourceBadge(order.order_source).label}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span>{order.customer_name} - {order.customer_phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span className="truncate">{order.delivery_address}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(order.created_at)}</span>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">{order.item_count} item{order.item_count !== 1 ? 's' : ''}</span>
                        <span className="mx-2">•</span>
                        <span className="font-bold text-primary">{formatCurrency(order.total_amount)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {order.status === 'pending' && (
                        <Button
                          onClick={() => handleOrderAction(order, 'approve')}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      )}
                      {order.status === 'confirmed' && (
                        <Button
                          onClick={() => handleOrderAction(order, 'process')}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          <Package className="h-4 w-4 mr-1" />
                          Process
                        </Button>
                      )}
                      {order.status === 'processing' && (
                        <Button
                          onClick={() => handleOrderAction(order, 'ship')}
                          size="sm"
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          <Truck className="h-4 w-4 mr-1" />
                          Ship
                        </Button>
                      )}
                      {order.status === 'out_for_delivery' && (
                        <Button
                          onClick={() => handleOrderAction(order, 'deliver')}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Deliver
                        </Button>
                      )}
                      <Button
                        onClick={() => handleViewOrder(order)}
                        variant="outline"
                        size="sm"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setLocation('/')}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
            <p className="text-gray-600 mt-1">Manage customer orders and track deliveries</p>
          </div>
        </div>
        <Button onClick={handleGlobalRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats?.pending || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Confirmed</p>
                <p className="text-2xl font-bold text-blue-600">{stats?.confirmed || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Processing</p>
                <p className="text-2xl font-bold text-purple-600">{stats?.processing || 0}</p>
              </div>
              <Package className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Delivered</p>
                <p className="text-2xl font-bold text-green-600">{stats?.delivered || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        {/* Profit Stat Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Profit (Today)</p>
                <p className="text-2xl font-bold text-primary">
                  {isProfitLoading ? '...' : formatCurrency(profitData?.totalProfit || 0)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="today" value={activeTab} onValueChange={(value) => setActiveTab(value as 'today' | 'all')} className="mt-6">
        <TabsList>
          <TabsTrigger value="today">Today's Orders</TabsTrigger>
          <TabsTrigger value="all">All Orders</TabsTrigger>
        </TabsList>
        <TabsContent value="today" className="mt-6">
          {/* Show only today's orders, filters hidden */}
          <OrdersList orders={todayOrdersData?.orders || []} isLoading={isLoadingTodayOrders} />
        </TabsContent>
        <TabsContent value="all" className="mt-6">
          {/* Show filters and all orders */}
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search by order number, customer name, or phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={dateFilter} onValueChange={handleDateFilterChange}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Date Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today Only</SelectItem>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="custom">Custom Date</SelectItem>
                  </SelectContent>
                </Select>
                {dateFilter === 'custom' && (
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-48">
                        <CalendarDays className="h-4 w-4 mr-2" />
                        {format(selectedDate, 'MMM dd, yyyy')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          if (date) {
                            setSelectedDate(date);
                            setCurrentPage(1);
                            setIsCalendarOpen(false);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="showcase">Online</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="walk_in">Walk-in</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          <OrdersList orders={filteredOrders} isLoading={isLoadingAllOrders} />
        </TabsContent>
      </Tabs>

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setSelectedOrder(null);
          }}
          onRefresh={refetchAllOrders}
        />
      )}

      {/* Order Confirmation Dialog */}
      {confirmationDialog.order && (
        <OrderConfirmationDialog
          isOpen={confirmationDialog.isOpen}
          onClose={() => setConfirmationDialog({ isOpen: false, order: null, action: 'approve' })}
          onConfirm={handleConfirmAction}
          order={confirmationDialog.order}
          action={confirmationDialog.action}
          isLoading={approveOrder.isPending || updateOrderStatus.isPending}
        />
      )}
    </div>
  );
}
