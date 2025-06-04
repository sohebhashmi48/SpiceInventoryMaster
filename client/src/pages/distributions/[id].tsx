import { useState } from 'react';
import { useLocation } from 'wouter';
import Layout from '../../components/layout/layout';
import {
  useDistribution,
  useDistributionItems,
  useUpdateDistributionStatus
} from '../../hooks/use-distributions';
import { useCaterer } from '../../hooks/use-caterers';
import {
  useCreateCatererPayment,
  useCatererPaymentsByDistribution
} from '../../hooks/use-caterer-payments';
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
  DollarSign, CheckCircle, XCircle, Clock, Image
} from 'lucide-react';
import { Skeleton } from '../../components/ui/skeleton';
import { Badge } from '../../components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from '../../components/ui/dialog';
import { toast } from '../../components/ui/use-toast';
import { formatCurrency, formatDate } from '../../lib/utils';
import PaymentModal from '../../components/caterers/payment-modal';

export default function DistributionDetailsPage({ params }: { params?: { id?: string } }) {
  const [location, setLocation] = useLocation();

  // Check if params and params.id exist before parsing
  const id = params?.id ? parseInt(params.id) : 0;

  const { data: distribution, isLoading: distributionLoading } = useDistribution(id);
  const { data: items, isLoading: itemsLoading } = useDistributionItems(id);
  const { data: caterer, isLoading: catererLoading } = useCaterer(distribution?.catererId);
  const { data: payments, isLoading: paymentsLoading } = useCatererPaymentsByDistribution(id);
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
        amount: paymentAmount,
        paymentDate: paymentDate.toISOString(),
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
      <Layout>
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
      </Layout>
    );
  }

  // If distribution not found
  if (!distribution) {
    return (
      <Layout>
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
      </Layout>
    );
  }

  return (
    <Layout>
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
            <PaymentModal
              triggerText="Record Payment"
              triggerClassName="w-full"
              preselectedCatererId={distribution.catererId.toString()}
              preselectedDistributionId={distribution.id.toString()}
              preselectedAmount={distribution.balanceDue.toString()}
              onSuccess={() => {
                // Refresh the page data
                window.location.reload();
              }}
            >
              <Button
                className="w-full"
                disabled={distribution.status === 'paid' || distribution.status === 'cancelled'}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </PaymentModal>

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

        {/* Payment Records */}
        <Card className="md:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Payment Records</CardTitle>
              <CardDescription>Payment history for this distribution</CardDescription>
            </div>
            <PaymentModal
              triggerText="Add Payment"
              triggerVariant="outline"
              triggerSize="sm"
              preselectedCatererId={distribution.catererId.toString()}
              preselectedDistributionId={distribution.id.toString()}
              preselectedAmount={distribution.balanceDue.toString()}
              onSuccess={() => {
                // Refresh the page data
                window.location.reload();
              }}
            >
              <Button
                variant="outline"
                size="sm"
                disabled={distribution.status === 'paid' || distribution.status === 'cancelled'}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Add Payment
              </Button>
            </PaymentModal>
          </CardHeader>
          <CardContent>
            {paymentsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : !payments || payments.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border border-dashed rounded-md">
                No payment records found for this distribution.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Mode</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Receipt</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
                        <TableCell className="capitalize">{payment.paymentMode}</TableCell>
                        <TableCell>{payment.referenceNo || '-'}</TableCell>
                        <TableCell>
                          {payment.receiptImage ? (
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

        {/* Distribution Items */}
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
    </Layout>
  );
}
