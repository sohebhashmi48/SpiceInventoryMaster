import React, { useState } from 'react';
import { ShoppingCart, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShowcaseProduct } from '@/hooks/use-showcase';
import { formatCurrency } from '@/lib/utils';

interface ProductCardProps {
  product: ShowcaseProduct;
  cartQuantity?: number;
  isInCart?: boolean;
  onAddToCart: (product: ShowcaseProduct, quantity?: number) => void;
  onUpdateQuantity: (productId: number, quantity: number) => void;
  viewMode?: 'grid' | 'list';
}

export default function ProductCard({
  product,
  cartQuantity = 0,
  isInCart = false,
  onAddToCart,
  onUpdateQuantity,
  viewMode = 'grid'
}: ProductCardProps) {
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  const handleAddToCart = () => {
    onAddToCart(product, selectedQuantity);
    setSelectedQuantity(1); // Reset after adding
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

  return (
    <Card
      className={`group hover:shadow-lg transition-all duration-300 ${viewMode === 'list' ? 'flex' : ''}`}
    >
      {/* Product Image */}
      <div className={`${viewMode === 'list' ? 'w-48 flex-shrink-0' : 'w-full'} h-48 bg-gradient-to-br from-orange-100 to-amber-100 rounded-t-lg ${viewMode === 'list' ? 'rounded-l-lg rounded-tr-none' : ''} flex items-center justify-center overflow-hidden relative`}>
        {product.imagePath ? (
          <img
            src={product.imagePath.startsWith('/api/') ? product.imagePath : `/api${product.imagePath}`}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <span className="text-6xl">🌶️</span>
        )}

        {/* Stock Status Badge - Only show if out of stock */}
        {product.stocksQty === 0 && (
          <Badge
            variant="destructive"
            className="absolute top-2 right-2"
          >
            Out of Stock
          </Badge>
        )}
      </div>

      <CardContent className={`p-4 ${viewMode === 'list' ? 'flex-1 flex flex-col justify-between' : ''}`}>
        <div>
          <h3 className="font-semibold text-lg text-gray-800 mb-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {product.description}
            </p>
          )}

          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-2xl font-bold text-primary">
                {formatCurrency(Number(product.retailPrice))}
              </span>
              <span className="text-sm text-gray-500 ml-1">
                per {product.unit}
              </span>
            </div>
          </div>
        </div>

        {/* Add to Cart Controls */}
        <div className="space-y-3">
          {isInCart ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuantityChange(cartQuantity - 1)}
                disabled={cartQuantity <= 1}
                className="h-8 w-8 p-0"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="px-3 py-1 bg-gray-100 rounded text-sm font-medium min-w-[3rem] text-center">
                {cartQuantity}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuantityChange(cartQuantity + 1)}
                disabled={product.stocksQty > 0 && product.stocksQty <= cartQuantity}
                className="h-8 w-8 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <span className="text-xs text-gray-500 ml-2">in cart</span>
            </div>
          ) : (
            <>
              {/* Quantity Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Qty:</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectedQuantityChange(-1)}
                  disabled={selectedQuantity <= 1}
                  className="h-8 w-8 p-0"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="px-3 py-1 bg-gray-100 rounded text-sm font-medium min-w-[3rem] text-center">
                  {selectedQuantity}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectedQuantityChange(1)}
                  disabled={selectedQuantity >= (product.stocksQty > 0 ? product.stocksQty : 10)}
                  className="h-8 w-8 p-0"
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <span className="text-xs text-gray-500">{product.unit}</span>
              </div>

              {/* Add to Cart Button */}
              <Button
                onClick={handleAddToCart}
                disabled={product.stocksQty === 0}
                className={`w-full ${product.stocksQty === 0 ? 'bg-gray-400 hover:bg-gray-400' : ''}`}
                size="sm"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                {product.stocksQty === 0
                  ? `Pre-order ${selectedQuantity} ${product.unit}`
                  : `Add ${selectedQuantity} ${product.unit} to Cart`
                }
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
