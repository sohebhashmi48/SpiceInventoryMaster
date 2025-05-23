import { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateCaterer } from '../../hooks/use-caterers';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { ChefHat, ArrowLeft, Save } from 'lucide-react';
import { toast } from '../../components/ui/use-toast';

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
  creditLimit: z.string().optional(),
  notes: z.string().optional(),
});

type CatererFormValues = z.infer<typeof catererFormSchema>;

export default function NewCatererPage() {
  const [location, setLocation] = useLocation();
  const createCaterer = useCreateCaterer();

  // Helper function to navigate
  const navigate = (path: string) => setLocation(path);

  // Initialize form with default values
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
      creditLimit: '',
      notes: '',
    },
  });

  // Handle form submission
  const onSubmit = (data: CatererFormValues) => {
    // Send the data as is - the server will handle the conversion
    createCaterer.mutate(data, {
      onSuccess: () => {
        navigate('/caterers');
      },
      onError: (error) => {
        console.error('Error creating caterer:', error);
      }
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <ChefHat className="h-6 w-6 mr-2 text-primary" />
          <h1 className="text-2xl font-bold">Add New Caterer</h1>
        </div>
        <Button variant="outline" onClick={() => navigate('/caterers')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Caterers
        </Button>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Enter the caterer's basic details</CardDescription>
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
              <CardDescription>Enter the caterer's address and business information</CardDescription>
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

          <Card>
            <CardHeader>
              <CardTitle>Financial Information</CardTitle>
              <CardDescription>Enter financial details for this caterer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="creditLimit">Credit Limit (₹)</Label>
                <Input
                  id="creditLimit"
                  type="number"
                  min="0"
                  step="0.01"
                  {...form.register("creditLimit")}
                  placeholder="Enter maximum credit limit"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
              <CardDescription>Enter any additional notes or details</CardDescription>
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
        </div>

        <div className="mt-6 flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/caterers')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createCaterer.isLoading}>
            {createCaterer.isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </div>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Caterer
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
