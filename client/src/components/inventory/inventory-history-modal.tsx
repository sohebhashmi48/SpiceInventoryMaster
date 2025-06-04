import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, History, Search, Filter, X } from "lucide-react";
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

interface InventoryHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventoryId?: number;
  productId?: number;
  title?: string;
}

export default function InventoryHistoryModal({
  isOpen,
  onClose,
  inventoryId,
  productId,
  title = "Inventory History"
}: InventoryHistoryModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [changeTypeFilter, setChangeTypeFilter] = useState<string>("all");

  // Fetch inventory history
  const { data: historyData, isLoading, error } = useQuery<InventoryHistoryItem[]>({
    queryKey: ["inventory-history", inventoryId, productId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (inventoryId) params.append("inventoryId", inventoryId.toString());
      if (productId) params.append("productId", productId.toString());
      
      const response = await fetch(`/api/inventory/history?${params.toString()}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch inventory history");
      }
      
      return response.json();
    },
    enabled: isOpen,
  });

  // Filter history data based on search and filters
  const filteredHistory = historyData?.filter(item => {
    const matchesSearch = !searchTerm || 
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.reason && item.reason.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesChangeType = changeTypeFilter === "all" || item.changeType === changeTypeFilter;
    
    return matchesSearch && matchesChangeType;
  }) || [];

  // Get unique change types for filter
  const changeTypes = Array.from(new Set(historyData?.map(item => item.changeType) || []));

  const getChangeTypeBadgeVariant = (changeType: string) => {
    switch (changeType) {
      case "created":
        return "default";
      case "updated":
        return "secondary";
      case "quantity_adjusted":
        return "outline";
      case "deleted":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const formatChangeDescription = (item: InventoryHistoryItem) => {
    switch (item.changeType) {
      case "created":
        return `New inventory item created with quantity: ${item.quantityAfter}`;
      case "quantity_adjusted":
        return `Quantity changed from ${item.quantityBefore} to ${item.quantityAfter}`;
      case "updated":
        if (item.fieldChanged && item.oldValue && item.newValue) {
          return `${item.fieldChanged} changed from "${item.oldValue}" to "${item.newValue}"`;
        }
        return "Item updated";
      case "deleted":
        return `Inventory item deleted (had quantity: ${item.quantityBefore})`;
      default:
        return item.reason || "Unknown change";
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setChangeTypeFilter("all");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            View the complete history of changes for this inventory item or product.
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 py-4 border-b">
          <div className="flex-1">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by product, supplier, user, or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="w-full sm:w-48">
            <Label htmlFor="changeType">Change Type</Label>
            <select
              id="changeType"
              value={changeTypeFilter}
              onChange={(e) => setChangeTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="all">All Changes</option>
              {changeTypes.map(type => (
                <option key={type} value={type}>
                  {type.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          {(searchTerm || changeTypeFilter !== "all") && (
            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading history...</span>
            </div>
          ) : error ? (
            <div className="text-center text-red-600 py-8">
              Failed to load inventory history. Please try again.
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {historyData?.length === 0 
                ? "No history records found." 
                : "No records match your search criteria."
              }
            </div>
          ) : (
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
                      {item.productName}
                    </TableCell>
                    <TableCell>
                      {item.supplierName}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getChangeTypeBadgeVariant(item.changeType)}>
                        {item.changeType.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="text-sm">
                        {formatChangeDescription(item)}
                      </div>
                      {item.reason && item.reason !== formatChangeDescription(item) && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Reason: {item.reason}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{item.userName}</div>
                      {item.userId && (
                        <div className="text-xs text-muted-foreground">ID: {item.userId}</div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Footer with summary */}
        {filteredHistory.length > 0 && (
          <div className="border-t pt-4 text-sm text-muted-foreground">
            Showing {filteredHistory.length} of {historyData?.length || 0} history records
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
