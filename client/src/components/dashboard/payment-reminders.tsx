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
import { Distribution } from '@/hooks/use-distributions';
import { Caterer } from '@/hooks/use-caterers';

interface PaymentRemindersProps {
  className?: string;
}

export default function PaymentReminders({ className }: PaymentRemindersProps) {
  const [, navigate] = useLocation();

  // Fetch all distributions (caterer bills)
  const { data: distributions, isLoading: distributionsLoading } = useQuery<Distribution[]>({
    queryKey: ['distributions'],
    queryFn: async () => {
      const response = await fetch('/api/distributions', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch distributions');
      }
      return response.json();
    },
  });

  // Fetch all caterers
  const { data: caterers, isLoading: caterersLoading } = useQuery<Caterer[]>({
    queryKey: ['caterers'],
    queryFn: async () => {
      const response = await fetch('/api/caterers', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch caterers');
      }
      return response.json();
    },
  });

  // Get caterer name by ID
  const getCatererName = (catererId: number) => {
    const caterer = caterers?.find(c => c.id === catererId);
    return caterer ? caterer.name : 'Unknown Caterer';
  };

  // Filter distributions with pending balances
  const pendingDistributions = distributions?.filter(
    dist => Number(dist.balanceDue) > 0
  ) || [];

  // Sort by balance due (highest first)
  const sortedPendingDistributions = [...pendingDistributions].sort(
    (a, b) => Number(b.balanceDue) - Number(a.balanceDue)
  );

  // Calculate days overdue
  const calculateDaysOverdue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get status badge variant based on days overdue
  const getStatusBadge = (dueDate: string) => {
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
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-lg flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
              Payment Reminders
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {distributionsLoading || caterersLoading ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : sortedPendingDistributions.length === 0 ? (
              <div className="p-6 text-center">
                <DollarSign className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500">No pending payments</p>
                <p className="text-sm text-gray-400">All caterers are up to date with their payments</p>
              </div>
            ) : (
              <div className="divide-y">
                {sortedPendingDistributions.slice(0, 5).map((distribution) => (
                  <div key={distribution.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {getCatererName(distribution.catererId)}
                          {getStatusBadge(distribution.dueDate || distribution.distributionDate)}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Bill #{distribution.billNo} • {new Date(distribution.distributionDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-red-600">{formatCurrency(Number(distribution.balanceDue))}</p>
                        <p className="text-xs text-gray-500">
                          of {formatCurrency(Number(distribution.grandTotal))}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end mt-2 space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/distributions/${distribution.id}`);
                        }}
                      >
                        View Bill
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/distributions/${distribution.id}/payment`);
                        }}
                      >
                        <CreditCard className="h-3 w-3 mr-1" />
                        Record Payment
                      </Button>
                    </div>
                  </div>
                ))}

                {sortedPendingDistributions.length > 5 && (
                  <div className="p-3 text-center">
                    <Button
                      variant="link"
                      onClick={() => navigate('/distributions')}
                      className="text-primary"
                    >
                      View all {sortedPendingDistributions.length} pending payments
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
        distributionsLoading || caterersLoading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : sortedPendingDistributions.length === 0 ? (
          <div className="p-6 text-center">
            <DollarSign className="h-8 w-8 mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500">No pending payments</p>
            <p className="text-sm text-gray-400">All caterers are up to date with their payments</p>
          </div>
        ) : (
          <div className="divide-y">
            {sortedPendingDistributions.slice(0, 5).map((distribution) => (
              <div key={distribution.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {getCatererName(distribution.catererId)}
                      {getStatusBadge(distribution.dueDate || distribution.distributionDate)}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Bill #{distribution.billNo} • {new Date(distribution.distributionDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-red-600">{formatCurrency(Number(distribution.balanceDue))}</p>
                    <p className="text-xs text-gray-500">
                      of {formatCurrency(Number(distribution.grandTotal))}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end mt-2 space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/distributions/${distribution.id}`);
                    }}
                  >
                    View Bill
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/distributions/${distribution.id}/payment`);
                    }}
                  >
                    <CreditCard className="h-3 w-3 mr-1" />
                    Record Payment
                  </Button>
                </div>
              </div>
            ))}

            {sortedPendingDistributions.length > 5 && (
              <div className="p-3 text-center">
                <Button
                  variant="link"
                  onClick={() => navigate('/distributions')}
                  className="text-primary"
                >
                  View all {sortedPendingDistributions.length} pending payments
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
