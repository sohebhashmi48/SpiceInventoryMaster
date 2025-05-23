import { useState } from 'react';
import { useLocation } from 'wouter';
import { Distribution, useDistributions, useDeleteDistribution } from '../../hooks/use-distributions';
import { useCaterers } from '../../hooks/use-caterers';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '../../components/ui/table';
import {
  CreditCard, Plus, Search, Eye, Trash2,
  Calendar, Receipt, CreditCardIcon, DollarSign
} from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '../../components/ui/alert-dialog';
import { formatCurrency, formatDate } from '../../lib/utils';

export default function DistributionsPage() {
  const [location, setLocation] = useLocation();
  const { data: distributions, isLoading } = useDistributions();
  const { data: caterers } = useCaterers();
  const deleteDistribution = useDeleteDistribution();
  const [searchQuery, setSearchQuery] = useState('');
  const [distributionToDelete, setDistributionToDelete] = useState<Distribution | null>(null);

  // Helper function to navigate
  const navigate = (path: string) => setLocation(path);

  const getCatererName = (catererId: number) => {
    const caterer = caterers?.find(c => c.id === catererId);
    return caterer ? caterer.name : 'Unknown Caterer';
  };

  const filteredDistributions = distributions?.filter(distribution => {
    const catererName = getCatererName(distribution.catererId);
    const searchLower = searchQuery.toLowerCase();

    return (
      distribution.billNo.toLowerCase().includes(searchLower) ||
      catererName.toLowerCase().includes(searchLower) ||
      distribution.status.toLowerCase().includes(searchLower)
    );
  });

  const handleDelete = () => {
    if (distributionToDelete) {
      deleteDistribution.mutate({
        id: distributionToDelete.id,
        catererId: distributionToDelete.catererId
      });
      setDistributionToDelete(null);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <CreditCard className="h-6 w-6 mr-2 text-primary" />
          <h1 className="text-2xl font-bold">Caterer Billing</h1>
        </div>
        <Button onClick={() => navigate('/distributions/new')} className="bg-primary">
          <Plus className="h-4 w-4 mr-2" />
          New Distribution
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Distribution Management</CardTitle>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search distributions..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredDistributions && filteredDistributions.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill No</TableHead>
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
                  {filteredDistributions.map((distribution) => (
                    <TableRow key={distribution.id}>
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
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-1 text-muted-foreground" />
                          {formatCurrency(Number(distribution.grandTotal))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <CreditCardIcon className="h-4 w-4 mr-1 text-muted-foreground" />
                          {formatCurrency(Number(distribution.amountPaid))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-1 text-muted-foreground" />
                          {formatCurrency(Number(distribution.balanceDue))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={distribution.status === 'active' ? "success" : "secondary"}>
                          {distribution.status === 'active' ? "Active" : distribution.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => navigate(`/distributions/${distribution.id}`)}
                            title="View Distribution"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDistributionToDelete(distribution)}
                            title="Delete Distribution"
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
              <p className="text-muted-foreground">No distributions found</p>
              {searchQuery && (
                <p className="text-sm text-muted-foreground mt-2">
                  Try adjusting your search query
                </p>
              )}
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => navigate('/distributions/new')}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Distribution
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!distributionToDelete} onOpenChange={(open) => !open && setDistributionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the distribution with bill number "{distributionToDelete?.billNo}".
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
    </div>
  );
}
