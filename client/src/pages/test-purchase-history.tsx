import { useState, useEffect } from "react";
import Layout from "@/components/layout/layout";
import PageHeader from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatCurrency } from "@/lib/utils";

// Define interfaces for the data we expect
interface PurchaseHistoryItem {
  purchaseId: number;
  purchase_date: string;
  supplier_id: number;
  billNo: string;
  supplierName: string;
  productName: string;
  quantity: number;
  price: number;
  unit: string;
  gstPercentage: number;
  gstAmount: number;
  totalAmount: number;
}

interface SupplierPurchase {
  id: number;
  supplierId: number;
  supplierName: string;
  purchaseDate: string;
  billNo: string;
  items: PurchaseHistoryItem[];
}

export default function TestPurchaseHistoryPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allPurchases, setAllPurchases] = useState<PurchaseHistoryItem[]>([]);
  const [supplierPurchases, setSupplierPurchases] = useState<Record<number, PurchaseHistoryItem[]>>({});
  const [groupedPurchases, setGroupedPurchases] = useState<SupplierPurchase[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<number | null>(null);

  // Fetch all purchase history
  useEffect(() => {
    const fetchPurchaseHistory = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch all purchase history
        console.log("Fetching all purchase history");
        const response = await fetch("/api/purchase-history", {
          credentials: "include",
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch purchase history: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Purchase history data:", data);
        setAllPurchases(data);
        
        // Group purchases by supplier
        const groupedBySupplier: Record<number, PurchaseHistoryItem[]> = {};
        data.forEach((item: PurchaseHistoryItem) => {
          if (!groupedBySupplier[item.supplier_id]) {
            groupedBySupplier[item.supplier_id] = [];
          }
          groupedBySupplier[item.supplier_id].push(item);
        });
        setSupplierPurchases(groupedBySupplier);
        
        // Create a list of purchases grouped by supplier and purchase ID
        const purchaseGroups: Record<string, SupplierPurchase> = {};
        data.forEach((item: PurchaseHistoryItem) => {
          const key = `${item.supplier_id}-${item.purchaseId}`;
          if (!purchaseGroups[key]) {
            purchaseGroups[key] = {
              id: item.purchaseId,
              supplierId: item.supplier_id,
              supplierName: item.supplierName || "Unknown Supplier",
              purchaseDate: item.purchase_date,
              billNo: item.billNo || "",
              items: []
            };
          }
          purchaseGroups[key].items.push(item);
        });
        
        setGroupedPurchases(Object.values(purchaseGroups));
      } catch (err) {
        console.error("Error fetching purchase history:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPurchaseHistory();
  }, []);

  // Calculate total amount for a purchase
  const calculateTotal = (items: PurchaseHistoryItem[]): number => {
    return items.reduce((sum, item) => sum + Number(item.totalAmount), 0);
  };

  return (
    <Layout>
      <PageHeader
        title="Test Purchase History"
        description="Debugging page for purchase history"
      >
        <Button variant="outline" onClick={() => window.location.reload()}>
          Refresh Data
        </Button>
      </PageHeader>

      {error && (
        <Card className="mb-6 border-red-500">
          <CardContent className="p-4 text-red-500">
            <h3 className="font-bold">Error:</h3>
            <p>{error}</p>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Raw Data</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <pre className="text-xs overflow-auto max-h-40 p-2 bg-gray-100 rounded">
              {JSON.stringify(allPurchases, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Purchases by Supplier</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : groupedPurchases.length === 0 ? (
            <p className="text-center py-4 text-gray-500">No purchase history found</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(supplierPurchases).map(([supplierId, purchases]) => (
                <Card key={supplierId} className="overflow-hidden">
                  <CardHeader className="p-4 bg-gray-50">
                    <CardTitle className="text-lg flex justify-between">
                      <span>{purchases[0]?.supplierName || `Supplier ID: ${supplierId}`}</span>
                      <span className="text-sm text-gray-500">
                        {purchases.length} purchase(s)
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Button 
                      variant="link" 
                      onClick={() => setSelectedSupplier(selectedSupplier === Number(supplierId) ? null : Number(supplierId))}
                      className="w-full p-2"
                    >
                      {selectedSupplier === Number(supplierId) ? "Hide Details" : "Show Details"}
                    </Button>
                    
                    {selectedSupplier === Number(supplierId) && (
                      <div className="p-4 border-t">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2">Bill No</th>
                              <th className="text-left p-2">Date</th>
                              <th className="text-left p-2">Product</th>
                              <th className="text-right p-2">Quantity</th>
                              <th className="text-right p-2">Price</th>
                              <th className="text-right p-2">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {purchases.map((purchase, index) => (
                              <tr key={`${purchase.purchaseId}-${index}`} className="border-b">
                                <td className="p-2">{purchase.billNo}</td>
                                <td className="p-2">{formatDate(purchase.purchase_date)}</td>
                                <td className="p-2">{purchase.productName}</td>
                                <td className="text-right p-2">{purchase.quantity} {purchase.unit}</td>
                                <td className="text-right p-2">{formatCurrency(purchase.price)}</td>
                                <td className="text-right p-2">{formatCurrency(purchase.totalAmount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}
