import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { AlertCircle, Clock, CreditCard, DollarSign, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import SupplierPaymentModal from '@/components/suppliers/supplier-payment-modal';

interface Vendor {
  id: number;
  name: string;
  moneyOwed: string | number;
  lastPurchaseDate?: string;
  paymentDueDate?: string;
}

interface SupplierPaymentRemindersProps {
  className?: string;
}

export default function SupplierPaymentReminders({ className }: SupplierPaymentRemindersProps) {
  const [, navigate] = useLocation();

  // Fetch all vendors
  const { data: vendors, isLoading } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors'],
    queryFn: async () => {
      const response = await fetch('/api/vendors', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch vendors');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchIntervalInBackground: true,
  });

  // Filter vendors we owe money to
  const vendorsWeOweMoney = vendors?.filter(
    vendor => Number(vendor.balanceDue) > 0
  ) || [];

  // Sort by balance due (highest first)
  const sortedVendorsWeOweMoney = [...vendorsWeOweMoney].sort(
    (a, b) => Number(b.balanceDue) - Number(a.balanceDue)
  );

  // Calculate days overdue
  const calculateDaysOverdue = (dueDate?: string) => {
    if (!dueDate) return 0;

    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get status badge variant based on days overdue
  const getStatusBadge = (dueDate?: string) => {
    if (!dueDate) return null;

    const daysOverdue = calculateDaysOverdue(dueDate);

    if (daysOverdue > 0) {
      return (
        <Badge variant="destructive" className="ml-2">
          <AlertCircle className="h-3 w-3 mr-1" />
          {daysOverdue} days overdue
        </Badge>
      );
    } else if (daysOverdue > -7) {
      return (
        <Badge variant="warning" className="ml-2 bg-yellow-500">
          <Clock className="h-3 w-3 mr-1" />
          Due soon
        </Badge>
      );
    }

    return null;
  };

  return (
    <div className={cn("", className)}>
      {!className ? (
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : sortedVendorsWeOweMoney.length === 0 ? (
              <div className="p-6 text-center">
                <DollarSign className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500">No pending payments</p>
                <p className="text-sm text-gray-400">All supplier payments are up to date</p>
              </div>
            ) : (
              <div className="divide-y">
                {sortedVendorsWeOweMoney.slice(0, 5).map((vendor) => (
                  <div key={vendor.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {vendor.name}
                          {getStatusBadge(vendor.paymentDueDate)}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Last purchase: {vendor.lastPurchaseDate ? new Date(vendor.lastPurchaseDate).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-orange-600">{formatCurrency(Number(vendor.balanceDue))}</p>
                      </div>
                    </div>
                    <div className="flex justify-end mt-2 space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/suppliers/${vendor.id}`);
                        }}
                      >
                        View Supplier
                      </Button>
                      <SupplierPaymentModal
                        supplierId={vendor.id.toString()}
                        supplierName={vendor.name}
                        preselectedAmount={vendor.balanceDue?.toString()}
                        onSuccess={() => {
                          // Refresh the data
                          window.location.reload();
                        }}
                      >
                        <Button
                          variant="default"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          <CreditCard className="h-3 w-3 mr-1" />
                          Record Payment
                        </Button>
                      </SupplierPaymentModal>
                    </div>
                  </div>
                ))}

                {sortedVendorsWeOweMoney.length > 5 && (
                  <div className="p-3 text-center">
                    <Button
                      variant="link"
                      onClick={() => navigate('/suppliers')}
                      className="text-primary"
                    >
                      View all {sortedVendorsWeOweMoney.length} pending payments
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        // When className is provided, render without the Card wrapper
        isLoading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : sortedVendorsWeOweMoney.length === 0 ? (
          <div className="p-6 text-center">
            <DollarSign className="h-8 w-8 mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500">No pending payments</p>
            <p className="text-sm text-gray-400">All supplier payments are up to date</p>
          </div>
        ) : (
          <div className="divide-y">
            {sortedVendorsWeOweMoney.slice(0, 5).map((vendor) => (
              <div key={vendor.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {vendor.name}
                      {getStatusBadge(vendor.paymentDueDate)}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Last purchase: {vendor.lastPurchaseDate ? new Date(vendor.lastPurchaseDate).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-orange-600">{formatCurrency(Number(vendor.balanceDue))}</p>
                  </div>
                </div>
                <div className="flex justify-end mt-2 space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/suppliers/${vendor.id}`);
                    }}
                  >
                    View Supplier
                  </Button>
                  <SupplierPaymentModal
                    supplierId={vendor.id.toString()}
                    supplierName={vendor.name}
                    preselectedAmount={vendor.balanceDue?.toString()}
                    onSuccess={() => {
                      // Refresh the data
                      window.location.reload();
                    }}
                  >
                    <Button
                      variant="default"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <CreditCard className="h-3 w-3 mr-1" />
                      Record Payment
                    </Button>
                  </SupplierPaymentModal>
                </div>
              </div>
            ))}

            {sortedVendorsWeOweMoney.length > 5 && (
              <div className="p-3 text-center">
                <Button
                  variant="link"
                  onClick={() => navigate('/suppliers')}
                  className="text-primary"
                >
                  View all {sortedVendorsWeOweMoney.length} pending payments
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
