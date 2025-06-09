import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer, Users, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: number;
  name: string;
  description?: string;
  retailPrice: number;
  catererPrice: number;
  unit: string;
  stocksQty: number;
  categoryId: number;
  categoryName?: string;
  imagePath?: string;
  isActive: boolean;
}

interface Category {
  id: number;
  name: string;
  description?: string;
}

interface CataloguePrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CataloguePrintDialog({
  open,
  onOpenChange,
}: CataloguePrintDialogProps) {
  const [selectedPriceType, setSelectedPriceType] = useState<'retail' | 'caterer' | null>(null);
  const { toast } = useToast();

  // Fetch all products for catalogue
  const { data: products = [], isLoading: productsLoading, error: productsError } = useQuery<Product[]>({
    queryKey: ['catalogue-products'],
    queryFn: async () => {
      const response = await fetch('/api/products', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`Failed to fetch products: ${response.status} ${errorText}`);
      }
      const data = await response.json();
      console.log('Fetched products:', data);
      return data;
    },
    enabled: open,
    retry: 2,
  });

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      return response.json();
    },
    enabled: open,
  });

  const handlePrintCatalogue = () => {
    if (!selectedPriceType) {
      toast({
        title: "Please select price type",
        description: "Choose whether to print retail or caterer prices",
        variant: "destructive",
      });
      return;
    }

    // Debug: Check if we have products
    console.log('Products for catalogue:', products);
    console.log('Categories:', categories);

    if (products.length === 0) {
      toast({
        title: "No products found",
        description: "There are no products available to print in the catalogue",
        variant: "destructive",
      });
      return;
    }

    // Group products by category and sort categories
    const productsByCategory = products.reduce((acc, product) => {
      const categoryName = categories.find(cat => cat.id === product.categoryId)?.name || 'Uncategorized';
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push(product);
      return acc;
    }, {} as Record<string, Product[]>);

    // Sort products within each category (available first, then by name)
    Object.keys(productsByCategory).forEach(categoryName => {
      productsByCategory[categoryName].sort((a, b) => {
        const aInStock = (a.stocksQty || 0) > 0;
        const bInStock = (b.stocksQty || 0) > 0;

        if (aInStock && !bInStock) return -1;
        if (!aInStock && bInStock) return 1;

        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      });
    });

    console.log('Products by category:', productsByCategory);

    // Generate HTML for printing
    const printHTML = generateCatalogueHTML(productsByCategory, selectedPriceType);
    console.log('Generated HTML length:', printHTML.length);

    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=1000,height=800,scrollbars=yes,resizable=yes');
    if (!printWindow) {
      toast({
        title: "Print blocked",
        description: "Please allow popups to print the catalogue",
        variant: "destructive",
      });
      return;
    }

    try {
      // Write the HTML and trigger print
      printWindow.document.open();
      printWindow.document.write(printHTML);
      printWindow.document.close();

      console.log('HTML written to print window');

      // Wait for content to load before printing
      printWindow.addEventListener('load', () => {
        console.log('Print window loaded');
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 1000);
      });

      // Fallback if load event doesn't fire
      setTimeout(() => {
        if (printWindow && !printWindow.closed) {
          console.log('Fallback print trigger');
          printWindow.focus();
          printWindow.print();
        }
      }, 2000);

    } catch (error) {
      console.error('Error writing to print window:', error);
      toast({
        title: "Print error",
        description: "Failed to generate print preview",
        variant: "destructive",
      });
    }

    // Close the dialog
    onOpenChange(false);
    setSelectedPriceType(null);
  };

  const generateCatalogueHTML = (productsByCategory: Record<string, Product[]>, priceType: 'retail' | 'caterer') => {
    const customerType = priceType === 'retail' ? 'Retail Customers' : 'Caterers';
    const categoryEntries = Object.entries(productsByCategory);

    // Sort categories by number of items (most items first)
    categoryEntries.sort(([, productsA], [, productsB]) => productsB.length - productsA.length);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Product Catalogue - ${customerType}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background: white;
            padding: 20px;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #f97316;
            padding-bottom: 20px;
        }

        .company-name {
            font-size: 32px;
            font-weight: bold;
            color: #f97316;
            margin-bottom: 5px;
        }

        .subtitle {
            font-size: 18px;
            color: #666;
            margin-bottom: 10px;
        }

        .company-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 15px 0;
            text-align: left;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
        }

        .contact-info, .business-info {
            background: #f8fafc;
            padding: 12px;
            border-radius: 8px;
            border-left: 4px solid #f97316;
        }

        .contact-info h4, .business-info h4 {
            font-size: 14px;
            font-weight: bold;
            color: #f97316;
            margin-bottom: 8px;
        }

        .contact-info p, .business-info p {
            font-size: 12px;
            color: #374151;
            margin: 3px 0;
            line-height: 1.4;
        }

        .customer-type {
            font-size: 20px;
            font-weight: bold;
            background: #f97316;
            color: white;
            padding: 12px 24px;
            border-radius: 25px;
            display: inline-block;
            margin-top: 15px;
        }

        .category {
            margin-bottom: 20px;
            page-break-inside: avoid;
        }

        .category-title {
            font-size: 16px;
            font-weight: bold;
            color: #f97316;
            margin-bottom: 10px;
            padding: 8px 12px;
            background: linear-gradient(135deg, #fef3e2 0%, #fed7aa 100%);
            border-left: 3px solid #f97316;
            border-radius: 0 4px 4px 0;
        }

        .products-grid {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 8px;
            margin-bottom: 20px;
        }

        .product-card {
            border: 1px solid #d1d5db;
            border-radius: 6px;
            padding: 6px;
            background: white;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
            height: 140px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }

        .product-image {
            width: 100%;
            height: 45px;
            object-fit: cover;
            border-radius: 3px;
            margin-bottom: 4px;
            background: linear-gradient(135deg, #fef3e2 0%, #fed7aa 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
        }

        .product-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 3px;
        }

        .product-name {
            font-size: 10px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 2px;
            line-height: 1.1;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            min-height: 22px;
        }

        .product-description {
            font-size: 8px;
            color: #6b7280;
            margin-bottom: 4px;
            line-height: 1.1;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 1;
            -webkit-box-orient: vertical;
        }

        .product-details {
            margin-top: auto;
        }

        .price-section {
            text-align: center;
            margin-bottom: 4px;
        }

        .price {
            font-size: 13px;
            font-weight: bold;
            color: #f97316;
            display: block;
        }

        .unit {
            font-size: 8px;
            color: #6b7280;
            font-weight: normal;
        }

        .price-comparison {
            font-size: 7px;
            margin-top: 3px;
            text-align: center;
        }

        .market-price {
            color: #6b7280;
            text-decoration: line-through;
            font-size: 8px;
        }

        .savings-badge {
            background: #dcfce7;
            color: #16a34a;
            border: 1px solid #16a34a;
            padding: 1px 4px;
            border-radius: 6px;
            font-size: 7px;
            font-weight: bold;
            margin-top: 1px;
            display: inline-block;
        }

        .retail-note {
            background: #e0f2fe;
            color: #0369a1;
            border: 1px solid #0369a1;
            padding: 1px 4px;
            border-radius: 6px;
            font-size: 7px;
            font-weight: bold;
            margin-top: 1px;
            display: inline-block;
        }

        .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 14px;
            color: #6b7280;
            border-top: 2px solid #e5e7eb;
            padding-top: 25px;
        }

        .footer p {
            margin-bottom: 5px;
        }

        @media print {
            @page {
                margin: 0.5in;
                size: A4;
            }

            body {
                margin: 0;
                padding: 10px;
                font-size: 12px;
            }

            .header {
                margin-bottom: 20px;
                padding-bottom: 15px;
            }

            .company-name {
                font-size: 24px;
            }

            .subtitle {
                font-size: 14px;
            }

            .customer-type {
                font-size: 16px;
                padding: 8px 16px;
            }

            .category {
                page-break-inside: avoid;
                margin-bottom: 15px;
            }

            .category-title {
                font-size: 14px;
                padding: 6px 10px;
                margin-bottom: 8px;
            }

            .products-grid {
                grid-template-columns: repeat(6, 1fr);
                gap: 6px;
                margin-bottom: 12px;
            }

            .product-card {
                box-shadow: none;
                border: 1px solid #ccc;
                padding: 4px;
                height: 120px;
            }

            .product-image {
                height: 35px;
                margin-bottom: 3px;
                font-size: 14px;
            }

            .product-name {
                font-size: 8px;
                min-height: 18px;
                margin-bottom: 1px;
            }

            .product-description {
                font-size: 7px;
                margin-bottom: 3px;
            }

            .price {
                font-size: 10px;
            }

            .unit {
                font-size: 7px;
            }

            .price-comparison {
                font-size: 7px;
            }

            .market-price {
                font-size: 8px;
            }

            .savings-badge, .retail-note {
                font-size: 6px;
                padding: 1px 4px;
            }

            .footer {
                margin-top: 20px;
                padding-top: 15px;
                font-size: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">RoyalSpicyMasala</div>
        <div class="subtitle">Premium Spices & Masalas</div>
        <div class="customer-type">
            ${priceType === 'caterer' ? 'Wholesale Price List for Caterers' : 'Retail Price List'}
        </div>
        ${priceType === 'caterer' ?
            '<div style="font-size: 14px; color: #666; margin-top: 8px;">Special wholesale rates with maximum savings!</div>' :
            '<div style="font-size: 14px; color: #666; margin-top: 8px;">Best quality spices at competitive retail prices</div>'
        }
    </div>

    ${categoryEntries.length > 0 ?
        categoryEntries.map(([categoryName, products]) => {
            // Split products into chunks of 18 for better page layout (6 columns x 3 rows)
            const productChunks = [];
            for (let i = 0; i < products.length; i += 18) {
                productChunks.push(products.slice(i, i + 18));
            }

            return productChunks.map((chunk, chunkIndex) => `
                <div class="category">
                    <div class="category-title">
                        ${categoryName}
                        ${productChunks.length > 1 ? `(Part ${chunkIndex + 1}/${productChunks.length})` : ''}
                        - ${chunk.length} items
                    </div>
                    <div class="products-grid">
                        ${chunk.map(product => {
                            const price = priceType === 'retail' ? product.retailPrice : product.catererPrice;
                            const marketPrice = product.marketPrice || 0;
                            const retailPrice = product.retailPrice || 0;
                            const catererPrice = product.catererPrice || 0;

                            const imageUrl = product.imagePath ?
                                (product.imagePath.startsWith('/api/') ? product.imagePath : `/api${product.imagePath}`) :
                                null;

                            // Calculate savings
                            let savingsInfo = '';
                            if (priceType === 'caterer' && marketPrice > 0 && catererPrice > 0) {
                                const savings = marketPrice - catererPrice;
                                const savingsPercent = ((savings / marketPrice) * 100).toFixed(0);
                                if (savings > 0) {
                                    savingsInfo = `
                                        <div class="price-comparison">
                                            <div class="market-price">MRP: ₹${Number(marketPrice).toFixed(2)}</div>
                                            <div class="savings-badge">Save ₹${savings.toFixed(2)} (${savingsPercent}%)</div>
                                        </div>
                                    `;
                                }
                            } else if (priceType === 'retail' && marketPrice > 0 && retailPrice > 0) {
                                if (marketPrice !== retailPrice) {
                                    savingsInfo = `
                                        <div class="price-comparison">
                                            <div class="market-price">MRP: ₹${Number(marketPrice).toFixed(2)}</div>
                                            <div class="retail-note">Retail Price</div>
                                        </div>
                                    `;
                                }
                            }

                            return `
                                <div class="product-card">
                                    <div class="product-image">
                                        ${imageUrl ?
                                            `<img src="${imageUrl}" alt="${product.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                                             <div style="display:none; width:100%; height:100%; align-items:center; justify-content:center; background: linear-gradient(135deg, #fef3e2 0%, #fed7aa 100%); border-radius: 4px;">🌶️</div>` :
                                            `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background: linear-gradient(135deg, #fef3e2 0%, #fed7aa 100%); border-radius: 4px; font-size: 20px;">🌶️</div>`
                                        }
                                    </div>
                                    <div class="product-name">${product.name || 'Unnamed Product'}</div>
                                    ${product.description ? `<div class="product-description">${product.description}</div>` : ''}
                                    <div class="product-details">
                                        <div class="price-section">
                                            <span class="price">₹${Number(price || 0).toFixed(2)}</span>
                                            <span class="unit">per ${product.unit || 'unit'}</span>
                                        </div>
                                    </div>
                                    ${savingsInfo}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `).join('');
        }).join('')
        :
        `<div style="text-align: center; padding: 40px; color: #666;">
            <h3>No products available</h3>
            <p>There are currently no products in the catalogue.</p>
        </div>`
    }

    <div class="footer">
        <p><strong>Generated on ${new Date().toLocaleDateString('en-IN')}</strong></p>
        <p>Contact: +91 97027 13157 | Email: orders@royalspicymasala.com</p>
        <p>Mumbai, Maharashtra | Free Delivery on Orders Above ₹500</p>
    </div>
</body>
</html>`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print Product Catalogue
          </DialogTitle>
          <DialogDescription>
            Select the customer type to print the catalogue with appropriate pricing.
            {products.length > 0 && (
              <span className="block mt-1 text-sm text-green-600">
                {products.length} products available
              </span>
            )}
            {productsLoading && (
              <span className="block mt-1 text-sm text-blue-600">
                Loading products...
              </span>
            )}
            {productsError && (
              <span className="block mt-1 text-sm text-red-600">
                Error loading products: {productsError.message}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Debug info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
              Products: {products.length}, Loading: {productsLoading.toString()}, Error: {productsError?.message || 'none'}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3">
            <Card 
              className={`cursor-pointer transition-all ${
                selectedPriceType === 'retail' 
                  ? 'ring-2 ring-primary border-primary' 
                  : 'hover:border-primary/50'
              }`}
              onClick={() => setSelectedPriceType('retail')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Store className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="font-semibold">Retail Customers</h3>
                    <p className="text-sm text-muted-foreground">Print with retail prices</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all ${
                selectedPriceType === 'caterer' 
                  ? 'ring-2 ring-primary border-primary' 
                  : 'hover:border-primary/50'
              }`}
              onClick={() => setSelectedPriceType('caterer')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="font-semibold">Caterers</h3>
                    <p className="text-sm text-muted-foreground">Print with caterer prices</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handlePrintCatalogue}
              disabled={!selectedPriceType || productsLoading}
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              {productsLoading ? 'Loading...' : 'Print Catalogue'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
