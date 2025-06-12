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
import { formatCurrency, formatQuantity } from '@/lib/utils';
import { BUSINESS_WHATSAPP_NUMBER, generateOrderMessage, openWhatsApp } from '@/lib/whatsapp-utils';
import {
  useShowcaseCategories,
  useShowcaseProducts,
  useShoppingCart,
  useSearch,
  useProductFilters,
  ShowcaseProduct
} from '@/hooks/use-showcase';
import { useOrderMutations } from '@/hooks/use-orders';

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
  const { cart, addToCart, updateQuantity, removeFromCart, clearCart, clearCartAfterTime, getCartItemCount, getCartTotal, isInCart, getCartItem } = useShoppingCart();
  const { createOrder } = useOrderMutations();

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

  const handleRemoveFromCart = (productId: number) => {
    removeFromCart(productId);
    toast({
      title: 'Removed from Cart',
      description: 'Item has been removed from your cart.',
    });
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

      // Save order to database before sending WhatsApp
      const orderData = {
        customerName: data.name,
        customerPhone: data.phone,
        customerEmail: data.email,
        customerAddress: data.address,
        notes: data.notes,
        items: cart.map(item => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          price: item.price,
          total: item.total
        })),
        subtotal: cartTotal,
        deliveryFee,
        total: finalTotal,
        whatsappMessage
      };

      // Save to database using the hook
      const orderResult = await createOrder.mutateAsync(orderData);
      console.log('Order saved:', orderResult);

      // Open WhatsApp with the order message
      openWhatsApp(BUSINESS_WHATSAPP_NUMBER, whatsappMessage);

      toast({
        title: 'Order Placed!',
        description: `Your order #${orderResult.orderNumber} has been sent via WhatsApp. We will contact you shortly to confirm.`,
      });

      // Clear cart and reset form
      clearCart();
      reset();
      setCurrentView('products');

      // Set auto-clear for next user (30 minutes)
      clearCartAfterTime(30);
    } catch (error) {
      console.error('Order submission error:', error);
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
      <section className="py-3 sm:py-4 md:py-6 lg:py-8 bg-white">
            <div className="container mx-auto px-3 sm:px-4">
          {categoriesLoading ? (
            <div className="flex justify-center">
              <div className="animate-pulse flex space-x-2 sm:space-x-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-gray-200 rounded-lg h-10 sm:h-12 w-20 sm:w-32"></div>
                ))}
              </div>
            </div>
          ) : (
            <Tabs value={activeCategory} onValueChange={handleCategoryChange} className="w-full">
              {/* Mobile: Horizontal scrollable tabs */}
              <div className="md:hidden">
                <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide px-1">
                  {/* All Products Tab */}
                  <button
                    onClick={() => handleCategoryChange("")}
                    className={`flex flex-col items-center gap-1 p-2 sm:p-3 min-w-[70px] sm:min-w-[80px] rounded-lg transition-all duration-300 ${
                      activeCategory === ""
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Grid className="h-4 w-4" />
                    <span className="text-xs font-medium whitespace-nowrap">All</span>
                  </button>

                  {/* Category Tabs */}
                  {categories.map((category) => {
                    const IconComponent = getCategoryIcon(category.name);
                    return (
                      <button
                        key={category.id}
                        onClick={() => handleCategoryChange(category.id.toString())}
                        className={`flex flex-col items-center gap-1 p-2 sm:p-3 min-w-[70px] sm:min-w-[80px] rounded-lg transition-all duration-300 ${
                          activeCategory === category.id.toString()
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <IconComponent className="h-4 w-4" />
                        <span className="text-xs font-medium whitespace-nowrap truncate max-w-[60px] sm:max-w-none">
                          {category.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Desktop: Grid layout */}
              <TabsList className="hidden md:grid w-full grid-cols-4 lg:grid-cols-7 gap-2 h-auto p-2 bg-gray-100">
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
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-primary mb-1 sm:mb-2">
                    All Products
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600">
                    Browse our complete collection of premium spices and masalas
                  </p>
                </div>

                {/* Controls */}
                <div className="flex flex-col gap-3 mb-4 sm:mb-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <span className="text-xs sm:text-sm text-gray-600">
                      Showing {Math.min(getVisibleCount(''), allProducts.length)} of {allProducts.length} products
                    </span>

                    {/* Mobile-first controls */}
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      {/* Sort */}
                      <Select
                        value={filters.sortBy}
                        onValueChange={(value) => updateFilter('sortBy', value)}
                      >
                        <SelectTrigger className="w-24 sm:w-32 h-8 text-xs sm:text-sm">
                          <SelectValue placeholder="Sort" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="name">Name</SelectItem>
                          <SelectItem value="price">Price</SelectItem>
                          <SelectItem value="stock">Stock</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Sort Order */}
                      <Select
                        value={filters.sortOrder}
                        onValueChange={(value) => updateFilter('sortOrder', value)}
                      >
                        <SelectTrigger className="w-20 sm:w-24 h-8 text-xs sm:text-sm">
                          <SelectValue placeholder="Order" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asc">A-Z</SelectItem>
                          <SelectItem value="desc">Z-A</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* View Mode - Hidden on mobile for better space usage */}
                      <div className="hidden sm:flex border rounded-lg">
                        <Button
                          variant={viewMode === 'grid' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('grid')}
                          className="rounded-r-none h-8"
                        >
                          <Grid className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        <Button
                          variant={viewMode === 'list' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('list')}
                          className="rounded-l-none h-8"
                        >
                          <List className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* All Products Grid */}
                {productsLoading ? (
                  <div className={`grid ${viewMode === 'grid' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6' : 'grid-cols-1'} gap-2 sm:gap-3 md:gap-4 lg:gap-6`}>
                    {[...Array(12)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="bg-gray-200 rounded-lg h-32 sm:h-36 md:h-40 lg:h-44 mb-2 sm:mb-3"></div>
                        <div className="bg-gray-200 rounded h-3 sm:h-4 mb-1 sm:mb-2"></div>
                        <div className="bg-gray-200 rounded h-2 sm:h-3 w-3/4 mb-1 sm:mb-2"></div>
                        <div className="bg-gray-200 rounded h-4 sm:h-5 w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : allProducts.length === 0 ? (
                  <div className="text-center py-8 sm:py-12 md:py-16">
                    <div className="text-gray-400 text-4xl sm:text-5xl md:text-6xl mb-2 sm:mb-3 md:mb-4">📦</div>
                    <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-600 mb-1 sm:mb-2">No products found</h3>
                    <p className="text-sm sm:text-base text-gray-500">No products available</p>
                  </div>
                ) : (
                  <>
                    <div className={`grid ${viewMode === 'grid' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6' : 'grid-cols-1'} gap-2 sm:gap-3 md:gap-4 lg:gap-6`}>
                      {getVisibleProducts(allProducts, '').map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          cartQuantity={getCartItem(product.id)?.quantity || 0}
                          isInCart={isInCart(product.id)}
                          onAddToCart={handleAddToCart}
                          onUpdateQuantity={handleQuantityChange}
                          onRemoveFromCart={handleRemoveFromCart}
                          viewMode={viewMode}
                        />
                      ))}
                    </div>

                    {/* Show More Button */}
                    {getVisibleCount('') < allProducts.length && (
                      <div className="text-center mt-6 sm:mt-8">
                        <Button
                          onClick={() => handleShowMore('')}
                          variant="outline"
                          size="lg"
                          className="bg-white border-primary text-primary hover:bg-primary hover:text-white transition-all duration-300 w-full sm:w-auto"
                        >
                          <span className="hidden sm:inline">Show More Products ({allProducts.length - getVisibleCount('')} remaining)</span>
                          <span className="sm:hidden">Show More ({allProducts.length - getVisibleCount('')})</span>
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
                    <div className="mb-4 sm:mb-6">
                      <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-primary mb-1 sm:mb-2">
                        {category.name}
                      </h3>
                      <p className="text-sm sm:text-base text-gray-600">
                        {category.description || `Explore our premium ${category.name.toLowerCase()} collection`}
                      </p>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-col gap-3 mb-4 sm:mb-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <span className="text-xs sm:text-sm text-gray-600">
                          Showing {Math.min(getVisibleCount(category.id.toString()), categoryProducts.length)} of {categoryProducts.length} products
                        </span>

                        {/* Mobile-first controls */}
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                          {/* Sort */}
                          <Select
                            value={filters.sortBy}
                            onValueChange={(value) => updateFilter('sortBy', value)}
                          >
                            <SelectTrigger className="w-24 sm:w-32 h-8 text-xs sm:text-sm">
                              <SelectValue placeholder="Sort" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="name">Name</SelectItem>
                              <SelectItem value="price">Price</SelectItem>
                              <SelectItem value="stock">Stock</SelectItem>
                            </SelectContent>
                          </Select>

                          {/* Sort Order */}
                          <Select
                            value={filters.sortOrder}
                            onValueChange={(value) => updateFilter('sortOrder', value)}
                          >
                            <SelectTrigger className="w-20 sm:w-24 h-8 text-xs sm:text-sm">
                              <SelectValue placeholder="Order" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="asc">A-Z</SelectItem>
                              <SelectItem value="desc">Z-A</SelectItem>
                            </SelectContent>
                          </Select>

                          {/* View Mode - Hidden on mobile for better space usage */}
                          <div className="hidden sm:flex border rounded-lg">
                            <Button
                              variant={viewMode === 'grid' ? 'default' : 'ghost'}
                              size="sm"
                              onClick={() => setViewMode('grid')}
                              className="rounded-r-none h-8"
                            >
                              <Grid className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                            <Button
                              variant={viewMode === 'list' ? 'default' : 'ghost'}
                              size="sm"
                              onClick={() => setViewMode('list')}
                              className="rounded-l-none h-8"
                            >
                              <List className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                  {/* Products Grid */}
                  {productsLoading ? (
                    <div className={`grid ${viewMode === 'grid' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6' : 'grid-cols-1'} gap-2 sm:gap-3 md:gap-4 lg:gap-6`}>
                      {[...Array(12)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="bg-gray-200 rounded-lg h-32 sm:h-36 md:h-40 lg:h-44 mb-2 sm:mb-3"></div>
                          <div className="bg-gray-200 rounded h-3 sm:h-4 mb-1 sm:mb-2"></div>
                          <div className="bg-gray-200 rounded h-2 sm:h-3 w-3/4 mb-1 sm:mb-2"></div>
                          <div className="bg-gray-200 rounded h-4 sm:h-5 w-1/2"></div>
                        </div>
                      ))}
                    </div>
                  ) : categoryProducts.length === 0 ? (
                    <div className="text-center py-8 sm:py-12 md:py-16">
                      <div className="text-gray-400 text-4xl sm:text-5xl md:text-6xl mb-2 sm:mb-3 md:mb-4">📦</div>
                      <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-600 mb-1 sm:mb-2">No products found</h3>
                      <p className="text-sm sm:text-base text-gray-500">No products available in this category</p>
                    </div>
                  ) : (
                    <>
                      <div className={`grid ${viewMode === 'grid' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6' : 'grid-cols-1'} gap-2 sm:gap-3 md:gap-4 lg:gap-6`}>
                        {getVisibleProducts(categoryProducts, category.id.toString()).map((product) => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            cartQuantity={getCartItem(product.id)?.quantity || 0}
                            isInCart={isInCart(product.id)}
                            onAddToCart={handleAddToCart}
                            onUpdateQuantity={handleQuantityChange}
                            onRemoveFromCart={handleRemoveFromCart}
                            viewMode={viewMode}
                          />
                        ))}
                      </div>

                      {/* Show More Button */}
                      {getVisibleCount(category.id.toString()) < categoryProducts.length && (
                        <div className="text-center mt-6 sm:mt-8">
                          <Button
                            onClick={() => handleShowMore(category.id.toString())}
                            variant="outline"
                            size="lg"
                            className="bg-white border-primary text-primary hover:bg-primary hover:text-white transition-all duration-300 w-full sm:w-auto"
                          >
                            <span className="hidden sm:inline">Show More Products ({categoryProducts.length - getVisibleCount(category.id.toString())} remaining)</span>
                            <span className="sm:hidden">Show More ({categoryProducts.length - getVisibleCount(category.id.toString())})</span>
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

        /* Hide scrollbar for mobile category tabs */
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
        </>
      )}

      {/* Cart Section */}
      {currentView === 'cart' && (
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
              <Button
                variant="ghost"
                onClick={handleContinueShopping}
                className="text-primary hover:text-primary hover:bg-primary/10 self-start"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Continue Shopping
              </Button>

              {cart.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    clearCart();
                    toast({
                      title: 'Cart Cleared',
                      description: 'All items have been removed from your cart.',
                    });
                  }}
                  className="text-red-600 border-red-600 hover:bg-red-50 self-start sm:self-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Clear Cart</span>
                  <span className="sm:hidden">Clear</span>
                </Button>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary">Shopping Cart</h1>
            <p className="text-gray-600 mt-2 text-sm sm:text-base">
              {getCartItemCount() === 0 ? 'Your cart is empty' : `${getCartItemCount()} item${getCartItemCount() !== 1 ? 's' : ''} in your cart`}
            </p>
          </div>

          {cart.length === 0 ? (
            <div className="text-center py-12 sm:py-16">
              <div className="text-gray-400 text-5xl sm:text-6xl mb-3 sm:mb-4">🛒</div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-600 mb-2">Your cart is empty</h3>
              <p className="text-gray-500 mb-4 sm:mb-6 text-sm sm:text-base">Add some delicious spices to get started!</p>
              <Button onClick={handleContinueShopping} className="bg-primary hover:bg-primary/90">
                Start Shopping
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-3 lg:space-y-4">
                {cart.map((item) => (
                  <Card key={item.productId} className="p-3 sm:p-4">
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                      <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-orange-100 to-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        {item.imagePath ? (
                          <img
                            src={item.imagePath.startsWith('/api/') ? item.imagePath : `/api${item.imagePath}`}
                            alt={item.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <span className="text-lg lg:text-2xl">🌶️</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm lg:text-lg truncate">{item.name}</h3>
                        <p className="text-gray-600 text-xs lg:text-sm">{formatCurrency(item.price)} per {item.unit}</p>
                      </div>

                      <div className="flex flex-col lg:flex-row items-end lg:items-center gap-2 lg:gap-4">
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-1 lg:gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCartQuantityChange(item.productId, item.quantity - 1)}
                            className="h-6 w-6 lg:h-8 lg:w-8 p-0"
                          >
                            <Minus className="h-3 w-3 lg:h-4 lg:w-4" />
                          </Button>
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs lg:text-sm font-medium min-w-[2rem] lg:min-w-[3rem] text-center">
                            {formatQuantity(item.quantity)}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCartQuantityChange(item.productId, item.quantity + 1)}
                            className="h-6 w-6 lg:h-8 lg:w-8 p-0"
                          >
                            <Plus className="h-3 w-3 lg:h-4 lg:w-4" />
                          </Button>
                        </div>

                        {/* Price and Remove */}
                        <div className="text-right flex flex-col items-end gap-1">
                          <p className="font-semibold text-sm lg:text-lg">{formatCurrency(item.total)}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(item.productId)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-6 lg:h-8 px-1 lg:px-2"
                          >
                            <Trash2 className="h-3 w-3 lg:h-4 lg:w-4" />
                          </Button>
                        </div>
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
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <Button
              variant="ghost"
              onClick={handleBackToCart}
              className="text-primary hover:text-primary hover:bg-primary/10 mb-3 sm:mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Cart
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary">Checkout</h1>
            <p className="text-gray-600 mt-2 text-sm sm:text-base">Complete your order details</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Customer Details */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              <Card className="p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Customer Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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

                  <div className="sm:col-span-2">
                    <Label htmlFor="email" className="text-sm sm:text-base">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      {...register('email')}
                      placeholder="Enter your email (optional)"
                      className={`text-base ${errors.email ? 'border-red-500' : ''}`}
                    />
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="address" className="text-sm sm:text-base">Delivery Address *</Label>
                    <Textarea
                      id="address"
                      {...register('address')}
                      placeholder="Enter your complete delivery address"
                      rows={3}
                      className={`text-base resize-none ${errors.address ? 'border-red-500' : ''}`}
                    />
                    {errors.address && (
                      <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="notes" className="text-sm sm:text-base">Order Notes</Label>
                    <Textarea
                      id="notes"
                      {...register('notes')}
                      placeholder="Any special instructions for your order (optional)"
                      rows={2}
                      className="text-base resize-none"
                    />
                  </div>
                </div>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="p-4 sm:p-6 lg:sticky lg:top-4">
                <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Order Summary</h3>

                <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4 max-h-48 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.productId} className="flex justify-between text-sm">
                      <span className="truncate mr-2">{item.name} × {formatQuantity(item.quantity)}</span>
                      <span className="font-medium flex-shrink-0">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>

                <Separator className="my-3 sm:my-4" />

                <div className="space-y-2 mb-4 sm:mb-6">
                  <div className="flex justify-between text-sm sm:text-base">
                    <span>Subtotal</span>
                    <span>{formatCurrency(getCartTotal())}</span>
                  </div>
                  <div className="flex justify-between text-sm sm:text-base">
                    <span>Delivery Fee</span>
                    <span className={getCartTotal() >= 500 ? 'text-green-600 font-medium' : ''}>
                      {getCartTotal() >= 500 ? 'Free' : formatCurrency(50)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-base sm:text-lg">
                    <span>Total</span>
                    <span>{formatCurrency(getCartTotal() + (getCartTotal() >= 500 ? 0 : 50))}</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || cart.length === 0}
                  className="w-full bg-green-600 hover:bg-green-700 h-12 sm:h-auto"
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      <span className="hidden sm:inline">Placing Order...</span>
                      <span className="sm:hidden">Placing...</span>
                    </>
                  ) : (
                    <>
                      <MessageCircle className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Place Order via WhatsApp</span>
                      <span className="sm:hidden">Place Order</span>
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
