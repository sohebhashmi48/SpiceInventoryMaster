import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, CreditCard, Calendar, Search, FileText, Receipt } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useCatererPaymentsByCaterer } from '@/hooks/use-caterer-payments';

interface CatererPaymentHistoryProps {
  catererId: number;
}

export default function CatererPaymentHistory({ catererId }: CatererPaymentHistoryProps) {
  const [openPaymentId, setOpenPaymentId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Toggle payment details
  const togglePayment = (paymentId: number) => {
    setOpenPaymentId(openPaymentId === paymentId ? null : paymentId);
  };

  // Fetch payment history for this caterer
  const { data: payments, isLoading } = useCatererPaymentsByCaterer(catererId);

  // Filter payments based on search term
  const filteredPayments = payments?.filter(payment =>
    payment.paymentMode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.referenceNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.amount.toString().includes(searchTerm)
  ) || [];

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-lg flex items-center">
              <CreditCard className="h-5 w-5 mr-2 text-green-600" />
              Payment History
            </CardTitle>
            <CardDescription>
              All payments received from this caterer
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Search payments..."
                className="pl-8 w-full md:w-[250px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !filteredPayments || filteredPayments.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border border-dashed rounded-md">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Payment History</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? 'No payments found matching your search.' : 'This caterer hasn\'t made any payments yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPayments.map((payment) => (
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
                        <Badge variant="outline" className="ml-2 text-xs">
                          {payment.paymentMode}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(payment.paymentDate)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">
                      {formatCurrency(parseFloat(payment.amount))}
                    </div>
                    {payment.distributionId && (
                      <div className="text-xs text-gray-500">
                        Bill #{payment.distributionId}
                      </div>
                    )}
                  </div>
                </div>

                <CollapsibleContent>
                  <div className="p-4 bg-white border-t">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center">
                          <Receipt className="h-4 w-4 mr-2" />
                          Payment Details
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Amount:</span>
                            <span className="font-medium">{formatCurrency(parseFloat(payment.amount))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Payment Mode:</span>
                            <span className="font-medium">{payment.paymentMode}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Payment Date:</span>
                            <span className="font-medium">{formatDate(payment.paymentDate)}</span>
                          </div>
                          {payment.referenceNo && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Reference No:</span>
                              <span className="font-medium">{payment.referenceNo}</span>
                            </div>
                          )}
                          {payment.distributionId && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Related Bill:</span>
                              <span className="font-medium">#{payment.distributionId}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {payment.notes && (
                        <div>
                          <h4 className="font-semibold mb-2">Notes</h4>
                          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                            {payment.notes}
                          </p>
                        </div>
                      )}
                      
                      {payment.receiptImage && (
                        <div className="md:col-span-2">
                          <h4 className="font-semibold mb-2">Receipt Image</h4>
                          <img 
                            src={payment.receiptImage} 
                            alt="Payment Receipt" 
                            className="max-w-xs rounded border shadow-sm"
                          />
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
