import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useCaterers } from '@/hooks/use-caterers';
import { useProducts } from '@/hooks/use-products';
import { useCategories } from '@/hooks/use-categories';
import { useCreateDistribution } from '@/hooks/use-distributions';
import { useUpdateInventoryQuantity } from '@/hooks/use-inventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, Trash2, Save, ArrowLeft, Calculator, ChefHat, FileText, Package, Image, Upload, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatQuantityWithUnit, UnitType, convertUnit, cn } from '@/lib/utils';
import UnitSelector from '@/components/ui/unit-selector';
import InventoryBatchSelector from './inventory-batch-selector';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { addDays } from 'date-fns';

// Define the schema for the bill form
const billItemSchema = z.object({
  productId: z.number().min(1, 'Product is required'),
  productName: z.string().optional(),
  quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
  unit: z.string().min(1, 'Unit is required'),
  rate: z.number().min(0, 'Rate must be a positive number'),
  gstPercentage: z.number().min(0, 'GST percentage must be a positive number'),
  amount: z.number().min(0, 'Amount must be a positive number'),
});

const billFormSchema = z.object({
  billNo: z.string().min(1, 'Bill number is required'),
  billDate: z.date(),
  dueDate: z.date(),
  catererId: z.number().min(1, 'Caterer is required'),
  paymentMethod: z.string().min(1, 'Payment method is required'), // Keep this for form field name
  amountPaid: z.number().min(0, 'Amount paid must be a positive number'),
  notes: z.string().optional(),
  items: z.array(billItemSchema).min(1, 'At least one item is required'),
});

type BillFormValues = z.infer<typeof billFormSchema>;

