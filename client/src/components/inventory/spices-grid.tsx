import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Spice, Category } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Check,
  X,
} from "lucide-react";
import SpiceCard from "./spice-card";
import AddSpiceForm from "./add-spice-form";
import { Badge } from "@/components/ui/badge";

export default function SpicesGrid() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<{min: number, max: number | null}>({min: 0, max: null});
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [originFilter, setOriginFilter] = useState<string>("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedSpice, setSelectedSpice] = useState<Spice | null>(null);
  const [selectedSpiceAvgPrice, setSelectedSpiceAvgPrice] = useState<number | null>(null);
  const [isAvgPriceLoading, setIsAvgPriceLoading] = useState(false);

  const { data: spices, isLoading: spicesLoading, refetch } = useQuery<Spice[]>({
    queryKey: ["/api/products"],
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Get unique origins for filter dropdown
  const uniqueOrigins = spices
    ? [...new Set(spices.filter(s => s.origin).map(s => s.origin))]
        .filter(Boolean)
        .sort() as string[]
    : [];

  // Filter and sort spices
  const filteredSpices = spices?.filter(spice => {
    // Search filter
    const matchesSearch = searchTerm === "" ||
      spice.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      spice.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      spice.origin?.toLowerCase().includes(searchTerm.toLowerCase());

    // Category filter
    const matchesCategory = selectedCategory === "all" ||
      spice.categoryId.toString() === selectedCategory;

    // Status filter
    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "active" && spice.isActive) ||
      (statusFilter === "inactive" && !spice.isActive);

    // Price range filter
    const price = Number(spice.price);
    const matchesPrice = (priceRange.min === 0 || price >= priceRange.min) &&
                         (priceRange.max === null || price <= priceRange.max);

    // Stock quantity filter
    const stockQty = Number(spice.stocksQty);
    const matchesStock = stockFilter === "all" ||
      (stockFilter === "in-stock" && stockQty > 0) ||
      (stockFilter === "low-stock" && stockQty > 0 && stockQty <= 10) ||
      (stockFilter === "out-of-stock" && stockQty === 0);

    // Origin filter
    const matchesOrigin = originFilter === "all" ||
      spice.origin === originFilter;

    return matchesSearch && matchesCategory && matchesStatus &&
           matchesPrice && matchesStock && matchesOrigin;
  }) || [];

  // Sort spices
  const sortedSpices = [...filteredSpices].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "price":
        comparison = Number(a.price) - Number(b.price);
        break;
      case "category":
        const catA = categories?.find(c => c.id === a.categoryId)?.name || "";
        const catB = categories?.find(c => c.id === b.categoryId)?.name || "";
        comparison = catA.localeCompare(catB);
        break;
      default:
        comparison = 0;
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  const handleDeleteSpice = async (spice: Spice) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const res = await fetch(`/api/products/${spice.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete product");
      toast({
        title: "Product deleted",
        description: "The product has been deleted successfully.",
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Function to fetch average price for a product
  const fetchAveragePrice = async (productName: string) => {
    try {
      setIsAvgPriceLoading(true);
      const response = await fetch(`/api/products/${encodeURIComponent(productName)}/average-price`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedSpiceAvgPrice(data.averagePrice);
      } else {
        setSelectedSpiceAvgPrice(null);
      }
    } catch (error) {
      console.error(`Error fetching average price for ${productName}:`, error);
      setSelectedSpiceAvgPrice(null);
    } finally {
      setIsAvgPriceLoading(false);
    }
  };

  // Effect to fetch average price when a spice is selected for viewing
  useEffect(() => {
    if (selectedSpice && isViewDialogOpen) {
      fetchAveragePrice(selectedSpice.name);
    } else {
      setSelectedSpiceAvgPrice(null);
    }
  }, [selectedSpice, isViewDialogOpen]);

  const getCategoryName = (categoryId: number) => {
    return categories?.find(c => c.id === categoryId)?.name || "Unknown";
  };

  return (
    <div className="space-y-6">
      {/* Search and Basic Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map((category) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`ml-2 ${(priceRange.min > 0 || priceRange.max !== null || stockFilter !== "all" || originFilter !== "all") ? "border-primary text-primary" : ""}`}
          >
            {showAdvancedFilters ? "Hide Filters" : "More Filters"}
            {(priceRange.min > 0 || priceRange.max !== null || stockFilter !== "all" || originFilter !== "all") && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {[
                  (priceRange.min > 0 || priceRange.max !== null) ? 1 : 0,
                  stockFilter !== "all" ? 1 : 0,
                  originFilter !== "all" ? 1 : 0
                ].reduce((a, b) => a + b, 0)}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="bg-secondary/5 p-4 rounded-md border mt-4">
          <h3 className="font-medium mb-3 text-sm">Advanced Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Price Range Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Price Range (₹)</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  placeholder="Min"
                  value={priceRange.min || ""}
                  onChange={(e) => setPriceRange({
                    ...priceRange,
                    min: e.target.value ? Number(e.target.value) : 0
                  })}
                  className="w-full"
                />
                <span>to</span>
                <Input
                  type="number"
                  min="0"
                  placeholder="Max"
                  value={priceRange.max || ""}
                  onChange={(e) => setPriceRange({
                    ...priceRange,
                    max: e.target.value ? Number(e.target.value) : null
                  })}
                  className="w-full"
                />
              </div>
            </div>

            {/* Stock Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Stock Status</label>
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Stock Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock Levels</SelectItem>
                  <SelectItem value="in-stock">In Stock</SelectItem>
                  <SelectItem value="low-stock">Low Stock (≤ 10)</SelectItem>
                  <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Origin Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Origin</label>
              <Select value={originFilter} onValueChange={setOriginFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Origin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Origins</SelectItem>
                  {uniqueOrigins.map((origin) => (
                    <SelectItem key={origin} value={origin}>
                      {origin}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filters */}
          {(priceRange.min > 0 || priceRange.max !== null || stockFilter !== "all" || originFilter !== "all") && (
            <div className="mt-4 flex flex-wrap gap-2">
              <div className="text-sm font-medium mr-2">Active Filters:</div>

              {priceRange.min > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Min Price: ₹{priceRange.min}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setPriceRange({...priceRange, min: 0})}
                  />
                </Badge>
              )}

              {priceRange.max !== null && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Max Price: ₹{priceRange.max}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setPriceRange({...priceRange, max: null})}
                  />
                </Badge>
              )}

              {stockFilter !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Stock: {stockFilter === "in-stock" ? "In Stock" :
                         stockFilter === "low-stock" ? "Low Stock" : "Out of Stock"}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setStockFilter("all")}
                  />
                </Badge>
              )}

              {originFilter !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Origin: {originFilter}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setOriginFilter("all")}
                  />
                </Badge>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-xs h-7"
                onClick={() => {
                  setPriceRange({min: 0, max: null});
                  setStockFilter("all");
                  setOriginFilter("all");
                }}
              >
                Clear All
              </Button>
            </div>
          )}

          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPriceRange({min: 0, max: null});
                setStockFilter("all");
                setOriginFilter("all");
              }}
            >
              Reset Filters
            </Button>
          </div>
        </div>
      )}

      {/* Sort Controls */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-muted-foreground">
          Showing {sortedSpices.length} {sortedSpices.length === 1 ? "product" : "products"}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <Select value={sortField} onValueChange={setSortField}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="price">Price</SelectItem>
              <SelectItem value="category">Category</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
          >
            {sortDirection === "asc" ? (
              <SortAsc className="h-4 w-4" />
            ) : (
              <SortDesc className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Grid of spice cards */}
      {sortedSpices.length === 0 ? (
        <div className="text-center py-12 bg-secondary/5 rounded-lg border">
          <p className="text-muted-foreground">
            {searchTerm || selectedCategory !== "all" || statusFilter !== "all"
              ? "No products found matching your filters"
              : "No products found. Add your first product."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {sortedSpices.map((spice) => (
            <SpiceCard
              key={spice.id}
              spice={spice}
              categories={categories}
              onView={(spice) => {
                setSelectedSpice(spice);
                setIsViewDialogOpen(true);
              }}
              onEdit={(spice) => {
                setSelectedSpice(spice);
                setIsAddDialogOpen(true);
              }}
              onDelete={handleDeleteSpice}
            />
          ))}
        </div>
      )}

      {/* View Spice Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={(open) => setIsViewDialogOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
          </DialogHeader>
          {selectedSpice ? (
            <div className="space-y-4">
              {selectedSpice.imagePath && (
                <div className="flex justify-center mb-4">
                  <div className="w-40 h-40 relative rounded-md overflow-hidden border">
                    <img
                      src={`/api${selectedSpice.imagePath}`}
                      alt={selectedSpice.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <p><strong>Name:</strong> {selectedSpice.name}</p>
                <p><strong>Category:</strong> {getCategoryName(selectedSpice.categoryId)}</p>
                <p><strong>Origin:</strong> {selectedSpice.origin || "Unknown"}</p>
                <p><strong>Description:</strong> {selectedSpice.description || "No description"}</p>
                <p>
                  <strong>Average Price:</strong>{" "}
                  {isAvgPriceLoading ? (
                    <span className="text-muted-foreground">Loading...</span>
                  ) : selectedSpiceAvgPrice !== null ? (
                    <span className="text-green-600 font-medium">₹{selectedSpiceAvgPrice.toFixed(2)}/{selectedSpice.unit}</span>
                  ) : (
                    <span className="text-muted-foreground">No price data available</span>
                  )}
                </p>
                <p><strong>Listed Price:</strong> ₹{Number(selectedSpice.price).toFixed(2)}/{selectedSpice.unit}</p>
                <p><strong>Stock Quantity:</strong> {selectedSpice.stocksQty}</p>
                <p><strong>Status:</strong> {selectedSpice.isActive ? "Active" : "Inactive"}</p>
              </div>
            </div>
          ) : (
            <p>No spice selected.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Spice Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => setIsAddDialogOpen(open)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSpice ? "Edit Product" : "Add New Product"}</DialogTitle>
            <DialogDescription>
              {selectedSpice
                ? "Update the product information in your catalog."
                : "Add a new product to your catalog."}
            </DialogDescription>
          </DialogHeader>
          <AddSpiceForm
            onSuccess={() => {
              setIsAddDialogOpen(false);
              setSelectedSpice(null);
              refetch();
            }}
            existingSpice={selectedSpice || undefined}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
