import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Inventory, Spice, Vendor } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MoreHorizontal, Edit, Trash2, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatQuantityWithUnit } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AddInventoryForm from "./add-inventory-form";

interface InventoryTableProps {
  filters?: {
    searchQuery?: string;
    productId?: number | null;
    supplierId?: number | null;
    status?: 'all' | 'active' | 'expiring' | 'expired';
    minQuantity?: number | null;
    maxQuantity?: number | null;
    expiryDateStart?: Date | null;
    expiryDateEnd?: Date | null;
  };
}

export default function InventoryTable({ filters = {} }: InventoryTableProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState(filters.searchQuery || "");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Inventory | null>(null);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  // Update searchQuery when filters.searchQuery changes
  useEffect(() => {
    if (filters.searchQuery !== undefined) {
      setSearchQuery(filters.searchQuery);
    }
  }, [filters.searchQuery]);

  const { data: inventory, isLoading: inventoryLoading } = useQuery<Inventory[]>({
    queryKey: ["/api/inventory"],
  });

  const { data: spices } = useQuery<Spice[]>({
    queryKey: ["/api/products"],
  });

  const { data: vendors } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const deleteInventoryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/inventory/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Inventory item deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setItemToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete inventory item: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const getSpiceName = (productId: number) => {
    const product = spices?.find((s) => s.id === productId);
    return product ? product.name : "Unknown";
  };

  const getVendorName = (supplierId: number) => {
    const supplier = vendors?.find((v) => v.id === supplierId);
    return supplier ? supplier.name : "Unknown";
  };

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isExpiringSoon = (expiryDate: string | Date) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  };

  const isExpired = (expiryDate: string | Date) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    return expiry < today;
  };

  const isLowStock = (quantity: number | string) => {
    return Number(quantity) < 5;
  };

  const handleDelete = (id: number) => {
    setItemToDelete(id);
  };

  const confirmDelete = () => {
    if (itemToDelete !== null) {
      deleteInventoryMutation.mutate(itemToDelete);
    }
  };

  const handleEdit = (item: Inventory) => {
    setEditingItem(item);
    setIsAddDialogOpen(true);
  };

  const filteredInventory = inventory?.filter((item) => {
    // First check if the item is active and has quantity > 0
    // Only show inactive items if explicitly requested with status filter
    const isItemActive = item.status === 'active';
    const hasQuantity = Number(item.quantity) > 0;

    // Skip inactive or zero quantity items unless specifically requested
    if (!isItemActive || !hasQuantity) {
      // Only show inactive items if explicitly looking for them
      const showingInactive = filters.status === 'expired' || filters.status === 'expiring';
      if (!showingInactive) {
        return false;
      }
    }

    // Get product and supplier names
    const spiceName = getSpiceName(item.productId).toLowerCase();
    const vendorName = getVendorName(item.supplierId).toLowerCase();
    const batchNumber = item.batchNumber.toLowerCase();
    const query = searchQuery.toLowerCase();
    const quantity = Number(item.quantity);

    // Basic search filter
    const matchesSearch =
      spiceName.includes(query) ||
      vendorName.includes(query) ||
      batchNumber.includes(query);

    // Product filter
    const matchesProduct =
      !filters.productId ||
      item.productId === filters.productId;

    // Supplier filter
    const matchesSupplier =
      !filters.supplierId ||
      item.supplierId === filters.supplierId;

    // Status filter
    let matchesStatus = true;
    if (filters.status) {
      if (filters.status === 'expired') {
        matchesStatus = isExpired(item.expiryDate);
      } else if (filters.status === 'expiring') {
        matchesStatus = isExpiringSoon(item.expiryDate);
      } else if (filters.status === 'active') {
        matchesStatus = !isExpired(item.expiryDate) && !isExpiringSoon(item.expiryDate) && isItemActive && hasQuantity;
      }
    }

    // Quantity filter
    const matchesMinQuantity =
      filters.minQuantity === undefined ||
      filters.minQuantity === null ||
      quantity >= filters.minQuantity;

    const matchesMaxQuantity =
      filters.maxQuantity === undefined ||
      filters.maxQuantity === null ||
      quantity <= filters.maxQuantity;

    // Expiry date filter
    const expiryDate = new Date(item.expiryDate);
    const matchesExpiryStart =
      !filters.expiryDateStart ||
      expiryDate >= filters.expiryDateStart;

    const matchesExpiryEnd =
      !filters.expiryDateEnd ||
      expiryDate <= filters.expiryDateEnd;

    return (
      matchesSearch &&
      matchesProduct &&
      matchesSupplier &&
      matchesStatus &&
      matchesMinQuantity &&
      matchesMaxQuantity &&
      matchesExpiryStart &&
      matchesExpiryEnd
    );
  });

  return (
    <div>
      <div className="mb-6">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Inventory Item" : "Add New Inventory Item"}</DialogTitle>
              <DialogDescription>
                {editingItem
                  ? "Update the details of the existing inventory item."
                  : "Add a new item to your inventory. Fill in all the required information."}
              </DialogDescription>
            </DialogHeader>
            <AddInventoryForm
              onSuccess={() => {
                setIsAddDialogOpen(false);
                setEditingItem(null);
              }}
              existingItem={editingItem}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventoryLoading ? (
              Array(5).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                </TableRow>
              ))
            ) : filteredInventory?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No inventory items found
                </TableCell>
              </TableRow>
            ) : (
              filteredInventory?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {getSpiceName(item.productId)}
                  </TableCell>
                  <TableCell>{item.batchNumber}</TableCell>
                  <TableCell>
                    {getVendorName(item.supplierId)}
                  </TableCell>
                  <TableCell className="text-right">
                    {isLowStock(item.quantity) && (
                      <AlertTriangle className="h-4 w-4 text-red-500 inline mr-1" />
                    )}
                    {formatQuantityWithUnit(item.quantity, 'kg', true)}
                  </TableCell>
                  <TableCell className="text-right">${Number(item.totalValue).toFixed(2)}</TableCell>
                  <TableCell>
                    {formatDate(item.expiryDate)}
                  </TableCell>
                  <TableCell>
                    {isExpired(item.expiryDate) ? (
                      <Badge variant="destructive">Expired</Badge>
                    ) : isExpiringSoon(item.expiryDate) ? (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                        Expiring Soon
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleEdit(item)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={itemToDelete !== null} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the inventory item.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
