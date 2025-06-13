import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronRight, 
  Receipt, 
  Calendar, 
  Search, 
  FileText, 
  Package,
  CreditCard,
  IndianRupee,
  Clock
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useCatererDetailedPaymentHistory } from '@/hooks/use-caterer-detailed-payment-history';

interface CatererDetailedPaymentHistoryProps {
  catererId: number;
}

export default function CatererDetailedPaymentHistory({ catererId }: CatererDetailedPaymentHistoryProps) {
  const [openBillId, setOpenBillId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Toggle bill details
  const toggleBill = (billId: number) => {
    setOpenBillId(openBillId === billId ? null : billId);
  };

  // Fetch detailed payment history for this caterer
  const { data: bills, isLoading } = useCatererDetailedPaymentHistory(catererId);

  // Filter bills based on search term
  const filteredBills = bills?.filter(bill =>
    bill.billNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.items?.some(item => 
      item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.productName.toLowerCase().includes(searchTerm.toLowerCase())
    ) ||
    bill.payments?.some(payment =>
      payment.paymentMode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.referenceNo?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  ) || [];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'pending':
      case 'active': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-lg flex items-center">
              <Receipt className="h-5 w-5 mr-2 text-blue-600" />
              Detailed Payment History
            </CardTitle>
            <CardDescription>
              Complete purchase and payment history with bill details
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Search bills, items, payments..."
                className="pl-8 w-full md:w-[300px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : !filteredBills || filteredBills.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border border-dashed rounded-md">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Purchase History</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? 'No bills found matching your search.' : 'This caterer hasn\'t made any purchases yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBills.map((bill) => (
              <Collapsible
                key={bill.id}
                open={openBillId === bill.id}
                onOpenChange={() => toggleBill(bill.id)}
                className="border rounded-lg overflow-hidden shadow-sm"
              >
                <div 
                  className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleBill(bill.id)}
                >
                  <div className="flex items-center space-x-4">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                        {openBillId === bill.id ?
                          <ChevronDown className="h-4 w-4" /> :
                          <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                    <div>
                      <div className="font-medium flex items-center">
                        <Receipt className="h-4 w-4 mr-2 text-blue-600" />
                        Bill #{bill.billNo}
                        <Badge className={`ml-2 text-xs ${getStatusColor(bill.status)}`}>
                          {bill.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(bill.distributionDate)}
                        <span className="mx-2">•</span>
                        <Package className="h-3 w-3 mr-1" />
                        {bill.items?.length || 0} items
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">
                      {formatCurrency(parseFloat(bill.grandTotal))}
                    </div>
                    <div className="text-sm text-gray-500">
                      Paid: {formatCurrency(parseFloat(bill.amountPaid))}
                    </div>
                    {parseFloat(bill.balanceDue) > 0 && (
                      <div className="text-sm text-red-600 font-medium">
                        Due: {formatCurrency(parseFloat(bill.balanceDue))}
                      </div>
                    )}
                  </div>
                </div>

                <CollapsibleContent>
                  <div className="p-4 bg-white border-t">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Bill Items */}
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center">
                          <Package className="h-4 w-4 mr-2 text-blue-600" />
                          Items Purchased ({bill.items?.length || 0})
                        </h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {bill.items?.map((item, index) => (
                            <div key={index} className="bg-gray-50 p-3 rounded-md">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{item.itemName}</p>
                                  <p className="text-xs text-gray-600">{item.productName}</p>
                                  <p className="text-xs text-gray-500">
                                    {item.quantity} {item.unit} × {formatCurrency(parseFloat(item.rate))}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium text-sm">
                                    {formatCurrency(parseFloat(item.amount))}
                                  </p>
                                  {parseFloat(item.gstAmount) > 0 && (
                                    <p className="text-xs text-gray-500">
                                      +GST {formatCurrency(parseFloat(item.gstAmount))}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Payment History */}
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center">
                          <CreditCard className="h-4 w-4 mr-2 text-green-600" />
                          Payment History ({bill.payments?.length || 0})
                        </h4>
                        {bill.payments && bill.payments.length > 0 ? (
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {bill.payments
                              .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
                              .map((payment) => (
                              <div key={payment.id} className="bg-green-50 p-3 rounded-md">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="flex items-center">
                                      <IndianRupee className="h-3 w-3 mr-1 text-green-600" />
                                      <span className="font-medium text-sm text-green-700">
                                        {formatCurrency(parseFloat(payment.amount))}
                                      </span>
                                      <Badge variant="outline" className="ml-2 text-xs">
                                        {payment.paymentMode}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center text-xs text-gray-600 mt-1">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {formatDate(payment.paymentDate)}
                                    </div>
                                    {payment.referenceNo && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        Ref: {payment.referenceNo}
                                      </p>
                                    )}
                                    {payment.notes && (
                                      <p className="text-xs text-gray-600 mt-1 italic">
                                        {payment.notes}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500 border border-dashed rounded-md">
                            <CreditCard className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                            <p className="text-sm">No payments recorded</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bill Summary */}
                    <div className="mt-4 pt-4 border-t bg-gray-50 p-3 rounded-md">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Subtotal:</span>
                          <p className="font-medium">{formatCurrency(parseFloat(bill.totalAmount))}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">GST:</span>
                          <p className="font-medium">{formatCurrency(parseFloat(bill.totalGstAmount))}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Total:</span>
                          <p className="font-bold text-blue-600">{formatCurrency(parseFloat(bill.grandTotal))}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Balance:</span>
                          <p className={`font-bold ${parseFloat(bill.balanceDue) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(parseFloat(bill.balanceDue))}
                          </p>
                        </div>
                      </div>
                      {bill.notes && (
                        <div className="mt-3 pt-3 border-t">
                          <span className="text-gray-600 text-sm">Notes:</span>
                          <p className="text-sm text-gray-700 mt-1">{bill.notes}</p>
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
