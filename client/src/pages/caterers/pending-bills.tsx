import React, { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertTriangle,
  ArrowLeft,
  Search,
  Calendar,
  DollarSign,
  FileText,
  Clock,
  User,
  Phone,
  Mail,
  CreditCard
} from 'lucide-react';
import CatererLayout from '@/components/caterers/caterer-layout';
import PaymentModal from '@/components/caterers/payment-modal';
import { formatCurrency } from '@/lib/utils';
import { format, isAfter, differenceInDays } from 'date-fns';

interface Distribution {
  id: number;
  billNo: string;
  distributionDate: string;
  catererId: number;
  catererName: string;
  grandTotal: string;
  amountPaid: string;
  balanceDue: string;
  status: string;
  dueDate?: string;
}

interface Caterer {
  id: number;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  balanceDue: string;
  pendingAmount: string;
  totalBilled: string;
  totalPaid: string;
}

export default function PendingBillsPage() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch distributions
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

  // Fetch caterers
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

  // Filter caterers with pending amounts (based on distributions with balance due)
  const caterersWithPendingAmounts = useMemo(() => {
    if (!caterers || !distributions) return [];

    // Debug: Log all distributions to see their current status
    console.log('All distributions:', distributions.map(d => ({
      id: d.id,
      billNo: d.billNo,
      balanceDue: d.balanceDue,
      status: d.status,
      amountPaid: d.amountPaid,
      grandTotal: d.grandTotal
    })));

    // Get pending distributions (with balance due > 0 and not paid)
    const pendingDistributions = distributions.filter(dist => {
      const balanceDue = Number(dist.balanceDue || 0);
      const status = dist.status?.toLowerCase();

      // Only include distributions that:
      // 1. Have a balance due > 0
      // 2. Are NOT in 'paid' status
      // 3. Have valid status (partial, pending, active)
      const isPending = balanceDue > 0 &&
                       status !== 'paid' &&
                       (status === 'partial' || status === 'pending' || status === 'active');

      console.log(`Distribution ${dist.billNo}: balanceDue=${balanceDue}, status=${status}, isPending=${isPending}`);
      return isPending;
    });

    console.log('Filtered pending distributions:', pendingDistributions.length);

    // Group by caterer and calculate totals
    const catererGroups = new Map();

    pendingDistributions.forEach(dist => {
      const caterer = caterers.find(c => c.id === dist.catererId);
      if (!caterer) return;

      if (!catererGroups.has(caterer.id)) {
        catererGroups.set(caterer.id, {
          caterer,
          totalPendingAmount: 0,
          bills: []
        });
      }

      const group = catererGroups.get(caterer.id);
      group.totalPendingAmount += Number(dist.balanceDue || 0);
      group.bills.push(dist);
    });

    return Array.from(catererGroups.values())
      .sort((a, b) => b.totalPendingAmount - a.totalPendingAmount);
  }, [caterers, distributions]);

  // Filter by search term
  const filteredCaterersWithPending = useMemo(() => {
    if (!searchTerm) return caterersWithPendingAmounts;

    return caterersWithPendingAmounts.filter(group =>
      group.caterer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.caterer.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.bills.some(bill => bill.billNo.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [caterersWithPendingAmounts, searchTerm]);

  const isLoading = distributionsLoading || caterersLoading;

  const getStatusBadge = (bill: Distribution) => {
    const dueDate = bill.nextPaymentDate || bill.distributionDate;
    const daysOverdue = dueDate ? differenceInDays(new Date(), new Date(dueDate)) : 0;

    if (daysOverdue > 30) {
      return <Badge variant="destructive">Overdue ({daysOverdue}d)</Badge>;
    } else if (daysOverdue > 0) {
      return <Badge variant="secondary">Overdue ({daysOverdue}d)</Badge>;
    } else {
      return <Badge variant="outline">Pending</Badge>;
    }
  };

  const totalPendingAmount = filteredCaterersWithPending.reduce((sum, group) => sum + group.totalPendingAmount, 0);
  const totalOrders = filteredCaterersWithPending.reduce((sum, group) => sum + group.bills.length, 0);

  return (
    <CatererLayout
      title="Pending Bills"
      description="View all caterers with outstanding payment balances"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/caterers')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Caterers
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl shadow-lg">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">Pending Bills</h2>
              <p className="text-slate-600 mt-1">
                Caterers with outstanding payment balances
              </p>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-900">Total Pending Amount</span>
              </div>
              <p className="text-2xl font-bold text-orange-700 mt-1">
                {formatCurrency(totalPendingAmount)}
              </p>
            </div>
            <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium text-red-900">Total Orders</span>
              </div>
              <p className="text-2xl font-bold text-red-700 mt-1">{totalOrders}</p>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Caterers with Pending Bills</span>
              </div>
              <p className="text-2xl font-bold text-blue-700 mt-1">{filteredCaterersWithPending.length}</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search caterers or bill numbers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Pending Bills List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredCaterersWithPending.length > 0 ? (
            filteredCaterersWithPending.map((group) => (
              <Card key={group.caterer.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <User className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{group.caterer.name}</CardTitle>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                          {group.caterer.contactName && (
                            <span>{group.caterer.contactName}</span>
                          )}
                          {group.caterer.phone && (
                            <div className="flex items-center space-x-1">
                              <Phone className="h-3 w-3" />
                              <span>{group.caterer.phone}</span>
                            </div>
                          )}
                          {group.caterer.email && (
                            <div className="flex items-center space-x-1">
                              <Mail className="h-3 w-3" />
                              <span>{group.caterer.email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(group.totalPendingAmount)}
                      </div>
                      <div className="text-sm text-gray-600">
                        Outstanding balance
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Simple pending amount display */}
                    <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-red-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-red-100 rounded-lg">
                            <DollarSign className="h-5 w-5 text-red-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-red-900">Outstanding Balance</div>
                            <div className="text-sm text-red-700">
                              Total amount pending payment
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-red-600">
                            {formatCurrency(group.totalPendingAmount)}
                          </div>
                          <div className="text-sm text-red-700">
                            From {group.bills.length} order{group.bills.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Show recent bills for context */}
                    {group.bills.length > 0 && (
                      <div className="mt-4">
                        <div className="text-sm font-medium text-gray-700 mb-2">Recent Orders:</div>
                        <div className="space-y-2">
                          {group.bills.slice(0, 3).map((bill, index) => (
                            <div key={bill.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex items-center space-x-2">
                                <FileText className="h-4 w-4 text-gray-500" />
                                <span className="text-sm font-medium">#{bill.billNo}</span>
                                <span className="text-xs text-gray-500">
                                  {format(new Date(bill.distributionDate), 'MMM dd')}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600">
                                {formatCurrency(Number(bill.grandTotal))}
                              </div>
                            </div>
                          ))}
                          {group.bills.length > 3 && (
                            <div className="text-xs text-gray-500 text-center py-1">
                              +{group.bills.length - 3} more orders
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end space-x-2 mt-4 pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/caterers/${group.caterer.id}`)}
                    >
                      View Details
                    </Button>
                    <PaymentModal
                      triggerText="Make Payment"
                      triggerSize="sm"
                      triggerClassName="bg-green-600 hover:bg-green-700"
                      preselectedCatererId={group.caterer.id.toString()}
                      preselectedAmount={group.totalPendingAmount.toString()}
                      onSuccess={() => {
                        // Refresh the page to show updated data
                        window.location.reload();
                      }}
                    >
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Make Payment
                      </Button>
                    </PaymentModal>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Bills Found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm 
                    ? 'No caterers match your search criteria.' 
                    : 'All bills have been paid! 🎉'
                  }
                </p>
                {searchTerm && (
                  <Button variant="outline" onClick={() => setSearchTerm('')}>
                    Clear Search
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </CatererLayout>
  );
}
