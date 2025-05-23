import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Purchase } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, Calendar, FileText, DollarSign, Eye } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface SupplierPurchaseHistoryProps {
  supplierId: number;
}

export default function SupplierPurchaseHistory({ supplierId }: SupplierPurchaseHistoryProps) {
  const [, setLocation] = useLocation();

  // Fetch purchase history for this supplier
  const { data: purchases, isLoading } = useQuery<Purchase[]>({
    queryKey: [`/api/vendors/${supplierId}/purchases`],
    enabled: !!supplierId,
  });

  // Format currency
  const formatCurrency = (amount: string | number) => {
    return `₹${parseFloat(amount.toString()).toFixed(2)}`;
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
        ) : !purchases || purchases.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border border-dashed rounded-md">
            No purchase history found for this supplier.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-800">
                  <TableHead className="font-medium">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      Bill No
                    </div>
                  </TableHead>
                  <TableHead className="font-medium">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      Date
                    </div>
                  </TableHead>
                  <TableHead className="font-medium text-right">
                    <div className="flex items-center justify-end">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Amount
                    </div>
                  </TableHead>
                  <TableHead className="font-medium text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell>{purchase.billNo}</TableCell>
                    <TableCell>{formatDate(purchase.purchaseDate)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(purchase.grandTotal)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLocation(`/purchases/${purchase.id}`)}
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="mt-4 flex justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation(`/purchase-history?vendor=${supplierId}`)}
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
