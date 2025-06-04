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
  Camera,
  Printer,
  Heart,
  History,
  Tag,
  Save
} from 'lucide-react';
import Layout from '@/components/layout/layout';
import PageHeader from '@/components/common/page-header';

// Form validation schema
const customerBillingSchema = z.object({
  clientName: z.string().min(1, 'Client name is required'),
  clientMobile: z.string().min(10, 'Valid mobile number is required'),
  clientEmail: z.string().email().optional().or(z.literal('')),
  clientAddress: z.string().optional(),
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
}

export default function CustomerBillingPage() {
  const { data: products, isLoading: productsLoading } = useProducts();
  const createCustomerBill = useCreateCustomerBill();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [unit, setUnit] = useState<'kg' | 'g' | 'pcs'>('kg');
  const [billNumber] = useState(() => Math.floor(Math.random() * 100000) + 1);
  const [currentTime, setCurrentTime] = useState(new Date());

  const form = useForm<CustomerBillingForm>({
    resolver: zodResolver(customerBillingSchema),
    defaultValues: {
      clientName: '',
      clientMobile: '',
      clientEmail: '',
      clientAddress: '',
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

    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid quantity',
        variant: 'destructive',
      });
      return;
    }

    const product = products?.find(p => p.id.toString() === selectedProduct);
    if (!product) return;

    // Convert quantity to kg for calculation
    let quantityInKg: number;
    let displayQuantity: string;

    if (unit === 'g') {
      quantityInKg = qty / 1000;
      displayQuantity = `${qty}g`;
    } else if (unit === 'kg') {
      quantityInKg = qty;
      displayQuantity = `${qty}kg`;
    } else { // pieces
      quantityInKg = qty;
      displayQuantity = `${qty}pcs`;
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

  // Save bill functionality
  const saveBill = async () => {
    const formData = form.getValues();

    // Validate required fields
    if (!formData.clientName.trim()) {
      toast({
        title: 'Error',
        description: 'Client name is required',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.clientMobile.trim()) {
      toast({
        title: 'Error',
        description: 'Client mobile number is required',
        variant: 'destructive',
      });
      return;
    }

    if (cart.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add items to the cart before saving',
        variant: 'destructive',
      });
      return;
    }

    try {
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
      };

      await createCustomerBill.mutateAsync(billData);

      // Reset form and cart after successful save
      form.reset();
      setCart([]);
      setSelectedProduct('');
      setQuantity('');

    } catch (error) {
      console.error('Error saving bill:', error);
    }
  };

  return (
    <Layout>
      <PageHeader
        title="Customer Billing"
        description="Create bills for customer purchases"
      />

      <div className="space-y-6">
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
                    <h2 className="text-2xl font-bold text-gray-800">SpiceInventoryMaster</h2>
                    <p className="text-primary font-medium">Premium Quality Spices</p>
                  </div>
                </div>
                <div className="text-sm text-gray-600 space-y-2">
                  <p className="flex items-center"><MapPin className="w-4 h-4 mr-2 text-primary" /> 123 Spice Market, Trade Center</p>
                  <p className="flex items-center"><Phone className="w-4 h-4 mr-2 text-primary" /> +91 (123) 456-7890</p>
                  <p className="flex items-center"><Mail className="w-4 h-4 mr-2 text-primary" /> contact@spiceinventory.com</p>
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
                <Button variant="ghost" size="sm" className="text-primary">
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
        <Card className="shadow-lg">
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
                <Label htmlFor="quantityInput">
                  <Scale className="w-4 h-4 inline mr-2" />
                  Quantity
                </Label>
                <Input
                  id="quantityInput"
                  type="number"
                  placeholder="Enter quantity"
                  min="0.01"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
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
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-center">S.No.</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead className="text-center">Unit Price</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
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
                          <div>
                            <div className="font-medium">{item.productName}</div>
                            <div className="text-sm text-gray-500">₹{item.pricePerKg}/kg</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(index, -0.1)}
                              className="w-8 h-8 p-0 rounded-full"
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="px-3 font-medium">{item.displayQuantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(index, 0.1)}
                              className="w-8 h-8 p-0 rounded-full"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">₹{item.pricePerKg}</TableCell>
                        <TableCell className="text-center font-semibold">₹{item.total.toFixed(2)}</TableCell>
                        <TableCell className="text-center">
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
                <div className="flex flex-col md:flex-row gap-4 mb-4 md:mb-0">
                  <Button
                    onClick={saveBill}
                    disabled={createCustomerBill.isPending || cart.length === 0}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {createCustomerBill.isPending ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </div>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Bill
                      </>
                    )}
                  </Button>
                  <Button variant="destructive" onClick={clearCart}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear Cart
                  </Button>
                  <Button variant="outline">
                    <Camera className="w-4 h-4 mr-2" />
                    Save Receipt
                  </Button>
                  <Button variant="outline">
                    <Printer className="w-4 h-4 mr-2" />
                    Print Receipt
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

        {/* Footer */}
        <div className="text-center text-gray-600 py-4">
          <p className="flex items-center justify-center">
            <Heart className="w-4 h-4 text-red-500 mr-2" />
            Thank you for choosing SpiceInventoryMaster
          </p>
          <p className="text-sm mt-2">
            © 2024 SpiceInventoryMaster. All rights reserved.
          </p>
        </div>
      </div>
    </Layout>
  );
}
