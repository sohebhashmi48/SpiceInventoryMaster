import React, { useState, useEffect } from 'react';
import { Grid, List, Package, Leaf, Coffee, ArrowRight, Plus, Minus, User, MessageCircle, ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import ShowcaseLayout from '@/components/showcase/showcase-layout';
import ProductCard from '@/components/showcase/product-card';
import MixCalculator from '@/components/showcase/mix-calculator';
import { formatCurrency } from '@/lib/utils';
import { BUSINESS_WHATSAPP_NUMBER, generateOrderMessage, openWhatsApp } from '@/lib/whatsapp-utils';
import {
  useShowcaseCategories,
  useShowcaseProducts,
  useShoppingCart,
  useSearch,
  useProductFilters,
  ShowcaseProduct
} from '@/hooks/use-showcase';

// Checkout form schema
const checkoutSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().min(10, 'Address must be at least 10 characters'),
  notes: z.string().optional()
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

export default function ProductShowcasePage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [currentView, setCurrentView] = useState<'products' | 'cart' | 'checkout'>('products');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visibleProductsCount, setVisibleProductsCount] = useState(12); // Show 12 products initially
  const [categoryVisibleCounts, setCategoryVisibleCounts] = useState<Record<string, number>>({});
  const [showMixCalculator, setShowMixCalculator] = useState(false);

  // Hooks
  const { searchQuery, handleSearchChange } = useSearch();
  const { filters, updateFilter } = useProductFilters();
  const { cart, addToCart, updateQuantity, removeFromCart, clearCart, getCartItemCount, getCartTotal, isInCart, getCartItem } = useShoppingCart();

  // Checkout form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema)
  });

  // Data fetching
  const { data: categories = [], isLoading: categoriesLoading } = useShowcaseCategories();
  const { data: allProducts = [], isLoading: productsLoading } = useShowcaseProducts({
    search: searchQuery,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder
  });

  // Parse URL parameters for category and set default
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');

    if (categoryParam && categories.length > 0) {
      const category = categories.find(cat => cat.id.toString() === categoryParam);
      if (category) {
        setActiveCategory(categoryParam);
        return;
      }
    }

    // Set "All Products" as default if no valid category in URL
    if (!activeCategory) {
      setActiveCategory('');
    }
  }, [categories, location, activeCategory]);



  // Get category icon
  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('spice') || name.includes('masala')) return Package;
    if (name.includes('herb') || name.includes('leaf')) return Leaf;
    if (name.includes('seed') || name.includes('grain')) return Coffee;
    return Package;
  };

  // Handle category change
  const handleCategoryChange = (categoryId: string) => {
    setActiveCategory(categoryId);

    // Reset pagination for the new category
    if (categoryId === '') {
      setVisibleProductsCount(12);
    } else {
      setCategoryVisibleCounts(prev => ({
        ...prev,
        [categoryId]: 12
      }));
    }

    // Update URL without page refresh
    const url = new URL(window.location.href);
    if (categoryId === '') {
      // Remove category parameter for "All Products"
      url.searchParams.delete('category');
    } else {
      url.searchParams.set('category', categoryId);
    }
    window.history.pushState({}, '', url.toString());
  };

  const handleAddToCart = (product: ShowcaseProduct, quantity: number = 1) => {
    addToCart(product, quantity);
    toast({
      title: 'Added to Cart',
      description: `${product.name} has been added to your cart.`,
    });
  };

  const handleQuantityChange = (productId: number, newQuantity: number) => {
    updateQuantity(productId, newQuantity);
  };

  // Cart and checkout handlers
  const handleCartClick = () => {
    setCurrentView('cart');
  };

  const handleContinueShopping = () => {
    setCurrentView('products');
  };

  const handleProceedToCheckout = () => {
    setCurrentView('checkout');
  };

  const handleBackToCart = () => {
    setCurrentView('cart');
  };

  // Mix calculator handlers
  const handleMixCalculatorClick = () => {
    setShowMixCalculator(true);
  };

  const handleCloseMixCalculator = () => {
    setShowMixCalculator(false);
  };

  const handleCartQuantityChange = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      updateQuantity(productId, newQuantity);
    }
  };

  // Pagination helpers
  const getVisibleCount = (categoryId: string) => {
    if (categoryId === '') {
      return visibleProductsCount;
    }
    return categoryVisibleCounts[categoryId] || 12;
  };

  const handleShowMore = (categoryId: string) => {
    if (categoryId === '') {
      setVisibleProductsCount(prev => prev + 12);
    } else {
      setCategoryVisibleCounts(prev => ({
        ...prev,
        [categoryId]: (prev[categoryId] || 12) + 12
      }));
    }
  };

  const getVisibleProducts = (products: ShowcaseProduct[], categoryId: string) => {
    const visibleCount = getVisibleCount(categoryId);
    return products.slice(0, visibleCount);
  };

  // Checkout submission
  const onSubmit = async (data: CheckoutForm) => {
    setIsSubmitting(true);

    try {
      const cartTotal = getCartTotal();
      const deliveryFee = cartTotal >= 500 ? 0 : 50;
      const finalTotal = cartTotal + deliveryFee;

      // Generate and send WhatsApp message
      const whatsappMessage = generateOrderMessage({
        customerName: data.name,
        customerPhone: data.phone,
        customerEmail: data.email,
        customerAddress: data.address,
        notes: data.notes,
        items: cart.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          price: item.price,
          total: item.total
        })),
        subtotal: cartTotal,
        deliveryFee,
        total: finalTotal
      });

      // Open WhatsApp with the order message
      openWhatsApp(BUSINESS_WHATSAPP_NUMBER, whatsappMessage);

      toast({
        title: 'Order Placed!',
        description: 'Your order has been sent via WhatsApp. We will contact you shortly to confirm.',
      });

      // Clear cart and reset form
      clearCart();
      reset();
      setCurrentView('products');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to place order. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ShowcaseLayout
      cartItemCount={getCartItemCount()}
      onSearchChange={handleSearchChange}
      searchQuery={searchQuery}
      onCartClick={handleCartClick}
      onMixCalculatorClick={handleMixCalculatorClick}
    >
      {currentView === 'products' && (
        <>
          {/* Category Tabs Section */}
      <section className="py-8 md:py-12 bg-white">
            <div className="container mx-auto px-4">
          {categoriesLoading ? (
            <div className="flex justify-center">
              <div className="animate-pulse flex space-x-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-gray-200 rounded-lg h-12 w-32"></div>
                ))}
              </div>
            </div>
          ) : (
            <Tabs value={activeCategory} onValueChange={handleCategoryChange} className="w-full">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 h-auto p-2 bg-gray-100">
                {/* All Products Tab */}
                <TabsTrigger
                  value=""
                  className="flex flex-col items-center gap-2 p-4 h-auto data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300"
                >
                  <Grid className="h-5 w-5" />
                  <span className="text-sm font-medium">All Products</span>
                </TabsTrigger>

                {/* Category Tabs */}
                {categories.map((category) => {
                  const IconComponent = getCategoryIcon(category.name);
                  return (
                    <TabsTrigger
                      key={category.id}
                      value={category.id.toString()}
                      className="flex flex-col items-center gap-2 p-4 h-auto data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300"
                    >
                      <IconComponent className="h-5 w-5" />
                      <span className="text-sm font-medium">{category.name}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {/* All Products Tab Content */}
              <TabsContent
                value=""
                className="mt-8 focus:outline-none"
              >
                {/* All Products Header */}
                <div className="mb-6">
                  <h3 className="text-xl md:text-2xl font-bold text-primary mb-2">
                    All Products
                  </h3>
                  <p className="text-gray-600">
                    Browse our complete collection of premium spices and masalas
                  </p>
                </div>

                {/* Controls */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">
                      Showing {Math.min(getVisibleCount(''), allProducts.length)} of {allProducts.length} products
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Sort */}
                    <Select
                      value={filters.sortBy}
                      onValueChange={(value) => updateFilter('sortBy', value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="price">Price</SelectItem>
                        <SelectItem value="stock">Stock</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* View Mode */}
                    <div className="flex border rounded-lg">
                      <Button
                        variant={viewMode === 'grid' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className="rounded-r-none"
                      >
                        <Grid className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                        className="rounded-l-none"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* All Products Grid */}
                {productsLoading ? (
                  <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'} gap-6`}>
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="bg-gray-200 rounded-lg h-48 mb-4"></div>
                        <div className="bg-gray-200 rounded h-4 mb-2"></div>
                        <div className="bg-gray-200 rounded h-3 w-3/4 mb-2"></div>
                        <div className="bg-gray-200 rounded h-6 w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : allProducts.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-gray-400 text-6xl mb-4">📦</div>
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No products found</h3>
                    <p className="text-gray-500">No products available</p>
                  </div>
                ) : (
                  <>
                    <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'} gap-6`}>
                      {getVisibleProducts(allProducts, '').map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          cartQuantity={getCartItem(product.id)?.quantity || 0}
                          isInCart={isInCart(product.id)}
                          onAddToCart={handleAddToCart}
                          onUpdateQuantity={handleQuantityChange}
                          viewMode={viewMode}
                        />
                      ))}
                    </div>

                    {/* Show More Button */}
                    {getVisibleCount('') < allProducts.length && (
                      <div className="text-center mt-8">
                        <Button
                          onClick={() => handleShowMore('')}
                          variant="outline"
                          size="lg"
                          className="bg-white border-primary text-primary hover:bg-primary hover:text-white transition-all duration-300"
                        >
                          Show More Products ({allProducts.length - getVisibleCount('')} remaining)
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              {/* Products for each category */}
              {categories.map((category) => {
                const categoryProducts = allProducts.filter(product => product.categoryId.toString() === category.id.toString());

                return (
                  <TabsContent
                    key={category.id}
                    value={category.id.toString()}
                    className="mt-8 focus:outline-none"
                  >
                    {/* Category Header */}
                    <div className="mb-6">
                      <h3 className="text-xl md:text-2xl font-bold text-primary mb-2">
                        {category.name}
                      </h3>
                      <p className="text-gray-600">
                        {category.description || `Explore our premium ${category.name.toLowerCase()} collection`}
                      </p>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">
                          Showing {Math.min(getVisibleCount(category.id.toString()), categoryProducts.length)} of {categoryProducts.length} products
                        </span>
                      </div>

                    <div className="flex items-center gap-3">
                      {/* Sort */}
                      <Select
                        value={filters.sortBy}
                        onValueChange={(value) => updateFilter('sortBy', value)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="name">Name</SelectItem>
                          <SelectItem value="price">Price</SelectItem>
                          <SelectItem value="stock">Stock</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* View Mode */}
                      <div className="flex border rounded-lg">
                        <Button
                          variant={viewMode === 'grid' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('grid')}
                          className="rounded-r-none"
                        >
                          <Grid className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={viewMode === 'list' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('list')}
                          className="rounded-l-none"
                        >
                          <List className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Products Grid */}
                  {productsLoading ? (
                    <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'} gap-6`}>
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="bg-gray-200 rounded-lg h-48 mb-4"></div>
                          <div className="bg-gray-200 rounded h-4 mb-2"></div>
                          <div className="bg-gray-200 rounded h-3 w-3/4 mb-2"></div>
                          <div className="bg-gray-200 rounded h-6 w-1/2"></div>
                        </div>
                      ))}
                    </div>
                  ) : categoryProducts.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="text-gray-400 text-6xl mb-4">📦</div>
                      <h3 className="text-xl font-semibold text-gray-600 mb-2">No products found</h3>
                      <p className="text-gray-500">No products available in this category</p>
                    </div>
                  ) : (
                    <>
                      <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'} gap-6`}>
                        {getVisibleProducts(categoryProducts, category.id.toString()).map((product) => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            cartQuantity={getCartItem(product.id)?.quantity || 0}
                            isInCart={isInCart(product.id)}
                            onAddToCart={handleAddToCart}
                            onUpdateQuantity={handleQuantityChange}
                            viewMode={viewMode}
                          />
                        ))}
                      </div>

                      {/* Show More Button */}
                      {getVisibleCount(category.id.toString()) < categoryProducts.length && (
                        <div className="text-center mt-8">
                          <Button
                            onClick={() => handleShowMore(category.id.toString())}
                            variant="outline"
                            size="lg"
                            className="bg-white border-primary text-primary hover:bg-primary hover:text-white transition-all duration-300"
                          >
                            Show More Products ({categoryProducts.length - getVisibleCount(category.id.toString())} remaining)
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
        </div>
      </section>



      {/* Call to Action with Animated Gradient */}
      <section
        className="relative overflow-hidden text-white py-12 md:py-16"
        style={{
          background: 'linear-gradient(45deg, #5D4037, #E65100, #FF8F00, #D84315, #5D4037)',
          backgroundSize: '400% 400%',
          animation: 'gradientShift 8s ease infinite'
        }}
      >
        {/* Animated Background Overlay */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: 'linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent)',
            backgroundSize: '200% 200%',
            animation: 'shimmer 3s ease-in-out infinite'
          }}
        />

        {/* Floating Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-white rounded-full opacity-20"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${8 + Math.random() * 4}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`
              }}
            />
          ))}
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 drop-shadow-lg">
            Ready to Order?
          </h2>
          <p className="text-base md:text-xl mb-6 md:mb-8 text-orange-100 drop-shadow-md px-4">
            Place your order via WhatsApp for quick and easy delivery
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="bg-white text-primary hover:bg-gray-100 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl text-sm md:text-base"
            onClick={handleProceedToCheckout}
          >
            <ArrowRight className="mr-2 h-4 w-4 md:h-5 md:w-5" />
            Proceed to Checkout
          </Button>
        </div>
      </section>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes shimmer {
          0% { background-position: -200% -200%; }
          50% { background-position: 200% 200%; }
          100% { background-position: -200% -200%; }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-20px) rotate(120deg); }
          66% { transform: translateY(10px) rotate(240deg); }
        }


      `}</style>
        </>
      )}

      {/* Cart Section */}
      {currentView === 'cart' && (
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                onClick={handleContinueShopping}
                className="text-primary hover:text-primary hover:bg-primary/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Continue Shopping
              </Button>
            </div>
            <h1 className="text-3xl font-bold text-primary">Shopping Cart</h1>
            <p className="text-gray-600 mt-2">
              {getCartItemCount() === 0 ? 'Your cart is empty' : `${getCartItemCount()} item${getCartItemCount() !== 1 ? 's' : ''} in your cart`}
            </p>
          </div>

          {cart.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-gray-400 text-6xl mb-4">🛒</div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">Your cart is empty</h3>
              <p className="text-gray-500 mb-6">Add some delicious spices to get started!</p>
              <Button onClick={handleContinueShopping} className="bg-primary hover:bg-primary/90">
                Start Shopping
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                {cart.map((item) => (
                  <Card key={item.productId} className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-amber-100 rounded-lg flex items-center justify-center">
                        {item.imagePath ? (
                          <img
                            src={item.imagePath.startsWith('/api/') ? item.imagePath : `/api${item.imagePath}`}
                            alt={item.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <span className="text-2xl">🌶️</span>
                        )}
                      </div>

                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{item.name}</h3>
                        <p className="text-gray-600">{formatCurrency(item.price)} per {item.unit}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCartQuantityChange(item.productId, item.quantity - 1)}
                          className="h-8 w-8 p-0"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="px-3 py-1 bg-gray-100 rounded text-sm font-medium min-w-[3rem] text-center">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCartQuantityChange(item.productId, item.quantity + 1)}
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="text-right">
                        <p className="font-semibold text-lg">{formatCurrency(item.total)}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.productId)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <Card className="p-6 sticky top-4">
                  <h3 className="text-xl font-semibold mb-4">Order Summary</h3>

                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatCurrency(getCartTotal())}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery Fee</span>
                      <span>{getCartTotal() >= 500 ? 'Free' : formatCurrency(50)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span>{formatCurrency(getCartTotal() + (getCartTotal() >= 500 ? 0 : 50))}</span>
                    </div>
                  </div>

                  {getCartTotal() < 500 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-orange-700">
                        Add {formatCurrency(500 - getCartTotal())} more for free delivery!
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={handleProceedToCheckout}
                    className="w-full bg-primary hover:bg-primary/90"
                    size="lg"
                  >
                    Proceed to Checkout
                  </Button>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Checkout Section */}
      {currentView === 'checkout' && (
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={handleBackToCart}
              className="text-primary hover:text-primary hover:bg-primary/10 mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Cart
            </Button>
            <h1 className="text-3xl font-bold text-primary">Checkout</h1>
            <p className="text-gray-600 mt-2">Complete your order details</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Customer Details */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Customer Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      {...register('name')}
                      placeholder="Enter your full name"
                      className={errors.name ? 'border-red-500' : ''}
                    />
                    {errors.name && (
                      <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      {...register('phone')}
                      placeholder="Enter your phone number"
                      className={errors.phone ? 'border-red-500' : ''}
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      {...register('email')}
                      placeholder="Enter your email (optional)"
                      className={errors.email ? 'border-red-500' : ''}
                    />
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="address">Delivery Address *</Label>
                    <Textarea
                      id="address"
                      {...register('address')}
                      placeholder="Enter your complete delivery address"
                      rows={3}
                      className={errors.address ? 'border-red-500' : ''}
                    />
                    {errors.address && (
                      <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="notes">Order Notes</Label>
                    <Textarea
                      id="notes"
                      {...register('notes')}
                      placeholder="Any special instructions for your order (optional)"
                      rows={2}
                    />
                  </div>
                </div>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-4">
                <h3 className="text-xl font-semibold mb-4">Order Summary</h3>

                <div className="space-y-3 mb-4">
                  {cart.map((item) => (
                    <div key={item.productId} className="flex justify-between text-sm">
                      <span>{item.name} × {item.quantity}</span>
                      <span>{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatCurrency(getCartTotal())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span>{getCartTotal() >= 500 ? 'Free' : formatCurrency(50)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>{formatCurrency(getCartTotal() + (getCartTotal() >= 500 ? 0 : 50))}</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || cart.length === 0}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Placing Order...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Place Order via WhatsApp
                    </>
                  )}
                </Button>

                <p className="text-xs text-gray-500 mt-2 text-center">
                  Your order will be sent via WhatsApp for confirmation
                </p>
              </Card>
            </div>
          </form>
        </div>
      )}

      {/* Mix Calculator Modal */}
      {showMixCalculator && (
        <MixCalculator
          products={allProducts}
          onAddToCart={handleAddToCart}
          onClose={handleCloseMixCalculator}
        />
      )}
    </ShowcaseLayout>
  );
}
