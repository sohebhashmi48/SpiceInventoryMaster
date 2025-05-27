import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCaterers } from '../../hooks/use-caterers';
import { useCreateDistribution } from '../../hooks/use-distributions';
import { useSpices } from '../../hooks/use-spices';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '../../components/ui/table';
import {
  CreditCard, Plus, Trash2, Calculator, Save, ArrowLeft
} from 'lucide-react';
import { toast } from '../../components/ui/use-toast';
import { formatCurrency } from '../../lib/utils';

// Define the schema for the form
const distributionFormSchema = z.object({
  billNo: z.string().min(1, { message: "Bill number is required" }),
  catererId: z.string().min(1, { message: "Caterer is required" }),
  distributionDate: z.string().min(1, { message: "Date is required" }),
  paymentMode: z.string().optional(),
  paymentDate: z.string().optional(),
  amountPaid: z.string().default("0"),
  notes: z.string().optional(),
  items: z.array(z.object({
    spiceId: z.string().min(1, { message: "Product is required" }),
    itemName: z.string().min(1, { message: "Item name is required" }),
    quantity: z.string().min(1, { message: "Quantity is required" }),
    unit: z.string().min(1, { message: "Unit is required" }),
    rate: z.string().min(1, { message: "Rate is required" }),
    gstPercentage: z.string().default("0"),
    gstAmount: z.string().default("0"),
    amount: z.string().default("0"),
  })).min(1, { message: "At least one item is required" }),
  totalAmount: z.string().default("0"),
  totalGstAmount: z.string().default("0"),
  grandTotal: z.string().default("0"),
  balanceDue: z.string().default("0"),
});

type DistributionFormValues = z.infer<typeof distributionFormSchema>;

// Measurement units
const MEASUREMENT_UNITS = [
  { value: "kg", label: "Kilogram (kg)" },
  { value: "g", label: "Gram (g)" },
  { value: "l", label: "Liter (l)" },
  { value: "ml", label: "Milliliter (ml)" },
  { value: "pcs", label: "Pieces" },
  { value: "box", label: "Box" },
  { value: "packet", label: "Packet" },
];

