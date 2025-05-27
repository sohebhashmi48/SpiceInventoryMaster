import React from 'react';
import { Trash2, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

interface ProductCardProps {
  id: number;
  name: string;
  description?: string;
  price: number;
  unit: string;
  quantity?: number;
  onSelect?: (id: number) => void;
  onRemove?: (id: number) => void;
  onQuantityChange?: (id: number, quantity: number) => void;
  isSelected?: boolean;
}

export default function ProductCard({
  id,
  name,
  description,
  price,
  unit,
  quantity = 0,
  onSelect,
  onRemove,
  onQuantityChange,
  isSelected = false
}: ProductCardProps) {
  const handleIncrement = () => {
    if (onQuantityChange) {
      onQuantityChange(id, quantity + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 0 && onQuantityChange) {
      onQuantityChange(id, quantity - 1);
    }
  };

  const handleSelect = () => {
    if (onSelect) {
      onSelect(id);
    }
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove(id);
    }
  };

  return (
    <div 
      className={`border rounded-md overflow-hidden transition-all duration-200 ${
        isSelected ? 'border-primary shadow-sm' : 'hover:border-gray-300'
      }`}
    >
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium text-base">{name}</h3>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className="text-right">
            <div className="font-semibold text-base">{formatCurrency(price)}</div>
            <div className="text-xs text-muted-foreground">per {unit}</div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex items-center justify-between">
          {isSelected ? (
            <>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8 rounded-full"
                  onClick={handleDecrement}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center font-medium">{quantity}</span>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8 rounded-full"
                  onClick={handleIncrement}
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <span className="ml-2 text-sm text-muted-foreground">{unit}</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-destructive hover:text-destructive/90 hover:bg-destructive/10 p-0 h-8 w-8"
                onClick={handleRemove}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-2"
              onClick={handleSelect}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add to Bill
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
