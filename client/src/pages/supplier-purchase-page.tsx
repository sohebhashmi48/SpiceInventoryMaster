import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Vendor } from "@shared/schema";
import Layout from "@/components/layout/layout";
import PageHeader from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingCart, History } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import SupplierPurchaseForm from "../components/purchases/supplier-purchase-form";

export default function SupplierPurchasePage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/supplier-purchase/:supplierId");
  const supplierId = params?.supplierId;
  const [supplierName, setSupplierName] = useState<string>("");

  // Fetch supplier details
  const { data: supplier, isLoading: supplierLoading } = useQuery<Vendor>({
    queryKey: [`/api/vendors/${supplierId}`],
    enabled: !!supplierId,
  });

  // Update supplier name when data is loaded
  useEffect(() => {
    if (supplier) {
      setSupplierName(supplier.name);
    }
  }, [supplier]);

  return (
    <Layout>
      <div className="space-y-6 stable-form-container">
        <PageHeader
          title={supplierLoading ? "Loading..." : `Purchase from ${supplierName || "Supplier"}`}
          description="Create a new purchase and add items to inventory"
        >
          {supplierLoading && <Skeleton className="h-8 w-64 absolute top-6" />}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setLocation("/suppliers")}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Suppliers
            </Button>

            {supplierId && (
              <Button
                variant="outline"
                onClick={() => setLocation(`/suppliers/${supplierId}?tab=purchases`)}
                className="flex items-center text-blue-600 hover:text-blue-800 hover:bg-blue-50 border-blue-200"
              >
                <History className="h-4 w-4 mr-2" />
                View Purchase History
              </Button>
            )}
          </div>
        </PageHeader>

        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg prevent-layout-shift">
          <div className="p-6">
            <SupplierPurchaseForm supplierId={Number(supplierId)} />
          </div>
        </div>
      </div>
    </Layout>
  );
}
