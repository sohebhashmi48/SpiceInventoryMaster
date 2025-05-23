import { useState } from "react";
import Layout from "@/components/layout/layout";
import PageHeader from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, List, ShoppingCart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Purchase } from "@shared/schema";
import { PurchaseEntryForm, PurchasesTable } from "@/components/purchases";

export default function PurchaseEntryPage() {
  const [activeTab, setActiveTab] = useState("entry");

  const { data: purchases, isLoading } = useQuery<Purchase[]>({
    queryKey: ["/api/purchases"],
  });

  return (
    <Layout>
      <PageHeader
        title="Purchase Entry System"
        description="Create and manage purchase entries"
        actions={
          <Button
            onClick={() => setActiveTab("entry")}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Purchase
          </Button>
        }
      />

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="mb-6"
      >
        <TabsList className="bg-blue-100 dark:bg-gray-800 p-1">
          <TabsTrigger
            value="entry"
            className="flex items-center data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Entry Form
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="flex items-center data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            <List className="h-4 w-4 mr-2" />
            Purchase History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entry" className="mt-6">
          <PurchaseEntryForm />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <PurchasesTable purchases={purchases || []} isLoading={isLoading} />
        </TabsContent>
      </Tabs>
    </Layout>
  );
}

