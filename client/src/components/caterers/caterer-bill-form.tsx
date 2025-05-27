import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CatererBill, CatererBillItem } from '../../../shared/models/caterer-bill';
import { useCreateCatererBill, useUpdateCatererBill } from '@/hooks/use-caterer-bills';
import { useCaterers } from '@/hooks/use-caterers';
import { useProducts } from '@/hooks/use-products';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, Trash2, Save, ArrowLeft, Calculator } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

// Validation schema
const billItemSchema = z.object({
  productId: z.number().min(1, 'Product is required'),
  productName: z.string().optional(),
  quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
  unit: z.string().min(1, 'Unit is required'),
  rate: z.number().min(0, 'Rate must be a positive number'),
  gstPercentage: z.number().min(0, 'GST percentage must be a positive number'),
  gstAmount: z.number().min(0, 'GST amount must be a positive number'),
  amount: z.number().min(0, 'Amount must be a positive number'),
});

const billSchema = z.object({
  id: z.number().optional(),
  billNo: z.string().min(1, 'Bill number is required'),
  billDate: z.date(),
  dueDate: z.date(),
  catererId: z.number().min(1, 'Caterer is required'),
  totalAmount: z.number().min(0, 'Total amount must be a positive number'),
  totalGstAmount: z.number().min(0, 'Total GST amount must be a positive number'),
  grandTotal: z.number().min(0, 'Grand total must be a positive number'),
  status: z.enum(['draft', 'pending', 'paid', 'overdue', 'cancelled']),
  notes: z.string().optional(),
  items: z.array(billItemSchema).min(1, 'At least one item is required'),
});

type BillFormValues = z.infer<typeof billSchema>;

interface CatererBillFormProps {
  initialData?: CatererBill;
  catererId?: number;
}

