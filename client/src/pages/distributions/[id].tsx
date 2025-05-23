import { useState } from 'react';
import { useLocation } from 'wouter';
import {
  useDistribution,
  useDistributionItems,
  useUpdateDistributionStatus
} from '../../hooks/use-distributions';
import { useCaterer } from '../../hooks/use-caterers';
import { useCreateCatererPayment } from '../../hooks/use-caterer-payments';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '../../components/ui/table';
import {
  CreditCard, ArrowLeft, Printer, Receipt,
  DollarSign, CheckCircle, XCircle, Clock
} from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from '../../components/ui/dialog';
import { toast } from '../../components/ui/use-toast';
import { formatCurrency, formatDate } from '../../lib/utils';

export default function DistributionDetailsPage({ params }: { params?: { id?: string } }) {
  const [location, setLocation] = useLocation();

  // Check if params and params.id exist before parsing
  const id = params?.id ? parseInt(params.id) : 0;

  const { data: distribution, isLoading: distributionLoading } = useDistribution(id);
  const { data: items, isLoading: itemsLoading } = useDistributionItems(id);
  const { data: caterer, isLoading: catererLoading } = useCaterer(distribution?.catererId);
  const updateStatus = useUpdateDistributionStatus();
  const createPayment = useCreateCatererPayment();

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNotes, setPaymentNotes] = useState('');

  // Helper function to navigate
  const navigate = (path: string) => setLocation(path);

  // Handle status change
  const handleStatusChange = (status: string) => {
    updateStatus.mutate(
      { id, status },
      {
        onSuccess: () => {
          toast({
            title: "Status updated",
            description: `Distribution status changed to ${status}`,
          });
        },
      }
    );
  };

  // Handle payment submission
  const handlePaymentSubmit = () => {
    if (!distribution || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast({
        title: "Invalid payment",
        description: "Please enter a valid payment amount",
        variant: "destructive",
      });
      return;
    }

    createPayment.mutate(
      {
        catererId: distribution.catererId,
        distributionId: distribution.id,
        amount: parseFloat(paymentAmount),
        paymentDate,
        paymentMode,
        notes: paymentNotes,
      },
      {
        onSuccess: () => {
          setPaymentDialogOpen(false);
          toast({
            title: "Payment recorded",
            description: `Payment of ${formatCurrency(parseFloat(paymentAmount))} recorded successfully`,
          });
        },
      }
    );
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500">{status}</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-500">{status}</Badge>;
      case 'pending':
        return <Badge className="bg-blue-500">{status}</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500">{status}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Loading state
  if (distributionLoading || itemsLoading || catererLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <CreditCard className="h-6 w-6 mr-2 text-primary" />
            <h1 className="text-2xl font-bold">Distribution Details</h1>
          </div>
          <Button variant="outline" onClick={() => navigate('/distributions')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Distributions
          </Button>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // If distribution not found
  if (!distribution) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <CreditCard className="h-6 w-6 mr-2 text-primary" />
            <h1 className="text-2xl font-bold">Distribution Details</h1>
          </div>
          <Button variant="outline" onClick={() => navigate('/distributions')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Distributions
          </Button>
        </div>
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <XCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
              <h2 className="text-xl font-bold mb-2">Distribution Not Found</h2>
              <p className="text-gray-500 mb-4">The distribution you're looking for doesn't exist or has been deleted.</p>
              <Button onClick={() => navigate('/distributions')}>
                Go Back to Distributions
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <CreditCard className="h-6 w-6 mr-2 text-primary" />
          <h1 className="text-2xl font-bold">Distribution Details</h1>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => navigate('/distributions')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Distributions
          </Button>
          <Button variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Distribution Information</CardTitle>
            <CardDescription>Basic details about this distribution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-gray-500">Bill Number</Label>
                <p className="font-medium">{distribution.billNo}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-500">Date</Label>
                <p className="font-medium">{formatDate(distribution.distributionDate)}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-500">Status</Label>
                <div className="mt-1">{getStatusBadge(distribution.status)}</div>
              </div>
              <div>
                <Label className="text-sm text-gray-500">Payment Mode</Label>
                <p className="font-medium capitalize">{distribution.paymentMode || 'Not specified'}</p>
              </div>
            </div>

            <div>
              <Label className="text-sm text-gray-500">Notes</Label>
              <p className="font-medium">{distribution.notes || 'No notes'}</p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-4">
            <Label className="text-sm text-gray-500">Created</Label>
            <p className="text-sm">{formatDate(distribution.createdAt)}</p>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Caterer Information</CardTitle>
            <CardDescription>Details about the caterer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {caterer ? (
              <>
                <div>
                  <Label className="text-sm text-gray-500">Name</Label>
                  <p className="font-medium">{caterer.name}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Contact Person</Label>
                  <p className="font-medium">{caterer.contactName || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Phone</Label>
                  <p className="font-medium">{caterer.phone || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Email</Label>
                  <p className="font-medium">{caterer.email || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Address</Label>
                  <p className="font-medium">{caterer.address || 'Not specified'}</p>
                </div>
              </>
            ) : (
              <p>Caterer information not available</p>
            )}
          </CardContent>
          <CardFooter className="border-t pt-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate(`/caterers/${distribution.catererId}`)}
            >
              View Caterer Profile
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Summary</CardTitle>
            <CardDescription>Financial details for this distribution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Total Amount:</span>
                <span>{formatCurrency(distribution.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total GST:</span>
                <span>{formatCurrency(distribution.totalGstAmount)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Grand Total:</span>
                <span>{formatCurrency(distribution.grandTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount Paid:</span>
                <span>{formatCurrency(distribution.amountPaid)}</span>
              </div>
              <div className="flex justify-between font-bold text-red-500">
                <span>Balance Due:</span>
                <span>{formatCurrency(distribution.balanceDue)}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2 border-t pt-4">
            <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full" disabled={distribution.status === 'paid' || distribution.status === 'cancelled'}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Payment</DialogTitle>
                  <DialogDescription>
                    Enter the payment details for this distribution.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="paymentAmount">Payment Amount</Label>
                    <Input
                      id="paymentAmount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="Enter amount"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentMode">Payment Mode</Label>
                    <Select value={paymentMode} onValueChange={setPaymentMode}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentDate">Payment Date</Label>
                    <Input
                      id="paymentDate"
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentNotes">Notes</Label>
                    <Textarea
                      id="paymentNotes"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      placeholder="Add any payment notes here..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handlePaymentSubmit} disabled={createPayment.isLoading}>
                    {createPayment.isLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      <>Save Payment</>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="w-full flex space-x-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleStatusChange('paid')}
                disabled={distribution.status === 'paid' || distribution.status === 'cancelled'}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark Paid
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleStatusChange('cancelled')}
                disabled={distribution.status === 'cancelled'}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardFooter>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Distribution Items</CardTitle>
            <CardDescription>Products included in this distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>GST %</TableHead>
                    <TableHead>GST Amount</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items && items.length > 0 ? (
                    items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.itemName}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>{formatCurrency(item.rate)}</TableCell>
                        <TableCell>{item.gstPercentage}%</TableCell>
                        <TableCell>{formatCurrency(item.gstAmount)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4">
                        No items found for this distribution
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
