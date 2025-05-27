import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, ChevronDown, ChevronRight, Calendar, CreditCard } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

// Define a custom interface for payment history items
interface PaymentHistoryItem {
  id: number;
  supplierId: number;
  invoiceId?: number;
  amount: string;
  transactionDate: string;
  type: string;
  notes?: string;
}

interface SupplierPaymentHistoryProps {
  supplierId: number;
}

export default function SupplierPaymentHistory({ supplierId }: SupplierPaymentHistoryProps) {
  const [, setLocation] = useLocation();
  const [openPaymentId, setOpenPaymentId] = useState<number | null>(null);

  // Toggle payment details
  const togglePayment = (paymentId: number) => {
    setOpenPaymentId(openPaymentId === paymentId ? null : paymentId);
  };

  // Fetch payment history for this supplier
  const { data: payments, isLoading } = useQuery<PaymentHistoryItem[]>({
    queryKey: [`/api/vendors/${supplierId}/payments`],
    queryFn: async () => {
      console.log(`Fetching payment history for supplier ID: ${supplierId}`);
      const response = await fetch(`/api/vendors/${supplierId}/payments`, {
        credentials: "include",
      });
      if (!response.ok) {
        console.error(`Failed to fetch payment history: ${response.status}`);
        throw new Error(`Failed to fetch payment history: ${response.status}`);
      }
      const data = await response.json();
      console.log("Payment history data:", data);
      return data;
    },
    enabled: !!supplierId,
  });

  // Calculate total payment amount
  const totalPaymentAmount = payments?.reduce((total, payment) => {
    return total + parseFloat(payment.amount);
  }, 0) || 0;

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-green-600" />
            Payment History
          </div>
          <div className="text-sm font-normal text-gray-500">
            Total Paid: {formatCurrency(totalPaymentAmount)}
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
        ) : !payments || payments.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border border-dashed rounded-md">
            No payment history found for this supplier.
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <Collapsible
                key={payment.id}
                open={openPaymentId === payment.id}
                onOpenChange={() => togglePayment(payment.id)}
                className="border rounded-md overflow-hidden"
              >
                <div className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
                     onClick={() => togglePayment(payment.id)}>
                  <div className="flex items-center space-x-4">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                        {openPaymentId === payment.id ?
                          <ChevronDown className="h-4 w-4" /> :
                          <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                    <div>
                      <div className="font-medium flex items-center">
                        <CreditCard className="h-4 w-4 mr-2 text-green-600" />
                        Payment #{payment.id}
                        {payment.type && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {payment.type}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(payment.transactionDate)}
                      </div>
                    </div>
                  </div>
                  <div className="font-medium text-right text-green-600">
                    {formatCurrency(parseFloat(payment.amount))}
                  </div>
                </div>
                <CollapsibleContent>
                  <div className="p-4 bg-white border-t">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-1">Payment Details</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Amount:</span>
                            <span className="text-sm font-medium">{formatCurrency(parseFloat(payment.amount))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Date:</span>
                            <span className="text-sm">{formatDate(payment.transactionDate)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Type:</span>
                            <span className="text-sm">{payment.type}</span>
                          </div>
                          {payment.invoiceId && (
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">Invoice ID:</span>
                              <span className="text-sm">{payment.invoiceId}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {payment.notes && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 mb-1">Notes</h4>
                          <p className="text-sm text-gray-700">{payment.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