// Product form schema for adding new products
const productFormSchema = z.object({
  productName: z.string().min(1, 'Product name is required'),
  category: z.string().min(1, 'Category is required'),
  quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
  unit: z.string().min(1, 'Unit is required'),
  price: z.number().min(0, 'Price must be a positive number'),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

export default function ModernCatererBillingUI() {
  const [location, navigate] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBatches, setSelectedBatches] = useState<Record<number, { batchIds: number[], quantities: number[] }>>({});
  const [paymentOption, setPaymentOption] = useState<string>('custom');
  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // State for reminder dialog
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [reminderDate, setReminderDate] = useState<Date>(addDays(new Date(), 7));
  const [remainingBalance, setRemainingBalance] = useState<number>(0);
  const { data: caterers, isLoading: caterersLoading } = useCaterers();
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const createDistribution = useCreateDistribution();
  const updateInventoryQuantity = useUpdateInventoryQuantity();

  // Get caterer ID from URL if present
  const searchParams = new URLSearchParams(window.location.search);
  const preselectedCatererId = searchParams.get('catererId');

  // Parse the caterer ID if it exists
  const initialCatererId = preselectedCatererId ? parseInt(preselectedCatererId) : 0;

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

  // Initialize the form with default values
  const form = useForm<BillFormValues>({
    resolver: zodResolver(billFormSchema),
    defaultValues: {
      billNo: generateBillNumber(),
      billDate: new Date(),
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // Default due date: 15 days from now
      catererId: initialCatererId,
      paymentMethod: '', // Empty by default, will be validated before submission
      amountPaid: 0, // Default amount paid
      notes: '',
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  // We don't need the product form anymore as we'll use dropdown selection

  // Group products by category
  const productsByCategory = React.useMemo(() => {
    if (!products) return {};

    return products.reduce((acc: Record<string, any[]>, product: any) => {
      const category = product.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(product);
      return acc;
    }, {});
  }, [products]);

  // Add product to bill
  const addProductToBill = (product: any) => {
    // Validate product before adding
    if (!product || !product.id || !product.name) {
      console.warn('Invalid product data:', product);
      return;
    }

    // Check if product is already in the bill
    const existingItemIndex = fields.findIndex(item => item.productId === product.id);

    // Use catererPrice if available, otherwise fall back to regular price
    const productRate = product.catererPrice || product.price || 0;

    if (existingItemIndex >= 0) {
      // If product already exists, increment quantity
      const currentQuantity = form.getValues(`items.${existingItemIndex}.quantity`) || 0;
      const newQuantity = currentQuantity + 1;
      form.setValue(`items.${existingItemIndex}.quantity`, newQuantity);

      // Update amount with proper unit conversion
      const rate = form.getValues(`items.${existingItemIndex}.rate`) || 0;
      const unit = form.getValues(`items.${existingItemIndex}.unit`) || 'kg';
      form.setValue(`items.${existingItemIndex}.amount`, calculateItemAmount(newQuantity, unit, rate));
    } else {
      // Add new product to bill with default quantity of 1
      const defaultQuantity = 1;
      const defaultUnit = product.unit || 'kg';
      append({
        productId: product.id,
        productName: product.name, // Ensure product name is set
        quantity: defaultQuantity,
        unit: defaultUnit,
        rate: productRate,
        gstPercentage: 5, // Default GST percentage
        amount: calculateItemAmount(defaultQuantity, defaultUnit, productRate), // Calculate initial amount with unit conversion
      });
    }

    // Trigger calculation after adding/updating product
    setTimeout(() => {
      calculateTotals();
    }, 100);
  };

  // State to track batch-selected quantities for each product
  const [productBatchQuantities, setProductBatchQuantities] = useState<Record<number, number>>({});

  // State to track units for each product
  const [productUnits, setProductUnits] = useState<Record<number, UnitType>>({});

  // Handle batch selection for a product
  const handleBatchSelect = (productId: number, batchIds: number[], quantities: number[], totalQuantity: number, unit: UnitType) => {
    console.log(`handleBatchSelect called with productId: ${productId}, totalQuantity: ${totalQuantity}, unit: ${unit}`);

    // Update selected batches
    setSelectedBatches(prev => ({
      ...prev,
      [productId]: { batchIds, quantities }
    }));

    // Update the product's quantity based on batch selection
    setProductBatchQuantities(prev => ({
      ...prev,
      [productId]: totalQuantity
    }));

    // Update the product's unit
    setProductUnits(prev => ({
      ...prev,
      [productId]: unit
    }));

    // Update the form field with the new quantity
    const itemIndex = fields.findIndex(field => field.productId === productId);
    if (itemIndex !== -1) {
      console.log(`Updating form field for item at index ${itemIndex} with quantity ${totalQuantity}`);

      // Format to ensure consistent numeric handling
      const formattedQuantity = Number(totalQuantity.toFixed(2));

      form.setValue(`items.${itemIndex}.quantity`, formattedQuantity, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true
      });

      // Also update the amount based on the new quantity and current rate with unit conversion
      const rate = form.getValues(`items.${itemIndex}.rate`);
      form.setValue(`items.${itemIndex}.amount`, calculateItemAmount(formattedQuantity, unit, rate), {
        shouldDirty: true
      });

      // Manually trigger calculation
      calculateTotals();

      // Force a re-render to ensure the UI updates
      setTimeout(() => {
        form.trigger(`items.${itemIndex}.quantity`);
      }, 50);
    } else {
      console.warn(`Could not find item with productId ${productId} in form fields`);
    }
  };

  // Handle quantity change from batch selector
  const handleQuantityChange = (productId: number, totalQuantity: number) => {
    console.log(`handleQuantityChange called with productId: ${productId}, totalQuantity: ${totalQuantity}`);

    // Update the product's quantity based on batch selection
    setProductBatchQuantities(prev => ({
      ...prev,
      [productId]: totalQuantity
    }));

    // Update the form field with the new quantity
    const itemIndex = fields.findIndex(field => field.productId === productId);
    if (itemIndex !== -1) {
      console.log(`Updating form field for item at index ${itemIndex} with quantity ${totalQuantity}`);

      // Format to ensure consistent numeric handling
      const formattedQuantity = Number(totalQuantity.toFixed(2));

      form.setValue(`items.${itemIndex}.quantity`, formattedQuantity, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true
      });

      // Also update the amount based on the new quantity and current rate with unit conversion
      const rate = form.getValues(`items.${itemIndex}.rate`);
      const unit = form.getValues(`items.${itemIndex}.unit`) || 'kg';
      form.setValue(`items.${itemIndex}.amount`, calculateItemAmount(formattedQuantity, unit, rate), {
        shouldDirty: true
      });

      // Manually trigger calculation
      calculateTotals();

      // Force a re-render to ensure the UI updates
      setTimeout(() => {
        form.trigger(`items.${itemIndex}.quantity`);
      }, 50);
    } else {
      console.warn(`Could not find item with productId ${productId} in form fields`);
    }
  };

  // Handle required quantity change from batch selector input
  const handleRequiredQuantityChange = (productId: number, requiredQuantity: number) => {
    console.log(`handleRequiredQuantityChange called with productId: ${productId}, requiredQuantity: ${requiredQuantity}`);

    // Update the product's quantity based on batch selection
    setProductBatchQuantities(prev => ({
      ...prev,
      [productId]: requiredQuantity
    }));

    // Update the form field with the new quantity
    const itemIndex = fields.findIndex(field => field.productId === productId);
    if (itemIndex !== -1) {
      console.log(`Updating form field for item at index ${itemIndex} with quantity ${requiredQuantity}`);

      // Format to ensure consistent numeric handling
      const formattedQuantity = Number(requiredQuantity.toFixed(2));

      form.setValue(`items.${itemIndex}.quantity`, formattedQuantity, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true
      });

      // Also update the amount based on the new quantity and current rate with unit conversion
      const rate = form.getValues(`items.${itemIndex}.rate`);
      const unit = form.getValues(`items.${itemIndex}.unit`) || 'kg';
      form.setValue(`items.${itemIndex}.amount`, calculateItemAmount(formattedQuantity, unit, rate), {
        shouldDirty: true
      });

      // Manually trigger calculation
      calculateTotals();

      // Force a re-render to ensure the UI updates
      setTimeout(() => {
        form.trigger(`items.${itemIndex}.quantity`);
      }, 50);
    } else {
      console.warn(`Could not find item with productId ${productId} in form fields`);
    }
  };

  // Handle unit change from batch selector
  const handleUnitChange = (productId: number, unit: UnitType, convertedQuantity: number) => {
    console.log(`handleUnitChange called with productId: ${productId}, unit: ${unit}, convertedQuantity: ${convertedQuantity}`);

    // Update the product's unit
    setProductUnits(prev => ({
      ...prev,
      [productId]: unit
    }));

    // Update the product's quantity based on the conversion
    setProductBatchQuantities(prev => ({
      ...prev,
      [productId]: convertedQuantity
    }));

    // Update the form field with the new unit and quantity
    const itemIndex = fields.findIndex(field => field.productId === productId);
    if (itemIndex !== -1) {
      console.log(`Updating form field for item at index ${itemIndex} with unit ${unit} and quantity ${convertedQuantity}`);

      // Format to ensure consistent numeric handling
      const formattedQuantity = Number(convertedQuantity.toFixed(2));

      // Update unit
      form.setValue(`items.${itemIndex}.unit`, unit, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true
      });

      // Update quantity
      form.setValue(`items.${itemIndex}.quantity`, formattedQuantity, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true
      });

      // Also update the amount based on the new quantity and current rate with unit conversion
      const rate = form.getValues(`items.${itemIndex}.rate`);
      form.setValue(`items.${itemIndex}.amount`, calculateItemAmount(formattedQuantity, unit, rate), {
        shouldDirty: true
      });

      // Manually trigger calculation
      calculateTotals();

      // Force a re-render to ensure the UI updates
      setTimeout(() => {
        form.trigger(`items.${itemIndex}.quantity`);
      }, 50);
    } else {
      console.warn(`Could not find item with productId ${productId} in form fields`);
    }
  };

  // Handle receipt image upload
  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPEG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    // Set the file and create a preview
    setReceiptImage(file);
    setReceiptPreview(URL.createObjectURL(file));
  };

  // Remove receipt image
  const removeReceiptImage = () => {
    setReceiptImage(null);
    if (receiptPreview) {
      URL.revokeObjectURL(receiptPreview);
      setReceiptPreview(null);
    }
  };

  // Upload receipt image to server
  const uploadReceiptImage = async (): Promise<string | null> => {
    if (!receiptImage) return null;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('receipt', receiptImage);

      const response = await fetch('/api/receipts/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const data = await response.json();
      return data.filename;
    } catch (error) {
      console.error('Receipt upload error:', error);
      toast({
        title: "Failed to upload receipt",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Helper function to calculate amount with proper unit conversion
  const calculateItemAmount = (quantity: number, unit: string, rate: number): number => {
    // Rate is always per kg, so we need to convert quantity to kg if it's in grams
    let quantityInKg = quantity;

    if (unit === 'g') {
      // Convert grams to kilograms
      quantityInKg = quantity / 1000;
      console.log(`Unit conversion: ${quantity}g = ${quantityInKg}kg`);
    }
    // If unit is 'kg' or any other unit, use quantity as is

    const amount = Number((quantityInKg * rate).toFixed(2));
    console.log(`Amount calculation: ${quantityInKg}kg × ₹${rate}/kg = ₹${amount}`);

    return amount;
  };

  // State for storing calculated totals
  const [calculatedTotals, setCalculatedTotals] = useState({
    totalAmount: 0,
    totalGstAmount: 0,
    grandTotal: 0,
    balanceDue: 0
  });

  // Calculate totals with debouncing to prevent excessive calculations
  const calculateTotals = React.useCallback(() => {
    try {
      const items = form.getValues('items');
      console.log('=== CALCULATE TOTALS START ===');
      console.log('Raw items from form:', items);

      if (!items || items.length === 0) {
        const emptyTotals = {
          totalAmount: 0,
          totalGstAmount: 0,
          grandTotal: 0,
          balanceDue: 0
        };
        setCalculatedTotals(emptyTotals);
        console.log('No items, setting empty totals:', emptyTotals);
        console.log('=== CALCULATE TOTALS END ===');
        return emptyTotals;
      }

      // Filter items first and log what we're working with
      const validItems = items.filter(item =>
        item.productName &&
        item.productName.trim() !== '' &&
        item.quantity > 0 // Only include items with quantity greater than 0
      );

      console.log('Valid items after filtering:', validItems);

      let totalAmount = 0;
      let totalGstAmount = 0;

      validItems.forEach((item, index) => {
        // Make sure quantity and rate are valid numbers with proper formatting
        const quantity = Number((parseFloat(item.quantity?.toString() || '0') || 0).toFixed(2));
        const rate = Number((parseFloat(item.rate?.toString() || '0') || 0).toFixed(2));
        const gstPercentage = Number((parseFloat(item.gstPercentage?.toString() || '0') || 0).toFixed(2));
        const unit = item.unit || 'kg';

        console.log(`Processing item ${index} (${item.productName}):`);
        console.log(`  - quantity: ${quantity} ${unit}`);
        console.log(`  - rate: ₹${rate}`);
        console.log(`  - gst: ${gstPercentage}%`);

        // Calculate item total with proper unit conversion
        const itemTotal = calculateItemAmount(quantity, unit, rate);

        // Calculate GST amount with proper formatting
        const gstAmount = Number(((itemTotal * gstPercentage) / 100).toFixed(2));

        console.log(`  - itemTotal: ₹${itemTotal}`);
        console.log(`  - gstAmount: ₹${gstAmount}`);

        totalAmount = Number((totalAmount + itemTotal).toFixed(2));
        totalGstAmount = Number((totalGstAmount + gstAmount).toFixed(2));

        console.log(`  - running totalAmount: ₹${totalAmount}`);
        console.log(`  - running totalGstAmount: ₹${totalGstAmount}`);
      });

      // Get amount paid from form with proper formatting
      const amountPaid = Number((form.getValues('amountPaid') || 0).toFixed(2));
      const grandTotal = Number((totalAmount + totalGstAmount).toFixed(2));
      const balanceDue = Number((Math.max(0, grandTotal - amountPaid)).toFixed(2));

      const totals = {
        totalAmount,
        totalGstAmount,
        grandTotal,
        balanceDue
      };

      console.log('FINAL CALCULATED TOTALS:', totals);
      console.log('=== CALCULATE TOTALS END ===');

      // Update the state with calculated totals
      setCalculatedTotals(totals);

      return totals;
    } catch (error) {
      console.error('Error calculating totals:', error);
      const errorTotals = {
        totalAmount: 0,
        totalGstAmount: 0,
        grandTotal: 0,
        balanceDue: 0
      };
      setCalculatedTotals(errorTotals);
      return errorTotals;
    }
  }, [form, calculateItemAmount]);

  // Handle payment option change
  const handlePaymentOptionChange = (option: string) => {
    setPaymentOption(option);

    // Update amount paid based on selected option
    switch (option) {
      case 'full':
        // Set amount paid to grand total
        form.setValue('amountPaid', calculatedTotals.grandTotal, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true
        });
        break;
      case 'half':
        // Set amount paid to 50% of grand total
        form.setValue('amountPaid', calculatedTotals.grandTotal / 2, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true
        });
        break;
      case 'later':
        // Set amount paid to 0
        form.setValue('amountPaid', 0, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true
        });
        break;
      case 'custom':
        // Keep current value or set to 0 if not set
        if (form.getValues('amountPaid') === undefined) {
          form.setValue('amountPaid', 0, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true
          });
        }
        break;
    }

    // Recalculate totals
    calculateTotals();
  };

  // Watch for changes in form fields to recalculate totals
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      // Recalculate for any field changes that affect totals
      if (name?.includes('amountPaid') ||
          name?.includes('gstPercentage') ||
          name?.includes('quantity') ||
          name?.includes('rate') ||
          name?.includes('items')) {
        // Use setTimeout to prevent blocking the UI
        setTimeout(() => {
          calculateTotals();
        }, 0);
      }
    });

    // Initial calculation with timeout to prevent blocking
    setTimeout(() => {
      calculateTotals();
    }, 100);

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe();
  }, []); // Remove form.watch dependency to prevent infinite loops

  // Function to clean up empty rows
  const cleanupEmptyRows = useCallback(() => {
    const items = form.getValues('items');
    if (!items) return;

    // Find indices of empty rows (rows without product names)
    const emptyRowIndices = items
      .map((item, index) => (!item.productName || item.productName.trim() === '') ? index : -1)
      .filter(index => index !== -1)
      .reverse(); // Reverse to remove from end to beginning to maintain correct indices

    // Remove empty rows
    emptyRowIndices.forEach(index => {
      remove(index);
    });
  }, [form, remove]);

  // Additional effect to recalculate when fields array changes
  useEffect(() => {
    // Clean up empty rows first
    cleanupEmptyRows();
    // Then calculate totals
    calculateTotals();
  }, [fields.length, calculateTotals, cleanupEmptyRows]);

  // Force initial calculation on mount
  useEffect(() => {
    // Reset calculated totals to ensure clean state
    setCalculatedTotals({
      totalAmount: 0,
      totalGstAmount: 0,
      grandTotal: 0,
      balanceDue: 0
    });

    // Force calculation after a short delay
    setTimeout(() => {
      calculateTotals();
    }, 200);
  }, []); // Only run on mount

  // Handle form submission with improved error handling
  const onSubmit = async (data: BillFormValues) => {
    console.log("onSubmit function called with data:", data);

    // Set loading state immediately
    setIsUploading(true);

    try {
      // Validate required fields first
      if (!data.catererId || data.catererId === 0) {
        toast({
          title: "Caterer Required",
          description: "Please select a caterer before saving the bill.",
          variant: "destructive"
        });
        setIsUploading(false);
        return;
      }

      if (!data.items || data.items.length === 0) {
        toast({
          title: "Products Required",
          description: "Please add at least one product to the bill.",
          variant: "destructive"
        });
        setIsUploading(false);
        return;
      }

      // Check if all products have batch selections (warning only, not blocking)
      console.log("Checking batch selections...");
      const missingBatchSelections = data.items.some(item => {
        const hasBatches = selectedBatches[item.productId];
        const batchQuantity = hasBatches
          ? Number(selectedBatches[item.productId].quantities.reduce((sum, qty) => Number(sum) + Number(qty), 0).toFixed(2))
          : 0;
        return !hasBatches || batchQuantity < item.quantity;
      });

      console.log("Missing batch selections:", missingBatchSelections);

      if (missingBatchSelections) {
        console.log("Showing batch selection warning");
        const proceed = window.confirm(
          "Warning: You haven't selected inventory batches for all products. " +
          "This means inventory won't be automatically updated. " +
          "Do you want to proceed anyway?"
        );

        if (!proceed) {
          console.log("User chose not to proceed without batch selection");
          setIsUploading(false);
          return;
        }

        console.log("User chose to proceed without batch selection");
      }

      // Validate payment information only if not paying later
      if (paymentOption !== 'later') {
        if (!data.paymentMethod || data.paymentMethod.trim() === '') {
          toast({
            title: "Payment Method Required",
            description: "Please select a payment method when making a payment.",
            variant: "destructive"
          });
          setIsUploading(false);
          return;
        }

        if (!data.amountPaid || data.amountPaid <= 0) {
          toast({
            title: "Invalid Payment Amount",
            description: "Please enter a valid payment amount greater than 0.",
            variant: "destructive"
          });
          setIsUploading(false);
          return;
        }
      }

      // Upload receipt image if one is selected (optional, non-blocking)
      let receiptFilename = null;
      if (receiptImage) {
        try {
          console.log("Uploading receipt image...");

          // Add timeout for receipt upload to prevent hanging
          const uploadPromise = uploadReceiptImage();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Upload timeout')), 30000) // 30 second timeout
          );

          receiptFilename = await Promise.race([uploadPromise, timeoutPromise]);
          console.log("Receipt uploaded successfully:", receiptFilename);

          toast({
            title: "Receipt Uploaded",
            description: "Receipt image has been attached to the bill.",
          });
        } catch (error) {
          console.error("Receipt upload failed:", error);
          toast({
            title: "Receipt Upload Failed",
            description: "Failed to upload receipt image. The bill will be saved without the receipt.",
            variant: "destructive"
          });
          // Continue with bill creation even if receipt upload fails
          receiptFilename = null;
        }
      }

      const { totalAmount, totalGstAmount, grandTotal } = calculatedTotals;

      // Prepare items data with proper unit conversion
      const items = data.items.map(item => {
        const itemAmount = calculateItemAmount(item.quantity, item.unit, item.rate);
        const gstAmount = (itemAmount * item.gstPercentage) / 100;

        return {
          productId: item.productId,
          itemName: item.productName || '', // Changed from productName to itemName to match schema
          quantity: item.quantity.toString(), // Convert to string to match schema
          unit: item.unit,
          rate: item.rate.toString(), // Convert to string to match schema
          gstPercentage: item.gstPercentage.toString(), // Convert to string to match schema
          gstAmount: gstAmount.toString(), // Convert to string to match schema with proper unit conversion
          amount: itemAmount.toString(), // Convert to string to match schema with proper unit conversion
        };
      });

      // Get amount paid from form
      const amountPaid = data.amountPaid || 0;
      const balanceDue = Math.max(0, grandTotal - amountPaid);

      // Determine status based on payment
      const status = balanceDue <= 0 ? 'paid' : 'partial';

      // Check if reminder is needed for partial payments
      if (balanceDue > 0 && amountPaid > 0 && paymentOption !== 'later') {
        setRemainingBalance(balanceDue);
        setShowReminderDialog(true);
        setIsUploading(false); // Reset loading state
        return; // Wait for reminder dialog completion
      }

      // Prepare distribution data
      const distributionData = {
        billNo: data.billNo,
        catererId: data.catererId,
        distributionDate: format(data.billDate, 'yyyy-MM-dd'),
        // dueDate is not in the database schema, so we'll remove it
        totalAmount: totalAmount.toString(),
        totalGstAmount: totalGstAmount.toString(),
        grandTotal: grandTotal.toString(),
        amountPaid: amountPaid.toString(),
        balanceDue: balanceDue.toString(),
        paymentMode: data.paymentMethod, // Changed from paymentMethod to paymentMode to match DB schema
        status: status,
        notes: data.notes || '',
        receiptImage: receiptFilename, // Add receipt image filename
        items: items, // Use the items array directly, already formatted correctly
      };

      // Log the data we're sending
      console.log("Submitting distribution data:", JSON.stringify(distributionData, null, 2));

      try {
        // Submit the distribution
        const result = await createDistribution.mutateAsync(distributionData);
        console.log("Distribution created successfully:", result);
      } catch (error) {
        console.error("Error creating distribution:", error);
        // Show error toast
        toast({
          title: "Error Creating Bill",
          description: error instanceof Error ? error.message : "An unknown error occurred",
          variant: "destructive"
        });
        setIsUploading(false);
        throw error; // Re-throw to be caught by the outer try/catch
      }

      // Update inventory quantities for each batch (only if batches were selected)
      const updatePromises: Promise<any>[] = [];
      let updatedInventory = false;

      // Process each product's batches
      for (const item of data.items) {
        const productBatches = selectedBatches[item.productId];
        if (productBatches && productBatches.batchIds && productBatches.batchIds.length > 0) {
          console.log(`Updating inventory for product ${item.productId} (${item.productName})`);

          // Update each batch's quantity
          for (let i = 0; i < productBatches.batchIds.length; i++) {
            const batchId = productBatches.batchIds[i];
            const quantity = productBatches.quantities[i];

            // Only update if quantity > 0
            if (quantity > 0) {
              console.log(`Updating batch ${batchId} with quantity ${quantity}`);
              updatedInventory = true;

              updatePromises.push(
                updateInventoryQuantity.mutateAsync({
                  id: batchId,
                  quantity: quantity,
                  isAddition: false // Subtract from inventory
                }).then(() => {
                  console.log(`Successfully updated batch ${batchId}`);
                }).catch(error => {
                  console.error(`Error updating batch ${batchId}:`, error);
                })
              );
            }
          }
        } else {
          console.log(`No batches selected for product ${item.productId} (${item.productName}), skipping inventory update`);
        }
      }

      // Wait for all inventory updates to complete
      if (updatePromises.length > 0) {
        console.log(`Updating ${updatePromises.length} inventory batches...`);
        await Promise.all(updatePromises);
        console.log("All inventory updates completed");

        if (updatedInventory) {
          toast({
            title: "Inventory Updated",
            description: "Inventory quantities have been updated successfully.",
          });
        }
      } else {
        console.log("No inventory updates needed");
      }

      // Show success toast
      toast({
        title: "Bill Saved Successfully",
        description: `Bill ${data.billNo} has been created successfully.`,
        variant: "default"
      });

      // Clear form state to prevent lingering issues
      form.reset();
      setSelectedBatches({});
      setProductBatchQuantities({});
      setProductUnits({});
      setReceiptImage(null);
      setReceiptPreview(null);

      // Navigate back to caterers page as requested
      setTimeout(() => {
        navigate('/caterers');
      }, 1500); // Add a small delay to allow the user to see the success message

    } catch (error) {
      console.error('Error creating distribution:', error);

      // Show error toast if not already shown
      toast({
        title: "Error Creating Bill",
        description: error instanceof Error ? error.message : "An unexpected error occurred while creating the bill.",
        variant: "destructive"
      });
    } finally {
      // Always reset loading state
      setIsUploading(false);
    }
  };

  // Handle adding a new product
  const handleAddProduct = (data: ProductFormValues) => {
    setNewProduct(data);
    productForm.reset();
  };

  // Handle skipping reminder
  const handleSkipReminder = async () => {
    setShowReminderDialog(false);
    await proceedWithBillCreation();
  };

  // Handle reminder confirmation
  const handleReminderConfirm = async () => {
    setShowReminderDialog(false);

    const formData = form.getValues();

    try {
      // First, create the payment reminder
      const reminderData = {
        catererId: formData.catererId,
        amount: remainingBalance,
        originalDueDate: formData.dueDate,
        reminderDate: reminderDate,
        notes: `Reminder for remaining balance after partial payment of ₹${(formData.amountPaid || 0).toLocaleString()}. Original due date: ${format(formData.dueDate, 'PPP')}`
      };

      console.log("Creating payment reminder:", reminderData);

      const reminderResponse = await fetch('/api/payment-reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(reminderData),
      });

      if (!reminderResponse.ok) {
        throw new Error('Failed to create payment reminder');
      }

      toast({
        title: "Reminder Set",
        description: `Payment reminder set for ${format(reminderDate, 'PPP')} for remaining balance of ₹${remainingBalance.toLocaleString()}`,
      });

      // Continue with bill creation
      await proceedWithBillCreation();
    } catch (error) {
      console.error('Error creating reminder:', error);
      toast({
        title: "Failed to create reminder",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
      // Still proceed with bill creation even if reminder fails
      await proceedWithBillCreation();
    }
  };

  // Proceed with bill creation (extracted from onSubmit)
  const proceedWithBillCreation = async () => {
    const data = form.getValues();
    setIsUploading(true);

    try {
      const { totalAmount, totalGstAmount, grandTotal } = calculatedTotals;

      // Prepare items data with proper unit conversion
      const items = data.items.map(item => {
        const itemAmount = calculateItemAmount(item.quantity, item.unit, item.rate);
        const gstAmount = (itemAmount * item.gstPercentage) / 100;

        return {
          productId: item.productId,
          itemName: item.productName || '', // Changed from productName to itemName to match schema
          quantity: item.quantity.toString(), // Convert to string to match schema
          unit: item.unit,
          rate: item.rate.toString(), // Convert to string to match schema
          gstPercentage: item.gstPercentage.toString(), // Convert to string to match schema
          gstAmount: gstAmount.toString(), // Convert to string to match schema with proper unit conversion
          amount: itemAmount.toString(), // Convert to string to match schema with proper unit conversion
        };
      });

      // Get amount paid from form
      const amountPaid = data.amountPaid || 0;
      const balanceDue = Math.max(0, grandTotal - amountPaid);

      // Determine status based on payment
      const status = balanceDue <= 0 ? 'paid' : 'partial';

      // Prepare distribution data
      const distributionData = {
        billNo: data.billNo,
        catererId: data.catererId,
        distributionDate: format(data.billDate, 'yyyy-MM-dd'),
        totalAmount: totalAmount.toString(),
        totalGstAmount: totalGstAmount.toString(),
        grandTotal: grandTotal.toString(),
        amountPaid: amountPaid.toString(),
        balanceDue: balanceDue.toString(),
        paymentMode: data.paymentMethod,
        status: status,
        notes: data.notes || '',
        receiptImage: null, // Will be handled separately
        items: items,
      };

      // Submit the distribution
      const result = await createDistribution.mutateAsync(distributionData);
      console.log("Distribution created successfully:", result);

      // Handle inventory updates (existing code)
      const updatePromises: Promise<any>[] = [];
      let updatedInventory = false;

      for (const item of data.items) {
        const productBatches = selectedBatches[item.productId];
        if (productBatches && productBatches.batchIds && productBatches.batchIds.length > 0) {
          for (let i = 0; i < productBatches.batchIds.length; i++) {
            const batchId = productBatches.batchIds[i];
            const quantity = productBatches.quantities[i];

            if (quantity > 0) {
              updatedInventory = true;
              updatePromises.push(
                updateInventoryQuantity.mutateAsync({
                  id: batchId,
                  quantity: quantity,
                  isAddition: false
                })
              );
            }
          }
        }
      }

      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
        if (updatedInventory) {
          toast({
            title: "Inventory Updated",
            description: "Inventory quantities have been updated successfully.",
          });
        }
      }

      // Show success toast
      toast({
        title: "Bill Saved Successfully",
        description: `Bill ${data.billNo} has been created successfully.`,
        variant: "default"
      });

      // Clear form state
      form.reset();
      setSelectedBatches({});
      setProductBatchQuantities({});
      setProductUnits({});
      setReceiptImage(null);
      setReceiptPreview(null);

      // Navigate back to caterers page
      setTimeout(() => {
        navigate('/caterers');
      }, 1500);

    } catch (error) {
      console.error('Error creating distribution:', error);
      toast({
        title: "Error Creating Bill",
        description: error instanceof Error ? error.message : "An unexpected error occurred while creating the bill.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      {/* Header with back button and save button */}
      <div className="mb-6 flex justify-between items-center">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (preselectedCatererId) {
              navigate(`/caterers/${preselectedCatererId}`);
            } else {
              navigate('/caterers');
            }
          }}
          className="flex items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {preselectedCatererId ? 'Back to Caterer' : 'Back to Caterers'}
        </Button>

        <Button
          onClick={form.handleSubmit(onSubmit)}
          className="bg-secondary hover:bg-secondary/80 text-white flex items-center"
          disabled={createDistribution.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          Save Bill
        </Button>
      </div>

      {/* Company Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-16 h-16 bg-secondary rounded-full flex items-center justify-center text-white font-bold text-xl">
            RSM
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Royal Spicy Masala</h1>
            <p className="text-gray-600">Premium Spices & Dry Fruits Wholesaler</p>
            <div className="flex gap-4 mt-1 text-sm text-gray-500">
              <span>+91-9876543210</span>
              <span>info@royalspicy.com</span>
              <span>www.royalspicy.com</span>
            </div>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-600 italic">
          We are a trusted wholesale supplier delivering top-grade spices and dry fruits to businesses nationwide with unbeatable quality and service.
        </div>
      </div>

      {/* Bill Details Section */}
      <div className="mb-6">
        <Card>
          <CardHeader className="bg-primary/10 pb-3">
            <CardTitle className="text-lg flex items-center">
              <FileText className="h-5 w-5 mr-2 text-primary" />
              Bill Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <Form {...form}>
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="billNo">Bill Number</Label>
                    <Input
                      id="billNo"
                      {...form.register('billNo')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="billDate">Bill Date</Label>
                    <Controller
                      name="billDate"
                      control={form.control}
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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="catererId">Caterer *</Label>
                    <Controller
                      name="catererId"
                      control={form.control}
                      render={({ field }) => (
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value ? field.value.toString() : ""}
                        >
                          <SelectTrigger className={cn("w-full", form.formState.errors.catererId && "border-red-500")}>
                            <SelectValue placeholder="Select Caterer" />
                          </SelectTrigger>
                          <SelectContent>
                            {caterers?.map((caterer: any) => (
                              <SelectItem key={caterer.id} value={caterer.id.toString()}>
                                {caterer.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.catererId && (
                      <p className="text-sm text-red-500">{form.formState.errors.catererId.message}</p>
                    )}
                  </div>
                </div>



                <div className="space-y-2 mt-4">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any additional notes here"
                    {...form.register('notes')}
                    rows={2}
                  />
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Products and Selection Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Left Column - Add Product Section */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader className="bg-secondary/10 pb-3">
              <CardTitle className="text-lg flex items-center">
                <Plus className="h-5 w-5 mr-2 text-secondary" />
                Add Product
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    onValueChange={(value) => setSelectedCategory(value)}
                    value={selectedCategory}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="— Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories?.map((category: any) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <Label htmlFor="product">Product</Label>
                  <Select
                    onValueChange={(value) => {
                      const productId = parseInt(value);
                      const product = products?.find(p => p.id === productId);
                      if (product) {
                        addProductToBill(product);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="— Select Product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products
                        ?.filter(product => selectedCategory === 'all' || product.categoryId.toString() === selectedCategory)
                        .map((product: any) => (
                          <SelectItem key={product.id} value={product.id.toString()}>
                            {product.name} - {formatCurrency(product.catererPrice || product.price || 0)} / {product.unit}
                            {product.catererPrice ? ' (Caterer Price)' : ''}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Selected Products Section */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="bg-green-50 pb-3 border-b border-green-100">
              <CardTitle className="text-lg flex items-center text-green-700">
                <ChefHat className="h-5 w-5 mr-2" />
                Selected Products
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold w-[35%]">Product</TableHead>
                  <TableHead className="text-center font-semibold w-[20%]">Quantity</TableHead>
                  <TableHead className="text-right font-semibold w-[15%]">Rate</TableHead>
                  <TableHead className="text-center font-semibold w-[10%]">GST %</TableHead>
                  <TableHead className="text-right font-semibold w-[15%]">Amount</TableHead>
                  <TableHead className="w-[5%]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                      No products added. Select a product from the dropdown above to add it to the bill.
                    </TableCell>
                  </TableRow>
                ) : (
                  fields
                    .filter(field => field.productName && field.productName.trim() !== '') // Only show rows with valid product names
                    .map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell className="py-4">
                        <div className="flex flex-col">
                          <span className="font-medium">{field.productName}</span>
                          <div className="mt-4">
                            <InventoryBatchSelector
                              productId={field.productId}
                              quantity={field.quantity}
                              unit={productUnits[field.productId] || field.unit as UnitType}
                              onBatchSelect={(batchIds, quantities, totalQuantity, unit) =>
                                handleBatchSelect(field.productId, batchIds, quantities, totalQuantity, unit)
                              }
                              onQuantityChange={(totalQuantity) =>
                                handleQuantityChange(field.productId, totalQuantity)
                              }
                              onRequiredQuantityChange={(requiredQuantity) =>
                                handleRequiredQuantityChange(field.productId, requiredQuantity)
                              }
                              onUnitChange={(unit, convertedQuantity) =>
                                handleUnitChange(field.productId, unit, convertedQuantity)
                              }
                              disabled={createDistribution.isPending}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-4">
                        <div className="flex flex-col items-center space-y-3">
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              className="w-20 text-center"
                              value={form.watch(`items.${index}.quantity`) || ''}
                              onChange={(e) => {
                                const value = e.target.value;

                                // Allow empty string for better UX
                                if (value === '') {
                                  form.setValue(`items.${index}.quantity`, 0, {
                                    shouldDirty: true,
                                    shouldTouch: true,
                                    shouldValidate: true
                                  });
                                  return;
                                }

                                const numValue = parseFloat(value);

                                // Only update if it's a valid positive number
                                if (!isNaN(numValue) && numValue > 0) {
                                  // Update the form field
                                  form.setValue(`items.${index}.quantity`, numValue, {
                                    shouldDirty: true,
                                    shouldTouch: true,
                                    shouldValidate: true
                                  });

                                  // Also update the productBatchQuantities state
                                  setProductBatchQuantities(prev => ({
                                    ...prev,
                                    [field.productId]: numValue
                                  }));

                                  // Update the amount based on the new quantity and current rate with unit conversion
                                  const rate = form.getValues(`items.${index}.rate`) || 0;
                                  const unit = form.getValues(`items.${index}.unit`) || 'kg';
                                  const amount = calculateItemAmount(numValue, unit, rate);
                                  form.setValue(`items.${index}.amount`, amount, {
                                    shouldDirty: true
                                  });

                                  // Manually trigger calculation
                                  calculateTotals();
                                }
                              }}
                              placeholder="0"
                            />
                            <UnitSelector
                              value={productUnits[field.productId] || field.unit as UnitType}
                              onChange={(newUnit, convertedQuantity) => {
                                if (convertedQuantity !== undefined) {
                                  handleUnitChange(field.productId, newUnit, convertedQuantity);
                                }
                              }}
                              quantity={field.quantity}
                            />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatQuantityWithUnit(
                              form.watch(`items.${index}.quantity`) || 0,
                              productUnits[field.productId] || form.watch(`items.${index}.unit`) as UnitType,
                              true
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-20 text-right"
                          value={form.watch(`items.${index}.rate`) || ''}
                          onChange={(e) => {
                            const value = e.target.value;

                            // Allow empty string for better UX
                            if (value === '') {
                              form.setValue(`items.${index}.rate`, 0, {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true
                              });
                              return;
                            }

                            const numValue = parseFloat(value);

                            // Only update if it's a valid number
                            if (!isNaN(numValue) && numValue >= 0) {
                              form.setValue(`items.${index}.rate`, numValue, {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true
                              });

                              const quantity = form.getValues(`items.${index}.quantity`) || 0;
                              const unit = form.getValues(`items.${index}.unit`) || 'kg';
                              const amount = calculateItemAmount(quantity, unit, numValue);
                              form.setValue(`items.${index}.amount`, amount, {
                                shouldDirty: true
                              });

                              // Manually trigger calculation
                              calculateTotals();
                            }
                          }}
                          placeholder="0.00"
                        />
                      </TableCell>
                      <TableCell className="text-center py-4">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          className="w-14 text-center"
                          value={form.watch(`items.${index}.gstPercentage`) || ''}
                          onChange={(e) => {
                            const value = e.target.value;

                            // Allow empty string for better UX
                            if (value === '') {
                              form.setValue(`items.${index}.gstPercentage`, 0, {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true
                              });
                              calculateTotals();
                              return;
                            }

                            const numValue = parseFloat(value);

                            // Only update if it's a valid percentage (0-100)
                            if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                              form.setValue(`items.${index}.gstPercentage`, numValue, {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true
                              });

                              // Manually trigger calculation
                              calculateTotals();
                            }
                          }}
                          placeholder="5"
                        />
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <div className="font-medium text-lg">
                          {formatCurrency(calculateItemAmount(
                            form.watch(`items.${index}.quantity`) || 0,
                            form.watch(`items.${index}.unit`) || 'kg',
                            form.watch(`items.${index}.rate`) || 0
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            // Remove batch selection when item is removed
                            if (selectedBatches[field.productId]) {
                              setSelectedBatches(prev => {
                                const newState = {...prev};
                                delete newState[field.productId];
                                return newState;
                              });
                            }
                            remove(index);
                          }}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {fields.length > 0 && (
              <div className="p-4 border-t">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Subtotal:</span>
                      <span className="font-medium">{formatCurrency(calculatedTotals.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">GST:</span>
                      <span className="font-medium">{formatCurrency(calculatedTotals.totalGstAmount)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="font-medium">Grand Total:</span>
                      <span className="font-bold text-lg">{formatCurrency(calculatedTotals.grandTotal)}</span>
                    </div>
                    <div className="flex justify-center mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          console.log('Manual recalculation triggered');
                          const items = form.getValues('items');
                          console.log('Current form items:', items);
                          console.log('Current calculated totals:', calculatedTotals);
                          calculateTotals();
                        }}
                        className="text-xs"
                      >
                        <Calculator className="h-3 w-3 mr-1" />
                        Recalculate
                      </Button>
                    </div>
                    {/* Debug info - remove in production */}
                    <div className="mt-2 text-xs text-gray-500 space-y-1">
                      <div>Items count: {form.getValues('items')?.length || 0}</div>
                      <div>Calc state: {JSON.stringify(calculatedTotals)}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Section - Only shown when at least one product is added */}
            {fields.length > 0 && (
              <div className="p-4 border-t bg-gray-50">
                <h3 className="text-lg font-semibold mb-4">Payment Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="paymentOption">Payment Option</Label>
                      <Select
                        value={paymentOption}
                        onValueChange={handlePaymentOptionChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Payment Option" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full">Pay Full Amount ({formatCurrency(calculatedTotals.grandTotal)})</SelectItem>
                          <SelectItem value="half">Pay Half Amount ({formatCurrency(calculatedTotals.grandTotal / 2)})</SelectItem>
                          <SelectItem value="custom">Pay Custom Amount</SelectItem>
                          <SelectItem value="later">Pay Later (₹0)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="paymentMethod">Payment Method *</Label>
                      <Controller
                        name="paymentMethod"
                        control={form.control}
                        render={({ field }) => (
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={paymentOption === 'later'}
                          >
                            <SelectTrigger className={cn("w-full", form.formState.errors.paymentMethod && "border-red-500")}>
                              <SelectValue placeholder="Select Payment Method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="upi">UPI</SelectItem>
                              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                              <SelectItem value="cheque">Cheque</SelectItem>
                              <SelectItem value="credit">Credit</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {form.formState.errors.paymentMethod && (
                        <p className="text-sm text-red-500">{form.formState.errors.paymentMethod.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="amountPaid">Amount Paid *</Label>
                      <Input
                        id="amountPaid"
                        type="number"
                        min="0"
                        step="0.01"
                        {...form.register('amountPaid', { valueAsNumber: true })}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          form.setValue('amountPaid', value, {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true
                          });
                          // Manually trigger calculation
                          calculateTotals();
                          // Set payment option to custom if manually changed
                          setPaymentOption('custom');
                        }}
                        disabled={paymentOption !== 'custom' && paymentOption !== 'full' && paymentOption !== 'half'}
                        className={cn(
                          paymentOption === 'later' ? 'bg-gray-100' : '',
                          form.formState.errors.amountPaid && "border-red-500"
                        )}
                      />
                      {form.formState.errors.amountPaid && (
                        <p className="text-sm text-red-500">{form.formState.errors.amountPaid.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="balanceDue">Balance Due</Label>
                      <Input
                        id="balanceDue"
                        type="number"
                        value={calculatedTotals.balanceDue}
                        readOnly
                        className="bg-gray-50"
                      />
                      <p className="text-xs text-muted-foreground">
                        {calculatedTotals.balanceDue > 0
                          ? "Remaining amount to be paid later"
                          : "Payment complete"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Batch Selection Instructions and Receipt Upload */}
        <div className="lg:col-span-1">
          <div className="space-y-6">
            <Card>
              <CardContent className="p-4 text-sm">
                <h3 className="font-semibold mb-2 flex items-center">
                  <Package className="h-4 w-4 mr-2 text-primary" />
                  Inventory Batch Selection
                </h3>
                <p className="text-muted-foreground">
                  After adding products to your bill, click the "Select Batches" button for each product to choose which inventory batches to use.
                </p>
                <ul className="mt-2 space-y-1 list-disc pl-5">
                  <li>Select batches based on expiry dates</li>
                  <li>Specify quantities from each batch</li>
                  <li>Inventory will be automatically updated</li>
                </ul>
              </CardContent>
            </Card>

            {/* Receipt Upload Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center">
                  <Image className="h-4 w-4 mr-2 text-primary" />
                  Receipt Image (Optional)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-blue-200 dark:border-blue-900 rounded-lg p-4 text-center">
                  {receiptPreview ? (
                    <div className="space-y-3">
                      <img
                        src={receiptPreview}
                        alt="Receipt preview"
                        className="max-h-48 mx-auto object-contain"
                      />
                      <div className="flex justify-center space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={removeReceiptImage}
                          className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Upload className="h-10 w-10 mx-auto text-blue-400" />
                      <div className="text-blue-700 dark:text-blue-300">
                        <p className="font-medium text-xs">Upload Receipt Image</p>
                        <p className="text-xs text-blue-500 dark:text-blue-400">
                          Click to browse
                        </p>
                      </div>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleReceiptUpload}
                        className="hidden"
                        id="receipt-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('receipt-upload')?.click()}
                        className="border-blue-200 text-blue-700 hover:bg-blue-50"
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        Select Image
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column - Bill Summary */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="bg-primary/10 pb-3">
              <CardTitle className="text-lg flex items-center">
                <FileText className="h-5 w-5 mr-2 text-primary" />
                Bill Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Total Products</Label>
                    <div className="font-medium text-lg">{fields.length}</div>
                  </div>
                  <div className="space-y-2">
                    <Label>Total Amount</Label>
                    <div className="font-medium text-lg">{formatCurrency(calculatedTotals.grandTotal)}</div>
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <div className="font-medium text-lg capitalize">
                      {form.getValues('paymentMethod')?.replace('_', ' ') || 'Not selected'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount Paid</Label>
                    <div className="font-medium text-lg">{formatCurrency(form.getValues('amountPaid') || 0)}</div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Balance Due</Label>
                    <div className="font-medium text-lg text-red-600">{formatCurrency(calculatedTotals.balanceDue)}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Batch Selection Status</Label>
                  <div className="text-sm">
                    {fields.length === 0 ? (
                      <span className="text-muted-foreground">No products added yet</span>
                    ) : (
                      <div className="space-y-2">
                        {fields.map((field, index) => {
                          const hasBatches = selectedBatches[field.productId] &&
                            selectedBatches[field.productId].quantities.reduce((sum, qty) => sum + qty, 0) >= field.quantity;

                          return (
                            <div key={field.id} className="flex items-center justify-between">
                              <span>{field.productName}</span>
                              {hasBatches ? (
                                <span className="text-green-600 font-medium">✓ Batches Selected</span>
                              ) : (
                                <span className="text-red-600 font-medium">⚠ Batches Required</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {receiptPreview && (
                  <div className="space-y-2">
                    <Label>Receipt Image</Label>
                    <div className="text-green-600 font-medium flex items-center">
                      <Image className="h-4 w-4 mr-2" />
                      Receipt image attached
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Prominent Save Bill Button */}
      <div className="mt-8 mb-10 flex justify-center">
        <Button
          onClick={async (e) => {
            e.preventDefault();

            // Prevent multiple submissions
            if (createDistribution.isPending || isUploading) {
              return;
            }

            console.log("Save Bill button clicked");

            // Get current form values
            const formValues = form.getValues();
            console.log("Form values:", formValues);

            // Perform manual validation with better error handling
            try {
              // Basic validation checks
              if (!formValues.catererId || formValues.catererId === 0) {
                toast({
                  title: "Caterer Required",
                  description: "Please select a caterer before saving the bill.",
                  variant: "destructive"
                });
                return;
              }

              if (!formValues.items || formValues.items.length === 0) {
                toast({
                  title: "Products Required",
                  description: "Please add at least one product to the bill.",
                  variant: "destructive"
                });
                return;
              }

              // Validate payment information if not paying later
              if (paymentOption !== 'later') {
                if (!formValues.paymentMethod || formValues.paymentMethod.trim() === '') {
                  toast({
                    title: "Payment Method Required",
                    description: "Please select a payment method when making a payment.",
                    variant: "destructive"
                  });
                  return;
                }

                if (!formValues.amountPaid || formValues.amountPaid <= 0) {
                  toast({
                    title: "Invalid Payment Amount",
                    description: "Please enter a valid payment amount greater than 0.",
                    variant: "destructive"
                  });
                  return;
                }
              }

              // Validate item quantities and rates
              for (let i = 0; i < formValues.items.length; i++) {
                const item = formValues.items[i];
                if (!item.quantity || item.quantity <= 0) {
                  toast({
                    title: "Invalid Quantity",
                    description: `Please enter a valid quantity for ${item.productName || `item ${i + 1}`}.`,
                    variant: "destructive"
                  });
                  return;
                }
                if (!item.rate || item.rate < 0) {
                  toast({
                    title: "Invalid Rate",
                    description: `Please enter a valid rate for ${item.productName || `item ${i + 1}`}.`,
                    variant: "destructive"
                  });
                  return;
                }
              }

              // If all validations pass, submit the form
              console.log("All validations passed, submitting form...");
              await onSubmit(formValues);

            } catch (error) {
              console.error("Error during form submission:", error);
              toast({
                title: "Submission Error",
                description: "An error occurred while saving the bill. Please try again.",
                variant: "destructive"
              });
            }
          }}
          className="bg-primary hover:bg-primary/90 text-white flex items-center py-6 px-8 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={createDistribution.isPending || isUploading}
        >
          <Save className="h-5 w-5 mr-3" />
          {isUploading ? "Saving Bill..." : createDistribution.isPending ? "Processing..." : "Save Bill"}
          {(createDistribution.isPending || isUploading) && (
            <span className="ml-2">
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </span>
          )}
        </Button>
      </div>

      {/* Reminder Dialog */}
      <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
              Set Payment Reminder
            </DialogTitle>
            <DialogDescription>
              You have a remaining balance of ₹{remainingBalance.toLocaleString()}.
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700 font-medium">
                  ⚠️ Payment is due on {format(form.getValues('dueDate'), 'PPP')}
                </p>
              </div>
              <div className="mt-2">
                Would you like to set a reminder for the next payment?
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <h4 className="font-medium text-slate-900 mb-2">Bill Details</h4>
              <div className="text-sm text-slate-600 space-y-1">
                <p><span className="font-medium">Bill No:</span> {form.getValues('billNo')}</p>
                <p><span className="font-medium">Bill Date:</span> {format(form.getValues('billDate'), 'PPP')}</p>
                <p><span className="font-medium">Total Amount:</span> ₹{calculatedTotals.grandTotal.toLocaleString()}</p>
                <p><span className="font-medium">Amount Paying Now:</span> ₹{(form.getValues('amountPaid') || 0).toLocaleString()}</p>
                <p><span className="font-medium text-orange-600">Remaining Balance:</span> ₹{remainingBalance.toLocaleString()}</p>
                <p><span className="font-medium text-red-600">Payment Due:</span> {format(form.getValues('dueDate'), 'PPP')}</p>
              </div>
            </div>
            <div>
              <Label>Next Payment Reminder Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(reminderDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={reminderDate}
                    onSelect={(date) => date && setReminderDate(date)}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-slate-500 mt-1">
                Choose a future date when you want to be reminded about the remaining payment
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleSkipReminder}>
              Skip Reminder
            </Button>
            <Button onClick={handleReminderConfirm}>
              Set Reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
