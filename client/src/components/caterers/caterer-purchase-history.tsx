import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Package, Calendar, Receipt, Search, FileText } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';

interface CatererPurchaseItem {
  id: number;
  distributionId: number;
  productId: number;
  productName: string;
  itemName: string;
  quantity: string;
  unit: string;
  rate: string;
  gstPercentage: string;
  gstAmount: string;
  amount: string;
}

interface CatererPurchase {
  id: number;
  billNo: string;
  catererId: number;
  catererName?: string;
  distributionDate: string;
  totalAmount: string;
  totalGstAmount: string;
  grandTotal: string;
  amountPaid: string;
  paymentMode?: string;
  paymentDate?: string;
  balanceDue: string;
  notes?: string;
  status: string;
  createdAt: string;
  items?: CatererPurchaseItem[];
}

interface CatererPurchaseHistoryProps {
  catererId: number;
}

export default function CatererPurchaseHistory({ catererId }: CatererPurchaseHistoryProps) {
  const [, navigate] = useLocation();
  const [openPurchaseId, setOpenPurchaseId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch distributions (purchases) for this caterer
  const { data: purchases, isLoading } = useQuery<CatererPurchase[]>({
    queryKey: ['distributions', 'caterer', catererId],
    queryFn: async () => {
      console.log(`Fetching distributions for caterer ID: ${catererId}`);
      const response = await fetch(`/api/distributions/caterer/${catererId}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        console.error(`Failed to fetch distributions: ${response.status}`);
        throw new Error(`Failed to fetch distributions: ${response.status}`);
      }
      const data = await response.json();
      console.log('Distributions data:', data);
      return data;
    },
    enabled: !!catererId,
  });

  // Toggle purchase details
  const togglePurchase = (purchaseId: number) => {
    setOpenPurchaseId(openPurchaseId === purchaseId ? null : purchaseId);
  };

  // Fetch purchase items when a purchase is expanded
  const { data: purchaseItems, isLoading: itemsLoading } = useQuery<CatererPurchaseItem[]>({
    queryKey: ['distributionItems', openPurchaseId],
    queryFn: async () => {
      if (!openPurchaseId) return [];
      console.log(`Fetching items for distribution ID: ${openPurchaseId}`);
      const response = await fetch(`/api/distributions/${openPurchaseId}/items`, {
        credentials: 'include',
      });
      if (!response.ok) {
        console.error(`Failed to fetch distribution items: ${response.status}`);
        throw new Error(`Failed to fetch distribution items: ${response.status}`);
      }
      const data = await response.json();
      console.log('Distribution items data:', data);
      return data;
    },
    enabled: !!openPurchaseId,
  });

  // Filter purchases by search term
  const filteredPurchases = purchases?.filter(purchase => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      purchase.billNo.toLowerCase().includes(searchLower) ||
      purchase.status.toLowerCase().includes(searchLower) ||
      (purchase.notes && purchase.notes.toLowerCase().includes(searchLower)) ||
      (purchase.items && purchase.items.some(item => 
        item.itemName.toLowerCase().includes(searchLower) ||
        item.productName.toLowerCase().includes(searchLower)
      ))
    );
  });

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-lg flex items-center">
              <Package className="h-5 w-5 mr-2 text-primary" />
              Purchase History
            </CardTitle>
            <CardDescription>
              All purchases made by this caterer
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Search purchases..."
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
        ) : !filteredPurchases || filteredPurchases.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border border-dashed rounded-md">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Purchase History</h3>
            <p className="text-gray-500 mb-4">This caterer doesn't have any purchase history yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPurchases.map((purchase) => (
              <Collapsible
                key={purchase.id}
                open={openPurchaseId === purchase.id}
                onOpenChange={() => togglePurchase(purchase.id)}
                className="border rounded-md overflow-hidden"
              >
                <div className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
                     onClick={() => togglePurchase(purchase.id)}>
                  <div className="flex items-center space-x-4">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                        {openPurchaseId === purchase.id ?
                          <ChevronDown className="h-4 w-4" /> :
                          <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                    <div>
                      <div className="font-medium flex items-center">
                        <Receipt className="h-4 w-4 mr-2 text-primary" />
                        Bill #{purchase.billNo}
                        <Badge variant="outline" className="ml-2 text-xs">
                          {purchase.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(purchase.distributionDate)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(parseFloat(purchase.grandTotal))}</div>
                    <div className="text-sm text-gray-500">
                      {purchase.amountPaid !== purchase.grandTotal
                        ? `Paid: ${formatCurrency(parseFloat(purchase.amountPaid))}`
                        : 'Fully Paid'}
                    </div>
                  </div>
                </div>
                <CollapsibleContent>
                  <div className="p-4 bg-white border-t">
                    {itemsLoading && openPurchaseId === purchase.id ? (
                      <div className="space-y-2">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Product</TableHead>
                              <TableHead className="text-right">Quantity</TableHead>
                              <TableHead className="text-right">Rate</TableHead>
                              <TableHead className="text-right">GST</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {purchaseItems && purchaseItems.length > 0 ? (
                              purchaseItems.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell className="font-medium">{item.itemName}</TableCell>
                                  <TableCell className="text-right">{item.quantity} {item.unit}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(parseFloat(item.rate))}</TableCell>
                                  <TableCell className="text-right">{item.gstPercentage}%</TableCell>
                                  <TableCell className="text-right">{formatCurrency(parseFloat(item.amount))}</TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                                  No items found for this purchase
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    <div className="mt-4 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/distributions/${purchase.id}`)}
                      >
                        View Full Details
                      </Button>
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
