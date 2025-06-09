import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

// Types for showcase data
export interface ShowcaseProduct {
  id: number;
  name: string;
  description?: string;
  retailPrice: number;
  unit: string;
  stocksQty: number;
  categoryId: number;
  imagePath?: string;
  isActive: boolean;
}

export interface ShowcaseCategory {
  id: number;
  name: string;
  description?: string;
  imagePath?: string;
}

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  unit: string;
  quantity: number;
  total: number;
  imagePath?: string;
}

export interface SearchSuggestion {
  id: number;
  name: string;
  description?: string;
  retailPrice: number;
  unit: string;
}

// Hook for fetching public categories
export function useShowcaseCategories() {
  return useQuery<ShowcaseCategory[]>({
    queryKey: ['showcase-categories'],
    queryFn: async () => {
      const response = await fetch('/api/public/categories');
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook for fetching public products
export function useShowcaseProducts(filters?: {
  category?: number;
  search?: string;
  sortBy?: 'name' | 'price' | 'stock';
  sortOrder?: 'asc' | 'desc';
}) {
  const queryParams = new URLSearchParams();

  if (filters?.category) {
    queryParams.append('category', filters.category.toString());
  }
  if (filters?.search) {
    queryParams.append('search', filters.search);
  }
  if (filters?.sortBy) {
    queryParams.append('sortBy', filters.sortBy);
  }
  if (filters?.sortOrder) {
    queryParams.append('sortOrder', filters.sortOrder);
  }

  return useQuery<ShowcaseProduct[]>({
    queryKey: ['showcase-products', filters],
    queryFn: async () => {
      const response = await fetch(`/api/public/products?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Hook for fetching products by category
export function useShowcaseCategoryProducts(categoryId: number) {
  return useQuery<ShowcaseProduct[]>({
    queryKey: ['showcase-category-products', categoryId],
    queryFn: async () => {
      const response = await fetch(`/api/public/categories/${categoryId}/products`);
      if (!response.ok) {
        throw new Error('Failed to fetch category products');
      }
      return response.json();
    },
    enabled: !!categoryId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Hook for search suggestions
export function useSearchSuggestions(query: string) {
  return useQuery<SearchSuggestion[]>({
    queryKey: ['search-suggestions', query],
    queryFn: async () => {
      if (!query || query.length < 2) {
        return [];
      }
      const response = await fetch(`/api/public/products/search?q=${encodeURIComponent(query)}&limit=8`);
      if (!response.ok) {
        throw new Error('Failed to fetch search suggestions');
      }
      return response.json();
    },
    enabled: query.length >= 2,
    staleTime: 1000 * 30, // 30 seconds
  });
}

// Shopping cart management hook
export function useShoppingCart() {
  const [cart, setCart] = useState<CartItem[]>([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('showcase-cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (error) {
        console.error('Failed to parse saved cart:', error);
        localStorage.removeItem('showcase-cart');
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('showcase-cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: ShowcaseProduct, quantity: number = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.productId === product.id);

      if (existingItem) {
        // Update quantity of existing item with proper rounding
        const newQuantity = Math.round((existingItem.quantity + quantity) * 1000) / 1000;
        return prevCart.map(item =>
          item.productId === product.id
            ? {
                ...item,
                quantity: newQuantity,
                total: Math.round(newQuantity * item.price * 100) / 100
              }
            : item
        );
      } else {
        // Add new item to cart with proper rounding
        const roundedQuantity = Math.round(quantity * 1000) / 1000;
        const newItem: CartItem = {
          productId: product.id,
          name: product.name,
          price: Number(product.retailPrice),
          unit: product.unit,
          quantity: roundedQuantity,
          total: Math.round(roundedQuantity * Number(product.retailPrice) * 100) / 100,
          imagePath: product.imagePath
        };
        return [...prevCart, newItem];
      }
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prevCart => prevCart.filter(item => item.productId !== productId));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    // Round quantity to avoid floating point issues
    const roundedQuantity = Math.round(quantity * 1000) / 1000;

    setCart(prevCart =>
      prevCart.map(item =>
        item.productId === productId
          ? {
              ...item,
              quantity: roundedQuantity,
              total: Math.round(roundedQuantity * item.price * 100) / 100
            }
          : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('showcase-cart');
  };

  // Clear cart after specified time (for shared devices)
  const clearCartAfterTime = (minutes: number = 30) => {
    setTimeout(() => {
      clearCart();
    }, minutes * 60 * 1000);
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.total, 0);
  };

  const getCartItemCount = () => {
    // Return the number of distinct items in cart, not the total quantity
    return cart.length;
  };

  const isInCart = (productId: number) => {
    return cart.some(item => item.productId === productId);
  };

  const getCartItem = (productId: number) => {
    return cart.find(item => item.productId === productId);
  };

  return {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    clearCartAfterTime,
    getCartTotal,
    getCartItemCount,
    isInCart,
    getCartItem
  };
}

// Hook for managing search state
export function useSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setIsSearching(query.length > 0);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
  };

  return {
    searchQuery,
    isSearching,
    handleSearchChange,
    clearSearch
  };
}

// Hook for managing filters
export function useProductFilters() {
  const [filters, setFilters] = useState({
    category: undefined as number | undefined,
    sortBy: 'name' as 'name' | 'price' | 'stock',
    sortOrder: 'asc' as 'asc' | 'desc',
    priceRange: [0, 1000] as [number, number]
  });

  const updateFilter = (key: keyof typeof filters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      category: undefined,
      sortBy: 'name',
      sortOrder: 'asc',
      priceRange: [0, 1000]
    });
  };

  return {
    filters,
    updateFilter,
    resetFilters
  };
}
