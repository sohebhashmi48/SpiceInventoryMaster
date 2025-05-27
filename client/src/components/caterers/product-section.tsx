import React from 'react';
import ProductCard from './product-card';
import { Separator } from '@/components/ui/separator';

interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  unit: string;
  categoryId: number;
}

interface ProductSectionProps {
  title: string;
  icon?: React.ReactNode;
  products: Product[];
  selectedProductIds?: number[];
  productQuantities?: Record<number, number>;
  onSelectProduct?: (id: number) => void;
  onRemoveProduct?: (id: number) => void;
  onQuantityChange?: (id: number, quantity: number) => void;
}

export default function ProductSection({
  title,
  icon,
  products,
  selectedProductIds = [],
  productQuantities = {},
  onSelectProduct,
  onRemoveProduct,
  onQuantityChange
}: ProductSectionProps) {
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      {/* Section Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <Separator className="bg-primary/20" />
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            id={product.id}
            name={product.name}
            description={product.description}
            price={Number(product.price)}
            unit={product.unit}
            quantity={productQuantities[product.id] || 0}
            isSelected={selectedProductIds.includes(product.id)}
            onSelect={onSelectProduct}
            onRemove={onRemoveProduct}
            onQuantityChange={onQuantityChange}
          />
        ))}
      </div>
    </div>
  );
}