export default function NewDistributionPage() {
  const [location, setLocation] = useLocation();
  const { data: caterers, isLoading: caterersLoading } = useCaterers();
  const { data: products, isLoading: productsLoading } = useSpices();
  const createDistribution = useCreateDistribution();

  // Get caterer ID from URL if present
  const searchParams = new URLSearchParams(window.location.search);
  const preselectedCatererId = searchParams.get('catererId');

  // Helper function to navigate
  const navigate = (path: string) => setLocation(path);

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  // Initialize form with default values
  const form = useForm<DistributionFormValues>({
    resolver: zodResolver(distributionFormSchema),
    defaultValues: {
      billNo: `BILL-${Date.now().toString().slice(-6)}`,
      catererId: preselectedCatererId || '',
      distributionDate: today,
      paymentMode: '',
      paymentDate: today,
      amountPaid: "0",
      notes: '',
      items: [
        {
          spiceId: '',
          itemName: '',
          quantity: "1",
          unit: "kg",
          rate: "0",
          gstPercentage: "0",
          gstAmount: "0",
          amount: "0",
        },
      ],
      totalAmount: "0",
      totalGstAmount: "0",
      grandTotal: "0",
      balanceDue: "0",
    },
  });

  // Use field array for dynamic items
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Calculate totals whenever items change
  useEffect(() => {
    const items = form.getValues().items;
    let totalAmount = 0;
    let totalGstAmount = 0;

    items.forEach((item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      const gstPercentage = parseFloat(item.gstPercentage) || 0;

      const itemAmount = quantity * rate;
      const gstAmount = (itemAmount * gstPercentage) / 100;

      totalAmount += itemAmount;
      totalGstAmount += gstAmount;

      // Update the item's amount and gstAmount
      form.setValue(`items.${items.indexOf(item)}.amount`, itemAmount.toFixed(2));
      form.setValue(`items.${items.indexOf(item)}.gstAmount`, gstAmount.toFixed(2));
    });

    const grandTotal = totalAmount + totalGstAmount;
    const amountPaid = parseFloat(form.getValues().amountPaid) || 0;
    const balanceDue = grandTotal - amountPaid;

    form.setValue("totalAmount", totalAmount.toFixed(2));
    form.setValue("totalGstAmount", totalGstAmount.toFixed(2));
    form.setValue("grandTotal", grandTotal.toFixed(2));
    form.setValue("balanceDue", balanceDue.toFixed(2));
  }, [form.watch("items"), form.watch("amountPaid")]);

  // Handle product selection
  const handleProductChange = (index: number, productId: string) => {
    const product = products?.find(p => p.id.toString() === productId);
    if (product) {
      form.setValue(`items.${index}.itemName`, product.name);
      form.setValue(`items.${index}.rate`, product.price.toString());
      form.setValue(`items.${index}.unit`, product.unit);
    }
  };

  // Handle form submission
  const onSubmit = (data: DistributionFormValues) => {
    // Convert string IDs to numbers
    const formattedData = {
      ...data,
      catererId: parseInt(data.catererId),
      items: data.items.map(item => ({
        ...item,
        spiceId: parseInt(item.spiceId),
      })),
    };

    createDistribution.mutate(formattedData, {
      onSuccess: () => {
        navigate('/distributions');
      },
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <CreditCard className="h-6 w-6 mr-2 text-primary" />
          <h1 className="text-2xl font-bold">New Distribution</h1>
        </div>
        <Button variant="outline" onClick={() => navigate('/distributions')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Distributions
        </Button>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Distribution Details</CardTitle>
              <CardDescription>Enter the basic details for this distribution</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="billNo">Bill Number</Label>
                <Input id="billNo" {...form.register("billNo")} />
                {form.formState.errors.billNo && (
                  <p className="text-sm text-red-500">{form.formState.errors.billNo.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="catererId">Caterer</Label>
                <Select
                  onValueChange={(value) => form.setValue("catererId", value)}
                  defaultValue={form.getValues().catererId || undefined}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a caterer" />
                  </SelectTrigger>
                  <SelectContent>
                    {caterersLoading ? (
                      <SelectItem value="loading-caterers" disabled>Loading caterers...</SelectItem>
                    ) : caterers && caterers.length > 0 ? (
                      caterers.map((caterer) => (
                        <SelectItem key={caterer.id} value={caterer.id.toString()}>
                          {caterer.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-caterers" disabled>No caterers found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {form.formState.errors.catererId && (
                  <p className="text-sm text-red-500">{form.formState.errors.catererId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="distributionDate">Distribution Date</Label>
                <Input
                  id="distributionDate"
                  type="date"
                  {...form.register("distributionDate")}
                />
                {form.formState.errors.distributionDate && (
                  <p className="text-sm text-red-500">{form.formState.errors.distributionDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  {...form.register("notes")}
                  placeholder="Add any additional notes here..."
                />
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Items</CardTitle>
              <CardDescription>Add the products being distributed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>GST %</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell>
                          <Select
                            onValueChange={(value) => handleProductChange(index, value)}
                            defaultValue={field.spiceId.toString() || undefined}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a product" />
                            </SelectTrigger>
                            <SelectContent>
                              {productsLoading ? (
                                <SelectItem value="loading-products" disabled>Loading products...</SelectItem>
                              ) : products && products.length > 0 ? (
                                products.map((product) => (
                                  <SelectItem key={product.id} value={product.id.toString()}>
                                    {product.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-products" disabled>No products found</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <Input
                            type="hidden"
                            {...form.register(`items.${index}.itemName`)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            {...form.register(`items.${index}.quantity`)}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Controller
                            control={form.control}
                            name={`items.${index}.unit`}
                            render={({ field }) => (
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {MEASUREMENT_UNITS.map((unit) => (
                                    <SelectItem key={unit.value} value={unit.value}>
                                      {unit.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            {...form.register(`items.${index}.rate`)}
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            {...form.register(`items.${index}.gstPercentage`)}
                            className="w-16"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            {...form.register(`items.${index}.amount`)}
                            className="w-24"
                            readOnly
                          />
                          <Input
                            type="hidden"
                            {...form.register(`items.${index}.gstAmount`)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            disabled={fields.length === 1}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({
                  spiceId: '',
                  itemName: '',
                  quantity: "1",
                  unit: "kg",
                  rate: "0",
                  gstPercentage: "0",
                  gstAmount: "0",
                  amount: "0",
                })}
                className="mt-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
              <CardDescription>Enter payment information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="paymentMode">Payment Mode</Label>
                <Select
                  onValueChange={(value) => form.setValue("paymentMode", value)}
                  defaultValue={form.getValues().paymentMode}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="credit">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentDate">Payment Date</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  {...form.register("paymentDate")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amountPaid">Amount Paid</Label>
                <Input
                  id="amountPaid"
                  type="number"
                  min="0"
                  step="0.01"
                  {...form.register("amountPaid")}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Amount:</span>
                  <span>{formatCurrency(parseFloat(form.watch("totalAmount")))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total GST:</span>
                  <span>{formatCurrency(parseFloat(form.watch("totalGstAmount")))}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Grand Total:</span>
                  <span>{formatCurrency(parseFloat(form.watch("grandTotal")))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount Paid:</span>
                  <span>{formatCurrency(parseFloat(form.watch("amountPaid")))}</span>
                </div>
                <div className="flex justify-between font-bold text-red-500">
                  <span>Balance Due:</span>
                  <span>{formatCurrency(parseFloat(form.watch("balanceDue")))}</span>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/distributions')}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createDistribution.isLoading}>
                  {createDistribution.isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </div>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Distribution
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
