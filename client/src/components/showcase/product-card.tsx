import React, { useState } from 'react';
import { ShoppingCart, Plus, Minus, Calculator, Hash, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ShowcaseProduct } from '@/hooks/use-showcase';
import { formatCurrency } from '@/lib/utils';
import { getSpiceImageUrl } from '@/lib/image-utils';

// Simplified Product Image Component
interface ProductImageProps {
  imagePath?: string;
  productName: string;
  className?: string;
  showDebug?: boolean;
}

const ProductImage: React.FC<ProductImageProps> = ({
  imagePath,
  productName,
  className,
  showDebug = false
}) => {
  // Get the proper image URL using our utility function
  const imageUrl = imagePath ? getSpiceImageUrl(imagePath) : null;

  // Simple logging
  React.useEffect(() => {
    if (imageUrl) {
      console.log(`🔍 Image URL for ${productName}:`, imageUrl);
    }
  }, [imageUrl, productName]);

  return (
    <div className="relative w-full h-full">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={productName}
          className={className}
          onError={(e) => {
            console.error(`❌ Image failed: ${imageUrl}`);
            // Hide the broken image and show fallback
            e.currentTarget.style.display = 'none';
            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = 'flex';
          }}
          onLoad={() => {
            console.log(`✅ Image loaded: ${imageUrl}`);
          }}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      ) : null}

      {/* Fallback - always present but hidden by default */}
      <div
        className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-amber-100"
        style={{ display: imageUrl ? 'none' : 'flex' }}
      >
        <span className="text-3xl sm:text-4xl md:text-6xl">🌶️</span>
      </div>

      {/* Simple debug info */}
      {process.env.NODE_ENV === 'development' && showDebug && (
        <div className="absolute top-0 right-0 bg-black bg-opacity-75 text-white text-xs p-1 z-10">
          <div className="text-xs">
            {imageUrl ? '🖼️' : '❌'}
          </div>
        </div>
      )}
    </div>
  );
};

interface QuantityOption {
  value: number;
  label: string;
}

// Helper function to get popular quantities based on unit
const getPopularQuantities = (unit: string): QuantityOption[] => {
  const unitLower = unit.toLowerCase();

  if (unitLower.includes('kg') || unitLower.includes('kilogram')) {
    return [
      { value: 0.25, label: '250g' },
      { value: 0.5, label: '500g' },
      { value: 1, label: '1kg' },
      { value: 2, label: '2kg' },
      { value: 5, label: '5kg' }
    ];
  } else if (unitLower.includes('g') || unitLower.includes('gram')) {
    return [
      { value: 100, label: '100g' },
      { value: 250, label: '250g' },
      { value: 500, label: '500g' },
      { value: 1000, label: '1kg' }
    ];
  } else if (unitLower.includes('l') || unitLower.includes('liter') || unitLower.includes('litre')) {
    return [
      { value: 0.5, label: '500ml' },
      { value: 1, label: '1L' },
      { value: 2, label: '2L' },
      { value: 5, label: '5L' }
    ];
  } else if (unitLower.includes('ml') || unitLower.includes('milliliter')) {
    return [
      { value: 250, label: '250ml' },
      { value: 500, label: '500ml' },
      { value: 1000, label: '1L' }
    ];
  } else {
    // Default quantities for pieces, packets, etc.
    return [
      { value: 1, label: '1' },
      { value: 2, label: '2' },
      { value: 5, label: '5' },
      { value: 10, label: '10' }
    ];
  }
};

interface ProductCardProps {
  product: ShowcaseProduct;
  cartQuantity?: number;
  isInCart?: boolean;
  onAddToCart: (product: ShowcaseProduct, quantity?: number) => void;
  onUpdateQuantity: (productId: number, quantity: number) => void;
  onRemoveFromCart?: (productId: number) => void;
  viewMode?: 'grid' | 'list';
}

