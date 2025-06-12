import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

// Define interfaces for the data we expect
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
  status: string;
  purchaseCreatedAt: string;
  supplierId: number;
  supplierName: string;
  supplierContactName: string;
  supplierEmail: string;
  supplierPhone: string;
  supplierAddress: string;
  itemId: number;
  productName?: string;
  itemName?: string;
  quantity: number;
  price: number;
  unit: string;
  gstPercentage: number;
  gstAmount: number;
  totalAmount: number;
  receiptImage?: string;
}

// Interface for grouped purchases by purchase ID
interface PurchaseBill {
  purchaseId: number;
  date: string;
  billNo: string;
  totalAmount: number;
  status: string;
  items: PurchaseHistoryItem[];
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Eye, ChevronDown, ChevronRight, Package, FileText, Calendar, CreditCard, AlertCircle } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SupplierPurchaseHistoryProps {
  supplierId: number;
  onPaymentClick?: (billAmount: number, billNo: string) => void;
}

export default function SupplierPurchaseHistoryBillView({ supplierId, onPaymentClick }: SupplierPurchaseHistoryProps) {
  const [, setLocation] = useLocation();
  const [expandedBills, setExpandedBills] = useState<number[]>([]);

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



  // Group purchases by bill (purchase ID) and determine payment status
  const purchaseBills = useMemo(() => {
    if (!purchaseItems || purchaseItems.length === 0) return [];

    // Group by purchase ID
    const billMap = new Map<number, PurchaseBill>();

    purchaseItems.forEach(item => {
      if (!billMap.has(item.purchaseId)) {
        billMap.set(item.purchaseId, {
          purchaseId: item.purchaseId,
          date: item.purchase_date,
          billNo: item.billNo || `Bill #${item.purchaseId}`,
          totalAmount: 0,
          status: 'unpaid', // Will be determined later
          items: []
        });
      }

      const bill = billMap.get(item.purchaseId)!;
      bill.items.push(item);
      bill.totalAmount += item.totalAmount;
    });

    // Convert to array and sort by date (newest first)
    const bills = Array.from(billMap.values()).sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    console.log('Final bills:', bills);
    return bills;
  }, [purchaseItems]);

  // Toggle bill expansion
  const toggleBill = (purchaseId: number) => {
    setExpandedBills(prev =>
      prev.includes(purchaseId)
        ? prev.filter(id => id !== purchaseId)
        : [...prev, purchaseId]
    );
  };

  // Calculate total amount for all purchases
  const totalPurchaseAmount = useMemo(() => {
    return purchaseBills.reduce((sum, bill) => sum + bill.totalAmount, 0);
  }, [purchaseBills]);

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center">
            <ShoppingCart className="h-5 w-5 mr-2 text-blue-600" />
            Purchase History
          </div>
          <div className="text-sm font-normal text-gray-500">
            Total: {formatCurrency(totalPurchaseAmount)}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !purchaseBills || purchaseBills.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border border-dashed rounded-md">
            No purchase history found for this supplier.
          </div>
        ) : (
          <div className="space-y-4">
            {purchaseBills.map((bill) => (
              <Collapsible
                key={bill.purchaseId}
                open={expandedBills.includes(bill.purchaseId)}
                onOpenChange={() => toggleBill(bill.purchaseId)}
                className="border rounded-md overflow-hidden"
              >
                <div className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
                     onClick={() => toggleBill(bill.purchaseId)}>
                  <div className="flex items-center space-x-4">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                        {expandedBills.includes(bill.purchaseId) ?
                          <ChevronDown className="h-4 w-4" /> :
                          <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                    <div>
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-blue-600" />
                        <span className="font-medium">{bill.billNo}</span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        <Calendar className="h-3 w-3 inline-block mr-1" />
                        {formatDate(bill.date)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(bill.totalAmount)}</div>
                    <div className="text-sm text-gray-500">{bill.items.length} item{bill.items.length !== 1 ? 's' : ''}</div>
                    <div className="mt-2">
                      <Badge variant="outline" className="text-gray-600 border-gray-200 bg-gray-50">
                        📄 Purchase Record
                      </Badge>
                    </div>
                  </div>
                </div>

                <CollapsibleContent>
                  <div className="p-4 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="col-span-2">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2">Product</th>
                              <th className="text-right py-2">Quantity</th>
                              <th className="text-right py-2">Price</th>
                              <th className="text-right py-2">GST</th>
                              <th className="text-right py-2">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bill.items.map((item, index) => (
                              <tr key={index} className="border-b">
                                <td className="py-2 flex items-center">
                                  <Package className="h-3 w-3 mr-2 text-gray-400" />
                                  {item.productName || item.itemName || "Unknown Product"}
                                </td>
                                <td className="text-right py-2">{item.quantity} {item.unit}</td>
                                <td className="text-right py-2">{formatCurrency(item.price)}</td>
                                <td className="text-right py-2">
                                  <Badge variant="outline" className="font-normal">
                                    {item.gstPercentage}% = {formatCurrency(item.gstAmount)}
                                  </Badge>
                                </td>
                                <td className="text-right py-2">{formatCurrency(item.totalAmount)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="font-medium">
                              <td colSpan={4} className="text-right py-2">Total:</td>
                              <td className="text-right py-2">{formatCurrency(bill.totalAmount)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* Receipt Image */}
                      {bill.items[0]?.receiptImage && (
                        <div className="border rounded-md overflow-hidden">
                          <div className="bg-gray-50 p-2 font-medium">Receipt</div>
                          <div className="p-2">
                            <a
                              href={`/api/uploads/receipts/${bill.items[0].receiptImage}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <img
                                src={`/api/uploads/receipts/${bill.items[0].receiptImage}`}
                                alt="Receipt"
                                className="max-w-full h-auto max-h-48 object-contain mx-auto"
                              />
                              <div className="text-center mt-2 text-sm text-blue-600">
                                Click to view full size
                              </div>
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
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
