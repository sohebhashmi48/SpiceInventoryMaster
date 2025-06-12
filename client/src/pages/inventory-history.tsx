import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout/layout";
import PageHeader from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  History,
  Search,
  Filter,
  Download,
  Calendar,
  Package,
  User,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Plus,
  Minus,
  Edit,
  Trash2,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";

interface InventoryHistoryItem {
  id: number;
  inventoryId: number;
  productId: number;
  productName: string;
  supplierId: number;
  supplierName: string;
  changeType: string;
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
  quantityBefore?: number;
  quantityAfter?: number;
  reason?: string;
  userId?: number;
  userName: string;
  createdAt: string;
}

export default function InventoryHistoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [changeTypeFilter, setChangeTypeFilter] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");

  // Fetch inventory history
  const { data: historyData, isLoading, error, refetch } = useQuery<InventoryHistoryItem[]>({
    queryKey: ["inventory-history-all"],
    queryFn: async () => {
      // Fetch all records without limit
      const response = await fetch("/api/inventory/history?limit=1000", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch inventory history");
      }

      const data = await response.json();
      console.log(`Fetched ${data.length} inventory history records`);
      return data;
    },
    staleTime: 0, // Always fetch fresh data
    cacheTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get unique values for filters
  const filterOptions = useMemo(() => {
    if (!historyData) return { products: [], suppliers: [], users: [], changeTypes: [] };

    const products = [...new Set(historyData.map(item => item.productName))].sort();
    const suppliers = [...new Set(historyData.map(item => item.supplierName))].sort();
    const users = [...new Set(historyData.map(item => item.userName))].sort();
    const changeTypes = [...new Set(historyData.map(item => item.changeType))].sort();

    return { products, suppliers, users, changeTypes };
  }, [historyData]);

  // Filter history data
  const filteredHistory = useMemo(() => {
    if (!historyData) return [];

    return historyData.filter(item => {
      const matchesSearch = !searchTerm || 
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.reason && item.reason.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesChangeType = changeTypeFilter === "all" || item.changeType === changeTypeFilter;
      const matchesProduct = productFilter === "all" || item.productName === productFilter;
      const matchesSupplier = supplierFilter === "all" || item.supplierName === supplierFilter;
      const matchesUser = userFilter === "all" || item.userName === userFilter;

      // Date filtering logic can be added here
      const matchesDate = true; // For now, show all dates

      return matchesSearch && matchesChangeType && matchesProduct && matchesSupplier && matchesUser && matchesDate;
    });
  }, [historyData, searchTerm, changeTypeFilter, productFilter, supplierFilter, userFilter]);

  // Get badge variant for change type
  const getChangeTypeBadgeVariant = (changeType: string) => {
    switch (changeType.toLowerCase()) {
      case 'stock_added':
      case 'purchase':
        return 'default';
      case 'stock_reduced':
      case 'sale':
        return 'destructive';
      case 'stock_updated':
      case 'price_updated':
        return 'secondary';
      case 'expired':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Get icon for change type
  const getChangeTypeIcon = (changeType: string) => {
    switch (changeType.toLowerCase()) {
      case 'stock_added':
      case 'purchase':
        return <Plus className="h-3 w-3" />;
      case 'stock_reduced':
      case 'sale':
        return <Minus className="h-3 w-3" />;
      case 'stock_updated':
        return <RotateCcw className="h-3 w-3" />;
      case 'price_updated':
        return <Edit className="h-3 w-3" />;
      case 'expired':
        return <Trash2 className="h-3 w-3" />;
      default:
        return <History className="h-3 w-3" />;
    }
  };

  // Format change description
  const formatChangeDescription = (item: InventoryHistoryItem) => {
    if (item.quantityBefore !== undefined && item.quantityAfter !== undefined) {
      const quantityBefore = Number(item.quantityBefore).toFixed(2);
      const quantityAfter = Number(item.quantityAfter).toFixed(2);
      const change = Number(item.quantityAfter) - Number(item.quantityBefore);
      const changeText = change > 0 ? `+${change.toFixed(2)}` : `${change.toFixed(2)}`;
      return `Quantity: ${quantityBefore} → ${quantityAfter} (${changeText})`;
    }

    if (item.fieldChanged && item.oldValue && item.newValue) {
      return `${item.fieldChanged}: ${item.oldValue} → ${item.newValue}`;
    }

    if (item.reason) {
      return item.reason;
    }

    return item.changeType.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setChangeTypeFilter("all");
    setProductFilter("all");
    setSupplierFilter("all");
    setUserFilter("all");
    setDateRange("all");
  };

  return (
    <Layout>
      <PageHeader
        title="Inventory History"
        description="Complete history of all inventory changes and transactions"
      >
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </PageHeader>

      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search history..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Change Type Filter */}
              <div className="space-y-2">
                <Label>Change Type</Label>
                <Select value={changeTypeFilter} onValueChange={setChangeTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {filterOptions.changeTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Product Filter */}
              <div className="space-y-2">
                <Label>Product</Label>
                <Select value={productFilter} onValueChange={setProductFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All products" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    {filterOptions.products.map(product => (
                      <SelectItem key={product} value={product}>
                        {product}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Supplier Filter */}
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All suppliers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Suppliers</SelectItem>
                    {filterOptions.suppliers.map(supplier => (
                      <SelectItem key={supplier} value={supplier}>
                        {supplier}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* User Filter */}
              <div className="space-y-2">
                <Label>User</Label>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {filterOptions.users.map(user => (
                      <SelectItem key={user} value={user}>
                        {user}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters */}
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button
                  variant="outline"
                  onClick={clearAllFilters}
                  className="w-full"
                >
                  Clear All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* History Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Inventory History
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  {filteredHistory.length} of {historyData?.length || 0} records
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : error ? (
              <div className="text-center py-10">
                <div className="text-red-500 mb-2">Failed to load inventory history</div>
                <p className="text-sm text-muted-foreground">Please try again later</p>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-10">
                <History className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">No History Found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || changeTypeFilter !== "all" || productFilter !== "all" || supplierFilter !== "all" || userFilter !== "all"
                    ? "No records match your current filters"
                    : "No inventory history available"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Change Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>User</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">
                          {format(new Date(item.createdAt), "MMM dd, yyyy HH:mm:ss")}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            {item.productName}
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.supplierName}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={getChangeTypeBadgeVariant(item.changeType)}
                            className="flex items-center gap-1 w-fit"
                          >
                            {getChangeTypeIcon(item.changeType)}
                            {item.changeType.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <div className="text-sm">
                            {formatChangeDescription(item)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {item.userName}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
