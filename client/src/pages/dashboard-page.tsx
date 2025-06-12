import { useEffect } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/layout/layout";
import PageHeader from "@/components/common/page-header";
import StatCard from "@/components/dashboard/stats-card";
import SalesChart from "@/components/dashboard/sales-chart";

import RecentAlerts from "@/components/dashboard/recent-alerts";

import PaymentReminders from "@/components/dashboard/payment-reminders";
import SupplierPaymentReminders from "@/components/dashboard/supplier-payment-reminders";
import NotificationWidget from "@/components/notifications/notification-widget";
import RecentOrders from "@/components/dashboard/recent-orders";
import DailyProfit from "@/components/dashboard/daily-profit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { File, Plus, DollarSign, ArrowRight, Package, ShoppingCart, AlertTriangle, TrendingUp, Users, Calendar, Zap, BarChart3, Settings, UserPlus, Truck, Receipt } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrencyAmount } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Inventory } from "@shared/schema";

interface DashboardStats {
  totalValue: number;
  activeSpices: number;
  pendingInvoices: number;
  lowStockAlerts: number;
  changes: {
    totalValueChange: number;
    activeSpicesChange: number;
    pendingInvoicesChange: number;
    lowStockAlertsChange: number;
  };
}

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/stats', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchIntervalInBackground: true,
  });

  // Fetch inventory alerts for notifications
  const { data: lowStockItems, isLoading: lowStockLoading } = useQuery<Inventory[]>({
    queryKey: ["/api/inventory/alerts/low-stock"],
    queryFn: async () => {
      const response = await fetch('/api/inventory/alerts/low-stock', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch low stock items');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchIntervalInBackground: true,
  });

  const { data: expiringItems } = useQuery<Inventory[]>({
    queryKey: ["/api/inventory/alerts/expiring"],
    queryFn: async () => {
      const response = await fetch('/api/inventory/alerts/expiring', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch expiring items');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchIntervalInBackground: true,
  });

  // Calculate out of stock items from low stock data
  const outOfStockItemsLocal = lowStockItems?.filter(item => Number(item.quantity) === 0) || [];
  const lowStockOnlyItems = lowStockItems?.filter(item => Number(item.quantity) > 0) || [];

  // Show notification alerts for low stock and out of stock items (only on initial load)
  useEffect(() => {
    // Only show notifications if we have data and it's not loading
    if (!lowStockLoading && lowStockOnlyItems && lowStockOnlyItems.length > 0) {
      toast({
        title: "⚠️ Low Stock Alert",
        description: `${lowStockOnlyItems.length} item(s) are running low on stock and need restocking.`,
        variant: "destructive",
      });
    }

    if (outOfStockItemsLocal && outOfStockItemsLocal.length > 0) {
      toast({
        title: "🚨 Out of Stock Alert",
        description: `${outOfStockItemsLocal.length} item(s) are completely out of stock.`,
        variant: "destructive",
      });
    }

    if (expiringItems && expiringItems.length > 0) {
      toast({
        title: "⏰ Expiring Soon Alert",
        description: `${expiringItems.length} item(s) will expire within 30 days.`,
        variant: "destructive",
      });
    }
  }, [lowStockOnlyItems?.length, outOfStockItemsLocal?.length, expiringItems?.length]); // Only trigger when counts change

  // Quick action handlers
  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'add-product':
        setLocation('/spices');
        break;
      case 'new-order':
        setLocation('/showcase');
        break;
      case 'add-payment':
        setLocation('/caterer-payments');
        break;
      case 'view-reports':
        setLocation('/reports');
        break;
      case 'manage-suppliers':
        setLocation('/suppliers');
        break;
      case 'settings':
        setLocation('/settings');
        break;
      case 'inventory':
        setLocation('/inventory');
        break;
      case 'orders':
        setLocation('/orders');
        break;
      case 'customer-billing':
        setLocation('/customer-billing');
        break;
      case 'caterer-billing':
        setLocation('/caterer-billing');
        break;
      default:
        console.log('Action not implemented:', action);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-100/30">
        <div className="space-y-4 p-4 max-w-7xl mx-auto">
          {/* Beautiful Header Section */}
          <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-lg border border-white/40 p-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                  Business Dashboard
                </h1>
                <p className="text-slate-600 text-lg">Welcome back! Here's your business overview for today.</p>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Live Data
                  </span>
                  <span>Last updated: {new Date().toLocaleTimeString()}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  className="bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white shadow-sm"
                  onClick={() => handleQuickAction('view-reports')}
                >
                  <File className="h-4 w-4 mr-2" />
                  View Reports
                </Button>
                <Button
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
                  onClick={() => handleQuickAction('add-product')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Quick Add
                </Button>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <NotificationWidget maxItems={3} compact={false} />

          {/* Beautiful Quick Actions */}
          <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-lg border border-white/40 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl shadow-lg">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Quick Actions</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center gap-2 hover:bg-blue-50 hover:border-blue-300 hover:shadow-md transition-all duration-300 border-slate-200 bg-white/80"
                onClick={() => handleQuickAction('add-product')}
              >
                <Package className="h-6 w-6 text-blue-600" />
                <span className="text-sm font-medium text-slate-700">Add Product</span>
              </Button>

              <Button
                variant="outline"
                className="h-20 flex flex-col items-center gap-2 hover:bg-green-50 hover:border-green-300 hover:shadow-md transition-all duration-300 border-slate-200 bg-white/80"
                onClick={() => handleQuickAction('new-order')}
              >
                <ShoppingCart className="h-6 w-6 text-green-600" />
                <span className="text-sm font-medium text-slate-700">New Order</span>
              </Button>

              <Button
                variant="outline"
                className="h-20 flex flex-col items-center gap-2 hover:bg-purple-50 hover:border-purple-300 hover:shadow-md transition-all duration-300 border-slate-200 bg-white/80"
                onClick={() => handleQuickAction('add-payment')}
              >
                <DollarSign className="h-6 w-6 text-purple-600" />
                <span className="text-sm font-medium text-slate-700">Payments</span>
              </Button>

              <Button
                variant="outline"
                className="h-20 flex flex-col items-center gap-2 hover:bg-orange-50 hover:border-orange-300 hover:shadow-md transition-all duration-300 border-slate-200 bg-white/80"
                onClick={() => handleQuickAction('view-reports')}
              >
                <BarChart3 className="h-6 w-6 text-orange-600" />
                <span className="text-sm font-medium text-slate-700">Reports</span>
              </Button>

              <Button
                variant="outline"
                className="h-20 flex flex-col items-center gap-2 hover:bg-indigo-50 hover:border-indigo-300 hover:shadow-md transition-all duration-300 border-slate-200 bg-white/80"
                onClick={() => handleQuickAction('manage-suppliers')}
              >
                <UserPlus className="h-6 w-6 text-indigo-600" />
                <span className="text-sm font-medium text-slate-700">Suppliers</span>
              </Button>

              <Button
                variant="outline"
                className="h-20 flex flex-col items-center gap-2 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md transition-all duration-300 border-slate-200 bg-white/80"
                onClick={() => handleQuickAction('settings')}
              >
                <Settings className="h-6 w-6 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">Settings</span>
              </Button>
            </div>
          </div>

          {/* Beautiful Key Performance Metrics */}
          <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-lg border border-white/40 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl shadow-lg">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Key Performance Metrics</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {statsLoading ? (
                <>
                  <Skeleton className="h-[140px] rounded-2xl" />
                  <Skeleton className="h-[140px] rounded-2xl" />
                  <Skeleton className="h-[140px] rounded-2xl" />
                  <Skeleton className="h-[140px] rounded-2xl" />
                </>
              ) : (
                <>
                  <StatCard
                    title="Total Inventory Value"
                    value={formatCurrencyAmount(stats?.totalValue)}
                    icon={<DollarSign className="h-6 w-6" />}
                    changeValue={stats?.changes?.totalValueChange}
                    changeLabel="vs 30 days ago"
                  />

                  <StatCard
                    title="Active Products"
                    value={stats?.activeSpices || 0}
                    icon={<Package className="h-6 w-6" />}
                    changeValue={stats?.changes?.activeSpicesChange}
                    changeLabel="vs 30 days ago"
                  />

                  <StatCard
                    title="Pending Orders"
                    value={stats?.pendingInvoices || 0}
                    icon={<ShoppingCart className="h-6 w-6" />}
                    changeValue={stats?.changes?.pendingInvoicesChange}
                    changeLabel="vs 30 days ago"
                  />

                  <StatCard
                    title="Stock Alerts"
                    value={lowStockItems?.length || 0}
                    icon={<AlertTriangle className="h-6 w-6" />}
                    changeValue={stats?.changes?.lowStockAlertsChange}
                    changeLabel="Need attention"
                  />
                </>
              )}
            </div>
          </div>

          {/* Beautiful Analytics Section */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2">
              <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-lg border border-white/40 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Sales Analytics</h2>
                </div>
                <SalesChart />
              </div>
            </div>
            <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-lg border border-white/40">
              <DailyProfit />
            </div>
          </div>

          {/* Beautiful Business Operations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-lg border border-white/40 overflow-hidden">
              <RecentOrders />
            </div>

            <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-lg border border-white/40 overflow-hidden">
              <RecentAlerts />
            </div>
          </div>

          {/* Beautiful Financial Management */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-lg border border-white/40 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl shadow-lg">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Payment Reminders</h2>
              </div>
              <PaymentReminders className="dashboard-widget" />
            </div>

            <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-lg border border-white/40 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl shadow-lg">
                  <Truck className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Supplier Payments</h2>
              </div>
              <SupplierPaymentReminders className="dashboard-widget" />
            </div>
          </div>

          {/* Additional Business Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Quick Stats */}
            <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-lg border border-white/40 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl shadow-lg">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Quick Stats</h2>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                  <div>
                    <p className="text-sm text-slate-600">Today's Revenue</p>
                    <p className="text-2xl font-bold text-slate-900">{formatCurrencyAmount(stats?.todayRevenue || 0)}</p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-xl">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                </div>
                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                  <div>
                    <p className="text-sm text-slate-600">Active Suppliers</p>
                    <p className="text-2xl font-bold text-slate-900">{stats?.activeSuppliers || 0}</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-xl">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                  <div>
                    <p className="text-sm text-slate-600">Orders This Week</p>
                    <p className="text-2xl font-bold text-slate-900">{stats?.weeklyOrders || 0}</p>
                  </div>
                  <div className="p-2 bg-purple-100 rounded-xl">
                    <ShoppingCart className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* System Status */}
            <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-lg border border-white/40 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl shadow-lg">
                  <Settings className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">System Status</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-2xl border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="font-medium text-green-800">Database</span>
                  </div>
                  <span className="text-sm text-green-600">Online</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-2xl border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="font-medium text-green-800">API Services</span>
                  </div>
                  <span className="text-sm text-green-600">Operational</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="font-medium text-blue-800">Last Backup</span>
                  </div>
                  <span className="text-sm text-blue-600">2 hours ago</span>
                </div>
              </div>
            </div>

            {/* Quick Navigation */}
            <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-lg border border-white/40 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl shadow-lg">
                  <Receipt className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Quick Access</h2>
              </div>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start h-12 bg-white/80 hover:bg-slate-50 border-slate-200"
                  onClick={() => setLocation('/inventory')}
                >
                  <Package className="h-4 w-4 mr-3" />
                  Manage Inventory
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start h-12 bg-white/80 hover:bg-slate-50 border-slate-200"
                  onClick={() => setLocation('/caterer-billing')}
                >
                  <Receipt className="h-4 w-4 mr-3" />
                  Caterer Billing
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start h-12 bg-white/80 hover:bg-slate-50 border-slate-200"
                  onClick={() => setLocation('/customer-billing')}
                >
                  <Users className="h-4 w-4 mr-3" />
                  Customer Billing
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start h-12 bg-white/80 hover:bg-slate-50 border-slate-200"
                  onClick={() => setLocation('/financial-tracker')}
                >
                  <DollarSign className="h-4 w-4 mr-3" />
                  Financial Tracker
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
