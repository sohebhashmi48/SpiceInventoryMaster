import React, { useState, useEffect } from 'react';
import { Calculator, Plus, Minus, X, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';
import { ShowcaseProduct } from '@/hooks/use-showcase';

interface MixCalculatorProps {
  products: ShowcaseProduct[];
  onAddToCart: (product: ShowcaseProduct, quantity: number) => void;
  onClose: () => void;
}

interface SelectedProduct {
  product: ShowcaseProduct;
  allocatedPrice: number;
  calculatedQuantity: number;
}

export default function MixCalculator({ products, onAddToCart, onClose }: MixCalculatorProps) {
  const [totalBudget, setTotalBudget] = useState<string>('');
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter products based on search
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !selectedProducts.some(sp => sp.product.id === product.id)
  );

  // Calculate quantities when budget or selected products change
  useEffect(() => {
    if (totalBudget && selectedProducts.length > 0) {
      const budget = parseFloat(totalBudget);
      const pricePerProduct = budget / selectedProducts.length;
      
      setSelectedProducts(prev => prev.map(sp => ({
        ...sp,
        allocatedPrice: pricePerProduct,
        calculatedQuantity: Math.floor((pricePerProduct / parseFloat(sp.product.retailPrice)) * 1000) / 1000 // Round to 3 decimal places
      })));
    }
  }, [totalBudget, selectedProducts.length]);

  const addProduct = (product: ShowcaseProduct) => {
    const newSelectedProduct: SelectedProduct = {
      product,
      allocatedPrice: 0,
      calculatedQuantity: 0
    };
    setSelectedProducts(prev => [...prev, newSelectedProduct]);
    setSearchQuery('');
  };

  const removeProduct = (productId: number) => {
    setSelectedProducts(prev => prev.filter(sp => sp.product.id !== productId));
  };

  const handleAddAllToCart = () => {
    selectedProducts.forEach(sp => {
      if (sp.calculatedQuantity > 0) {
        onAddToCart(sp.product, sp.calculatedQuantity);
      }
    });
    
    // Reset calculator
    setTotalBudget('');
    setSelectedProducts([]);
    onClose();
  };

  const totalAllocated = selectedProducts.reduce((sum, sp) => sum + sp.allocatedPrice, 0);
  const isValidCalculation = totalBudget && selectedProducts.length > 0 && totalAllocated > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <CardTitle>Mix Calculator</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Budget Input */}
          <div className="space-y-2">
            <Label htmlFor="budget">Total Budget</Label>
            <Input
              id="budget"
              type="number"
              placeholder="Enter your total budget (₹)"
              value={totalBudget}
              onChange={(e) => setTotalBudget(e.target.value)}
              className="text-lg"
            />
          </div>

          {/* Product Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Add Products</Label>
            <Input
              id="search"
              placeholder="Search products to add..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            
            {/* Search Results */}
            {searchQuery && (
              <div className="max-h-40 overflow-y-auto border rounded-lg">
                {filteredProducts.length > 0 ? (
                  filteredProducts.slice(0, 5).map(product => (
                    <div
                      key={product.id}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 flex justify-between items-center"
                      onClick={() => addProduct(product)}
                    >
                      <div>
                        <span className="font-medium">{product.name}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          {formatCurrency(parseFloat(product.retailPrice))} per {product.unit}
                        </span>
                      </div>
                      <Plus className="h-4 w-4 text-primary" />
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-gray-500 text-center">No products found</div>
                )}
              </div>
            )}
          </div>

          {/* Selected Products */}
          {selectedProducts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Selected Products ({selectedProducts.length})</h3>
                {isValidCalculation && (
                  <Badge variant="secondary">
                    Budget: {formatCurrency(parseFloat(totalBudget))}
                  </Badge>
                )}
              </div>

              <div className="space-y-3">
                {selectedProducts.map((sp, index) => (
                  <Card key={sp.product.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{sp.product.name}</span>
                          <Badge variant="outline">
                            {formatCurrency(parseFloat(sp.product.retailPrice))} per {sp.product.unit}
                          </Badge>
                          {sp.product.stocksQty === 0 && (
                            <Badge variant="destructive">Out of Stock</Badge>
                          )}
                        </div>
                        
                        {isValidCalculation && (
                          <div className="mt-2 text-sm text-gray-600 space-y-1">
                            <div>Allocated Budget: {formatCurrency(sp.allocatedPrice)}</div>
                            <div className="font-medium text-primary">
                              Quantity: {sp.calculatedQuantity} {sp.product.unit}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProduct(sp.product.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Summary */}
              {isValidCalculation && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-3">Calculation Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total Budget:</span>
                        <span className="font-medium">{formatCurrency(parseFloat(totalBudget))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Products Selected:</span>
                        <span className="font-medium">{selectedProducts.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Budget per Product:</span>
                        <span className="font-medium">{formatCurrency(totalAllocated / selectedProducts.length)}</span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between font-semibold">
                        <span>Total Allocated:</span>
                        <span>{formatCurrency(totalAllocated)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleAddAllToCart}
                  disabled={!isValidCalculation}
                  className="flex-1"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add All to Cart
                </Button>
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Instructions */}
          {selectedProducts.length === 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <h4 className="font-semibold text-blue-800 mb-2">How to use Mix Calculator:</h4>
                <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                  <li>Enter your total budget amount</li>
                  <li>Search and select the products you want to mix</li>
                  <li>The calculator will divide your budget equally among selected products</li>
                  <li>View the calculated quantities for each product</li>
                  <li>Add all products to your cart with calculated quantities</li>
                </ol>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
