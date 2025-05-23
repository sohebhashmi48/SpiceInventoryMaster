import { useState } from "react";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Grid, List, Store, History } from "lucide-react";
import SupplierTable from "@/components/suppliers/supplier-table";
import SupplierGrid from "@/components/suppliers/supplier-grid";
import Layout from "@/components/layout/layout";
import PageHeader from "@/components/common/page-header";

export default function SuppliersPage() {
  const [view, setView] = useState<"grid" | "table">("grid");
  const [, setLocation] = useLocation();

  const navigateToPurchaseHistory = () => {
    setLocation("/purchase-history");
  };



  return (
    <Layout>
      <PageHeader
        title="Supplier Management"
        description="Manage your suppliers and track payments"
      >
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={navigateToPurchaseHistory}
            className="mr-2 flex items-center"
          >
            <History className="h-4 w-4 mr-2" />
            Purchase History
          </Button>

          <Button
            variant={view === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setView("grid")}
            className="h-8 w-8"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "table" ? "default" : "outline"}
            size="icon"
            onClick={() => setView("table")}
            className="h-8 w-8"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </PageHeader>

      <Tabs defaultValue="all" className="mb-6">
        <TabsList>
          <TabsTrigger value="all" className="flex items-center">
            <Store className="h-4 w-4 mr-2" />
            All Suppliers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
            {view === "grid" ? <SupplierGrid /> : <SupplierTable />}
          </div>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
