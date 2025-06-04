import { useState } from "react";
import Layout from "@/components/layout/layout";
import PageHeader from "@/components/common/page-header";
import InventoryTable from "@/components/inventory/inventory-table";
import InventoryFilters from "@/components/inventory/inventory-filters";
import InventoryDashboard from "@/components/inventory/inventory-dashboard";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Barcode, Package, PackageCheck, AlertTriangle, Clock, BarChart, History } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Inventory } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import AddInventoryForm from "@/components/inventory/add-inventory-form";

export default function InventoryPage() {
  const [, setLocation] = useLocation();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [filters, setFilters] = useState({
    searchQuery: "",
    productId: null as number | null,
    supplierId: null as number | null,
    status: "all" as 'all' | 'active' | 'expiring' | 'expired',
    minQuantity: null as number | null,
    maxQuantity: null as number | null,
    expiryDateStart: null as Date | null,
    expiryDateEnd: null as Date | null,
  });

  const { data: inventory } = useQuery<Inventory[]>({
    queryKey: ["/api/inventory"],
  });

  const { data: lowStockItems } = useQuery<Inventory[]>({
    queryKey: ["/api/inventory/alerts/low-stock"],
  });

  const { data: expiringItems } = useQuery<Inventory[]>({
    queryKey: ["/api/inventory/alerts/expiring"],
  });

  const isExpiringSoon = (expiryDate: string | Date) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  };

  const isExpired = (expiryDate: string | Date) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    return expiry < today;
  };

  const expiredItems = inventory?.filter(item => isExpired(item.expiryDate));

  return (
    <Layout>
      <PageHeader
        title="Inventory Management"
        description="Track and manage your spice inventory"
      >
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setLocation('/inventory-history')}
            className="flex items-center gap-2"
          >
            <History className="h-4 w-4" />
            View History
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-secondary hover:bg-secondary-dark text-white">
                Add Inventory
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Add New Inventory Item</DialogTitle>
                <DialogDescription>
                  Add a new item to your inventory. Fill in all the required information.
                </DialogDescription>
              </DialogHeader>
              <AddInventoryForm
                onSuccess={() => setIsAddDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="all" className="flex items-center">
            <Package className="h-4 w-4 mr-2" />
            All Items
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center">
            <BarChart className="h-4 w-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="low-stock" className="flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Low Stock
            {lowStockItems && lowStockItems.length > 0 && (
              <span className="ml-2 bg-red-100 text-red-800 text-xs rounded-full px-2 py-0.5">
                {lowStockItems.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="expiring" className="flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            Expiring Soon
            {expiringItems && expiringItems.length > 0 && (
              <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs rounded-full px-2 py-0.5">
                {expiringItems.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="expired" className="flex items-center">
            <PackageCheck className="h-4 w-4 mr-2" />
            Expired
            {expiredItems && expiredItems.length > 0 && (
              <span className="ml-2 bg-neutral-100 text-neutral-800 text-xs rounded-full px-2 py-0.5">
                {expiredItems.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="barcode" className="flex items-center">
            <Barcode className="h-4 w-4 mr-2" />
            Scan Barcode
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <InventoryFilters onFilterChange={setFilters} />
          <div className="mt-6">
            <InventoryTable filters={filters} />
          </div>
        </TabsContent>

        <TabsContent value="dashboard" className="mt-6">
          <InventoryDashboard />
        </TabsContent>

        <TabsContent value="low-stock" className="mt-6">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Low Stock Alert</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>The following items are running low and need to be restocked soon.</p>
                </div>
              </div>
            </div>
          </div>
          <InventoryTable filters={{ ...filters, minQuantity: 0, maxQuantity: 5 }} />
        </TabsContent>

        <TabsContent value="expiring" className="mt-6">
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6 rounded-r-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Expiring Soon</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>These items will expire within the next 30 days.</p>
                </div>
              </div>
            </div>
          </div>
          <InventoryTable filters={{ ...filters, status: 'expiring' }} />
        </TabsContent>

        <TabsContent value="expired" className="mt-6">
          <div className="bg-neutral-50 border-l-4 border-neutral-500 p-4 mb-6 rounded-r-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <PackageCheck className="h-5 w-5 text-neutral-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-neutral-800">Expired Items</h3>
                <div className="mt-2 text-sm text-neutral-700">
                  <p>These items have passed their expiration date and should be disposed of.</p>
                </div>
              </div>
            </div>
          </div>
          <InventoryTable filters={{ ...filters, status: 'expired' }} />
        </TabsContent>

        <TabsContent value="barcode" className="mt-6">
          <div className="bg-primary-light/20 border rounded-md p-6 text-center max-w-md mx-auto">
            <Barcode className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Barcode Scanner</h3>
            <p className="text-neutral-600 mb-4">
              Scan a barcode to quickly find or update inventory items
            </p>
            <Button className="bg-primary hover:bg-primary-dark">
              Start Scanning
            </Button>
          </div>
        </TabsContent>
      </Tabs>

    </Layout>
  );
}
