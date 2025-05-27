import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/layout/layout';
import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table';
import {
  FileText, Plus, Search, Filter, ArrowUpDown, ChevronDown, DollarSign, Image
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useCatererPayments } from '@/hooks/use-caterer-payments';
import { useCaterers } from '@/hooks/use-caterers';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function CatererPaymentsPage() {
  const [, setLocation] = useLocation();
  const { data: payments, isLoading } = useCatererPayments();
  const { data: caterers } = useCaterers();
  const [searchTerm, setSearchTerm] = useState('');
  const [catererFilter, setCatererFilter] = useState<number | 'all'>('all');
  const [paymentModeFilter, setPaymentModeFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  }>({ key: 'paymentDate', direction: 'desc' });

  // Helper function to navigate
  const navigate = (path: string) => setLocation(path);

  // Get caterer name by ID
  const getCatererName = (catererId: number) => {
    const caterer = caterers?.find(c => c.id === catererId);
    return caterer ? caterer.name : 'Unknown Caterer';
  };

  // Filter and sort payments
  const filteredPayments = payments
    ? payments
        .filter(payment => {
          // Filter by search term
          const searchMatch =
            getCatererName(payment.catererId).toLowerCase().includes(searchTerm.toLowerCase()) ||
            payment.paymentMode.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (payment.notes && payment.notes.toLowerCase().includes(searchTerm.toLowerCase()));

          // Filter by caterer
          const catererMatch = catererFilter === 'all' || payment.catererId === catererFilter;

          // Filter by payment mode
          const paymentModeMatch = paymentModeFilter === 'all' || payment.paymentMode === paymentModeFilter;

          return searchMatch && catererMatch && paymentModeMatch;
        })
        .sort((a, b) => {
          const { key, direction } = sortConfig;

          if (key === 'caterer') {
            const aName = getCatererName(a.catererId);
            const bName = getCatererName(b.catererId);
            return direction === 'asc'
              ? aName.localeCompare(bName)
              : bName.localeCompare(aName);
          }

          if (key === 'amount') {
            const aAmount = parseFloat(a.amount);
            const bAmount = parseFloat(b.amount);
            return direction === 'asc' ? aAmount - bAmount : bAmount - aAmount;
          }

          if (key === 'paymentDate') {
            const aDate = new Date(a.paymentDate);
            const bDate = new Date(b.paymentDate);
            return direction === 'asc'
              ? aDate.getTime() - bDate.getTime()
              : bDate.getTime() - aDate.getTime();
          }

          return 0;
        })
    : [];

  // Get unique payment modes
  const paymentModes = payments
    ? [...new Set(payments.map(payment => payment.paymentMode))]
    : [];

  // Handle sort
  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  return (
    <Layout>
      <PageHeader
        title="Caterer Payment History"
        description="View and manage all payments from caterers"
        icon={<FileText className="h-6 w-6 text-secondary" />}
      >
        <Button onClick={() => navigate('/caterer-payments/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Record Payment
        </Button>
      </PageHeader>

      <Card className="mt-6">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>Payment History</CardTitle>
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search payments..."
                  className="pl-8 w-full md:w-[250px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="ml-auto">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  <div className="p-2">
                    <h4 className="font-medium mb-1">Caterer</h4>
                    <select
                      className="w-full p-2 border rounded"
                      value={catererFilter === 'all' ? 'all' : catererFilter}
                      onChange={(e) => setCatererFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                    >
                      <option value="all">All Caterers</option>
                      {caterers?.map((caterer) => (
                        <option key={caterer.id} value={caterer.id}>
                          {caterer.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="p-2">
                    <h4 className="font-medium mb-1">Payment Mode</h4>
                    <select
                      className="w-full p-2 border rounded"
                      value={paymentModeFilter}
                      onChange={(e) => setPaymentModeFilter(e.target.value)}
                    >
                      <option value="all">All Payment Modes</option>
                      {paymentModes.map((mode) => (
                        <option key={mode} value={mode}>
                          {mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
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
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-10">
              <DollarSign className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Payments Found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || catererFilter !== 'all' || paymentModeFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'No payments have been recorded yet'}
              </p>
              <Button onClick={() => navigate('/caterer-payments/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Record First Payment
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('paymentDate')}>
                      <div className="flex items-center">
                        Date
                        {sortConfig.key === 'paymentDate' && (
                          <ArrowUpDown className={`ml-2 h-4 w-4 ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('caterer')}>
                      <div className="flex items-center">
                        Caterer
                        {sortConfig.key === 'caterer' && (
                          <ArrowUpDown className={`ml-2 h-4 w-4 ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('amount')}>
                      <div className="flex items-center">
                        Amount
                        {sortConfig.key === 'amount' && (
                          <ArrowUpDown className={`ml-2 h-4 w-4 ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} />
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Payment Mode</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Distribution</TableHead>
                    <TableHead>Receipt</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                      <TableCell>
                        <Button
                          variant="link"
                          className="p-0 h-auto text-left"
                          onClick={() => navigate(`/caterers/${payment.catererId}`)}
                        >
                          {getCatererName(payment.catererId)}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {payment.paymentMode}
                        </Badge>
                      </TableCell>
                      <TableCell>{payment.referenceNo || '-'}</TableCell>
                      <TableCell>
                        {payment.distributionId ? (
                          <Button
                            variant="link"
                            className="p-0 h-auto"
                            onClick={() => navigate(`/distributions/${payment.distributionId}`)}
                          >
                            View Bill
                          </Button>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {payment && payment.receiptImage ? (
                          <a
                            href={`/api/uploads/receipts/${payment.receiptImage}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-700 underline flex items-center"
                          >
                            <Image className="h-4 w-4 mr-1" />
                            View
                          </a>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{payment.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}
