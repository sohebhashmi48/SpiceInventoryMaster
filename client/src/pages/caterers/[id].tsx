import { useState } from 'react';
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
import CatererLayout from '../../components/caterers/caterer-layout';
import CatererDetailedPaymentHistory from '../../components/caterers/caterer-detailed-payment-history';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';

import { useToast } from '../../hooks/use-toast';
import {
  ArrowLeft,
  Edit,
  Trash2,
  ChefHat,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  DollarSign,
  Hash,
  ShoppingBag,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';


// Form validation schema
const catererFormSchema = z.object({
  name: z.string().min(1, 'Caterer name is required'),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  gstNumber: z.string().optional(),
  notes: z.string().optional(),
});

type CatererFormValues = z.infer<typeof catererFormSchema>;

export default function CatererDetailsPage() {
  const [location, setLocation] = useLocation();
  const [, params] = useRoute("/caterers/:id");
  const { toast } = useToast();

  // Parse caterer ID
  const id = params?.id ? parseInt(params.id) : 0;

  // Hooks
  const { data: caterer, isLoading: catererLoading } = useCaterer(id);
  const updateCaterer = useUpdateCaterer();
  const deleteCaterer = useDeleteCaterer();

  // State
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [relatedRecords, setRelatedRecords] = useState<RelatedRecordsError['relatedRecords'] | undefined>(undefined);

  // Form
  const form = useForm<CatererFormValues>({
    resolver: zodResolver(catererFormSchema),
    defaultValues: {
      name: caterer?.name || '',
      contactName: caterer?.contactName || '',
      phone: caterer?.phone || '',
      email: caterer?.email || '',
      address: caterer?.address || '',
      city: caterer?.city || '',
      state: caterer?.state || '',
      pincode: caterer?.pincode || '',
      gstNumber: caterer?.gstNumber || '',
      notes: caterer?.notes || '',
    },
  });

  // Update form when caterer data loads
  useState(() => {
    if (caterer) {
      form.reset({
        name: caterer.name || '',
        contactName: caterer.contactName || '',
        phone: caterer.phone || '',
        email: caterer.email || '',
        address: caterer.address || '',
        city: caterer.city || '',
        state: caterer.state || '',
        pincode: caterer.pincode || '',
        gstNumber: caterer.gstNumber || '',
        notes: caterer.notes || '',
      });
    }
  });

  // Navigation helper
  const navigate = (path: string) => setLocation(path);

  // Handle form submission
  const onSubmit = async (data: CatererFormValues) => {
    try {
      await updateCaterer.mutateAsync({ id, ...data });
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Caterer updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update caterer",
        variant: "destructive",
      });
    }
  };

  // Handle delete
  const handleDelete = async (id: number, options?: DeleteCatererOptions) => {
    try {
      await deleteCaterer.mutateAsync({ id, options });
      navigate('/caterers');
      toast({
        title: "Success",
        description: "Caterer deleted successfully",
      });
    } catch (error: any) {
      if (error.relatedRecords) {
        setRelatedRecords(error.relatedRecords);
      } else {
        toast({
          title: "Error",
          description: "Failed to delete caterer",
          variant: "destructive",
        });
      }
    }
  };



  // Loading state
  if (catererLoading) {
    return (
      <CatererLayout title="Caterer Details" description="Loading caterer information...">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </CatererLayout>
    );
  }

  // Not found state
  if (!caterer) {
    return (
      <CatererLayout title="Caterer Details" description="Caterer not found">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <ChefHat className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-bold mb-2">Caterer Not Found</h2>
              <p className="text-gray-500 mb-4">The caterer you're looking for doesn't exist or has been deleted.</p>
              <Button onClick={() => navigate('/caterers')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Caterers
              </Button>
            </div>
          </CardContent>
        </Card>
      </CatererLayout>
    );
  }

  // Calculate stats
  const totalBilled = Number(caterer.totalBilled) || 0;
  const totalPaid = Number(caterer.totalPaid) || 0;
  const balanceDue = Number(caterer.balanceDue) || 0;
  const totalOrders = Number(caterer.totalOrders) || 0;

  return (
    <CatererLayout 
      title={isEditing ? 'Edit Caterer' : caterer.name} 
      description={isEditing ? 'Update caterer information' : 'View and manage caterer details'}
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate('/caterers')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Caterers
          </Button>
          
          <div className="flex space-x-2">
            {!isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    try {
                      const response = await fetch(`/api/caterers/${id}/check-related-records`);
                      const data = await response.json();
                      setIsDeleteDialogOpen(true);
                      if (data.hasRelatedRecords) {
                        setRelatedRecords({
                          bills: data.distributionsCount || 0,
                          payments: data.paymentsCount || 0,
                          total: data.totalCount || 0
                        });
                      }
                    } catch (error) {
                      setIsDeleteDialogOpen(true);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={form.handleSubmit(onSubmit)} disabled={updateCaterer.isPending}>
                  {updateCaterer.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            )}
          </div>
        </div>

        {isEditing ? (
          // Edit Form
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Update the caterer's basic details</CardDescription>
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
                      placeholder="Enter contact person name"
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
                  <CardDescription>Update address and business information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      {...form.register("address")}
                      placeholder="Enter full address"
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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pincode">Pincode</Label>
                      <Input
                        id="pincode"
                        {...form.register("pincode")}
                        placeholder="Enter pincode"
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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      {...form.register("notes")}
                      placeholder="Enter any additional notes"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </form>
        ) : (
          // View Mode - This will be continued in the next part due to length limit
          <div className="space-y-6">
            {/* Caterer Profile Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-100 rounded-full">
                      <ChefHat className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">{caterer.name}</CardTitle>
                      {caterer.contactName && (
                        <p className="text-gray-600">Contact: {caterer.contactName}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant={caterer.isActive ? "default" : "secondary"} className="text-sm">
                    {caterer.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Contact Information */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900">Contact Information</h4>
                    {caterer.phone && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span>{caterer.phone}</span>
                      </div>
                    )}
                    {caterer.email && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span>{caterer.email}</span>
                      </div>
                    )}
                    {caterer.address && (
                      <div className="flex items-start space-x-2 text-sm">
                        <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                        <div>
                          <p>{caterer.address}</p>
                          {(caterer.city || caterer.state || caterer.pincode) && (
                            <p className="text-gray-600">
                              {[caterer.city, caterer.state, caterer.pincode].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Business Information */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900">Business Information</h4>
                    {caterer.gstNumber && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Hash className="h-4 w-4 text-gray-500" />
                        <span>GST: {caterer.gstNumber}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2 text-sm">
                      <ShoppingBag className="h-4 w-4 text-gray-500" />
                      <span>Total Orders: {totalOrders}</span>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900">Quick Actions</h4>
                    <div className="space-y-2">
                      <Button
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => navigate(`/caterer-billing?catererId=${id}`)}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Create Bill
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-600">Total Billed</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {formatCurrency(totalBilled)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-600">Total Paid</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {formatCurrency(totalPaid)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <span className="text-sm font-medium text-gray-600">Balance Due</span>
                  </div>
                  <p className="text-2xl font-bold text-red-600 mt-1">
                    {formatCurrency(balanceDue)}
                  </p>
                </CardContent>
              </Card>


            </div>

            {/* Tabs for detailed information */}
            <Tabs defaultValue="payment-history" className="w-full">
              <TabsList>
                <TabsTrigger value="payment-history">Payment History</TabsTrigger>
                {caterer.notes && <TabsTrigger value="notes">Notes</TabsTrigger>}
              </TabsList>

              <TabsContent value="payment-history" className="space-y-4">
                <CatererDetailedPaymentHistory catererId={id} />
              </TabsContent>





              {caterer.notes && (
                <TabsContent value="notes">
                  <Card>
                    <CardHeader>
                      <CardTitle>Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 whitespace-pre-wrap">{caterer.notes}</p>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </div>
        )}

        {/* Delete Dialog */}
        <CatererDeleteDialog
          open={isDeleteDialogOpen}
          caterer={caterer}
          relatedRecords={relatedRecords}
          onOpenChange={setIsDeleteDialogOpen}
          onDelete={handleDelete}
        />
      </div>
    </CatererLayout>
  );
}
