import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Spice, Vendor } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Search,
  Filter,
  Calendar as CalendarIcon,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface InventoryFiltersProps {
  onFilterChange: (filters: {
    searchQuery?: string;
    productId?: number | null;
    supplierId?: number | null;
    status?: 'all' | 'active' | 'expiring' | 'expired';
    minQuantity?: number | null;
    maxQuantity?: number | null;
    expiryDateStart?: Date | null;
    expiryDateEnd?: Date | null;
  }) => void;
}

export default function InventoryFilters({ onFilterChange }: InventoryFiltersProps) {
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [productId, setProductId] = useState<number | null>(null);
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [status, setStatus] = useState<'all' | 'active' | 'expiring' | 'expired'>('all');
  const [minQuantity, setMinQuantity] = useState<number | null>(null);
  const [maxQuantity, setMaxQuantity] = useState<number | null>(null);
  const [expiryDateStart, setExpiryDateStart] = useState<Date | null>(null);
  const [expiryDateEnd, setExpiryDateEnd] = useState<Date | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Fetch products and suppliers for dropdowns
  const { data: products } = useQuery<Spice[]>({
    queryKey: ["/api/products"],
  });

  const { data: suppliers } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  // Update parent component when filters change
  useEffect(() => {
    onFilterChange({
      searchQuery,
      productId,
      supplierId,
      status,
      minQuantity,
      maxQuantity,
      expiryDateStart,
      expiryDateEnd,
    });
  }, [
    searchQuery,
    productId,
    supplierId,
    status,
    minQuantity,
    maxQuantity,
    expiryDateStart,
    expiryDateEnd,
    onFilterChange,
  ]);

  // Count active filters
  const activeFilterCount = [
    searchQuery ? 1 : 0,
    productId ? 1 : 0,
    supplierId ? 1 : 0,
    status !== 'all' ? 1 : 0,
    minQuantity !== null ? 1 : 0,
    maxQuantity !== null ? 1 : 0,
    expiryDateStart ? 1 : 0,
    expiryDateEnd ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery("");
    setProductId(null);
    setSupplierId(null);
    setStatus('all');
    setMinQuantity(null);
    setMaxQuantity(null);
    setExpiryDateStart(null);
    setExpiryDateEnd(null);
  };

  return (
    <div className="space-y-4">
      {/* Basic Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search inventory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <Select value={status} onValueChange={(value: 'all' | 'active' | 'expiring' | 'expired') => setStatus(value)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expiring">Expiring Soon</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={cn(
              "ml-2",
              activeFilterCount > (searchQuery ? 1 : 0) + (status !== 'all' ? 1 : 0) && "border-primary text-primary"
            )}
          >
            <Filter className="h-4 w-4 mr-2" />
            {showAdvancedFilters ? "Hide Filters" : "More Filters"}
            {activeFilterCount > (searchQuery ? 1 : 0) + (status !== 'all' ? 1 : 0) && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {activeFilterCount - (searchQuery ? 1 : 0) - (status !== 'all' ? 1 : 0)}
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
            {/* Product Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Product</Label>
              <Select
                value={productId?.toString() || "all"}
                onValueChange={(value) => value === "all" ? setProductId(null) : setProductId(parseInt(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {products?.map((product) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Supplier Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Supplier</Label>
              <Select
                value={supplierId?.toString() || "all"}
                onValueChange={(value) => value === "all" ? setSupplierId(null) : setSupplierId(parseInt(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {suppliers?.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id.toString()}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity Range Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Quantity Range</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  placeholder="Min"
                  value={minQuantity || ""}
                  onChange={(e) => setMinQuantity(e.target.value ? Number(e.target.value) : null)}
                  className="w-full"
                />
                <span>to</span>
                <Input
                  type="number"
                  min="0"
                  placeholder="Max"
                  value={maxQuantity || ""}
                  onChange={(e) => setMaxQuantity(e.target.value ? Number(e.target.value) : null)}
                  className="w-full"
                />
              </div>
            </div>

            {/* Expiry Date Range */}
            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-medium">Expiry Date Range</Label>
              <div className="flex flex-wrap gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[180px] justify-start text-left font-normal",
                        !expiryDateStart && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expiryDateStart ? format(expiryDateStart, "PPP") : "Start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={expiryDateStart || undefined}
                      onSelect={(date) => date ? setExpiryDateStart(date) : setExpiryDateStart(null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[180px] justify-start text-left font-normal",
                        !expiryDateEnd && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expiryDateEnd ? format(expiryDateEnd, "PPP") : "End date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={expiryDateEnd || undefined}
                      onSelect={(date) => date ? setExpiryDateEnd(date) : setExpiryDateEnd(null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Active Filters */}
          {activeFilterCount > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <div className="text-sm font-medium mr-2">Active Filters:</div>

              {searchQuery && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Search: {searchQuery}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setSearchQuery("")}
                  />
                </Badge>
              )}

              {productId !== null && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Product: {products?.find(p => p.id === productId)?.name || productId}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setProductId(null)}
                  />
                </Badge>
              )}

              {supplierId !== null && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Supplier: {suppliers?.find(s => s.id === supplierId)?.name || supplierId}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setSupplierId(null)}
                  />
                </Badge>
              )}

              {status !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Status: {status.charAt(0).toUpperCase() + status.slice(1)}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setStatus('all')}
                  />
                </Badge>
              )}

              {minQuantity !== null && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Min Quantity: {minQuantity}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setMinQuantity(null)}
                  />
                </Badge>
              )}

              {maxQuantity !== null && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Max Quantity: {maxQuantity}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setMaxQuantity(null)}
                  />
                </Badge>
              )}

              {expiryDateStart && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  From: {format(expiryDateStart, "PP")}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setExpiryDateStart(null)}
                  />
                </Badge>
              )}

              {expiryDateEnd && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  To: {format(expiryDateEnd, "PP")}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setExpiryDateEnd(null)}
                  />
                </Badge>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-xs h-7"
                onClick={resetFilters}
              >
                Clear All
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