export default function CatererBillForm({ initialData, catererId }: CatererBillFormProps) {
  const [, navigate] = useLocation();
  const createBill = useCreateCatererBill();
  const updateBill = useUpdateCatererBill();
  const { data: caterers } = useCaterers();
  const { data: products } = useProducts();
  const [isCalculating, setIsCalculating] = useState(false);

  // Initialize form with default values or existing bill data
  const defaultValues: BillFormValues = {
    id: initialData?.id,
    billNo: initialData?.billNo || generateBillNumber(),
    billDate: initialData?.billDate ? new Date(initialData.billDate) : new Date(),
    dueDate: initialData?.dueDate ? new Date(initialData.dueDate) : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // Default due date: 15 days from now
    catererId: initialData?.catererId || catererId || 0,
    totalAmount: initialData?.totalAmount || 0,
    totalGstAmount: initialData?.totalGstAmount || 0,
    grandTotal: initialData?.grandTotal || 0,
    status: initialData?.status || 'draft',
    notes: initialData?.notes || '',
    items: initialData?.items?.length ? initialData.items.map(item => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unit: item.unit,
      rate: item.rate,
      gstPercentage: item.gstPercentage,
      gstAmount: item.gstAmount,
      amount: item.amount,
    })) : [{
      productId: 0,
      productName: '',
      quantity: 1,
      unit: 'kg',
      rate: 0,
      gstPercentage: 0,
      gstAmount: 0,
      amount: 0,
    }],
  };

  const { control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<BillFormValues>({
    resolver: zodResolver(billSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  // Watch form values for calculations
  const watchItems = watch('items');
  const watchCatererId = watch('catererId');

  // Generate a unique bill number with a more structured format
  function generateBillNumber() {
    const date = new Date();
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const randomDigits = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

    // Format: CB-YYYYMMDD-XXX (CB = Caterer Bill, followed by date, followed by random 3-digit number)
    return `CB-${year}${month}${day}-${randomDigits}`;
  }

  // Calculate line item amount
  const calculateLineAmount = (index: number) => {
    const item = watchItems[index];
    if (!item) return;

    const quantity = item.quantity || 0;
    const rate = item.rate || 0;
    const gstPercentage = item.gstPercentage || 0;

    const amount = quantity * rate;
    const gstAmount = (amount * gstPercentage) / 100;

    setValue(`items.${index}.amount`, parseFloat(amount.toFixed(2)));
    setValue(`items.${index}.gstAmount`, parseFloat(gstAmount.toFixed(2)));
  };

  // Calculate totals
  const calculateTotals = () => {
    setIsCalculating(true);

    try {
      const totalAmount = watchItems.reduce((sum, item) => sum + (item.amount || 0), 0);
      const totalGstAmount = watchItems.reduce((sum, item) => sum + (item.gstAmount || 0), 0);
      const grandTotal = totalAmount + totalGstAmount;

      setValue('totalAmount', parseFloat(totalAmount.toFixed(2)));
      setValue('totalGstAmount', parseFloat(totalGstAmount.toFixed(2)));
      setValue('grandTotal', parseFloat(grandTotal.toFixed(2)));
    } finally {
      setIsCalculating(false);
    }
  };

  // Recalculate when items change
  useEffect(() => {
    calculateTotals();
  }, [watchItems]);

  // Handle product selection
  const handleProductChange = (productId: number, index: number) => {
    const product = products?.find(p => p.id === productId);
    if (product) {
      setValue(`items.${index}.productName`, product.name);
      setValue(`items.${index}.unit`, product.unit || 'kg');
      // You could also set a default rate if available
    }
  };

  // Add a new item
  const addItem = () => {
    append({
      productId: 0,
      productName: '',
      quantity: 1,
      unit: 'kg',
      rate: 0,
      gstPercentage: 0,
      gstAmount: 0,
      amount: 0,
    });
  };

  // Submit the form
  const onSubmit = async (data: BillFormValues) => {
    try {
      const billData: CatererBill = {
        ...data,
        billDate: format(data.billDate, 'yyyy-MM-dd'),
        dueDate: format(data.dueDate, 'yyyy-MM-dd'),
      };

      if (initialData?.id) {
        await updateBill.mutateAsync(billData);
      } else {
        await createBill.mutateAsync(billData);
      }

      navigate('/distributions');
    } catch (error) {
      console.error('Error saving bill:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="flex justify-between items-center">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate('/distributions')}
          className="flex items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Bills
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={calculateTotals}
            disabled={isCalculating}
            className="flex items-center"
          >
            <Calculator className="h-4 w-4 mr-2" />
            Recalculate
          </Button>
          <Button type="submit" disabled={isSubmitting} className="flex items-center">
            <Save className="h-4 w-4 mr-2" />
            {initialData?.id ? 'Update' : 'Create'} Bill
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bill Information */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Bill Information</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="billNo">Bill Number</Label>
                  <Controller
                    name="billNo"
                    control={control}
                    render={({ field }) => (
                      <Input id="billNo" {...field} />
                    )}
                  />
                  {errors.billNo && (
                    <p className="text-sm text-red-500">{errors.billNo.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger id="status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.status && (
                    <p className="text-sm text-red-500">{errors.status.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="billDate">Bill Date</Label>
                  <Controller
                    name="billDate"
                    control={control}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  {errors.billDate && (
                    <p className="text-sm text-red-500">{errors.billDate.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Controller
                    name="dueDate"
                    control={control}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  {errors.dueDate && (
                    <p className="text-sm text-red-500">{errors.dueDate.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="catererId">Caterer</Label>
                <Controller
                  name="catererId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value.toString()}
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      disabled={!!catererId}
                    >
                      <SelectTrigger id="catererId">
                        <SelectValue placeholder="Select caterer" />
                      </SelectTrigger>
                      <SelectContent>
                        {caterers?.map((caterer) => (
                          <SelectItem key={caterer.id} value={caterer.id.toString()}>
                            {caterer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.catererId && (
                  <p className="text-sm text-red-500">{errors.catererId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Controller
                  name="notes"
                  control={control}
                  render={({ field }) => (
                    <Textarea id="notes" {...field} />
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bill Summary */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Bill Summary</h3>

            <div className="space-y-4">
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">{formatCurrency(watch('totalAmount'))}</span>
              </div>

              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">GST:</span>
                <span className="font-medium">{formatCurrency(watch('totalGstAmount'))}</span>
              </div>

              <Separator />

              <div className="flex justify-between py-2">
                <span className="text-lg font-semibold">Total:</span>
                <span className="text-lg font-semibold">{formatCurrency(watch('grandTotal'))}</span>
              </div>

              {initialData?.id && (
                <>
                  <Separator />

                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Paid Amount:</span>
                    <span className="font-medium">{formatCurrency(initialData.paidAmount || 0)}</span>
                  </div>

                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Balance Due:</span>
                    <span className={`font-medium ${(initialData.balanceDue || 0) > 0 ? 'text-red-600' : ''}`}>
                      {formatCurrency(initialData.balanceDue || 0)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bill Items */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Bill Items</h3>
            <Button
              type="button"
              onClick={addItem}
              variant="outline"
              size="sm"
              className="flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>

          {errors.items && errors.items.root && (
            <p className="text-sm text-red-500 mb-4">{errors.items.root.message}</p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 w-1/4">Product</th>
                  <th className="text-right py-2 px-2 w-1/6">Quantity</th>
                  <th className="text-right py-2 px-2 w-1/6">Rate</th>
                  <th className="text-right py-2 px-2 w-1/6">GST %</th>
                  <th className="text-right py-2 px-2 w-1/6">Amount</th>
                  <th className="text-center py-2 px-2 w-1/12"></th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => (
                  <tr key={field.id} className="border-b">
                    <td className="py-2 px-2">
                      <Controller
                        name={`items.${index}.productId`}
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value.toString()}
                            onValueChange={(value) => {
                              field.onChange(parseInt(value));
                              handleProductChange(parseInt(value), index);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {products?.map((product) => (
                                <SelectItem key={product.id} value={product.id.toString()}>
                                  {product.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.items?.[index]?.productId && (
                        <p className="text-xs text-red-500 mt-1">{errors.items[index]?.productId?.message}</p>
                      )}
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center justify-end">
                        <Controller
                          name={`items.${index}.quantity`}
                          control={control}
                          render={({ field }) => (
                            <Input
                              type="number"
                              step="0.01"
                              className="w-20 text-right"
                              {...field}
                              onChange={(e) => {
                                field.onChange(parseFloat(e.target.value) || 0);
                                calculateLineAmount(index);
                              }}
                            />
                          )}
                        />
                        <span className="ml-2 text-sm text-muted-foreground">
                          {watchItems[index]?.unit || 'kg'}
                        </span>
                      </div>
                      {errors.items?.[index]?.quantity && (
                        <p className="text-xs text-red-500 mt-1">{errors.items[index]?.quantity?.message}</p>
                      )}
                    </td>
                    <td className="py-2 px-2">
                      <Controller
                        name={`items.${index}.rate`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            type="number"
                            step="0.01"
                            className="w-24 text-right"
                            {...field}
                            onChange={(e) => {
                              field.onChange(parseFloat(e.target.value) || 0);
                              calculateLineAmount(index);
                            }}
                          />
                        )}
                      />
                      {errors.items?.[index]?.rate && (
                        <p className="text-xs text-red-500 mt-1">{errors.items[index]?.rate?.message}</p>
                      )}
                    </td>
                    <td className="py-2 px-2">
                      <Controller
                        name={`items.${index}.gstPercentage`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            type="number"
                            step="0.01"
                            className="w-20 text-right"
                            {...field}
                            onChange={(e) => {
                              field.onChange(parseFloat(e.target.value) || 0);
                              calculateLineAmount(index);
                            }}
                          />
                        )}
                      />
                      {errors.items?.[index]?.gstPercentage && (
                        <p className="text-xs text-red-500 mt-1">{errors.items[index]?.gstPercentage?.message}</p>
                      )}
                    </td>
                    <td className="py-2 px-2 text-right">
                      {formatCurrency(watchItems[index]?.amount || 0)}
                      {watchItems[index]?.gstAmount > 0 && (
                        <div className="text-xs text-muted-foreground">
                          +{formatCurrency(watchItems[index]?.gstAmount || 0)} GST
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
