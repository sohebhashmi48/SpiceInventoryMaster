import { useState } from "react";
import Layout from "@/components/layout/layout";
import PageHeader from "@/components/common/page-header";
import SpicesTable from "@/components/inventory/spices-table";
import SpicesGrid from "@/components/inventory/spices-grid";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Grid,
  List,
  Tag,
  Package,
  Settings,
  Plus,
  Printer
} from "lucide-react";
import CategoryManager from "@/components/inventory/category-manager";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { queryClient } from "@/lib/queryClient";
import AddSpiceForm from "@/components/inventory/add-spice-form";
import CataloguePrintDialog from "@/components/catalogue/catalogue-print-dialog";

export default function SpicesPage() {
  const [activeTab, setActiveTab] = useState("list");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCatalogueDialogOpen, setIsCatalogueDialogOpen] = useState(false);

  return (
    <Layout>
      <PageHeader
        title="Product Management"
        description="Manage your product catalog and categories"
      >
        <div className="flex gap-2">
          <Button
            onClick={() => setIsCatalogueDialogOpen(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Print Catalogue
          </Button>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-secondary hover:bg-secondary-dark text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="list" className="flex items-center">
            <List className="h-4 w-4 mr-2" />
            Product List
          </TabsTrigger>
          <TabsTrigger value="grid" className="flex items-center">
            <Grid className="h-4 w-4 mr-2" />
            Grid View
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center">
            <Tag className="h-4 w-4 mr-2" />
            Categories
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          <SpicesTable />
        </TabsContent>

        <TabsContent value="grid" className="mt-6">
          <SpicesGrid />
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <CategoryManager />
        </TabsContent>
      </Tabs>

      {/* Add Product Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 bg-white">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold">Add New Product</DialogTitle>
            <DialogDescription className="text-gray-500">
              Add a new product to your catalog with details and pricing information.
            </DialogDescription>
          </DialogHeader>
          <AddSpiceForm
            onSuccess={() => {
              setIsAddDialogOpen(false);
              // Refresh the data without full page reload
              queryClient.invalidateQueries({ queryKey: ["/api/products"] });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Catalogue Print Dialog */}
      <CataloguePrintDialog
        open={isCatalogueDialogOpen}
        onOpenChange={setIsCatalogueDialogOpen}
      />
    </Layout>
  );
}