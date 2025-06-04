import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useProducts } from '@/hooks/use-products';
import { useCreateCustomerBill } from '@/hooks/use-customer-bills';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

import { toast } from '@/hooks/use-toast';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  User,
  Phone,
  Mail,
  MapPin,
  Package,
  Scale,
  Printer,
  History,
  Tag,
  ToggleLeft,
  ToggleRight,
  IndianRupee
} from 'lucide-react';
import Layout from '@/components/layout/layout';
import PageHeader from '@/components/common/page-header';
import { useLocation } from 'wouter';
import CustomerBatchSelector from '@/components/customer-billing/customer-batch-selector';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

// Form validation schema
const customerBillingSchema = z.object({
  clientName: z.string().min(1, 'Client name is required'),
  clientMobile: z.string().min(10, 'Valid mobile number is required'),
  clientEmail: z.string().email().optional().or(z.literal('')),
  clientAddress: z.string().optional(),
  paymentMethod: z.enum(['Cash', 'Card', 'Bank Transfer', 'Credit', 'UPI']),
  items: z.array(z.object({
    productId: z.number(),
    productName: z.string(),
    quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
    unit: z.enum(['kg', 'g', 'pcs']),
    pricePerKg: z.number(),
    marketPricePerKg: z.number(),
    total: z.number(),
  })),
});

type CustomerBillingForm = z.infer<typeof customerBillingSchema>;

interface CartItem {
  productId: number;
  productName: string;
  quantity: number;
  unit: 'kg' | 'g' | 'pcs';
  pricePerKg: number;
  marketPricePerKg: number;
  total: number;
  displayQuantity: string;
  selectedBatches?: {
    batchIds: number[];
    quantities: number[];
  };
}

