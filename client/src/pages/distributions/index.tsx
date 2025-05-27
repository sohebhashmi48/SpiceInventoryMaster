import React, { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Distribution, useDistributions, useDeleteDistribution } from '@/hooks/use-distributions';
import { useCaterers } from '@/hooks/use-caterers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table';
import {
  CreditCard, Plus, Search, Eye, Trash2, Filter,
  Calendar, Receipt, CreditCardIcon, DollarSign, FileText, Edit,
  CheckCircle, Clock, AlertCircle, XCircle, ChevronRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CatererLayout from '@/components/caterers/caterer-layout';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function DistributionsPage() {
  const [, navigate] = useLocation();
  const { data: distributions, isLoading } = useDistributions();
  const { data: caterers } = useCaterers();
  const deleteDistribution = useDeleteDistribution();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [catererFilter, setCatererFilter] = useState<string>('all');
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [distributionToDelete, setDistributionToDelete] = useState<Distribution | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  const getCatererName = (catererId: number) => {
    const caterer = caterers?.find(c => c.id === catererId);
    return caterer ? caterer.name : 'Unknown Caterer';
  };

  // Filter distributions based on search and filters
  const filteredDistributions = distributions?.filter(distribution => {
    // Apply search filter
    if (searchTerm) {
      const searchTermLower = searchTerm.toLowerCase();
      const billNoMatch = distribution.billNo.toLowerCase().includes(searchTermLower);
      const catererMatch = getCatererName(distribution.catererId).toLowerCase().includes(searchTermLower);

      if (!(billNoMatch || catererMatch)) {
        return false;
      }
    }

    // Apply status filter
    if (statusFilter !== 'all' && distribution.status !== statusFilter) {
      return false;
    }

    // Apply caterer filter
    if (catererFilter !== 'all' && distribution.catererId.toString() !== catererFilter) {
      return false;
    }

    return true;
  });

  // Sort distributions by date (newest first)
  const sortedDistributions = filteredDistributions?.sort((a, b) => {
    return new Date(b.distributionDate).getTime() - new Date(a.distributionDate).getTime();
  });

  const handleDelete = () => {
    if (distributionToDelete) {
      deleteDistribution.mutate(distributionToDelete.id);
      setDistributionToDelete(null);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'overdue':
        return 'destructive';
      case 'cancelled':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Receipt className="h-4 w-4 text-blue-500" />;
    }
  };

  // Calculate summary statistics
  const activeDistributions = distributions?.filter(d => d.status === 'active') || [];
  const pendingDistributions = distributions?.filter(d => d.status === 'pending') || [];
  const overdueDistributions = distributions?.filter(d => d.status === 'overdue') || [];
  const cancelledDistributions = distributions?.filter(d => d.status === 'cancelled') || [];

  const totalBilled = distributions?.reduce((sum, d) => sum + Number(d.grandTotal || 0), 0) || 0;
  const totalPaid = distributions?.reduce((sum, d) => sum + Number(d.amountPaid || 0), 0) || 0;
  const totalDue = distributions?.reduce((sum, d) => sum + Number(d.balanceDue || 0), 0) || 0;
  const overdueBilled = overdueDistributions?.reduce((sum, d) => sum + Number(d.balanceDue || 0), 0) || 0;

  return (
    <CatererLayout title="Caterer Billing" description="Manage bills and payments for your caterers">
      <div className="space-y-6">
        {/* Header with search and actions */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by bill number or caterer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button
              variant="outline"
              onClick={() => setIsFilterVisible(!isFilterVisible)}
              className="flex-1 md:flex-none flex items-center"
            >
              <Filter className="h-4 w-4 mr-2" />
              {isFilterVisible ? "Hide Filters" : "Show Filters"}
            </Button>
            <Button
              onClick={() => navigate('/distributions/new')}
              className="flex-1 md:flex-none flex items-center bg-primary text-white hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Bill
            </Button>
          </div>
        </div>

        {/* Filters */}
        {isFilterVisible && (
          <Card className="border-t-4 border-t-blue-500">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="status-filter" className="block mb-2 text-sm">Filter by Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger id="status-filter" className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="caterer-filter" className="block mb-2 text-sm">Filter by Caterer</Label>
                  <Select value={catererFilter} onValueChange={setCatererFilter}>
                    <SelectTrigger id="caterer-filter" className="w-full">
                      <SelectValue placeholder="Select caterer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Caterers</SelectItem>
                      {caterers?.map((caterer) => (
                        <SelectItem key={caterer.id} value={caterer.id.toString()}>
                          {caterer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                      setCatererFilter("all");
                    }}
                    className="text-sm h-10"
                  >
                    Clear All Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-t-4 border-t-blue-500">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Billed</p>
                  <h3 className="text-2xl font-bold mt-1">{formatCurrency(totalBilled)}</h3>
                </div>
                <Receipt className="h-8 w-8 text-blue-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {distributions?.length || 0} total bills
              </p>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-green-500">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Paid</p>
                  <h3 className="text-2xl font-bold mt-1 text-green-600">{formatCurrency(totalPaid)}</h3>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {activeDistributions.length} active bills
              </p>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-red-500">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Balance Due</p>
                  <h3 className="text-2xl font-bold mt-1 text-red-600">{formatCurrency(totalDue)}</h3>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {overdueDistributions.length} overdue bills
              </p>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-yellow-500">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <h3 className="text-2xl font-bold mt-1 text-yellow-600">{formatCurrency(overdueBilled)}</h3>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {pendingDistributions.length} pending bills
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Bills Tabs and Table */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle>Billing History</CardTitle>
            <CardDescription>Manage and track all your caterer bills</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="all" className="flex items-center">
                  <Receipt className="h-4 w-4 mr-2" />
                  All Bills
                  {distributions && distributions.length > 0 && (
                    <span className="ml-2 bg-gray-100 text-gray-800 text-xs rounded-full px-2 py-0.5">
                      {distributions.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="active" className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Active
                  {activeDistributions.length > 0 && (
                    <span className="ml-2 bg-green-100 text-green-800 text-xs rounded-full px-2 py-0.5">
                      {activeDistributions.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="pending" className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Pending
                  {pendingDistributions.length > 0 && (
                    <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs rounded-full px-2 py-0.5">
                      {pendingDistributions.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="overdue" className="flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Overdue
                  {overdueDistributions.length > 0 && (
                    <span className="ml-2 bg-red-100 text-red-800 text-xs rounded-full px-2 py-0.5">
                      {overdueDistributions.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Table content for each tab */}
              {['all', 'active', 'pending', 'overdue'].map((tabValue) => (
                <TabsContent key={tabValue} value={tabValue} className="mt-0">
                  {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : sortedDistributions && sortedDistributions.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Bill #</TableHead>
                            <TableHead>Caterer</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Total Amount</TableHead>
                            <TableHead>Paid</TableHead>
                            <TableHead>Balance</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedDistributions
                            .filter(d => tabValue === 'all' || d.status === tabValue)
                            .map((distribution) => (
                              <TableRow key={distribution.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/distributions/${distribution.id}`)}>
                                <TableCell className="font-medium">
                                  <div className="flex items-center">
                                    <Receipt className="h-4 w-4 mr-2 text-muted-foreground" />
                                    {distribution.billNo}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {getCatererName(distribution.catererId)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                                    {formatDate(new Date(distribution.distributionDate))}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {formatCurrency(Number(distribution.grandTotal))}
                                </TableCell>
                                <TableCell>
                                  {formatCurrency(Number(distribution.amountPaid || 0))}
                                </TableCell>
                                <TableCell>
                                  <span className={Number(distribution.balanceDue) > 0 ? 'text-red-600 font-medium' : ''}>
                                    {formatCurrency(Number(distribution.balanceDue || 0))}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    {getStatusIcon(distribution.status)}
                                    <span className="ml-2">
                                      {distribution.status.charAt(0).toUpperCase() + distribution.status.slice(1)}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end space-x-2">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/distributions/${distribution.id}`);
                                      }}
                                      title="View Bill"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/distributions/${distribution.id}/payment`);
                                      }}
                                      title="Record Payment"
                                      disabled={distribution.status === 'cancelled'}
                                    >
                                      <CreditCardIcon className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDistributionToDelete(distribution);
                                      }}
                                      title="Delete Bill"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No bills found</p>
                      {(searchTerm || statusFilter !== 'all' || catererFilter !== 'all') && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Try adjusting your search or filters
                        </p>
                      )}
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => navigate('/distributions/new')}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Bill
                      </Button>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!distributionToDelete} onOpenChange={(open) => !open && setDistributionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the bill "{distributionToDelete?.billNo}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CatererLayout>
  );
}
