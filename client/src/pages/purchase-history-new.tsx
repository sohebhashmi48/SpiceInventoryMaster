import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout/layout";
import PageHeader from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Calendar, Package, DollarSign, Store,
  ChevronDown, ChevronRight, Eye, ShoppingCart, Filter
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Vendor, Spice } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// Define interfaces for the data we expect
interface PurchaseHistoryItem {
  purchaseId: number;
  purchase_date: string;
  supplier_id: number;
  billNo: string;
  pageNo: string;
  purchaseTotalAmount: number;
  purchaseTotalGstAmount: number;
  purchaseGrandTotal: number;
  notes: string;
  status: string;
  purchaseCreatedAt: string;
  supplierId: number;
  supplierName: string;
  supplierContactName: string;
  supplierEmail: string;
  supplierPhone: string;
  supplierAddress: string;
  itemId: number;
  productName: string;
  quantity: number;
  price: number;
  unit: string;
  gstPercentage: number;
  gstAmount: number;
  totalAmount: number;
}

interface PurchaseHistoryResponse {
  data: PurchaseHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Interface for grouped purchases by supplier
interface SupplierWithPurchases {
  supplierId: number;
  supplierName: string;
  supplierContactName: string;
  supplierEmail: string;
  supplierPhone: string;
  supplierAddress: string;
  totalPurchases: number;
  totalAmount: number;
  purchases: PurchaseGroup[];
}

// Interface for grouped purchases by purchase ID
interface PurchaseGroup {
  purchaseId: number;
  date: string;
  billNo: string;
  totalAmount: number;
  items: PurchaseHistoryItem[];
}

export default function PurchaseHistoryNewPage() {
  const [location, setLocation] = useLocation();

  // Check if there's a supplier parameter in the URL
  const urlParams = new URLSearchParams(location.split('?')[1]);
  const supplierParam = urlParams.get('supplier');

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<string>(supplierParam || "all");
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [expandedSuppliers, setExpandedSuppliers] = useState<number[]>([]);
  const [expandedPurchases, setExpandedPurchases] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<string>("basic");
  const [currentPage, setCurrentPage] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const limit = 10;

  // Reset filters
  const resetFilters = () => {
    setSearchTerm("");
    setSelectedSupplier(supplierParam || "all");
    setSelectedProduct("all");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  // Build query parameters
  const buildQueryParams = () => {
    const params = new URLSearchParams({
      page: currentPage.toString(),
      limit: limit.toString(),
    });

    if (searchTerm) params.append('search', searchTerm);
    if (selectedSupplier !== 'all') params.append('supplierId', selectedSupplier);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    return params.toString();
  };

  // Fetch purchase history with pagination and filtering
  const { data: purchaseResponse, isLoading } = useQuery<PurchaseHistoryResponse>({
    queryKey: ["/api/purchase-history", currentPage, searchTerm, selectedSupplier, startDate, endDate],
    queryFn: async () => {
      console.log("Fetching purchase history");
      const queryParams = buildQueryParams();
      const response = await fetch(`/api/purchase-history?${queryParams}`, {
        credentials: "include",
      });
      if (!response.ok) {
        console.error("Failed to fetch purchase history:", response.status);
        throw new Error(`Failed to fetch purchase history: ${response.status}`);
      }
      const data = await response.json();
      console.log("Purchase history data:", data);
      return data;
    },
  });

  // Extract data from response
  const purchaseItems = purchaseResponse?.data || [];
  const pagination = purchaseResponse?.pagination;

  // Fetch all suppliers for filter
  const { data: suppliers } = useQuery<Vendor[]>({
    queryKey: ["/api/suppliers"],
  });

  // Fetch all products for filter
  const { data: products } = useQuery<Spice[]>({
    queryKey: ["/api/products"],
  });

  // Group purchases by supplier
  const supplierPurchases = useMemo(() => {
    if (!purchaseItems || purchaseItems.length === 0) return [];

    // First, group by supplier
    const supplierMap = new Map<number, SupplierWithPurchases>();

    // Then, for each supplier, group by purchase ID
    purchaseItems.forEach(item => {
      // Create or get supplier group
      if (!supplierMap.has(item.supplierId)) {
        supplierMap.set(item.supplierId, {
          supplierId: item.supplierId,
          supplierName: item.supplierName || "Unknown Supplier",
          supplierContactName: item.supplierContactName || "",
          supplierEmail: item.supplierEmail || "",
          supplierPhone: item.supplierPhone || "",
          supplierAddress: item.supplierAddress || "",
          totalPurchases: 0,
          totalAmount: 0,
          purchases: []
        });
      }

      const supplierGroup = supplierMap.get(item.supplierId)!;

      // Find or create purchase group
      let purchaseGroup = supplierGroup.purchases.find(p => p.purchaseId === item.purchaseId);

      if (!purchaseGroup) {
        purchaseGroup = {
          purchaseId: item.purchaseId,
          date: item.purchase_date,
          billNo: item.billNo || `Purchase #${item.purchaseId}`,
          totalAmount: 0,
          items: []
        };
        supplierGroup.purchases.push(purchaseGroup);
        supplierGroup.totalPurchases++;
      }

      // Add item to purchase group
      purchaseGroup.items.push(item);
      purchaseGroup.totalAmount += item.totalAmount;
      supplierGroup.totalAmount += item.totalAmount;
    });

    // Sort purchases by date (newest first)
    supplierMap.forEach(supplier => {
      supplier.purchases.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    });

    // Convert to array and sort by supplier name
    return Array.from(supplierMap.values()).sort((a, b) =>
      a.supplierName.localeCompare(b.supplierName)
    );
  }, [purchaseItems]);

  // Filter suppliers based on selected product (client-side filtering for product since it's not in the API)
  const filteredSuppliers = useMemo(() => {
    if (!supplierPurchases) return [];

    return supplierPurchases.filter(supplier => {
      // Filter by selected product (client-side only)
      if (selectedProduct !== "all") {
        const hasSelectedProduct = supplier.purchases.some(purchase =>
          purchase.items.some(item =>
            item.productName.toLowerCase() === selectedProduct.toLowerCase()
          )
        );

        if (!hasSelectedProduct) return false;
      }

      return true;
    });
  }, [supplierPurchases, selectedProduct]);

  // Toggle supplier expansion
  const toggleSupplier = (supplierId: number) => {
    setExpandedSuppliers(prev =>
      prev.includes(supplierId)
        ? prev.filter(id => id !== supplierId)
        : [...prev, supplierId]
    );
  };

  // Toggle purchase expansion
  const togglePurchase = (purchaseId: number) => {
    setExpandedPurchases(prev =>
      prev.includes(purchaseId)
        ? prev.filter(id => id !== purchaseId)
        : [...prev, purchaseId]
    );
  };

  // Initialize expanded suppliers if URL has a supplier parameter
  useEffect(() => {
    if (supplierParam && supplierPurchases) {
      const supplierId = parseInt(supplierParam);
      if (!isNaN(supplierId)) {
        setExpandedSuppliers([supplierId]);

        // Also expand the first purchase for this supplier
        const supplier = supplierPurchases.find(s => s.supplierId === supplierId);
        if (supplier && supplier.purchases.length > 0) {
          setExpandedPurchases([supplier.purchases[0].purchaseId]);
        }
      }
    }
  }, [supplierParam, supplierPurchases]);

  return (
    <Layout>
      <PageHeader
        title={supplierParam ? "Supplier Purchase History" : "Purchase History"}
        description={supplierParam ? "View all purchases from this supplier" : "View all purchases from suppliers"}
      >
        <Button
          variant="outline"
          onClick={() => supplierParam ? setLocation(`/suppliers/${supplierParam}?tab=purchases`) : setLocation("/suppliers")}
          className="flex items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {supplierParam ? "Back to Supplier" : "Back to Suppliers"}
        </Button>
      </PageHeader>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center">
              <Filter className="h-5 w-5 mr-2 text-blue-600" />
              Filter Purchases
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </CardTitle>

          {/* Date and Search Filters */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    placeholder="Search by product, bill no, or supplier"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="supplier">Supplier</Label>
                  <Select value={selectedSupplier} onValueChange={(value) => {
                    setSelectedSupplier(value);
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger id="supplier" className="mt-1">
                      <SelectValue placeholder="All Suppliers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Suppliers</SelectItem>
                      {suppliers?.map((supplier: Vendor) => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="startDate">From Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">To Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={resetFilters}
                    className="w-full"
                  >
                    Reset Filters
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="px-6 border-b">
            <TabsList>
              <TabsTrigger value="basic">Basic Filters</TabsTrigger>
              <TabsTrigger value="advanced">Advanced Filters</TabsTrigger>
            </TabsList>
          </div>
          <CardContent>
            <TabsContent value="basic" className="mt-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="product">Product (Client-side filter)</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger id="product">
                      <SelectValue placeholder="All Products" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Products</SelectItem>
                      {products?.map((product: Spice) => (
                        <SelectItem key={product.id} value={product.name}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No purchase history found</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {searchTerm || selectedSupplier !== 'all' || startDate || endDate ?
              "No purchases found for the selected filters. Try adjusting your search or filter criteria." :
              "No purchase history available. Start by adding some purchases."
            }
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredSuppliers.map((supplier) => (
            <Collapsible
              key={supplier.supplierId}
              open={expandedSuppliers.includes(supplier.supplierId)}
              onOpenChange={() => toggleSupplier(supplier.supplierId)}
              className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden"
            >
              <div className="p-4 flex items-center justify-between cursor-pointer border-b"
                   onClick={() => toggleSupplier(supplier.supplierId)}>
                <div className="flex items-center space-x-3">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-0 h-8 w-8">
                      {expandedSuppliers.includes(supplier.supplierId) ?
                        <ChevronDown className="h-5 w-5" /> :
                        <ChevronRight className="h-5 w-5" />}
                    </Button>
                  </CollapsibleTrigger>
                  <div>
                    <h3 className="font-medium text-lg flex items-center">
                      <Store className="h-5 w-5 mr-2 text-blue-600" />
                      {supplier.supplierName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {supplier.totalPurchases} purchase{supplier.totalPurchases !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-lg">{formatCurrency(supplier.totalAmount)}</p>
                  <p className="text-sm text-gray-500">Total Value</p>
                </div>
              </div>

              <CollapsibleContent>
                <div className="p-4 space-y-4">
                  {/* Supplier details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-md mb-4">
                    {supplier.supplierContactName && (
                      <div>
                        <p className="text-sm text-gray-500">Contact Person</p>
                        <p className="font-medium">{supplier.supplierContactName}</p>
                      </div>
                    )}
                    {supplier.supplierPhone && (
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-medium">{supplier.supplierPhone}</p>
                      </div>
                    )}
                    {supplier.supplierEmail && (
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{supplier.supplierEmail}</p>
                      </div>
                    )}
                  </div>

                  {/* Purchases */}
                  <div className="space-y-3">
                    {supplier.purchases.map((purchase) => (
                      <Collapsible
                        key={purchase.purchaseId}
                        open={expandedPurchases.includes(purchase.purchaseId)}
                        onOpenChange={() => togglePurchase(purchase.purchaseId)}
                        className="border rounded-md overflow-hidden"
                      >
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 cursor-pointer"
                             onClick={() => togglePurchase(purchase.purchaseId)}>
                          <div className="flex items-center space-x-3">
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                                {expandedPurchases.includes(purchase.purchaseId) ?
                                  <ChevronDown className="h-4 w-4" /> :
                                  <ChevronRight className="h-4 w-4" />}
                              </Button>
                            </CollapsibleTrigger>
                            <div>
                              <div className="font-medium">{purchase.billNo}</div>
                              <div className="text-sm text-gray-500">{formatDate(purchase.date)}</div>
                            </div>
                          </div>
                          <div className="font-medium text-right">
                            {formatCurrency(purchase.totalAmount)}
                          </div>
                        </div>

                        <CollapsibleContent>
                          <div className="p-3 border-t">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-2">Product</th>
                                  <th className="text-right py-2">Quantity</th>
                                  <th className="text-right py-2">Price</th>
                                  <th className="text-right py-2">GST</th>
                                  <th className="text-right py-2">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {purchase.items.map((item, index) => (
                                  <tr key={index} className="border-b">
                                    <td className="py-2 flex items-center">
                                      <Package className="h-3 w-3 mr-2 text-gray-400" />
                                      {item.productName}
                                    </td>
                                    <td className="text-right py-2">{item.quantity} {item.unit}</td>
                                    <td className="text-right py-2">{formatCurrency(item.price)}</td>
                                    <td className="text-right py-2">
                                      <Badge variant="outline" className="font-normal">
                                        {item.gstPercentage}% = {formatCurrency(item.gstAmount)}
                                      </Badge>
                                    </td>
                                    <td className="text-right py-2">{formatCurrency(item.totalAmount)}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="font-medium">
                                  <td colSpan={4} className="text-right py-2">Total:</td>
                                  <td className="text-right py-2">{formatCurrency(purchase.totalAmount)}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>

                  <div className="flex justify-end mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation(`/supplier-purchase/${supplier.supplierId}`)}
                      className="text-green-600 hover:text-green-800 hover:bg-green-50 border-green-200"
                    >
                      <ShoppingCart className="h-4 w-4 mr-1" />
                      New Purchase
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>

                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                      className={currentPage === pagination.totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}

          {/* Pagination Info */}
          {pagination && (
            <div className="mt-4 text-center text-sm text-gray-500">
              Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, pagination.total)} of {pagination.total} purchases
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
