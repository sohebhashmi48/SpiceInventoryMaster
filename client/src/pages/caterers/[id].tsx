import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useCaterer,
  useUpdateCaterer,
  useDeleteCaterer,
  DeleteCatererOptions,
  RelatedRecordsError
} from '../../hooks/use-caterers';
import CatererDeleteDialog from '../../components/caterers/caterer-delete-dialog';
import {
  useDistributionsByCaterer
} from '../../hooks/use-distributions';
import {
  useCatererPaymentsByCaterer
} from '../../hooks/use-caterer-payments';
import CatererPurchaseHistory from '../../components/caterers/caterer-purchase-history';
import PaymentReminders from '../../components/dashboard/payment-reminders';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '../../components/ui/table';
import {
  ChefHat, ArrowLeft, Save, Trash2, Edit,
  Phone, Mail, MapPin, CreditCard, Receipt,
  DollarSign, Eye, Plus, FileText, Image,
  CheckCircle, XCircle
} from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '../../components/ui/alert-dialog';
import { toast } from '../../components/ui/use-toast';
import { formatCurrency, formatDate } from '../../lib/utils';
import CatererImageUpload from '../../components/caterers/caterer-image-upload';

// Define the schema for the form
const catererFormSchema = z.object({
  name: z.string().min(1, { message: "Caterer name is required" }),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email({ message: "Invalid email address" }).optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  gstNumber: z.string().optional(),
  notes: z.string().optional(),
  shopCardImage: z.string().optional(),
});

type CatererFormValues = z.infer<typeof catererFormSchema>;

