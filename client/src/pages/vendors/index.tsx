import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Grid, List, Store } from "lucide-react";
import VendorTable from "@/components/vendors/vendor-table";
import VendorGrid from "@/components/vendors/vendor-grid";
import Layout from "@/components/layout/layout";
import PageHeader from "@/components/common/page-header";

export default function VendorsPage() {
  const [view, setView] = useState<"grid" | "table">("grid");

  return (
    <Layout>
      <PageHeader
        title="Vendor Management"
        description="Manage your suppliers and track payments"
      >
        <div className="flex items-center space-x-2">
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
            All Vendors
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
            {view === "grid" ? <VendorGrid /> : <VendorTable />}
          </div>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
