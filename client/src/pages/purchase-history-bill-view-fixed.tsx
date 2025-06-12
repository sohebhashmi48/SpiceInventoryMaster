import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout/layout";
import PageHeader from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Calendar, Package, DollarSign, Store,
  ChevronDown, ChevronRight, Eye, ShoppingCart, FileText, Filter
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
  receiptImage?: string;
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

// Interface for grouped purchases by purchase ID
interface PurchaseBill {
  purchaseId: number;
  date: string;
  billNo: string;
  supplierId: number;
  supplierName: string;
  totalAmount: number;
  items: PurchaseHistoryItem[];
}

export default function PurchaseHistoryBillView() {
  const [location, setLocation] = useLocation();

  // Check if there's a supplier parameter in the URL
  const urlParams = new URLSearchParams(location.split('?')[1]);
  const supplierParam = urlParams.get('supplier');

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<string>(supplierParam || "all");
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [expandedBills, setExpandedBills] = useState<number[]>([]);
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

  // Group purchases by bill (purchase ID)
  const purchaseBills = useMemo(() => {
    if (!purchaseItems || purchaseItems.length === 0) return [];

    // Group by purchase ID
    const billMap = new Map<number, PurchaseBill>();

    purchaseItems.forEach(item => {
      if (!billMap.has(item.purchaseId)) {
        billMap.set(item.purchaseId, {
          purchaseId: item.purchaseId,
          date: item.purchase_date,
          billNo: item.billNo || `Bill #${item.purchaseId}`,
          supplierId: item.supplierId,
          supplierName: item.supplierName || "Unknown Supplier",
          totalAmount: 0,
          items: []
        });
      }

      const bill = billMap.get(item.purchaseId)!;
      bill.items.push(item);
      bill.totalAmount += item.totalAmount;
    });

    // Convert to array and sort by date (newest first)
    return Array.from(billMap.values()).sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [purchaseItems]);

  // Filter bills based on search and selected filters
  const filteredBills = useMemo(() => {
    if (!purchaseBills) return [];

    return purchaseBills.filter(bill => {
      // Filter by selected supplier
      if (selectedSupplier !== "all" && bill.supplierId.toString() !== selectedSupplier) {
        return false;
      }

      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSupplier = bill.supplierName.toLowerCase().includes(searchLower);
        const matchesBillNo = bill.billNo.toLowerCase().includes(searchLower);

        // Check if any items match the search term
        const matchesItems = bill.items.some(item =>
          item.productName.toLowerCase().includes(searchLower)
        );

        if (!matchesSupplier && !matchesBillNo && !matchesItems) {
          return false;
        }
      }

      // Filter by selected product
      if (selectedProduct !== "all") {
        const hasSelectedProduct = bill.items.some(item =>
          item.productName.toLowerCase() === selectedProduct.toLowerCase()
        );

        if (!hasSelectedProduct) return false;
      }

      return true;
    });
  }, [purchaseBills, selectedSupplier, selectedProduct, searchTerm]);

  // Toggle bill expansion
  const toggleBill = (purchaseId: number) => {
    setExpandedBills(prev =>
      prev.includes(purchaseId)
        ? prev.filter(id => id !== purchaseId)
        : [...prev, purchaseId]
    );
  };

  // Initialize expanded bills if URL has a supplier parameter
  useEffect(() => {
    if (supplierParam && purchaseBills && purchaseBills.length > 0) {
      // If a supplier is selected, expand the first bill for that supplier
      const supplierId = parseInt(supplierParam);
      if (!isNaN(supplierId)) {
        const supplierBill = purchaseBills.find(bill => bill.supplierId === supplierId);
        if (supplierBill) {
          setExpandedBills([supplierBill.purchaseId]);
        }
      }
    }
  }, [supplierParam, purchaseBills]);

  return (
    <Layout>
      <PageHeader
        title="Purchase History"
        description="View all purchases from suppliers"
      >
        <Button
          variant="outline"
          onClick={() => setLocation("/suppliers")}
          className="flex items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Suppliers
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
      ) : filteredBills.length === 0 ? (
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
        <div className="space-y-4">
          {filteredBills.map((bill) => (
            <Collapsible
              key={bill.purchaseId}
              open={expandedBills.includes(bill.purchaseId)}
              onOpenChange={() => toggleBill(bill.purchaseId)}
              className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden"
            >
              <div className="p-4 flex items-center justify-between cursor-pointer border-b"
                   onClick={() => toggleBill(bill.purchaseId)}>
                <div className="flex items-center space-x-3">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-0 h-8 w-8">
                      {expandedBills.includes(bill.purchaseId) ?
                        <ChevronDown className="h-5 w-5" /> :
                        <ChevronRight className="h-5 w-5" />}
                    </Button>
                  </CollapsibleTrigger>
                  <div>
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-blue-600" />
                      <span className="font-medium">{bill.billNo}</span>
                      <span className="mx-2 text-gray-400">•</span>
                      <Store className="h-4 w-4 mr-1 text-gray-500" />
                      <span>{bill.supplierName}</span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      <Calendar className="h-3 w-3 inline-block mr-1" />
                      {formatDate(bill.date)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-lg">{formatCurrency(bill.totalAmount)}</div>
                  <div className="text-sm text-gray-500">{bill.items.length} item{bill.items.length !== 1 ? 's' : ''}</div>
                </div>
              </div>

              <CollapsibleContent>
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="col-span-2">
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
                          {bill.items.map((item, index) => (
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
                            <td className="text-right py-2">{formatCurrency(bill.totalAmount)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Receipt Image */}
                    {bill.items[0]?.receiptImage && (
                      <div className="border rounded-md overflow-hidden">
                        <div className="bg-gray-50 p-2 font-medium">Receipt</div>
                        <div className="p-2">
                          <a
                            href={`/api/uploads/receipts/${bill.items[0].receiptImage}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <img
                              src={`/api/uploads/receipts/${bill.items[0].receiptImage}`}
                              alt="Receipt"
                              className="max-w-full h-auto max-h-48 object-contain mx-auto"
                            />
                            <div className="text-center mt-2 text-sm text-blue-600">
                              Click to view full size
                            </div>
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation(`/supplier-purchase/${bill.supplierId}`)}
                      className="text-green-600 hover:text-green-800 hover:bg-green-50 border-green-200"
                    >
                      <ShoppingCart className="h-4 w-4 mr-1" />
                      New Purchase from {bill.supplierName}
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
