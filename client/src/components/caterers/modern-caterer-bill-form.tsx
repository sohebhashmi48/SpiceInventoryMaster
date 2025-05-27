import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useCaterers } from '@/hooks/use-caterers';
import { useProducts } from '@/hooks/use-products';
import { useCategories } from '@/hooks/use-categories';
import { useCreateDistribution } from '@/hooks/use-distributions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, Trash2, Save, ArrowLeft, Calculator, ChefHat, Flame } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import CatererBillHeader from './caterer-bill-header';
import ProductSection from './product-section';
import AddProductForm from './add-product-form';
import { ProductFormValues } from './add-product-form';

// Define the schema for the bill form
const billSchema = z.object({
  billNo: z.string().min(1, 'Bill number is required'),
  billDate: z.date(),
  catererId: z.string().min(1, 'Caterer is required'),
  notes: z.string().optional(),
});

type BillFormValues = z.infer<typeof billSchema>;

interface ModernCatererBillFormProps {
  catererId?: number;
}

export default function ModernCatererBillForm({ catererId }: ModernCatererBillFormProps) {
  const [, navigate] = useLocation();
  const createDistribution = useCreateDistribution();
  const { data: caterers, isLoading: caterersLoading } = useCaterers();
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: categories, isLoading: categoriesLoading } = useCategories();

  // Generate a unique bill number with a more structured format
  const generateBillNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const randomDigits = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

    // Format: CB-YYYYMMDD-XXX (CB = Caterer Bill, followed by date, followed by random 3-digit number)
    return `CB-${year}${month}${day}-${randomDigits}`;
  };

  // State for selected products and quantities
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [productQuantities, setProductQuantities] = useState<Record<number, number>>({});
  const [productRates, setProductRates] = useState<Record<number, number>>({});
  const [productGstRates, setProductGstRates] = useState<Record<number, number>>({});

  // State for bill totals
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalGstAmount, setTotalGstAmount] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);

  // Form setup
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BillFormValues>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      billNo: generateBillNumber(),
      billDate: new Date(),
      catererId: catererId ? catererId.toString() : '',
      notes: '',
    },
  });

  const billDate = watch('billDate');

  // Set initial caterer ID if provided
  useEffect(() => {
    if (catererId) {
      setValue('catererId', catererId.toString());
    }
  }, [catererId, setValue]);

  // Group products by category
  const productsByCategory = React.useMemo(() => {
    if (!products || !categories) return {};

    return products.reduce((acc, product) => {
      const categoryId = product.categoryId;
      if (!acc[categoryId]) {
        acc[categoryId] = [];
      }
      acc[categoryId].push(product);
      return acc;
    }, {} as Record<number, typeof products>);
  }, [products, categories]);

  // Handle product selection
  const handleSelectProduct = (productId: number) => {
    setSelectedProductIds(prev => [...prev, productId]);
    setProductQuantities(prev => ({ ...prev, [productId]: 1 }));

    // Set default rate from product price
    const product = products?.find(p => p.id === productId);
    if (product) {
      setProductRates(prev => ({ ...prev, [productId]: Number(product.price) }));
      setProductGstRates(prev => ({ ...prev, [productId]: 5 })); // Default GST rate
    }

    calculateTotals();
  };

  // Handle product removal
  const handleRemoveProduct = (productId: number) => {
    setSelectedProductIds(prev => prev.filter(id => id !== productId));

    // Create new objects without the removed product
    const newQuantities = { ...productQuantities };
    const newRates = { ...productRates };
    const newGstRates = { ...productGstRates };

    delete newQuantities[productId];
    delete newRates[productId];
    delete newGstRates[productId];

    setProductQuantities(newQuantities);
    setProductRates(newRates);
    setProductGstRates(newGstRates);

    calculateTotals();
  };

  // Handle quantity change
  const handleQuantityChange = (productId: number, quantity: number) => {
    setProductQuantities(prev => ({ ...prev, [productId]: quantity }));
    calculateTotals();
  };

  // Calculate totals
  const calculateTotals = () => {
    let subTotal = 0;
    let gstTotal = 0;

    selectedProductIds.forEach(productId => {
      const quantity = productQuantities[productId] || 0;
      const rate = productRates[productId] || 0;
      const gstRate = productGstRates[productId] || 0;

      const amount = quantity * rate;
      const gstAmount = amount * (gstRate / 100);

      subTotal += amount;
      gstTotal += gstAmount;
    });

    setTotalAmount(subTotal);
    setTotalGstAmount(gstTotal);
    setGrandTotal(subTotal + gstTotal);
  };

  // Effect to recalculate totals when quantities or rates change
  useEffect(() => {
    calculateTotals();
  }, [productQuantities, productRates, productGstRates, selectedProductIds]);

  // Handle form submission
  const onSubmit = async (data: BillFormValues) => {
    if (selectedProductIds.length === 0) {
      alert('Please add at least one product to the bill');
      return;
    }

    try {
      // Prepare items for submission
      const items = selectedProductIds.map(productId => {
        const product = products?.find(p => p.id === productId);
        const quantity = productQuantities[productId] || 0;
        const rate = productRates[productId] || 0;
        const gstPercentage = productGstRates[productId] || 0;
        const amount = quantity * rate;
        const gstAmount = amount * (gstPercentage / 100);

        return {
          productId,
          itemName: product?.name || '',
          quantity: quantity.toString(),
          unit: product?.unit || 'kg',
          rate: rate.toString(),
          gstPercentage: gstPercentage.toString(),
          gstAmount: gstAmount.toString(),
          amount: amount.toString(),
        };
      });

      // Prepare distribution data
      const distributionData = {
        billNo: data.billNo,
        catererId: parseInt(data.catererId),
        distributionDate: format(data.billDate, 'yyyy-MM-dd'),
        totalAmount: totalAmount.toString(),
        totalGstAmount: totalGstAmount.toString(),
        grandTotal: grandTotal.toString(),
        amountPaid: '0', // Initial amount paid is 0
        balanceDue: grandTotal.toString(), // Initial balance due is the grand total
        status: 'active',
        notes: data.notes || '',
        items,
      };

      // Submit the distribution
      await createDistribution.mutateAsync(distributionData);

      // Navigate back to distributions list
      navigate('/distributions');
    } catch (error) {
      console.error('Error creating distribution:', error);
    }
  };

  // Handle adding a new product
  const handleAddProduct = (productData: ProductFormValues) => {
    // In a real implementation, you would save the product to the database
    console.log('New product data:', productData);
    alert('Product creation functionality would be implemented here');
  };

  if (caterersLoading || productsLoading || categoriesLoading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-6 flex justify-between items-center">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate('/distributions')}
          className="flex items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Bills
        </Button>

        <Button
          onClick={handleSubmit(onSubmit)}
          className="flex items-center"
          disabled={createDistribution.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          Save Bill
        </Button>
      </div>

      {/* Company Header */}
      <CatererBillHeader />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Left Column - Bill Form */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Bill Details</h2>

              <form className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="billNo">Bill Number</Label>
                  <Input
                    id="billNo"
                    {...register('billNo')}
                  />
                  {errors.billNo && (
                    <p className="text-sm text-destructive">{errors.billNo.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="billDate">Bill Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !billDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {billDate ? format(billDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={billDate}
                        onSelect={(date) => date && setValue('billDate', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.billDate && (
                    <p className="text-sm text-destructive">{errors.billDate.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="catererId">Caterer</Label>
                  <Select
                    onValueChange={(value) => setValue('catererId', value)}
                    defaultValue={watch('catererId')}
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
                  {errors.catererId && (
                    <p className="text-sm text-destructive">{errors.catererId.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    {...register('notes')}
                    placeholder="Add any additional notes here..."
                    className="resize-none"
                    rows={4}
                  />
                </div>
              </form>

              {/* Bill Summary */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold mb-4">Bill Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>{formatCurrency(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GST:</span>
                    <span>{formatCurrency(totalGstAmount)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Add Product Form */}
          <div className="mt-6">
            <AddProductForm
              categories={categories || []}
              onSubmit={handleAddProduct}
            />
          </div>
        </div>

        {/* Right Column - Products */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Select Products</h2>

              {/* Display products by category */}
              {categories?.map((category) => (
                <ProductSection
                  key={category.id}
                  title={category.name}
                  icon={category.name.toLowerCase().includes('spice') ?
                    <Flame className="h-5 w-5 text-secondary" /> :
                    <ChefHat className="h-5 w-5 text-primary" />
                  }
                  products={productsByCategory[category.id] || []}
                  selectedProductIds={selectedProductIds}
                  productQuantities={productQuantities}
                  onSelectProduct={handleSelectProduct}
                  onRemoveProduct={handleRemoveProduct}
                  onQuantityChange={handleQuantityChange}
                />
              ))}

              {(!categories || categories.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  No categories found. Please add categories first.
                </div>
              )}

              {(categories?.length > 0 && (!products || products.length === 0)) && (
                <div className="text-center py-8 text-muted-foreground">
                  No products found. Please add products using the form.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
