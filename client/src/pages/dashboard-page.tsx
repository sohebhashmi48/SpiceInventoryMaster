import { useEffect } from "react";
import Layout from "@/components/layout/layout";
import PageHeader from "@/components/common/page-header";
import StatCard from "@/components/dashboard/stats-card";
import SalesChart from "@/components/dashboard/sales-chart";
import PieChart from "@/components/dashboard/pie-chart";
import RecentAlerts from "@/components/dashboard/recent-alerts";
import RecentActivity from "@/components/dashboard/recent-activity";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { File, Plus, DollarSign, ArrowRight, Package, ShoppingCart, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  totalValue: number;
  activeSpices: number;
  pendingInvoices: number;
  lowStockAlerts: number;
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });
  
  return (
    <Layout>
      <PageHeader
        title="Dashboard"
        description="Overview of your inventory and business metrics"
      >
        <Button variant="outline" className="hidden sm:flex items-center">
          <File className="h-4 w-4 mr-2" />
          Export
        </Button>
        <Button className="bg-secondary hover:bg-secondary-dark text-white">
          <Plus className="h-4 w-4 mr-2" />
          New Entry
        </Button>
      </PageHeader>
      
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statsLoading ? (
          <>
            <Skeleton className="h-[120px] rounded-lg" />
            <Skeleton className="h-[120px] rounded-lg" />
            <Skeleton className="h-[120px] rounded-lg" />
            <Skeleton className="h-[120px] rounded-lg" />
          </>
        ) : (
          <>
            <StatCard
              title="Total Inventory Value"
              value={`$${stats?.totalValue.toFixed(2) || "0.00"}`}
              icon={<DollarSign className="h-5 w-5" />}
              changeValue={8.2}
              changeLabel="vs last month"
            />
            
            <StatCard
              title="Active Spice Types"
              value={stats?.activeSpices || 0}
              icon={<Package className="h-5 w-5" />}
              changeValue={3.1}
              changeLabel="vs last month"
            />
            
            <StatCard
              title="Pending Orders"
              value={stats?.pendingInvoices || 0}
              icon={<ShoppingCart className="h-5 w-5" />}
              changeValue={-4.5}
              changeLabel="vs last month"
            />
            
            <StatCard
              title="Low Stock Alerts"
              value={stats?.lowStockAlerts || 0}
              icon={<AlertTriangle className="h-5 w-5" />}
              changeLabel="Attention Needed"
            />
          </>
        )}
      </div>
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <SalesChart className="lg:col-span-2" />
        <PieChart />
      </div>
      
      {/* Alerts and Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentAlerts />
        <RecentActivity isLoading={false} />
      </div>
    </Layout>
  );
}
