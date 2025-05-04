import { useState } from "react";
import Layout from "@/components/layout/layout";
import PageHeader from "@/components/common/page-header";
import SpicesTable from "@/components/inventory/spices-table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Grid, 
  List, 
  Tag,
  Package, 
  Settings
} from "lucide-react";
import CategoryManager from "@/components/inventory/category-manager";

export default function SpicesPage() {
  const [activeTab, setActiveTab] = useState("list");
  
  return (
    <Layout>
      <PageHeader
        title="Spice Management"
        description="Manage your spice catalog and categories"
      />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="list" className="flex items-center">
            <List className="h-4 w-4 mr-2" />
            Spice List
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center">
            <Tag className="h-4 w-4 mr-2" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="grid" className="flex items-center">
            <Grid className="h-4 w-4 mr-2" />
            Grid View
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="mt-6">
          <SpicesTable />
        </TabsContent>
        
        <TabsContent value="categories" className="mt-6">
          <CategoryManager />
        </TabsContent>
        
        <TabsContent value="grid" className="mt-6">
          <div className="bg-secondary/5 border rounded-md p-6 text-center max-w-md mx-auto">
            <Grid className="h-12 w-12 text-secondary mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Grid View</h3>
            <p className="text-neutral-600 mb-4">
              The grid view for spices is under development and will be available soon.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}