export default function CatererDetailsPage() {
  const [location, setLocation] = useLocation();
  const [, params] = useRoute("/caterers/:id");

  // Check if params and params.id exist before parsing
  const id = params?.id ? parseInt(params.id) : 0;
  console.log("Caterer ID from params:", id, "Raw params:", params);

  const { data: caterer, isLoading: catererLoading } = useCaterer(id);
  const { data: distributions, isLoading: distributionsLoading } = useDistributionsByCaterer(id);
  const { data: payments, isLoading: paymentsLoading } = useCatererPaymentsByCaterer(id);
  const updateCaterer = useUpdateCaterer();
  const deleteCaterer = useDeleteCaterer();

  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [relatedRecords, setRelatedRecords] = useState<RelatedRecordsError['relatedRecords'] | undefined>(undefined);
  const [shopCardImage, setShopCardImage] = useState<string | null>(null);

  // Helper function to navigate
  const navigate = (path: string) => setLocation(path);

  // Initialize form with caterer data
  const form = useForm<CatererFormValues>({
    resolver: zodResolver(catererFormSchema),
    defaultValues: {
      name: '',
      contactName: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      gstNumber: '',
      notes: '',
      shopCardImage: '',
    },
  });

  // Update form values when caterer data is loaded
  useEffect(() => {
    if (caterer) {
      form.reset({
        name: caterer.name,
        contactName: caterer.contactName || '',
        phone: caterer.phone || '',
        email: caterer.email || '',
        address: caterer.address || '',
        city: caterer.city || '',
        state: caterer.state || '',
        pincode: caterer.pincode || '',
        gstNumber: caterer.gstNumber || '',
        notes: caterer.notes || '',
        shopCardImage: caterer.shopCardImage || '',
      });
      setShopCardImage(caterer.shopCardImage || null);
    }
  }, [caterer, form]);

  // Handle form submission
  const onSubmit = (data: CatererFormValues) => {
    if (!caterer) return;

    // Include the shop card image in the submission data
    const formattedData = {
      ...data,
      id: caterer.id,
      shopCardImage: shopCardImage,
    };

    updateCaterer.mutate(formattedData, {
      onSuccess: () => {
        setIsEditing(false);
        toast({
          title: 'Caterer updated',
          description: 'The caterer has been updated successfully.',
        });
      },
      onError: (error) => {
        console.error('Error updating caterer:', error);
      }
    });
  };

  // Handle caterer deletion
  const handleDelete = (id: number, options?: DeleteCatererOptions) => {
    if (!id) {
      console.error('Cannot delete caterer: Invalid ID');
      return;
    }

    console.log(`Deleting caterer with ID: ${id}, options:`, options);

    deleteCaterer.mutate({ id, options }, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
        navigate('/caterers');
      },
      onError: (error: any) => {
        // Check if this is a related records error
        if (error.relatedRecords) {
          console.log('Related records found:', error.relatedRecords);
          setRelatedRecords(error.relatedRecords);
        } else {
          // For other errors, close the dialog
          setIsDeleteDialogOpen(false);
        }
      }
    });
  };

  // Loading state
  if (catererLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <ChefHat className="h-6 w-6 mr-2 text-primary" />
            <h1 className="text-2xl font-bold">Caterer Details</h1>
          </div>
          <Button variant="outline" onClick={() => navigate('/caterers')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Caterers
          </Button>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // If caterer not found
  if (!caterer) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <ChefHat className="h-6 w-6 mr-2 text-primary" />
            <h1 className="text-2xl font-bold">Caterer Details</h1>
          </div>
          <Button variant="outline" onClick={() => navigate('/caterers')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Caterers
          </Button>
        </div>
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <ChefHat className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-bold mb-2">Caterer Not Found</h2>
              <p className="text-gray-500 mb-4">The caterer you're looking for doesn't exist or has been deleted.</p>
              <Button onClick={() => navigate('/caterers')}>
                Go Back to Caterers
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
          <ChefHat className="h-6 w-6 mr-2 text-primary" />
          <h1 className="text-2xl font-bold">{isEditing ? 'Edit Caterer' : 'Caterer Details'}</h1>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => navigate('/caterers')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Caterers
          </Button>
          {!isEditing && (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  // First, check if the caterer has related records
                  try {
                    const response = await fetch(`/api/caterers/${id}/check-related-records`);
                    const data = await response.json();

                    if (data.hasRelatedRecords) {
                      console.log('Caterer has related records:', data);
                      setRelatedRecords({
                        bills: data.distributionsCount || 0,
                        payments: data.paymentsCount || 0,
                        total: data.totalCount || 0
                      });
                    } else {
                      // No related records, show simple confirmation
                      setRelatedRecords(undefined);
                    }
                    setIsDeleteDialogOpen(true);
                  } catch (error) {
                    console.error('Error checking related records:', error);
                    // Fallback to simple confirmation
                    setRelatedRecords(undefined);
                    setIsDeleteDialogOpen(true);
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <CatererDeleteDialog
                caterer={caterer}
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                onDelete={handleDelete}
                relatedRecords={relatedRecords}
              />
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="distributions">Distributions</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          {isEditing ? (
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>Edit the caterer's basic details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Caterer Name *</Label>
                      <Input
                        id="name"
                        {...form.register("name")}
                        placeholder="Enter caterer business name"
                      />
                      {form.formState.errors.name && (
                        <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contactName">Contact Person</Label>
                      <Input
                        id="contactName"
                        {...form.register("contactName")}
                        placeholder="Enter primary contact name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        {...form.register("phone")}
                        placeholder="Enter phone number"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        {...form.register("email")}
                        placeholder="Enter email address"
                      />
                      {form.formState.errors.email && (
                        <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Address & Business Details</CardTitle>
                    <CardDescription>Edit the caterer's address and business information</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Textarea
                        id="address"
                        {...form.register("address")}
                        placeholder="Enter street address"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          {...form.register("city")}
                          placeholder="Enter city"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <Input
                          id="state"
                          {...form.register("state")}
                          placeholder="Enter state"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pincode">PIN Code</Label>
                      <Input
                        id="pincode"
                        {...form.register("pincode")}
                        placeholder="Enter PIN code"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gstNumber">GST Number</Label>
                      <Input
                        id="gstNumber"
                        {...form.register("gstNumber")}
                        placeholder="Enter GST number"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Financial Information Card removed */}

                <Card>
                  <CardHeader>
                    <CardTitle>Additional Information</CardTitle>
                    <CardDescription>Edit any additional notes or details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        {...form.register("notes")}
                        placeholder="Enter any additional notes about this caterer"
                        rows={5}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Shop Card Image</CardTitle>
                    <CardDescription>Upload an image of your shop card or business logo</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CatererImageUpload
                      currentImage={shopCardImage}
                      onImageChange={setShopCardImage}
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6 flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateCaterer.isLoading}>
                  {updateCaterer.isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </div>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Payment Reminders - Left Side */}
              <div className="lg:col-span-1">
                <PaymentReminders className="h-fit" />
              </div>

              {/* Caterer Information - Right Side */}
              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="text-xl font-bold">{caterer.name}</h3>
                      {caterer.contactName && (
                        <p className="text-gray-500">Contact: {caterer.contactName}</p>
                      )}
                    </div>

                  <div className="flex flex-col space-y-2">
                    {caterer.phone && (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-gray-500" />
                        <span>{caterer.phone}</span>
                      </div>
                    )}

                    {caterer.email && (
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-gray-500" />
                        <span>{caterer.email}</span>
                      </div>
                    )}

                    {caterer.address && (
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 mr-2 text-gray-500 mt-1" />
                        <div>
                          <p>{caterer.address}</p>
                          {(caterer.city || caterer.state || caterer.pincode) && (
                            <p>
                              {caterer.city && `${caterer.city}, `}
                              {caterer.state && `${caterer.state} `}
                              {caterer.pincode && caterer.pincode}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Business Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {caterer.gstNumber && (
                    <div className="space-y-1">
                      <Label className="text-sm text-gray-500">GST Number</Label>
                      <p>{caterer.gstNumber}</p>
                    </div>
                  )}

                  {/* Credit Limit field removed */}

                  <div className="space-y-1">
                    <Label className="text-sm text-gray-500">Total Orders</Label>
                    <p>{caterer.totalOrders || 0}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Financial Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Billed:</span>
                      <span>{formatCurrency(caterer.totalBilled || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Paid:</span>
                      <span>{formatCurrency(caterer.totalPaid || 0)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-red-500">
                      <span>Balance Due:</span>
                      <span>{formatCurrency(caterer.balanceDue || 0)}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col border-t pt-4 space-y-2">
                  <div className="flex justify-between w-full">
                    <Button
                      variant="outline"
                      className="w-full mr-2"
                      onClick={() => navigate(`/caterer-billing?catererId=${caterer.id}`)}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Create Bill
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        // Use our new redirect page
                        navigate(`/caterer-payment-form?catererId=${caterer.id}`);
                      }}
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Record Payment
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(`/distributions/new?catererId=${caterer.id}`)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Distribution
                  </Button>
                </CardFooter>
              </Card>

                {caterer.notes && (
                  <Card className="md:col-span-3">
                    <CardHeader>
                      <CardTitle>Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-line">{caterer.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="distributions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Distributions</CardTitle>
                <CardDescription>All distributions for this caterer</CardDescription>
              </div>
              <Button onClick={() => navigate(`/distributions/new?catererId=${caterer.id}`)}>
                <Plus className="h-4 w-4 mr-2" />
                New Distribution
              </Button>
            </CardHeader>
            <CardContent>
              {distributionsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : distributions && distributions.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bill No</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {distributions.map((distribution) => (
                        <TableRow key={distribution.id}>
                          <TableCell className="font-medium">{distribution.billNo}</TableCell>
                          <TableCell>{formatDate(distribution.distributionDate)}</TableCell>
                          <TableCell>{formatCurrency(distribution.grandTotal)}</TableCell>
                          <TableCell>{formatCurrency(distribution.amountPaid)}</TableCell>
                          <TableCell>{formatCurrency(distribution.balanceDue)}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                distribution.status === 'paid' ? 'bg-green-500' :
                                distribution.status === 'partial' ? 'bg-yellow-500' :
                                distribution.status === 'pending' ? 'bg-blue-500' :
                                distribution.status === 'cancelled' ? 'bg-red-500' : ''
                              }
                            >
                              {distribution.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/distributions/${distribution.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-10">
                  <Receipt className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Distributions Yet</h3>
                  <p className="text-gray-500 mb-4">This caterer doesn't have any distributions yet.</p>
                  <Button onClick={() => navigate(`/distributions/new?catererId=${caterer.id}`)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Distribution
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>All payments made by this caterer</CardDescription>
              </div>
              <Button onClick={() => {
                // Use our new redirect page
                navigate(`/caterer-payment-form?catererId=${caterer.id}`);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : payments && payments.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment Mode</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Distribution</TableHead>
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
              ) : (
                <div className="text-center py-10">
                  <DollarSign className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Payments Yet</h3>
                  <p className="text-gray-500 mb-4">This caterer hasn't made any payments yet.</p>
                  <Button onClick={() => {
                    // Use our new redirect page
                    navigate(`/caterer-payment-form?catererId=${caterer.id}`);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Record First Payment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases">
          {caterer && (
            <div className="space-y-4">
              <CatererPurchaseHistory catererId={caterer.id} />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