export default function CustomerBillingPage() {
  const { data: products, isLoading: productsLoading } = useProducts();
  const createCustomerBill = useCreateCustomerBill();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [unit, setUnit] = useState<'kg' | 'g' | 'pcs'>('kg');
  const [inputMode, setInputMode] = useState<'quantity' | 'price'>('quantity');
  const [priceAmount, setPriceAmount] = useState<string>('');
  const [billNumber] = useState(() => {
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0'); // 3 digit random
    return parseInt(timestamp + random);
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [, setLocation] = useLocation();

  const form = useForm<CustomerBillingForm>({
    resolver: zodResolver(customerBillingSchema),
    defaultValues: {
      clientName: '',
      clientMobile: '',
      clientEmail: '',
      clientAddress: '',
      paymentMethod: 'Cash',
      items: [],
    },
  });

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);



  // Save bill functionality - only saves, doesn't print
  const saveBill = async () => {
    const formValidationErrors = validateForm();

    if (formValidationErrors.length > 0) {
      toast({
        title: '⚠️ Validation Error',
        description: (
          <div className="space-y-1">
            <p className="font-medium">Please fix the following issues:</p>
            <ul className="list-disc list-inside space-y-1">
              {formValidationErrors.map((error, index) => (
                <li key={index} className="text-sm">{error}</li>
              ))}
            </ul>
          </div>
        ),
        variant: 'destructive',
        duration: 6000,
      });
      return;
    }

    try {
      const formData = form.getValues();
      const { total, savings, itemCount } = calculateTotals();

      const billData = {
        billNo: billNumber.toString().padStart(6, '0'),
        billDate: currentTime.toISOString(),
        clientName: formData.clientName,
        clientMobile: formData.clientMobile,
        clientEmail: formData.clientEmail || undefined,
        clientAddress: formData.clientAddress || undefined,
        totalAmount: total,
        marketTotal: total + savings,
        savings: savings,
        itemCount: itemCount,
        paymentMethod: formData.paymentMethod,
        status: 'completed' as const,
        items: cart.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unit: item.unit,
          pricePerKg: item.pricePerKg,
          marketPricePerKg: item.marketPricePerKg,
          total: item.total,
        })),
        // Include selected batches for inventory deduction
        selectedBatches: cart.reduce((acc, item) => {
          if (item.selectedBatches) {
            acc[item.productId] = item.selectedBatches;
          }
          return acc;
        }, {} as Record<number, { batchIds: number[]; quantities: number[] }>)
      };

      console.log('Sending bill data:', billData);
      await createCustomerBill.mutateAsync(billData);

      toast({
        title: 'Success',
        description: 'Bill saved successfully and inventory updated!',
      });

      // Reset form and cart after successful save
      form.reset();
      setCart([]);
      setSelectedProduct('');
      setQuantity('');
      setPriceAmount('');

    } catch (error) {
      console.error('Error saving bill:', error);
      toast({
        title: 'Error',
        description: 'Failed to save bill. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Calculate quantity from price
  const calculateQuantityFromPrice = (price: number, productPrice: number, unit: 'kg' | 'g' | 'pcs'): number => {
    if (productPrice <= 0) return 0;

    const quantityInKg = price / productPrice;

    if (unit === 'g') {
      return quantityInKg * 1000; // Convert kg to grams
    } else if (unit === 'pcs') {
      return quantityInKg; // For pieces, assume 1 piece = 1 kg equivalent
    } else {
      return quantityInKg; // kg
    }
  };

  // Handle input mode toggle
  const toggleInputMode = () => {
    setInputMode(prev => prev === 'quantity' ? 'price' : 'quantity');
    setQuantity('');
    setPriceAmount('');
  };

  // Handle batch selection for cart items
  const handleBatchSelect = (cartIndex: number, batchIds: number[], quantities: number[], totalQuantity: number) => {
    const updatedCart = [...cart];
    updatedCart[cartIndex].selectedBatches = {
      batchIds,
      quantities
    };
    // Update the cart item quantity to match selected batches
    updatedCart[cartIndex].quantity = totalQuantity;
    updatedCart[cartIndex].total = totalQuantity * updatedCart[cartIndex].pricePerKg;
    updatedCart[cartIndex].displayQuantity = `${totalQuantity.toFixed(2)}${updatedCart[cartIndex].unit}`;
    setCart(updatedCart);
  };

  // Add product to cart
  const addToCart = () => {
    if (!selectedProduct) {
      toast({
        title: 'Error',
        description: 'Please select a product',
        variant: 'destructive',
      });
      return;
    }

    const product = products?.find(p => p.id.toString() === selectedProduct);
    if (!product) return;

    const productPrice = Number(product.retailPrice || product.price || 0);

    let qty: number;

    if (inputMode === 'price') {
      const price = parseFloat(priceAmount);
      if (!price || price <= 0) {
        toast({
          title: 'Error',
          description: 'Please enter a valid price amount',
          variant: 'destructive',
        });
        return;
      }

      if (productPrice <= 0) {
        toast({
          title: 'Error',
          description: 'Product price not available',
          variant: 'destructive',
        });
        return;
      }

      qty = calculateQuantityFromPrice(price, productPrice, unit);
    } else {
      qty = parseFloat(quantity);
      if (!qty || qty <= 0) {
        toast({
          title: 'Error',
          description: 'Please enter a valid quantity',
          variant: 'destructive',
        });
        return;
      }
    }

    // Convert quantity to kg for calculation
    let quantityInKg: number;
    let displayQuantity: string;

    if (unit === 'g') {
      quantityInKg = qty / 1000;
      displayQuantity = `${qty.toFixed(2)}g`;
    } else if (unit === 'kg') {
      quantityInKg = qty;
      displayQuantity = `${qty.toFixed(2)}kg`;
    } else { // pieces
      quantityInKg = qty;
      displayQuantity = `${qty.toFixed(2)}pcs`;
    }

    const pricePerKg = Number(product.retailPrice || product.price || 0);
    const marketPricePerKg = Number(product.marketPrice || pricePerKg * 1.1); // Use market price or 10% markup
    const total = quantityInKg * pricePerKg;

    // Check if product already exists in cart
    const existingItemIndex = cart.findIndex(item => item.productId === product.id);

    if (existingItemIndex !== -1) {
      // Update existing item
      const updatedCart = [...cart];
      updatedCart[existingItemIndex].quantity += quantityInKg;
      updatedCart[existingItemIndex].total = updatedCart[existingItemIndex].quantity * pricePerKg;
      updatedCart[existingItemIndex].displayQuantity = `${updatedCart[existingItemIndex].quantity.toFixed(2)}${unit === 'pcs' ? 'pcs' : 'kg'}`;
      setCart(updatedCart);

      toast({
        title: 'Success',
        description: `Updated ${product.name} quantity in cart`,
      });
    } else {
      // Add new item
      const newItem: CartItem = {
        productId: product.id,
        productName: product.name,
        quantity: quantityInKg,
        unit: unit === 'pcs' ? 'pcs' : 'kg',
        pricePerKg,
        marketPricePerKg,
        total,
        displayQuantity,
      };

      setCart([...cart, newItem]);

      toast({
        title: 'Success',
        description: `${product.name} added to cart`,
      });
    }

    // Reset form
    setSelectedProduct('');
    setQuantity('');
    setPriceAmount('');
  };

  // Update quantity in cart
  const updateQuantity = (index: number, change: number) => {
    const updatedCart = [...cart];
    updatedCart[index].quantity += change;

    if (updatedCart[index].quantity <= 0) {
      removeFromCart(index);
      return;
    }

    updatedCart[index].total = updatedCart[index].quantity * updatedCart[index].pricePerKg;
    updatedCart[index].displayQuantity = `${updatedCart[index].quantity.toFixed(2)}${updatedCart[index].unit}`;
    setCart(updatedCart);
  };

  // Remove item from cart
  const removeFromCart = (index: number) => {
    const productName = cart[index].productName;
    const updatedCart = cart.filter((_, i) => i !== index);
    setCart(updatedCart);

    toast({
      title: 'Info',
      description: `${productName} removed from cart`,
    });
  };

  // Clear entire cart
  const clearCart = () => {
    if (cart.length === 0) {
      toast({
        title: 'Info',
        description: 'Cart is already empty',
      });
      return;
    }

    setCart([]);
    toast({
      title: 'Info',
      description: 'Cart cleared successfully',
    });
  };



  // Calculate totals
  const calculateTotals = () => {
    const total = cart.reduce((sum, item) => sum + item.total, 0);
    const marketTotal = cart.reduce((sum, item) => sum + (item.quantity * item.marketPricePerKg), 0);
    const savings = marketTotal - total;

    return { total, savings, itemCount: cart.length };
  };

  const { total, savings, itemCount } = calculateTotals();

  // Enhanced form validation with detailed warnings
  const validateForm = () => {
    const formData = form.getValues();
    const errors = [];

    // Check required fields
    if (!formData.clientName.trim()) {
      errors.push('Client name is required');
    }

    if (!formData.clientMobile.trim()) {
      errors.push('Client mobile number is required');
    } else if (formData.clientMobile.length < 10) {
      errors.push('Mobile number must be at least 10 digits');
    }

    if (!formData.paymentMethod) {
      errors.push('Payment method is required');
    }

    if (cart.length === 0) {
      errors.push('Please add items to the cart before saving');
    }

    // Check if all cart items have selected batches
    const itemsWithoutBatches = cart.filter(item => !item.selectedBatches || item.selectedBatches.batchIds.length === 0);
    if (itemsWithoutBatches.length > 0) {
      errors.push(`Please select inventory batches for: ${itemsWithoutBatches.map(item => item.productName).join(', ')}`);
    }

    return errors;
  };



  // Print current bill functionality - only prints, doesn't save
  const printCurrentBill = () => {
    const formValidationErrors = validateForm();

    if (formValidationErrors.length > 0) {
      toast({
        title: '⚠️ Cannot Print',
        description: 'Please fix validation errors before printing.',
        variant: 'destructive',
      });
      return;
    }

    if (cart.length === 0) {
      toast({
        title: '⚠️ Cannot Print',
        description: 'Please add items to the cart before printing.',
        variant: 'destructive',
      });
      return;
    }

    window.print();
  };

  return (
    <Layout>
      {/* Print-specific styles */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
            position: static !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body {
            font-size: 12px;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            overflow: visible !important;
          }
          html {
            overflow: visible !important;
          }
          .print-container {
            max-width: none !important;
            margin: 0 !important;
            padding: 20px !important;
            background: white !important;
            font-family: Arial, sans-serif !important;
            overflow: visible !important;
            height: auto !important;
          }

          /* Hide all scroll bars during print */
          * {
            overflow: visible !important;
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }
          *::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
          }

          /* Compact single-page layout */
          .print-invoice-container {
            display: block !important;
            position: relative !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 15px !important;
            background: white !important;
            page-break-inside: avoid !important;
          }

          /* Compact sections with minimal spacing */
          .print-company-header {
            display: block !important;
            width: 100% !important;
            margin-bottom: 8px !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
          }

          .print-customer-section {
            display: block !important;
            width: 100% !important;
            margin-bottom: 8px !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
          }

          .print-table-container {
            display: block !important;
            width: 100% !important;
            margin-bottom: 8px !important;
            overflow: visible !important;
            page-break-inside: avoid !important;
          }

          .print-savings-section {
            display: block !important;
            width: 100% !important;
            margin-bottom: 8px !important;
            page-break-inside: avoid !important;
            page-break-before: avoid !important;
          }

          .print-total-section {
            display: block !important;
            width: 100% !important;
            margin-bottom: 8px !important;
            page-break-inside: avoid !important;
            page-break-before: avoid !important;
          }

          .print-footer {
            display: block !important;
            width: 100% !important;
            margin-bottom: 0 !important;
            page-break-inside: avoid !important;
            page-break-before: avoid !important;
          }

          /* 1. Compact Company Header Section */
          .print-company-header {
            background: linear-gradient(135deg, #8B4513 0%, #D2691E 100%);
            color: white;
            padding: 15px;
            margin: -15px -15px 10px -15px;
            border-radius: 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .print-company-logo {
            width: 50px;
            height: 50px;
            background: white;
            color: #8B4513;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
            margin-right: 15px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          .print-company-info h1 {
            font-size: 24px;
            font-weight: bold;
            margin: 0;
            color: white;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
          }
          .print-company-tagline {
            font-size: 12px;
            margin: 2px 0;
            color: #FFE4B5;
            font-style: italic;
          }
          .print-company-contact {
            font-size: 10px;
            margin: 4px 0 0 0;
            color: #FFE4B5;
            line-height: 1.2;
          }
          .print-invoice-title {
            text-align: right;
          }
          .print-invoice-title h2 {
            font-size: 28px;
            font-weight: bold;
            margin: 0;
            color: white;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
          }
          .print-invoice-details {
            font-size: 11px;
            margin: 4px 0 0 0;
            color: #FFE4B5;
            line-height: 1.2;
          }

          /* 2. Compact Customer Details Section */
          .print-customer-section {
            background: #FFF8DC;
            border: 1px solid #8B4513;
            border-radius: 5px;
            padding: 12px;
            margin: 8px 0;
          }
          .print-customer-title {
            color: #8B4513;
            font-size: 14px;
            font-weight: bold;
            margin: 0 0 8px 0;
            border-bottom: 1px solid #D2691E;
            padding-bottom: 4px;
          }
          .print-customer-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          .print-customer-field {
            margin: 4px 0;
            font-size: 11px;
            line-height: 1.3;
          }
          .print-customer-label {
            font-weight: bold;
            color: #8B4513;
            display: inline-block;
            min-width: 60px;
          }

          /* 3. Compact Product Items Table */
          .print-table {
            border-collapse: collapse;
            width: 100%;
            margin: 8px 0;
            box-shadow: 0 1px 4px rgba(0,0,0,0.1);
            page-break-inside: auto;
          }
          .print-table th {
            background: linear-gradient(135deg, #8B4513 0%, #D2691E 100%);
            color: white;
            font-weight: bold;
            padding: 8px 6px;
            text-align: center;
            font-size: 11px;
            border: 1px solid #654321;
            page-break-inside: avoid;
            page-break-after: avoid;
          }
          .print-table td {
            border: 1px solid #D2691E;
            padding: 6px 4px;
            text-align: center;
            font-size: 10px;
            background: white;
            page-break-inside: avoid;
          }
          .print-table tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          .print-table tr:nth-child(even) td {
            background: #FFF8DC;
          }
          .print-table .product-name {
            text-align: left;
            font-weight: 600;
            color: #8B4513;
          }
          .print-table .total-amount {
            font-weight: bold;
            color: #8B4513;
          }

          /* Ensure table header repeats on new pages */
          .print-table thead {
            display: table-header-group;
          }

          /* Compact table for many items */
          .print-table-compact {
            font-size: 11px;
          }
          .print-table-compact th {
            padding: 8px 6px;
            font-size: 12px;
          }
          .print-table-compact td {
            padding: 6px 4px;
            font-size: 11px;
          }

          /* Ultra compact for very many items */
          .print-table-ultra-compact {
            font-size: 10px;
          }
          .print-table-ultra-compact th {
            padding: 6px 4px;
            font-size: 11px;
          }
          .print-table-ultra-compact td {
            padding: 4px 3px;
            font-size: 10px;
          }

          /* Ensure critical sections always appear */
          .print-critical-section {
            page-break-inside: avoid !important;
            page-break-before: auto !important;
          }

          /* Force new page for totals if needed */
          .print-totals-group {
            page-break-before: auto;
            page-break-inside: avoid;
          }

          /* 4. Compact Savings Section */
          .print-savings-section {
            background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
            color: #8B4513;
            padding: 12px;
            border-radius: 5px;
            margin: 8px 0;
            text-align: center;
            border: 2px solid #8B4513;
          }
          .print-savings-title {
            font-size: 12px;
            font-weight: bold;
            margin: 0 0 4px 0;
          }
          .print-savings-amount {
            font-size: 18px;
            font-weight: bold;
            margin: 2px 0;
          }
          .print-savings-details {
            font-size: 10px;
            margin: 4px 0 0 0;
            opacity: 0.8;
          }

          /* 5. Compact Total Amount Section */
          .print-total-section {
            background: linear-gradient(135deg, #8B4513 0%, #D2691E 100%);
            color: white;
            padding: 15px;
            border-radius: 5px;
            margin: 8px 0;
            text-align: center;
            box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          }
          .print-total-title {
            font-size: 14px;
            font-weight: bold;
            margin: 0 0 6px 0;
          }
          .print-total-amount {
            font-size: 24px;
            font-weight: bold;
            margin: 6px 0;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
          }
          .print-total-items {
            font-size: 11px;
            margin: 4px 0 0 0;
            color: #FFE4B5;
          }

          /* 6. Compact Footer Section */
          .print-footer {
            background: #FFF8DC;
            border: 1px solid #8B4513;
            border-radius: 5px;
            padding: 10px;
            margin: 8px 0 0 0;
            text-align: center;
          }
          .print-footer-message {
            font-size: 12px;
            font-weight: bold;
            color: #8B4513;
            margin: 0 0 4px 0;
          }
          .print-footer-branding {
            font-size: 11px;
            color: #D2691E;
            margin: 4px 0;
            font-weight: 600;
          }
          .print-footer-contact {
            font-size: 9px;
            color: #666;
            margin: 4px 0 0 0;
            line-height: 1.2;
          }
        }
        .print-only {
          display: none;
        }
      `}</style>

      {/* Print-only Professional Invoice Layout - MUST BE FIRST */}
      <div className="print-only print-invoice-container">
        {/* SECTION 1: Company Header - ALWAYS FIRST */}
        <div className="print-company-header">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div className="print-company-logo">R</div>
            <div className="print-company-info">
              <h1>RoyalSpicyMasala</h1>
              <div className="print-company-tagline">Premium Quality Spices & Masalas</div>
              <div className="print-company-contact">
                📍 123 Spice Market, Trade Center, Mumbai - 400001<br/>
                📞 +91-9876543210 | ✉️ info@royalspicymasala.com<br/>
                🌐 www.royalspicymasala.com | GST: 27ABCDE1234F1Z5
              </div>
            </div>
          </div>
          <div className="print-invoice-title">
            <h2>INVOICE</h2>
            <div className="print-invoice-details">
              Bill #: {billNumber.toString().padStart(6, '0')}<br/>
              Date: {format(currentTime, 'dd/MM/yyyy')}<br/>
              Time: {format(currentTime, 'HH:mm:ss')}
            </div>
          </div>
        </div>

        {/* SECTION 2: Customer Details */}
        <div className="print-customer-section">
          <h3 className="print-customer-title">Bill To:</h3>
          <div className="print-customer-grid">
            <div>
              <div className="print-customer-field">
                <span className="print-customer-label">Name:</span> {form.getValues('clientName') || 'N/A'}
              </div>
              <div className="print-customer-field">
                <span className="print-customer-label">Mobile:</span> {form.getValues('clientMobile') || 'N/A'}
              </div>
              <div className="print-customer-field">
                <span className="print-customer-label">Payment:</span> {form.getValues('paymentMethod') || 'Cash'}
              </div>
            </div>
            <div>
              <div className="print-customer-field">
                <span className="print-customer-label">Email:</span> {form.getValues('clientEmail') || 'N/A'}
              </div>
              <div className="print-customer-field">
                <span className="print-customer-label">Address:</span> {form.getValues('clientAddress') || 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: Product Items Table */}
        <div className="print-table-container">
          <table className={`print-table ${
            cart.length > 15 ? 'print-table-ultra-compact' :
            cart.length > 5 ? 'print-table-compact' : ''
          }`}>
            <thead>
              <tr>
                <th style={{ width: '8%' }}>S.No.</th>
                <th style={{ width: '40%' }}>Product Name</th>
                <th style={{ width: '15%' }}>Quantity</th>
                <th style={{ width: '17%' }}>Unit Price</th>
                <th style={{ width: '20%' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td className="product-name">
                    {item.productName}<br/>
                    <small style={{
                      color: '#666',
                      fontSize: cart.length > 20 ? '9px' : cart.length > 10 ? '10px' : '11px'
                    }}>₹{item.pricePerKg.toFixed(2)}/kg</small>
                  </td>
                  <td>{item.displayQuantity}</td>
                  <td>₹{item.pricePerKg.toFixed(2)}</td>
                  <td className="total-amount">₹{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SECTIONS 4-6: Critical Totals and Footer Group */}
        <div className="print-totals-group print-critical-section">
          {/* SECTION 4: Savings Section */}
          {savings > 0 && (
            <div className="print-savings-section">
              <div className="print-savings-title">🎉 Congratulations! You Saved</div>
              <div className="print-savings-amount">₹{savings.toFixed(2)}</div>
              <div className="print-savings-details">
                Market Price: ₹{(total + savings).toFixed(2)} | Your Price: ₹{total.toFixed(2)}
              </div>
            </div>
          )}

          {/* SECTION 5: Total Amount Section */}
          <div className="print-total-section">
            <div className="print-total-title">Grand Total</div>
            <div className="print-total-amount">₹{total.toFixed(2)}</div>
            <div className="print-total-items">Total Items: {itemCount}</div>
          </div>

          {/* SECTION 6: Footer Section - ALWAYS LAST */}
          <div className="print-footer">
            <div className="print-footer-message">🙏 Thank you for shopping with us! 🙏</div>
            <div className="print-footer-branding">RoyalSpicyMasala - Your Trusted Spice Partner</div>
            <div className="print-footer-contact">
              For queries: +91-9876543210 | Visit: www.royalspicymasala.com<br/>
              Follow us: @RoyalSpicyMasala | Quality Guaranteed Since 1995
            </div>
          </div>
        </div>
      </div>

      <div className="no-print">
        <PageHeader
          title="Customer Billing"
          description="Create bills for customer purchases"
        />
      </div>

      <div className="space-y-6 print-container no-print">
        {/* Company & Client Info Section */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Company Information */}
              <div className="border-r border-gray-200 pr-6">
                <div className="flex items-center mb-4">
                  <div className="w-15 h-15 bg-primary rounded-xl flex items-center justify-center text-white text-2xl font-bold mr-4">
                    S
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">RoyalSpicyMasala</h2>
                    <p className="text-primary font-medium">Premium Quality Spices</p>
                  </div>
                </div>
                <div className="text-sm text-gray-600 space-y-2">
                  <p className="flex items-center"><MapPin className="w-4 h-4 mr-2 text-primary" /> 123 Spice Market, Trade Center</p>
                  <p className="flex items-center"><Phone className="w-4 h-4 mr-2 text-primary" /> +91-9876543210</p>
                  <p className="flex items-center"><Mail className="w-4 h-4 mr-2 text-primary" /> info@royalspicy.com</p>
                </div>
              </div>

              {/* Client Information */}
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <User className="text-primary mr-2" />
                  Client Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="clientName">Client Name *</Label>
                    <Input
                      id="clientName"
                      placeholder="Enter client name"
                      {...form.register('clientName')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientMobile">Mobile Number *</Label>
                    <Input
                      id="clientMobile"
                      placeholder="Enter mobile number"
                      {...form.register('clientMobile')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientEmail">Email (Optional)</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      placeholder="Enter email address"
                      {...form.register('clientEmail')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientAddress">Address (Optional)</Label>
                    <Input
                      id="clientAddress"
                      placeholder="Enter address"
                      {...form.register('clientAddress')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="paymentMethod">Payment Method *</Label>
                    <Select
                      value={form.watch('paymentMethod')}
                      onValueChange={(value) => form.setValue('paymentMethod', value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">💵 Cash</SelectItem>
                        <SelectItem value="Card">💳 Card</SelectItem>
                        <SelectItem value="Bank Transfer">🏦 Bank Transfer</SelectItem>
                        <SelectItem value="Credit">📝 Credit</SelectItem>
                        <SelectItem value="UPI">📱 UPI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Bill Info */}
            <div className="flex flex-col md:flex-row justify-between items-center mt-6 pt-6 border-t border-gray-200">
              <div className="bg-gray-100 px-6 py-3 rounded-xl mb-4 md:mb-0">
                <div className="flex space-x-6">
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-medium">{format(currentTime, 'dd/MM/yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Time</p>
                    <p className="font-medium">{format(currentTime, 'HH:mm:ss')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Bill #</p>
                    <p className="font-medium">{billNumber.toString().padStart(6, '0')}</p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary"
                  onClick={() => setLocation('/customer-transaction-history')}
                >
                  <History className="w-4 h-4 mr-1" />
                  Transaction History
                </Button>
                <Button variant="ghost" size="sm" className="text-primary">
                  <Tag className="w-4 h-4 mr-1" />
                  Special Offers
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Product Selection Form */}
        <Card className="shadow-lg no-print">
          <CardHeader>
            <CardTitle className="flex items-center">
              <ShoppingCart className="text-primary mr-3" />
              Add Products to Cart
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <Label htmlFor="productSelect">
                  <Package className="w-4 h-4 inline mr-2" />
                  Select Product
                </Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct} disabled={productsLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder={productsLoading ? "Loading products..." : "Choose Product..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {products?.map((product) => (
                      <SelectItem key={product.id} value={product.id.toString()}>
                        {product.name} - ₹{Number(product.retailPrice || product.price || 0).toFixed(2)}/kg
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="quantityInput">
                    {inputMode === 'quantity' ? (
                      <>
                        <Scale className="w-4 h-4 inline mr-2" />
                        Quantity
                      </>
                    ) : (
                      <>
                        <IndianRupee className="w-4 h-4 inline mr-2" />
                        Price Amount
                      </>
                    )}
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={toggleInputMode}
                    className="h-8 px-3"
                  >
                    {inputMode === 'quantity' ? (
                      <>
                        <ToggleLeft className="w-4 h-4 mr-1" />
                        By Qty
                      </>
                    ) : (
                      <>
                        <ToggleRight className="w-4 h-4 mr-1" />
                        By Price
                      </>
                    )}
                  </Button>
                </div>

                {inputMode === 'quantity' ? (
                  <Input
                    id="quantityInput"
                    type="number"
                    placeholder="Enter quantity"
                    min="0.01"
                    step="0.01"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                ) : (
                  <Input
                    id="priceInput"
                    type="number"
                    placeholder="Enter price amount (₹)"
                    min="0.01"
                    step="0.01"
                    value={priceAmount}
                    onChange={(e) => setPriceAmount(e.target.value)}
                  />
                )}

                {inputMode === 'price' && selectedProduct && priceAmount && (
                  <div className="mt-2 text-sm text-gray-600">
                    {(() => {
                      const product = products?.find(p => p.id.toString() === selectedProduct);
                      const productPrice = Number(product?.retailPrice || product?.price || 0);
                      const price = parseFloat(priceAmount);

                      if (productPrice > 0 && price > 0) {
                        const calculatedQty = calculateQuantityFromPrice(price, productPrice, unit);
                        return `≈ ${calculatedQty.toFixed(2)} ${unit}`;
                      }
                      return '';
                    })()}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="unitSelect">
                  <Scale className="w-4 h-4 inline mr-2" />
                  Unit
                </Label>
                <Select value={unit} onValueChange={(value: 'kg' | 'g' | 'pcs') => setUnit(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">Kilogram (kg)</SelectItem>
                    <SelectItem value="g">Gram (g)</SelectItem>
                    <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button onClick={addToCart} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Cart
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>



        {/* Cart Display */}
        <Card className="shadow-lg">
          <CardHeader className="bg-primary text-white">
            <CardTitle className="flex items-center">
              <ShoppingCart className="mr-3" />
              Shopping Cart
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="print-table">
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-center">S.No.</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead className="text-center">Unit Price</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center no-print">Actions</TableHead>
                  </TableRow>
                </TableHeader>
              </Table>
            </div>

            {/* Scrollable Table Body */}
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <Table className="print-table">
                <TableBody>
                  {cart.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                        <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg">Your cart is empty</p>
                        <p className="text-sm">Add products to get started</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    cart.map((item, index) => (
                      <TableRow key={index} className="hover:bg-gray-50">
                        <TableCell className="text-center font-medium">{index + 1}</TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div>
                              <div className="font-medium">{item.productName}</div>
                              <div className="text-sm text-gray-500">₹{item.pricePerKg.toFixed(2)}/kg</div>
                            </div>
                            <div className="no-print">
                              <CustomerBatchSelector
                                productId={item.productId}
                                productName={item.productName}
                                requiredQuantity={item.quantity}
                                unit={item.unit}
                                onBatchSelect={(batchIds, quantities, totalQuantity) =>
                                  handleBatchSelect(index, batchIds, quantities, totalQuantity)
                                }
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(index, -0.1)}
                              className="w-8 h-8 p-0 rounded-full no-print"
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="px-3 font-medium">{item.displayQuantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(index, 0.1)}
                              className="w-8 h-8 p-0 rounded-full no-print"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">₹{item.pricePerKg.toFixed(2)}</TableCell>
                        <TableCell className="text-center font-semibold">₹{item.total.toFixed(2)}</TableCell>
                        <TableCell className="text-center no-print">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeFromCart(index)}
                            className="w-8 h-8 p-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Cart Summary */}
            <div className="border-t border-gray-200 p-6">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <div className="flex flex-col md:flex-row gap-4 mb-4 md:mb-0 no-print">
                  <Button
                    onClick={saveBill}
                    disabled={createCustomerBill.isPending || cart.length === 0}
                    className={`px-6 py-3 text-lg ${
                      cart.length === 0
                        ? 'bg-gray-400 hover:bg-gray-400 text-gray-600 cursor-not-allowed'
                        : 'bg-primary hover:bg-primary/90 text-white'
                    }`}
                  >
                    {createCustomerBill.isPending ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : cart.length === 0 ? (
                      <>
                        <Tag className="w-5 h-5 mr-2" />
                        Add Items to Save Bill
                      </>
                    ) : (
                      <>
                        <Tag className="w-5 h-5 mr-2" />
                        Save Bill
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={printCurrentBill}
                    disabled={cart.length === 0}
                    variant="outline"
                    className="px-6 py-3 text-lg"
                  >
                    <Printer className="w-5 h-5 mr-2" />
                    {cart.length === 0 ? 'Add Items to Print' : 'Print Bill'}
                  </Button>
                  <Button variant="destructive" onClick={clearCart}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear Cart
                  </Button>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4">
                  <Badge variant="secondary" className="bg-yellow-500 text-white px-4 py-2">
                    <div className="text-center">
                      <p className="text-xs font-medium">You Saved</p>
                      <p className="text-xl font-bold">₹{savings.toFixed(2)}</p>
                    </div>
                  </Badge>

                  <div className="bg-primary text-white px-8 py-4 rounded-2xl">
                    <div className="text-center">
                      <p className="text-lg font-medium">Total Amount</p>
                      <p className="text-3xl font-bold">₹{total.toFixed(2)}</p>
                      <p className="text-sm opacity-90">Items: {itemCount}</p>
                    </div>
                  </div>
                </div>


              </div>
            </div>
          </CardContent>
        </Card>







      </div>
    </Layout>
  );
}