export default function ProductCard({
  product,
  cartQuantity = 0,
  isInCart = false,
  onAddToCart,
  onUpdateQuantity,
  onRemoveFromCart,
  viewMode = 'grid'
}: ProductCardProps) {
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [inputMode, setInputMode] = useState<'quantity' | 'price'>('quantity');
  const [priceAmount, setPriceAmount] = useState<string>('');
  const [customQuantity, setCustomQuantity] = useState<string>('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Calculate quantity from price
  const calculateQuantityFromPrice = (price: string): number => {
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) return 0;
    return Math.round((priceNum / Number(product.retailPrice)) * 1000) / 1000;
  };

  // Calculate price from quantity
  const calculatePriceFromQuantity = (quantity: number): number => {
    return Math.round(quantity * Number(product.retailPrice) * 100) / 100;
  };

  // Get the current quantity to add to cart
  const getCurrentQuantity = (): number => {
    if (inputMode === 'price') {
      return calculateQuantityFromPrice(priceAmount);
    } else if (customQuantity) {
      const customQty = parseFloat(customQuantity);
      return isNaN(customQty) ? selectedQuantity : customQty;
    }
    return selectedQuantity;
  };

  const handleAddToCart = () => {
    const quantity = getCurrentQuantity();
    if (quantity > 0) {
      onAddToCart(product, quantity);
      // Reset after adding
      setSelectedQuantity(1);
      setPriceAmount('');
      setCustomQuantity('');
    }
  };

  const handleQuantityChange = (newQuantity: number) => {
    onUpdateQuantity(product.id, newQuantity);
  };

  const handleSelectedQuantityChange = (change: number) => {
    const newQuantity = selectedQuantity + change;
    // Allow quantity selection even if out of stock, but limit to reasonable amounts
    const maxQuantity = product.stocksQty > 0 ? product.stocksQty : 10;
    if (newQuantity >= 1 && newQuantity <= maxQuantity) {
      setSelectedQuantity(newQuantity);
    }
  };

  const handlePriceChange = (value: string) => {
    setPriceAmount(value);
    // Clear custom quantity when price is entered
    setCustomQuantity('');
  };

  const handleCustomQuantityChange = (value: string) => {
    setCustomQuantity(value);
    // Clear price when custom quantity is entered
    setPriceAmount('');
  };

  return (
    <Card
      className={`group hover:shadow-lg transition-all duration-300 ${viewMode === 'list' ? 'flex' : 'flex flex-col h-full'}`}
    >
      {/* Product Image */}
      <div className={`${viewMode === 'list' ? 'w-32 sm:w-48 flex-shrink-0' : 'w-full'} h-32 sm:h-40 md:h-48 bg-gradient-to-br from-orange-100 to-amber-100 rounded-t-lg ${viewMode === 'list' ? 'rounded-l-lg rounded-tr-none' : ''} flex items-center justify-center overflow-hidden relative`}>
        <ProductImage
          imagePath={product.imagePath}
          productName={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          showDebug={true}
        />



        {/* Stock Status Badge - Only show if out of stock */}
        {product.stocksQty === 0 && (
          <Badge
            variant="destructive"
            className="absolute top-1 right-1 sm:top-2 sm:right-2 text-xs"
          >
            Out of Stock
          </Badge>
        )}
      </div>

      <CardContent className={`p-2 sm:p-3 md:p-4 ${viewMode === 'list' ? 'flex-1 flex flex-col justify-between' : 'flex-1 flex flex-col'}`}>
        <div>
          <h3 className="font-semibold text-sm sm:text-base md:text-lg text-gray-800 mb-1 sm:mb-2 group-hover:text-primary transition-colors line-clamp-2">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 line-clamp-2 hidden sm:block">
              {product.description}
            </p>
          )}

          <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
            <div>
              <span className="text-lg sm:text-xl md:text-2xl font-bold text-primary">
                {formatCurrency(Number(product.retailPrice))}
              </span>
              <span className="text-xs sm:text-sm text-gray-500 ml-1">
                per {product.unit}
              </span>
            </div>
          </div>

          {/* Advanced Options Toggle */}
          {showAdvancedOptions && (
            <div className="mb-2 sm:mb-3 md:mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2 sm:mb-3">
                <span className="text-xs text-gray-500">Buy by:</span>
                <div className="flex border rounded-lg overflow-hidden w-full sm:w-auto">
                  <button
                    onClick={() => setInputMode('quantity')}
                    className={`flex-1 sm:flex-none px-2 sm:px-3 py-1 text-xs flex items-center justify-center gap-1 transition-colors ${
                      inputMode === 'quantity'
                        ? 'bg-primary text-white'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Hash className="h-3 w-3" />
                    <span className="hidden sm:inline">Quantity</span>
                    <span className="sm:hidden">Qty</span>
                  </button>
                  <button
                    onClick={() => setInputMode('price')}
                    className={`flex-1 sm:flex-none px-2 sm:px-3 py-1 text-xs flex items-center justify-center gap-1 transition-colors ${
                      inputMode === 'price'
                        ? 'bg-primary text-white'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Calculator className="h-3 w-3" />
                    Price
                  </button>
                </div>
              </div>

              {inputMode === 'quantity' ? (
                <>
                  {/* Popular Quantities */}
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-2">Popular quantities:</p>
                    <div className="flex flex-wrap gap-1">
                      {getPopularQuantities(product.unit).map((qty) => (
                        <button
                          key={qty.value}
                          onClick={() => {
                            setSelectedQuantity(qty.value);
                            setCustomQuantity('');
                          }}
                          className={`px-2 py-1 text-xs rounded border transition-colors ${
                            selectedQuantity === qty.value && !customQuantity
                              ? 'bg-primary text-white border-primary'
                              : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {qty.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Quantity Input */}
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Or enter custom quantity:</p>
                    <Input
                      type="number"
                      placeholder={`Enter ${product.unit}`}
                      value={customQuantity}
                      onChange={(e) => handleCustomQuantityChange(e.target.value)}
                      className="h-8 text-sm"
                      min="0"
                      step="0.001"
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Price Input */}
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Enter amount you want to spend:</p>
                    <Input
                      type="number"
                      placeholder="Enter price (₹)"
                      value={priceAmount}
                      onChange={(e) => handlePriceChange(e.target.value)}
                      className="h-8 text-sm"
                      min="0"
                      step="0.01"
                    />
                    {priceAmount && (
                      <p className="text-xs text-green-600 mt-1">
                        ≈ {calculateQuantityFromPrice(priceAmount)} {product.unit}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Add to Cart Controls */}
        <div className="space-y-2 sm:space-y-3 mt-auto">
          {isInCart ? (
            <div className="space-y-1 sm:space-y-2">
              <div className="flex items-center gap-1 sm:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange(cartQuantity - 1)}
                  disabled={cartQuantity <= 1}
                  className="h-6 w-6 sm:h-8 sm:w-8 p-0"
                >
                  <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <span className="px-2 sm:px-3 py-1 bg-gray-100 rounded text-xs sm:text-sm font-medium min-w-[2rem] sm:min-w-[3rem] text-center">
                  {cartQuantity}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange(cartQuantity + 1)}
                  disabled={product.stocksQty > 0 && product.stocksQty <= cartQuantity}
                  className="h-6 w-6 sm:h-8 sm:w-8 p-0"
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <span className="text-xs text-gray-500 ml-1 sm:ml-2">in cart</span>
              </div>
              {onRemoveFromCart && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRemoveFromCart(product.id)}
                  className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 h-6 sm:h-8 text-xs sm:text-sm"
                >
                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Remove from Cart</span>
                  <span className="sm:hidden">Remove</span>
                </Button>
              )}
            </div>
          ) : (
            <>
              {!showAdvancedOptions ? (
                /* Simple Add to Cart */
                <div className="space-y-1 sm:space-y-2">
                  <Button
                    onClick={() => {
                      onAddToCart(product, 1);
                    }}
                    disabled={product.stocksQty === 0}
                    className={`w-full h-7 sm:h-8 text-xs sm:text-sm ${product.stocksQty === 0 ? 'bg-gray-400 hover:bg-gray-400' : ''}`}
                    size="sm"
                  >
                    <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    {product.stocksQty === 0 ? (
                      <span className="hidden sm:inline">Pre-order 1 {product.unit}</span>
                    ) : (
                      <span className="hidden sm:inline">Add to Cart</span>
                    )}
                    <span className="sm:hidden">
                      {product.stocksQty === 0 ? 'Pre-order' : 'Add'}
                    </span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAdvancedOptions(true)}
                    className="w-full text-xs h-6 sm:h-8 sm:text-sm"
                  >
                    <Calculator className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Custom Quantity/Price</span>
                    <span className="sm:hidden">Custom</span>
                  </Button>
                </div>
              ) : (
                /* Advanced Options */
                <>
                  {/* Current Selection Display */}
                  <div className="mb-3 p-2 bg-gray-50 rounded text-sm">
                    {inputMode === 'quantity' ? (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Selected:</span>
                        <span className="font-medium">
                          {customQuantity ? `${customQuantity} ${product.unit}` : `${selectedQuantity} ${product.unit}`}
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Amount:</span>
                          <span className="font-medium">{formatCurrency(parseFloat(priceAmount) || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Quantity:</span>
                          <span className="font-medium">≈ {calculateQuantityFromPrice(priceAmount)} {product.unit}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleAddToCart}
                      disabled={product.stocksQty === 0 || getCurrentQuantity() <= 0}
                      className={`flex-1 ${product.stocksQty === 0 ? 'bg-gray-400 hover:bg-gray-400' : ''}`}
                      size="sm"
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {product.stocksQty === 0 ? (
                        `Pre-order`
                      ) : inputMode === 'price' ? (
                        `Add for ${formatCurrency(parseFloat(priceAmount) || 0)}`
                      ) : (
                        `Add to Cart`
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowAdvancedOptions(false);
                        setSelectedQuantity(1);
                        setPriceAmount('');
                        setCustomQuantity('');
                        setInputMode('quantity');
                      }}
                      className="px-3"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
