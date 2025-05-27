import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
// Define a custom interface for purchase history items
interface PurchaseHistoryItem {
  purchaseId: number;
  purchase_date: string;
  supplier_id: number;
  billNo: string;
  pageNo: string;
  purchaseTotalAmount: number;
  purchaseTotalGstAmount: number;
  purchaseGrandTotal: number;
  notes: string;
  receiptImage: string | null;
  status: string;
  purchaseCreatedAt: string;
  supplierId: number;
  supplierName: string;
  supplierContactName: string;
  supplierEmail: string;
  supplierPhone: string;
  supplierAddress: string;
  itemId: number;
  productName: string;
  quantity: number;
  price: number;
  unit: string;
  gstPercentage: number;
  gstAmount: number;
  totalAmount: number;
}

// Interface for grouped purchases
interface GroupedPurchase {
  purchaseId: number;
  date: string;
  billNo: string;
  totalAmount: number;
  items: PurchaseHistoryItem[];
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, Eye, ChevronDown, ChevronRight, Package } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SupplierPurchaseHistoryProps {
  supplierId: number;
}

export default function SupplierPurchaseHistory({ supplierId }: SupplierPurchaseHistoryProps) {
  const [, setLocation] = useLocation();
  const [openPurchaseId, setOpenPurchaseId] = useState<number | null>(null);

  // Fetch purchase history for this supplier
  const { data: purchaseItems, isLoading } = useQuery<PurchaseHistoryItem[]>({
    queryKey: [`/api/suppliers/${supplierId}/purchase-history`],
    queryFn: async () => {
      console.log(`Fetching purchase history for supplier ID: ${supplierId}`);
      const response = await fetch(`/api/suppliers/${supplierId}/purchase-history`, {
        credentials: "include",
      });
      if (!response.ok) {
        console.error(`Failed to fetch purchase history: ${response.status}`);
        throw new Error(`Failed to fetch purchase history: ${response.status}`);
      }
      const data = await response.json();
      console.log("Purchase history data:", data);
      return data;
    },
    enabled: !!supplierId,
  });

  // Group purchases by purchase ID
  const groupedPurchases = useMemo(() => {
    if (!purchaseItems || purchaseItems.length === 0) return [];

    const purchaseMap = new Map<number, GroupedPurchase>();

    purchaseItems.forEach(item => {
      if (!purchaseMap.has(item.purchaseId)) {
        purchaseMap.set(item.purchaseId, {
          purchaseId: item.purchaseId,
          date: item.purchase_date,
          billNo: item.billNo || `Purchase #${item.purchaseId}`,
          totalAmount: 0,
          items: []
        });
      }

      const purchase = purchaseMap.get(item.purchaseId)!;
      purchase.items.push(item);
      purchase.totalAmount += Number(item.totalAmount);
    });

    return Array.from(purchaseMap.values()).sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [purchaseItems]);

  // Format currency
  const formatCurrency = (amount: string | number) => {
    return `₹${parseFloat(amount.toString()).toFixed(2)}`;
  };

  const togglePurchase = (purchaseId: number) => {
    setOpenPurchaseId(openPurchaseId === purchaseId ? null : purchaseId);
  };

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center">
          <ShoppingCart className="h-5 w-5 mr-2 text-blue-600" />
          Purchase History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !groupedPurchases || groupedPurchases.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border border-dashed rounded-md">
            No purchase history found for this supplier.
          </div>
        ) : (
          <div className="space-y-4">
            {groupedPurchases.map((purchase) => (
              <Collapsible
                key={purchase.purchaseId}
                open={openPurchaseId === purchase.purchaseId}
                onOpenChange={() => togglePurchase(purchase.purchaseId)}
                className="border rounded-md overflow-hidden"
              >
                <div className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
                     onClick={() => togglePurchase(purchase.purchaseId)}>
                  <div className="flex items-center space-x-4">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                        {openPurchaseId === purchase.purchaseId ?
                          <ChevronDown className="h-4 w-4" /> :
                          <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                    <div>
                      <div className="font-medium">{purchase.billNo}</div>
                      <div className="text-sm text-gray-500">{formatDate(purchase.date)}</div>
                    </div>
                  </div>
                  <div className="font-medium text-right">
                    {formatCurrency(purchase.totalAmount)}
                  </div>
                </div>

                <CollapsibleContent>
                  <div className="p-4 border-t">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Product</th>
                          <th className="text-right py-2">Quantity</th>
                          <th className="text-right py-2">Price</th>
                          <th className="text-right py-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchase.items.map((item, index) => (
                          <tr key={index} className="border-b">
                            <td className="py-2 flex items-center">
                              <Package className="h-3 w-3 mr-2 text-gray-400" />
                              {item.productName || "Unknown Product"}
                            </td>
                            <td className="text-right py-2">{item.quantity} {item.unit}</td>
                            <td className="text-right py-2">{formatCurrency(item.price)}</td>
                            <td className="text-right py-2">{formatCurrency(item.totalAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-medium">
                          <td colSpan={3} className="text-right py-2">Total:</td>
                          <td className="text-right py-2">{formatCurrency(purchase.totalAmount)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}

        <div className="mt-4 flex justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation(`/purchase-history?supplier=${supplierId}`)}
            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 border-blue-200"
          >
            <Eye className="h-4 w-4 mr-1" />
            View All Purchase History
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation(`/supplier-purchase/${supplierId}`)}
            className="text-green-600 hover:text-green-800 hover:bg-green-50 border-green-200"
          >
            <ShoppingCart className="h-4 w-4 mr-1" />
            New Purchase
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
