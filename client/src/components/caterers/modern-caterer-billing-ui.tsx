import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { CalendarIcon, Plus, Trash2, Save, ArrowLeft, Calculator, ChefHat, FileText, Package, Image, Upload, AlertTriangle, X, Search, History } from 'lucide-react';
import { formatCurrency, formatQuantityWithUnit, UnitType, convertUnit, cn } from '@/lib/utils';
import UnitSelector from '@/components/ui/unit-selector';
import InventoryBatchSelector from './inventory-batch-selector';
import CatererPaymentHistory from './caterer-payment-history';
import MixBatchSelectorDialog from './mix-batch-selector-dialog';
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
  const [selectedBatches, setSelectedBatches] = useState<Record<string | number, { batchIds: number[], quantities: number[] }>>({});
  const [paymentOption, setPaymentOption] = useState<string>('full');
  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // State for reminder dialog
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [reminderDate, setReminderDate] = useState<Date>(addDays(new Date(), 7));
  const [paymentDueDate, setPaymentDueDate] = useState<Date>(addDays(new Date(), 15));
  const [remainingBalance, setRemainingBalance] = useState<number>(0);

  // Mix Calculator state
  const [showMixCalculator, setShowMixCalculator] = useState(false);
  const [mixBudget, setMixBudget] = useState<string>('');
  const [mixSelectedProducts, setMixSelectedProducts] = useState<{
    id: number,
    name: string,
    price: number,
    allocatedPrice: number,
    calculatedQuantity: number,
    selectedBatches?: {batchId: number, quantity: number, unitPrice: number}[]
  }[]>([]);
  const [mixSearchQuery, setMixSearchQuery] = useState('');
  const [mixCalculationMode, setMixCalculationMode] = useState<'price' | 'quantity'>('price');
  const [mixComboName, setMixComboName] = useState<string>('');
  const [showBatchSelector, setShowBatchSelector] = useState<{productId: number, quantity: number} | null>(null);

  // Payment History state
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);

  // Current toast reference for immediate replacement
  const currentToastRef = useRef<{id: string, dismiss: () => void} | null>(null);
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
  const addProductToBill = (product: any, quantity: number = 1, unit: UnitType = 'kg') => {
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
      // If product already exists, add to existing quantity
      const currentQuantity = form.getValues(`items.${existingItemIndex}.quantity`) || 0;
      const newQuantity = currentQuantity + quantity;
      form.setValue(`items.${existingItemIndex}.quantity`, newQuantity);

      // Update productBatchQuantities state - add to existing quantity instead of replacing
      setProductBatchQuantities(prev => {
        const currentBatchQuantity = prev[product.id] || 0;
        const updatedQuantity = currentBatchQuantity + quantity;
        return {
          ...prev,
          [product.id]: updatedQuantity
        };
      });

      // Update amount with proper unit conversion
      const rate = form.getValues(`items.${existingItemIndex}.rate`) || 0;
      const existingUnit = form.getValues(`items.${existingItemIndex}.unit`) || 'kg';
      form.setValue(`items.${existingItemIndex}.amount`, calculateItemAmount(newQuantity, existingUnit, rate));
    } else {
      // Add new product to bill with specified quantity and unit
      const finalUnit = unit || product.unit || 'kg';
      append({
        productId: product.id,
        productName: product.name, // Ensure product name is set
        quantity: quantity,
        unit: finalUnit,
        rate: productRate,
        gstPercentage: 5, // Default GST percentage
        amount: calculateItemAmount(quantity, finalUnit, productRate), // Calculate initial amount with unit conversion
      });

      // Update productBatchQuantities state
      setProductBatchQuantities(prev => ({
        ...prev,
        [product.id]: quantity
      }));

      // Update productUnits state
      setProductUnits(prev => ({
        ...prev,
        [product.id]: finalUnit
      }));
    }

    // Trigger calculation after adding/updating product
    setTimeout(() => {
      calculateTotals();
    }, 100);
  };

  // Mix Calculator functions
  const handleMixCalculatorOpen = () => {
    setShowMixCalculator(true);
  };

  const handleMixCalculatorClose = () => {
    setShowMixCalculator(false);
    setMixBudget('');
    setMixSelectedProducts([]);
    setMixSearchQuery('');
    setMixCalculationMode('price');
    setMixComboName('');
    setShowBatchSelector(null);
  };

  const addProductToMix = (product: any) => {
    const newProduct = {
      id: product.id,
      name: product.name,
      price: Number(product.catererPrice || product.price || 0),
      allocatedPrice: 0,
      calculatedQuantity: 0,
      selectedBatches: []
    };
    setMixSelectedProducts(prev => [...prev, newProduct]);
    setMixSearchQuery('');
  };

  const removeProductFromMix = (productId: number) => {
    setMixSelectedProducts(prev => prev.filter(p => p.id !== productId));
  };

  // Handle batch selection for mix products
  const handleMixBatchSelect = useCallback((productId: number, batchIds: number[], quantities: number[], totalQuantity: number, unit: string) => {
    console.log(`Mix batch select - ProductId: ${productId}, Total: ${totalQuantity}, Batches: ${batchIds.length}`);

    setMixSelectedProducts(prev => prev.map(p =>
      p.id === productId
        ? {
            ...p,
            selectedBatches: batchIds.map((batchId, index) => ({
              batchId,
              quantity: quantities[index],
              unitPrice: 0 // Will be updated when we get batch details
            })),
            calculatedQuantity: totalQuantity // Ensure calculated quantity matches total selected
          }
        : p
    ));

    setShowBatchSelector(null);

    // Only show toast if batches were actually selected
    if (batchIds.length > 0) {
      showImmediateToast('Batches Selected', `Selected ${batchIds.length} batches for mix product`);
    }
  }, []);

  // Open batch selector for mix product
  const openMixBatchSelector = (productId: number, quantity: number) => {
    console.log(`Opening batch selector for product ${productId} with quantity ${quantity}`);
    console.log(`Current showBatchSelector state:`, showBatchSelector);

    if (quantity > 0) {
      console.log(`Setting showBatchSelector to:`, { productId, quantity });
      setShowBatchSelector({ productId, quantity });
    } else {
      console.log(`Invalid quantity: ${quantity}, showing error toast`);
      showImmediateToast('Invalid Quantity', 'Please ensure the product has a valid calculated quantity before selecting batches', 'destructive');
    }
  };

  // Calculate mix quantities when budget or products change
  useEffect(() => {
    if (mixBudget && mixSelectedProducts.length > 0) {
      const inputValue = parseFloat(mixBudget);

      if (mixCalculationMode === 'price') {
        // Calculate by price - divide budget equally among products
        const pricePerProduct = inputValue / mixSelectedProducts.length;

        setMixSelectedProducts(prev => prev.map(p => ({
          ...p,
          allocatedPrice: Math.round(pricePerProduct * 100) / 100,
          calculatedQuantity: Math.round((pricePerProduct / p.price) * 100) / 100
        })));
      } else {
        // Calculate by quantity - divide quantity equally among products
        const quantityPerProduct = inputValue / mixSelectedProducts.length;

        setMixSelectedProducts(prev => prev.map(p => ({
          ...p,
          calculatedQuantity: Math.round(quantityPerProduct * 100) / 100,
          allocatedPrice: Math.round((quantityPerProduct * p.price) * 100) / 100
        })));
      }
    }
  }, [mixBudget, mixSelectedProducts.length, mixCalculationMode]);

  const addMixToCart = () => {
    const comboName = mixComboName.trim() || `Mix Combo ${Date.now()}`;

    // Calculate total values for the combo
    const totalQuantity = mixSelectedProducts.reduce((sum, p) => sum + p.calculatedQuantity, 0);
    const totalAmount = mixSelectedProducts.reduce((sum, p) => sum + p.allocatedPrice, 0);
    const averageRate = totalQuantity > 0 ? totalAmount / totalQuantity : 0;

    // Check if this combo already exists in the bill
    const existingComboIndex = fields.findIndex(field =>
      field.productName === comboName
    );

    if (existingComboIndex !== -1) {
      // Update existing combo
      const currentQuantity = form.getValues(`items.${existingComboIndex}.quantity`) || 0;
      const newQuantity = currentQuantity + totalQuantity;

      form.setValue(`items.${existingComboIndex}.quantity`, newQuantity, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true
      });

      // Update amount
      const rate = form.getValues(`items.${existingComboIndex}.rate`) || 0;
      const unit = form.getValues(`items.${existingComboIndex}.unit`) || 'kg';
      form.setValue(`items.${existingComboIndex}.amount`, calculateItemAmount(newQuantity, unit, rate), {
        shouldDirty: true
      });
    } else {
      // Add new combo as a single item
      append({
        productId: 999999, // Special ID for mix combos
        productName: comboName,
        quantity: totalQuantity,
        unit: 'kg',
        rate: averageRate,
        gstPercentage: 5,
        amount: totalAmount,
      });
    }

    // Store all selected batches under the combo name
    const comboKey = comboName;
    const allBatchIds: number[] = [];
    const allBatchQuantities: number[] = [];

    mixSelectedProducts.forEach(mixProduct => {
      if (mixProduct.selectedBatches && mixProduct.selectedBatches.length > 0) {
        mixProduct.selectedBatches.forEach(batch => {
          allBatchIds.push(batch.batchId);
          allBatchQuantities.push(batch.quantity);
        });
      }
    });

    // Update productBatchQuantities state
    setProductBatchQuantities(prev => {
      const currentBatchQuantity = prev[comboKey] || 0;
      return {
        ...prev,
        [comboKey]: currentBatchQuantity + totalQuantity
      };
    });

    // Store all selected batches for the combo
    if (allBatchIds.length > 0) {
      setSelectedBatches(prev => ({
        ...prev,
        [comboKey]: {
          batchIds: allBatchIds,
          quantities: allBatchQuantities
        }
      }));
    }

    handleMixCalculatorClose();
    showImmediateToast('Success', `Mix combo "${comboName}" added to bill successfully!`);

    // Trigger calculation
    setTimeout(() => {
      calculateTotals();
    }, 100);
  };

  // Filter products for mix calculator
  const filteredMixProducts = products?.filter(product =>
    product.name.toLowerCase().includes(mixSearchQuery.toLowerCase()) &&
    !mixSelectedProducts.some(mp => mp.id === product.id)
  ) || [];

  // Immediate replacement toast function
  const showImmediateToast = (title: string, description: string, variant: 'default' | 'destructive' = 'default') => {
    // Dismiss any existing toast immediately
    if (currentToastRef.current) {
      currentToastRef.current.dismiss();
    }

    // Show new toast and store reference
    const newToast = toast({
      title,
      description,
      variant,
    });

    currentToastRef.current = newToast;

    // Auto-dismiss after 500ms
    setTimeout(() => {
      if (currentToastRef.current && currentToastRef.current.id === newToast.id) {
        currentToastRef.current.dismiss();
        currentToastRef.current = null;
      }
    }, 500);
  };



  // State to track batch-selected quantities for each product (supports both number and string keys for combos)
  const [productBatchQuantities, setProductBatchQuantities] = useState<Record<string | number, number>>({});

  // State to track units for each product
  const [productUnits, setProductUnits] = useState<Record<number, UnitType>>({});

  // State for Add Product section
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [inputMode, setInputMode] = useState<'quantity' | 'price'>('quantity');
  const [productQuantity, setProductQuantity] = useState<number>(1);
  const [productPrice, setProductPrice] = useState<number>(0);
  const [productUnit, setProductUnit] = useState<UnitType>('kg');

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

    // First calculate totals to ensure we have the latest values
    const currentTotals = calculateTotals();

    // Use a timeout to ensure totals are calculated before updating amount paid
    setTimeout(() => {
      const latestTotals = currentTotals.grandTotal > 0 ? currentTotals : calculatedTotals;

      // Update amount paid based on selected option
      switch (option) {
        case 'full':
          // Set amount paid to grand total
          const fullAmount = Number(latestTotals.grandTotal.toFixed(2));
          form.setValue('amountPaid', fullAmount, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true
          });
          break;
        case 'half':
          // Set amount paid to 50% of grand total
          const halfAmount = Number((latestTotals.grandTotal / 2).toFixed(2));
          form.setValue('amountPaid', halfAmount, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true
          });
          // Trigger reminder dialog immediately for partial payment
          setTimeout(() => {
            const balanceDue = latestTotals.grandTotal - halfAmount;
            setRemainingBalance(balanceDue);
            setPaymentDueDate(form.getValues('dueDate')); // Initialize with form's due date
            setShowReminderDialog(true);
          }, 100);
          break;
        case 'later':
          // Set amount paid to 0
          form.setValue('amountPaid', 0, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true
          });
          // Trigger reminder dialog immediately for pay later
          setTimeout(() => {
            setRemainingBalance(latestTotals.grandTotal);
            setPaymentDueDate(form.getValues('dueDate')); // Initialize with form's due date
            setShowReminderDialog(true);
          }, 100);
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

      // Recalculate totals after updating amount paid
      calculateTotals();
    }, 50);
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

  // Update amount paid when totals change and payment option is set
  useEffect(() => {
    if (calculatedTotals.grandTotal > 0 && paymentOption) {
      switch (paymentOption) {
        case 'full':
          const fullAmount = Number(calculatedTotals.grandTotal.toFixed(2));
          if (form.getValues('amountPaid') !== fullAmount) {
            form.setValue('amountPaid', fullAmount, { shouldDirty: false });
          }
          break;
        case 'half':
          const halfAmount = Number((calculatedTotals.grandTotal / 2).toFixed(2));
          if (form.getValues('amountPaid') !== halfAmount) {
            form.setValue('amountPaid', halfAmount, { shouldDirty: false });
          }
          break;
        case 'later':
          if (form.getValues('amountPaid') !== 0) {
            form.setValue('amountPaid', 0, { shouldDirty: false });
          }
          break;
        // Don't auto-update for 'custom' option
      }
    }
  }, [calculatedTotals.grandTotal, paymentOption, form]);

  // Handle form submission with improved error handling
  const onSubmit = async (data: BillFormValues) => {
    console.log("onSubmit function called with data:", data);

    // Set loading state immediately
    setIsUploading(true);

    // Validate that items exist
    if (!data.items || data.items.length === 0) {
      showImmediateToast('Error', 'Please add at least one product to the bill before saving.', 'destructive');
      setIsUploading(false);
      return;
    }

    // Validate that all items have required fields
    const invalidItems = data.items.filter(item =>
      !item.productId || !item.productName || !item.quantity || item.quantity <= 0 || !item.rate || item.rate <= 0
    );

    if (invalidItems.length > 0) {
      showImmediateToast('Error', 'Please ensure all products have valid quantities and rates.', 'destructive');
      setIsUploading(false);
      return;
    }

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
        // For mix combos (productId 999999), use product name as key, otherwise use productId
        const batchKey = item.productId === 999999 ? item.productName : item.productId;
        const hasBatches = selectedBatches[batchKey];
        const batchQuantity = hasBatches
          ? Number(selectedBatches[batchKey].quantities.reduce((sum, qty) => Number(sum) + Number(qty), 0).toFixed(2))
          : 0;

        // Mix combos (productId 999999) always have batches pre-selected, so skip validation for them
        if (item.productId === 999999) {
          return false; // Don't consider mix combos as missing batch selections
        }

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

      // Check if reminder is needed when amount paid is less than grand total
      // Show reminder for any payment that's not full payment and not 'pay later'
      if (balanceDue > 0 && paymentOption !== 'later') {
        setRemainingBalance(balanceDue);
        setPaymentDueDate(data.dueDate); // Initialize with form's due date
        setShowReminderDialog(true);
        setIsUploading(false); // Reset loading state
        return; // Wait for reminder dialog completion
      }

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
        paymentMode: data.paymentMethod, // Changed from paymentMethod to paymentMode to match DB schema
        status: status,
        notes: data.notes || '',
        receiptImage: receiptFilename, // Add receipt image filename
        items: items, // Use the items array directly, already formatted correctly
        // Add reminder dates if there's a balance due (will be set after reminder dialog)
        nextPaymentDate: balanceDue > 0 ? format(reminderDate, 'yyyy-MM-dd') : null,
        reminderDate: balanceDue > 0 ? format(reminderDate, 'yyyy-MM-dd') : null,
      };

      // Log the data we're sending
      console.log("=== DISTRIBUTION SUBMISSION DEBUG ===");
      console.log("Form data items:", data.items);
      console.log("Processed items:", items);
      console.log("Items count:", items.length);
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
        // For mix combos (productId 999999), use product name as key, otherwise use productId
        const batchKey = item.productId === 999999 ? item.productName : item.productId;
        const productBatches = selectedBatches[batchKey];

        if (productBatches && productBatches.batchIds && productBatches.batchIds.length > 0) {
          console.log(`Updating inventory for ${item.productId === 999999 ? 'mix combo' : 'product'} ${batchKey} (${item.productName})`);

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
          console.log(`No batches selected for ${item.productId === 999999 ? 'mix combo' : 'product'} ${batchKey} (${item.productName}), skipping inventory update`);
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

  // Handle adding a new product (placeholder - not currently used)
  const handleAddProduct = (data: ProductFormValues) => {
    console.log('Add product functionality not implemented yet:', data);
  };

  // Handle skipping reminder
  const handleSkipReminder = async () => {
    setShowReminderDialog(false);
    await proceedWithBillCreation();
  };

  // Handle reminder confirmation
  const handleReminderConfirm = async () => {
    setShowReminderDialog(false);

    toast({
      title: "Reminder Set",
      description: `Payment due on ${format(paymentDueDate, 'PPP')}. Reminder set for ${format(reminderDate, 'PPP')} for remaining balance of ₹${remainingBalance.toLocaleString()}`,
    });

    // Continue with bill creation (reminder will be saved with the distribution)
    await proceedWithBillCreation();
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
        // Add reminder dates if balance due > 0
        nextPaymentDate: balanceDue > 0 ? format(paymentDueDate, 'yyyy-MM-dd') : null,
        reminderDate: balanceDue > 0 ? format(reminderDate, 'yyyy-MM-dd') : null,
      };

      // Submit the distribution
      const result = await createDistribution.mutateAsync(distributionData);
      console.log("Distribution created successfully:", result);

      // Handle inventory updates (existing code)
      const updatePromises: Promise<any>[] = [];
      let updatedInventory = false;

      for (const item of data.items) {
        // For mix combos (productId 999999), use product name as key, otherwise use productId
        const batchKey = item.productId === 999999 ? item.productName : item.productId;
        const productBatches = selectedBatches[batchKey];

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
          disabled={createDistribution.isPending || !form.watch('items')?.length}
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
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 mb-6">
        {/* Left Column - Add Product Section */}
        <div className="lg:col-span-3">
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
                        setSelectedProduct(product);
                      }
                    }}
                    value={selectedProduct?.id.toString() || ""}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="— Select Product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products
                        ?.filter(product => selectedCategory === 'all' || (product.category?.toString() === selectedCategory))
                        .map((product: any) => (
                          <SelectItem key={product.id} value={product.id.toString()}>
                            {product.name} - {formatCurrency(product.catererPrice || product.price || 0)} / {product.unit}
                            {product.catererPrice ? ' (Caterer Price)' : ''}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Quantity/Price Input Section */}
                {selectedProduct && (
                  <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Input Mode</Label>
                      <div className="flex items-center space-x-2">
                        <Button
                          type="button"
                          variant={inputMode === 'quantity' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setInputMode('quantity')}
                          className="text-xs"
                        >
                          By Quantity
                        </Button>
                        <Button
                          type="button"
                          variant={inputMode === 'price' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setInputMode('price')}
                          className="text-xs"
                        >
                          By Price
                        </Button>
                      </div>
                    </div>

                    {inputMode === 'quantity' ? (
                      <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="quantity"
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={productQuantity}
                            onChange={(e) => setProductQuantity(parseFloat(e.target.value) || 0)}
                            placeholder="Enter quantity"
                            className="flex-1"
                          />
                          <UnitSelector
                            value={productUnit}
                            onChange={(newUnit, convertedQuantity) => {
                              setProductUnit(newUnit);
                              if (convertedQuantity !== undefined) {
                                setProductQuantity(convertedQuantity);
                              }
                            }}
                            quantity={productQuantity}
                          />
                        </div>
                        <div className="text-xs text-gray-600">
                          Total: {formatCurrency((productQuantity || 0) * (selectedProduct.catererPrice || selectedProduct.price || 0))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="price">Price Amount</Label>
                        <Input
                          id="price"
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={productPrice}
                          onChange={(e) => setProductPrice(parseFloat(e.target.value) || 0)}
                          placeholder="Enter price amount"
                        />
                        <div className="text-xs text-gray-600">
                          Quantity: {((productPrice || 0) / (selectedProduct.catererPrice || selectedProduct.price || 1)).toFixed(2)} {selectedProduct.unit}
                        </div>
                      </div>
                    )}

                    <Button
                      type="button"
                      onClick={() => {
                        if (selectedProduct) {
                          const finalQuantity = inputMode === 'quantity'
                            ? productQuantity
                            : (productPrice || 0) / (selectedProduct.catererPrice || selectedProduct.price || 1);

                          if (finalQuantity > 0) {
                            addProductToBill(selectedProduct, finalQuantity, productUnit);
                            // Reset form
                            setSelectedProduct(null);
                            setProductQuantity(1);
                            setProductPrice(0);
                            setProductUnit('kg');
                          }
                        }
                      }}
                      disabled={!selectedProduct || (inputMode === 'quantity' ? productQuantity <= 0 : productPrice <= 0)}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Bill
                    </Button>
                  </div>
                )}
              </div>

              {/* Mix Calculator Button */}
              <div className="mt-6">
                <Button
                  type="button"
                  onClick={handleMixCalculatorOpen}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  Mix Calculator
                </Button>
              </div>

              {/* Payment History Button */}
              <div className="mt-3">
                <Button
                  type="button"
                  onClick={() => setShowPaymentHistory(!showPaymentHistory)}
                  variant="outline"
                  className="w-full border-blue-500 text-blue-600 hover:bg-blue-50"
                >
                  <History className="h-4 w-4 mr-2" />
                  {showPaymentHistory ? 'Hide Payment History' : 'View Payment History'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Selected Products Section */}
        <div className="lg:col-span-7">
          <Card className="h-full w-full">
            <CardHeader className="bg-green-50 pb-3 border-b border-green-100">
              <CardTitle className="text-lg flex items-center text-green-700">
                <ChefHat className="h-5 w-5 mr-2" />
                Selected Products
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold text-xs w-[30%] min-w-[200px]">Product</TableHead>
                  <TableHead className="text-center font-semibold text-xs w-[25%] min-w-[120px]">Quantity</TableHead>
                  <TableHead className="text-right font-semibold text-xs w-[15%] min-w-[80px]">Rate</TableHead>
                  <TableHead className="text-center font-semibold text-xs w-[10%] min-w-[60px]">GST %</TableHead>
                  <TableHead className="text-right font-semibold text-xs w-[15%] min-w-[80px]">Amount</TableHead>
                  <TableHead className="w-[5%] min-w-[40px]"></TableHead>
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
                      <TableCell className="py-2">
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{field.productName}</span>
                          {/* Only show batch selector for regular products, not mix combos */}
                          {field.productId !== 999999 ? (
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
                          ) : (
                            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                              <div className="flex items-center text-green-700">
                                <Package className="h-4 w-4 mr-2" />
                                <span className="text-sm font-medium">Mix Combo - Batches Already Selected</span>
                              </div>
                              <p className="text-xs text-green-600 mt-1">
                                Inventory batches were selected during mix calculation
                              </p>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-2">
                        <div className="flex flex-col items-center space-y-2">
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              className="w-16 text-center text-xs"
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
                      <TableCell className="text-right py-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-16 text-right text-xs"
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
                      <TableCell className="text-center py-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          className="w-12 text-center text-xs"
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
                      <TableCell className="text-right py-2">
                        <div className="font-medium text-sm">
                          {formatCurrency(calculateItemAmount(
                            form.watch(`items.${index}.quantity`) || 0,
                            form.watch(`items.${index}.unit`) || 'kg',
                            form.watch(`items.${index}.rate`) || 0
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
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
            </div>

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
                        value={form.watch('amountPaid') || 0}
                        onChange={(e) => {
                          const value = Number((parseFloat(e.target.value) || 0).toFixed(2));
                          form.setValue('amountPaid', value, {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true
                          });
                          // Manually trigger calculation
                          calculateTotals();
                          // Set payment option to custom if manually changed
                          setPaymentOption('custom');

                          // Check if custom amount is less than full amount and trigger reminder
                          if (value > 0 && value < calculatedTotals.grandTotal) {
                            setTimeout(() => {
                              const balanceDue = calculatedTotals.grandTotal - value;
                              setRemainingBalance(balanceDue);
                              setPaymentDueDate(form.getValues('dueDate')); // Initialize with form's due date
                              setShowReminderDialog(true);
                            }, 500); // Delay to allow calculation to complete
                          }
                        }}
                        disabled={paymentOption === 'later'}
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
                          // For mix combos (productId 999999), check if batches exist using product name as key
                          const batchKey = field.productId === 999999 ? field.productName : field.productId;
                          const hasBatches = selectedBatches[batchKey] &&
                            selectedBatches[batchKey].quantities.reduce((sum, qty) => sum + qty, 0) >= field.quantity;

                          return (
                            <div key={field.id} className="flex items-center justify-between">
                              <span>{field.productName}</span>
                              {field.productId === 999999 ? (
                                <span className="text-green-600 font-medium">✓ Mix Combo (Batches Pre-selected)</span>
                              ) : hasBatches ? (
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
          disabled={createDistribution.isPending || isUploading || !form.watch('items')?.length}
        >
          <Save className="h-5 w-5 mr-3" />
          {isUploading ? "Saving Bill..." : createDistribution.isPending ? "Processing..." : !form.watch('items')?.length ? "Add Products First" : "Save Bill"}
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
              <div className="mt-2">
                {form.getValues('amountPaid') > 0
                  ? "Set the payment due date and reminder date for the remaining payment."
                  : "Set the payment due date and reminder date for the payment."
                }
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
              </div>
            </div>

            <div>
              <Label>Payment Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(paymentDueDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={paymentDueDate}
                    onSelect={(date) => date && setPaymentDueDate(date)}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-slate-500 mt-1">
                When is the remaining payment due?
              </p>
            </div>

            <div>
              <Label>Reminder Date</Label>
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
                When do you want to be reminded about this payment?
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

      {/* Mix Calculator Modal */}
      <Dialog open={showMixCalculator} onOpenChange={setShowMixCalculator}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center text-purple-700">
              <Calculator className="h-5 w-5 mr-2" />
              Mix Calculator
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Calculation Mode Toggle */}
            <div className="space-y-2">
              <Label>Calculation Mode</Label>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="price-mode"
                    name="calculation-mode"
                    checked={mixCalculationMode === 'price'}
                    onChange={() => setMixCalculationMode('price')}
                    className="w-4 h-4 text-purple-600"
                  />
                  <Label htmlFor="price-mode" className="text-sm font-normal">By Price</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="quantity-mode"
                    name="calculation-mode"
                    checked={mixCalculationMode === 'quantity'}
                    onChange={() => setMixCalculationMode('quantity')}
                    className="w-4 h-4 text-purple-600"
                  />
                  <Label htmlFor="quantity-mode" className="text-sm font-normal">By Quantity</Label>
                </div>
              </div>
            </div>

            {/* Combo Name Input */}
            <div className="space-y-2">
              <Label htmlFor="mixComboName">Combo Name (Optional)</Label>
              <Input
                id="mixComboName"
                type="text"
                placeholder="Enter a special name for this mix combo"
                value={mixComboName}
                onChange={(e) => setMixComboName(e.target.value)}
                className="text-lg"
              />
            </div>

            {/* Budget/Quantity Input */}
            <div className="space-y-2">
              <Label htmlFor="mixBudget">
                {mixCalculationMode === 'price' ? 'Total Budget (₹)' : 'Total Quantity (kg)'}
              </Label>
              <Input
                id="mixBudget"
                type="number"
                placeholder={mixCalculationMode === 'price' ? 'Enter your total budget' : 'Enter total quantity'}
                value={mixBudget}
                onChange={(e) => setMixBudget(e.target.value)}
                className="text-lg"
              />
            </div>

            {/* Product Search */}
            <div className="space-y-2">
              <Label>Add Products to Mix</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search products..."
                  value={mixSearchQuery}
                  onChange={(e) => setMixSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Search Results */}
              {mixSearchQuery && (
                <div className="border rounded-lg max-h-40 overflow-y-auto">
                  {filteredMixProducts.map((product) => (
                    <div
                      key={product.id}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                      onClick={() => addProductToMix(product)}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{product.name}</span>
                        <span className="text-sm text-gray-600">
                          {formatCurrency(product.catererPrice || product.price || 0)}/{product.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                  {filteredMixProducts.length === 0 && (
                    <div className="p-3 text-center text-gray-500">
                      No products found
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Selected Products */}
            {mixSelectedProducts.length > 0 && (
              <div className="space-y-3">
                <Label>Selected Products</Label>
                <div className="border rounded-lg">
                  <div className="grid grid-cols-6 gap-4 p-3 bg-gray-50 font-medium text-sm">
                    <div>Product</div>
                    <div>Price/Unit</div>
                    <div>{mixCalculationMode === 'price' ? 'Allocated Budget' : 'Total Cost'}</div>
                    <div>Calculated Qty</div>
                    <div>Batches</div>
                    <div>Action</div>
                  </div>
                  {mixSelectedProducts.map((product) => (
                    <div key={product.id} className="grid grid-cols-6 gap-4 p-3 border-t">
                      <div className="font-medium">{product.name}</div>
                      <div>{formatCurrency(product.price)}</div>
                      <div>{formatCurrency(product.allocatedPrice)}</div>
                      <div>{product.calculatedQuantity.toFixed(2)} kg</div>
                      <div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openMixBatchSelector(product.id, product.calculatedQuantity)}
                          className="text-xs"
                        >
                          <Package className="h-3 w-3 mr-1" />
                          {product.selectedBatches && product.selectedBatches.length > 0
                            ? `${product.selectedBatches.length} Selected`
                            : 'Select Batches'
                          }
                        </Button>
                      </div>
                      <div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeProductFromMix(product.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                {mixBudget && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">
                        {mixCalculationMode === 'price' ? 'Total Budget:' : 'Total Quantity:'}
                      </span>
                      <span className="text-lg font-bold text-green-700">
                        {mixCalculationMode === 'price'
                          ? formatCurrency(parseFloat(mixBudget) || 0)
                          : `${parseFloat(mixBudget) || 0} kg`
                        }
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span>Products Selected:</span>
                      <span>{mixSelectedProducts.length}</span>
                    </div>
                    {mixCalculationMode === 'quantity' && (
                      <div className="flex justify-between items-center mt-2">
                        <span>Total Cost:</span>
                        <span className="font-bold text-green-700">
                          {formatCurrency(mixSelectedProducts.reduce((sum, p) => sum + p.allocatedPrice, 0))}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={handleMixCalculatorClose}>
              Cancel
            </Button>
            <Button
              onClick={addMixToCart}
              disabled={!mixBudget || mixSelectedProducts.length === 0}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Add Mix to Bill
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batch Selector Dialog for Mix Products */}
      <MixBatchSelectorDialog
        open={!!showBatchSelector}
        onOpenChange={(open) => {
          if (!open) {
            setShowBatchSelector(null);
          }
        }}
        productId={showBatchSelector?.productId || 0}
        quantity={showBatchSelector?.quantity || 0}
        unit="kg"
        onBatchSelect={(batchIds, quantities, totalQuantity, unit) => {
          console.log(`Mix batch selection - ProductId: ${showBatchSelector?.productId}, Batches: ${batchIds.length}`);

          if (showBatchSelector) {
            setMixSelectedProducts(prev => prev.map(p =>
              p.id === showBatchSelector.productId
                ? {
                    ...p,
                    selectedBatches: batchIds.map((batchId, index) => ({
                      batchId,
                      quantity: quantities[index],
                      unitPrice: 0 // Placeholder for unit price
                    })),
                    calculatedQuantity: totalQuantity
                  }
                : p
            ));
          }

          setShowBatchSelector(null);

          // Only show toast if batches were actually selected
          if (batchIds.length > 0) {
            showImmediateToast('Batches Selected', `Selected ${batchIds.length} batches for mix product`);
          }
        }}
      />


    </div>
  );
}
