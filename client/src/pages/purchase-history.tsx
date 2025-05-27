import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout/layout";
import PageHeader from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Package, DollarSign, Store, Filter, PercentIcon, Ruler } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Vendor, Spice } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";

interface PurchaseHistoryItem {
  id: number;
  vendorId: number;
  spiceId: number;
  purchaseId: number;
  purchaseDate: string;
  quantity: number;
  unit: string;
  price: number;
  gstPercentage: number;
  gstAmount: number;
  totalAmount: number;
  createdAt: string;
  productName: string;
  billNo: string;
  vendorName?: string;
}

export default function PurchaseHistoryPage() {
  const [location, setLocation] = useLocation();

  // Check if there's a vendor parameter in the URL
  const urlParams = new URLSearchParams(location.split('?')[1]);
  const vendorParam = urlParams.get('vendor');

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<string>(vendorParam || "all");
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [selectedUnit, setSelectedUnit] = useState<string>("all");
  const [selectedGst, setSelectedGst] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [activeTab, setActiveTab] = useState<string>("basic");

  // Fetch all purchase history
  const { data: purchaseHistory, isLoading } = useQuery<PurchaseHistoryItem[]>({
    queryKey: ["/api/purchase-history"],
    queryFn: async () => {
      console.log("Fetching purchase history");
      const response = await fetch("/api/purchase-history", {
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

  // Fetch all vendors for filter
  const { data: vendors } = useQuery<Vendor[]>({
    queryKey: ["/api/suppliers"],
  });

  // Fetch all products/spices for filter
  const { data: products } = useQuery<Spice[]>({
    queryKey: ["/api/products"],
  });

  // Get unique units from purchase history
  const uniqueUnits = purchaseHistory
    ? Array.from(new Set(purchaseHistory.map(item => item.unit)))
    : [];

  // Get unique GST percentages from purchase history
  const uniqueGstPercentages = purchaseHistory
    ? Array.from(new Set(purchaseHistory.map(item => item.gstPercentage)))
    : [];

  // Find min and max prices for the slider
  const minPrice = purchaseHistory && purchaseHistory.length > 0
    ? Math.min(...purchaseHistory.map(item => item.price))
    : 0;

  const maxPrice = purchaseHistory && purchaseHistory.length > 0
    ? Math.max(...purchaseHistory.map(item => item.price))
    : 10000;

  // Initialize price range when data is loaded
  useEffect(() => {
    if (purchaseHistory && purchaseHistory.length > 0) {
      setPriceRange([minPrice, maxPrice]);
    }
  }, [purchaseHistory, minPrice, maxPrice]);

  // Add vendor names to purchase history items
  const purchaseHistoryWithVendorNames = purchaseHistory?.map(item => {
    const vendor = vendors?.find((v: Vendor) => v.id === item.vendorId);
    return {
      ...item,
      vendorName: vendor?.name || "Unknown Vendor"
    };
  });

  // Filter purchase history based on search term and filters
  const filteredPurchaseHistory = purchaseHistoryWithVendorNames?.filter(item => {
    // Make sure all values are properly converted to lowercase strings for comparison
    const itemProductName = (item.productName || "").toLowerCase();
    const itemBillNo = (item.billNo || "").toLowerCase();
    const itemVendorName = (item.vendorName || "").toLowerCase();
    const searchTermLower = searchTerm.toLowerCase();

    // Search filter
    const matchesSearch = searchTerm === "" ||
      itemProductName.includes(searchTermLower) ||
      itemBillNo.includes(searchTermLower) ||
      itemVendorName.includes(searchTermLower);

    // Vendor filter
    const matchesVendor = selectedVendor === "all" ||
      (item.vendorId !== undefined && item.vendorId.toString() === selectedVendor);

    // Product filter
    const matchesProduct = selectedProduct === "all" ||
      (item.spiceId !== undefined && item.spiceId.toString() === selectedProduct);

    // Unit filter
    const matchesUnit = selectedUnit === "all" ||
      (item.unit !== undefined && item.unit === selectedUnit);

    // GST filter
    const matchesGst = selectedGst === "all" ||
      (item.gstPercentage !== undefined && item.gstPercentage.toString() === selectedGst);

    // Date range filter - ensure proper date comparison
    let matchesDateRange = true;
    try {
      if (item.purchaseDate && (dateFrom || dateTo)) {
        const itemDate = new Date(item.purchaseDate);

        // Only check if the date is valid
        if (!isNaN(itemDate.getTime())) {
          const matchesDateFrom = !dateFrom || itemDate >= dateFrom;
          const matchesDateTo = !dateTo || itemDate <= dateTo;
          matchesDateRange = matchesDateFrom && matchesDateTo;
        }
      }
    } catch (error) {
      console.error("Error comparing dates:", error);
      // If there's an error, don't filter out the item
      matchesDateRange = true;
    }

    // Price range filter
    const itemPrice = Number(item.price);
    const matchesPriceRange = !isNaN(itemPrice) &&
      itemPrice >= priceRange[0] &&
      itemPrice <= priceRange[1];

    // Return true only if all filters match
    return matchesSearch && matchesVendor && matchesProduct &&
           matchesUnit && matchesGst && matchesDateRange && matchesPriceRange;
  });

  return (
    <Layout>
      <PageHeader
        title={vendorParam ? "Supplier Purchase History" : "Purchase History"}
        description={vendorParam ? "View all purchases from this supplier" : "View all purchases from suppliers"}
      >
        <Button
          variant="outline"
          onClick={() => vendorParam ? setLocation(`/suppliers/${vendorParam}?tab=purchases`) : setLocation("/suppliers")}
          className="flex items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {vendorParam ? "Back to Supplier" : "Back to Suppliers"}
        </Button>
      </PageHeader>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filter Purchases</CardTitle>
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    placeholder="Search by product, bill no, or supplier"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="vendor">Supplier</Label>
                  <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                    <SelectTrigger id="vendor">
                      <SelectValue placeholder="All Suppliers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Suppliers</SelectItem>
                      {vendors?.map((vendor: Vendor) => (
                        <SelectItem key={vendor.id} value={vendor.id.toString()}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="product">Product</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger id="product">
                      <SelectValue placeholder="All Products" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Products</SelectItem>
                      {products?.map((product: Spice) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="mt-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="unit">Unit</Label>
                  <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                    <SelectTrigger id="unit">
                      <SelectValue placeholder="All Units" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Units</SelectItem>
                      {uniqueUnits.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="gst">GST Percentage</Label>
                  <Select value={selectedGst} onValueChange={setSelectedGst}>
                    <SelectTrigger id="gst">
                      <SelectValue placeholder="All GST Rates" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All GST Rates</SelectItem>
                      {uniqueGstPercentages && uniqueGstPercentages.map((gst) => (
                        <SelectItem key={gst} value={gst ? gst.toString() : '0'}>
                          {gst}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Date Range</Label>
                  <div className="flex space-x-2 mt-1.5">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <Calendar className="mr-2 h-4 w-4" />
                          {dateFrom ? format(dateFrom, "PPP") : "From Date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={dateFrom as any}
                          onSelect={(date: Date | undefined) => setDateFrom(date || null)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <Calendar className="mr-2 h-4 w-4" />
                          {dateTo ? format(dateTo, "PPP") : "To Date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={dateTo as any}
                          onSelect={(date: Date | undefined) => setDateTo(date || null)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div>
                  <Label>Price Range: {formatCurrency(priceRange[0])} - {formatCurrency(priceRange[1])}</Label>
                  <div className="pt-6 px-2">
                    <Slider
                      defaultValue={[minPrice, maxPrice]}
                      min={minPrice}
                      max={maxPrice}
                      step={10}
                      value={priceRange}
                      onValueChange={(value: number[]) => setPriceRange(value as [number, number])}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
        <CardFooter className="border-t pt-4">
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm("");
              setSelectedVendor("all");
              setSelectedProduct("all");
              setSelectedUnit("all");
              setSelectedGst("all");
              setDateFrom(null);
              setDateTo(null);
              setPriceRange([minPrice, maxPrice]);
            }}
            className="ml-auto"
          >
            Reset Filters
          </Button>
        </CardFooter>
      </Card>

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : filteredPurchaseHistory?.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No purchase history found</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Bill No
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Product
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Price
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    GST
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                {filteredPurchaseHistory?.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {item.billNo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {formatDate(item.purchaseDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <Store className="h-4 w-4 mr-2 text-gray-400" />
                        {item.vendorName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <Package className="h-4 w-4 mr-2 text-gray-400" />
                        {item.productName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1 text-gray-400" />
                        {formatCurrency(item.price)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <Badge variant="outline" className="font-normal">
                        {item.gstPercentage}% = {formatCurrency(item.gstAmount)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">
                      {formatCurrency(item.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
