import { useEffect } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/layout/layout";
import PageHeader from "@/components/common/page-header";
import StatCard from "@/components/dashboard/stats-card";
import SalesChart from "@/components/dashboard/sales-chart";

import RecentAlerts from "@/components/dashboard/recent-alerts";
import RecentActivity from "@/components/dashboard/recent-activity";
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
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchIntervalInBackground: true,
  });

  // Fetch inventory alerts for notifications
  const { data: lowStockItems, isLoading: lowStockLoading } = useQuery<Inventory[]>({
    queryKey: ["/api/inventory/alerts/low-stock"],
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchIntervalInBackground: true,
  });

  const { data: expiringItems } = useQuery<Inventory[]>({
    queryKey: ["/api/inventory/alerts/expiring"],
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
        <div className="space-y-4 p-3 max-w-7xl mx-auto">
          {/* Modern Header Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Dashboard
                </h1>
                <p className="text-gray-600 text-xs">Real-time business insights</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden sm:flex items-center border-gray-200 hover:bg-gray-50 h-8 px-3 text-xs"
                  onClick={() => handleQuickAction('view-reports')}
                >
                  <File className="h-3.5 w-3.5 mr-1" />
                  Reports
                </Button>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm h-8 px-3 text-xs"
                  onClick={() => handleQuickAction('add-product')}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Quick Add
                </Button>
              </div>
            </div>
          </div>

          {/* Compact Notifications */}
          <NotificationWidget maxItems={2} compact={true} />

          {/* Modern Quick Actions */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg">
                <Zap className="h-3.5 w-3.5 text-white" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">Quick Actions</h2>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <Button
                variant="outline"
                className="h-14 flex flex-col items-center gap-1 hover:bg-blue-50 hover:border-blue-200 transition-all duration-200 border-gray-200"
                onClick={() => handleQuickAction('add-product')}
              >
                <Package className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-xs font-medium">Add Product</span>
              </Button>

              <Button
                variant="outline"
                className="h-14 flex flex-col items-center gap-1 hover:bg-green-50 hover:border-green-200 transition-all duration-200 border-gray-200"
                onClick={() => handleQuickAction('new-order')}
              >
                <ShoppingCart className="h-3.5 w-3.5 text-green-600" />
                <span className="text-xs font-medium">New Order</span>
              </Button>

              <Button
                variant="outline"
                className="h-14 flex flex-col items-center gap-1 hover:bg-purple-50 hover:border-purple-200 transition-all duration-200 border-gray-200"
                onClick={() => handleQuickAction('add-payment')}
              >
                <DollarSign className="h-3.5 w-3.5 text-purple-600" />
                <span className="text-xs font-medium">Payments</span>
              </Button>

              <Button
                variant="outline"
                className="h-14 flex flex-col items-center gap-1 hover:bg-orange-50 hover:border-orange-200 transition-all duration-200 border-gray-200"
                onClick={() => handleQuickAction('view-reports')}
              >
                <BarChart3 className="h-3.5 w-3.5 text-orange-600" />
                <span className="text-xs font-medium">Reports</span>
              </Button>

              <Button
                variant="outline"
                className="h-14 flex flex-col items-center gap-1 hover:bg-indigo-50 hover:border-indigo-200 transition-all duration-200 border-gray-200"
                onClick={() => handleQuickAction('manage-suppliers')}
              >
                <UserPlus className="h-3.5 w-3.5 text-indigo-600" />
                <span className="text-xs font-medium">Suppliers</span>
              </Button>

              <Button
                variant="outline"
                className="h-14 flex flex-col items-center gap-1 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 border-gray-200"
                onClick={() => handleQuickAction('settings')}
              >
                <Settings className="h-3.5 w-3.5 text-gray-600" />
                <span className="text-xs font-medium">Settings</span>
              </Button>
            </div>
          </div>

          {/* Modern Key Performance Metrics */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                <TrendingUp className="h-3.5 w-3.5 text-white" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">Key Metrics</h2>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {statsLoading ? (
                <>
                  <Skeleton className="h-[110px] rounded-xl" />
                  <Skeleton className="h-[110px] rounded-xl" />
                  <Skeleton className="h-[110px] rounded-xl" />
                  <Skeleton className="h-[110px] rounded-xl" />
                </>
              ) : (
                <>
                  <StatCard
                    title="Total Inventory Value"
                    value={formatCurrencyAmount(stats?.totalValue)}
                    icon={<DollarSign className="h-5 w-5" />}
                    changeValue={stats?.changes?.totalValueChange}
                    changeLabel="vs 30 days ago"
                  />

                  <StatCard
                    title="Active Products"
                    value={stats?.activeSpices || 0}
                    icon={<Package className="h-5 w-5" />}
                    changeValue={stats?.changes?.activeSpicesChange}
                    changeLabel="vs 30 days ago"
                  />

                  <StatCard
                    title="Pending Orders"
                    value={stats?.pendingInvoices || 0}
                    icon={<ShoppingCart className="h-5 w-5" />}
                    changeValue={stats?.changes?.pendingInvoicesChange}
                    changeLabel="vs 30 days ago"
                  />

                  <StatCard
                    title="Stock Alerts"
                    value={lowStockItems?.length || 0}
                    icon={<AlertTriangle className="h-5 w-5" />}
                    changeValue={stats?.changes?.lowStockAlertsChange}
                    changeLabel="Need attention"
                  />
                </>
              )}
            </div>
          </div>

          {/* Modern Analytics Section */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
            <div className="xl:col-span-2">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                    <TrendingUp className="h-3.5 w-3.5 text-white" />
                  </div>
                  <h2 className="text-base font-semibold text-gray-900">Sales Analytics</h2>
                </div>
                <SalesChart />
              </div>
            </div>
            <div>
              <DailyProfit />
            </div>
          </div>

          {/* Modern Business Operations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg">
                  <Users className="h-3.5 w-3.5 text-white" />
                </div>
                <h2 className="text-base font-semibold text-gray-900">Recent Orders</h2>
              </div>
              <RecentOrders />
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg">
                    <Calendar className="h-3.5 w-3.5 text-white" />
                  </div>
                  <h2 className="text-base font-semibold text-gray-900">Recent Activity</h2>
                </div>
                <span className="text-xs text-gray-500">Live updates</span>
              </div>
              <RecentActivity isLoading={false} />
            </div>
          </div>

          {/* Modern Financial Management */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg">
                  <DollarSign className="h-3.5 w-3.5 text-white" />
                </div>
                <h2 className="text-base font-semibold text-gray-900">Payment Reminders</h2>
              </div>
              <PaymentReminders className="dashboard-widget" />
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg">
                  <Truck className="h-3.5 w-3.5 text-white" />
                </div>
                <h2 className="text-base font-semibold text-gray-900">Supplier Payments</h2>
              </div>
              <SupplierPaymentReminders className="dashboard-widget" />
            </div>
          </div>

          {/* Modern Alerts & Monitoring */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg">
                <AlertTriangle className="h-3.5 w-3.5 text-white" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">Alerts & Monitoring</h2>
            </div>
            <RecentAlerts />
          </div>
        </div>
      </div>
    </Layout>
  );
}
