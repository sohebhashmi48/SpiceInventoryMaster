import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, ChevronDown, ChevronRight, Calendar, CreditCard, Filter, ChevronLeft } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

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

interface PaymentHistoryResponse {
  data: PaymentHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface SupplierPaymentHistoryProps {
  supplierId: number;
}

export default function SupplierPaymentHistory({ supplierId }: SupplierPaymentHistoryProps) {
  const [, setLocation] = useLocation();
  const [openPaymentId, setOpenPaymentId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const limit = 10;

  // Toggle payment details
  const togglePayment = (paymentId: number) => {
    setOpenPaymentId(openPaymentId === paymentId ? null : paymentId);
  };

  // Reset filters
  const resetFilters = () => {
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  // Build query parameters
  const buildQueryParams = () => {
    const params = new URLSearchParams({
      page: currentPage.toString(),
      limit: limit.toString(),
    });

    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    return params.toString();
  };

  // Fetch payment history for this supplier
  const { data: paymentResponse, isLoading } = useQuery<PaymentHistoryResponse>({
    queryKey: [`/api/vendors/${supplierId}/payments`, currentPage, startDate, endDate],
    queryFn: async () => {
      console.log(`Fetching payment history for supplier ID: ${supplierId}`);
      const queryParams = buildQueryParams();
      const response = await fetch(`/api/vendors/${supplierId}/payments?${queryParams}`, {
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

  // Extract data from response
  const payments = paymentResponse?.data || [];
  const pagination = paymentResponse?.pagination;

  // Calculate total payment amount
  const totalPaymentAmount = payments.reduce((total, payment) => {
    return total + parseFloat(payment.amount);
  }, 0);

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-green-600" />
            Payment History
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
            <div className="text-sm font-normal text-gray-500">
              Total Paid: {formatCurrency(totalPaymentAmount)}
            </div>
          </div>
        </CardTitle>

        {/* Date Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="startDate">From Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="endDate">To Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="mt-1"
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  className="w-full"
                >
                  Reset Filters
                </Button>
              </div>
            </div>
          </div>
        )}
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
            {startDate || endDate ?
              "No payment history found for the selected date range." :
              "No payment history found for this supplier."
            }
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

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>

                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => setCurrentPage(page)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                    className={currentPage === pagination.totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

        {/* Pagination Info */}
        {pagination && (
          <div className="mt-4 text-center text-sm text-gray-500">
            Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, pagination.total)} of {pagination.total} payments
          </div>
        )}
      </CardContent>
    </Card>
  );
}
