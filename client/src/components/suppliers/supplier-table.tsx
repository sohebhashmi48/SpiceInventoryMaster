import { useState, useMemo } from "react";
import { useLocation } from "wouter";
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
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Vendor } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MoreHorizontal, Edit, Trash2, Mail, Phone, DollarSign, MapPin, Plus, Star, ShoppingCart, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import AddSupplierForm from "./add-supplier-form";
import SupplierFilters, { SupplierFilters as FilterType } from "./supplier-filters";

export default function SupplierTable() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [filters, setFilters] = useState<FilterType>({
    name: "",
    location: "",
    minAmount: null,
    maxAmount: null,
    dateFrom: null,
    dateTo: null
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Vendor | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<number | null>(null);

  const { data: suppliers, isLoading: suppliersLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  // Extract unique locations for the filter dropdown
  const uniqueLocations = useMemo(() => {
    if (!suppliers) return [];
    const locations = suppliers
      .map(supplier => supplier.address)
      .filter((address): address is string => Boolean(address));
    // Convert Set to Array to avoid iteration issues
    return Array.from(new Set(locations));
  }, [suppliers]);

  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/vendors/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Supplier deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      setSupplierToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete supplier: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: number) => {
    setSupplierToDelete(id);
  };

  const confirmDelete = () => {
    if (supplierToDelete !== null) {
      deleteSupplierMutation.mutate(supplierToDelete);
    }
  };

  const handleEdit = (supplier: Vendor) => {
    setEditingSupplier(supplier);
    setIsAddDialogOpen(true);
  };

  const renderRating = (rating: number | null) => {
    if (!rating) return <span className="text-muted-foreground text-sm">Not rated</span>;

    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? "text-yellow-500 fill-current"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const filteredSuppliers = useMemo(() => {
    if (!suppliers) return [];

    return suppliers.filter(supplier => {
      // Filter by name (search across name, contact name, email)
      const nameMatch = filters.name
        ? supplier.name.toLowerCase().includes(filters.name.toLowerCase()) ||
          (supplier.contactName ? supplier.contactName.toLowerCase().includes(filters.name.toLowerCase()) : false) ||
          (supplier.email ? supplier.email.toLowerCase().includes(filters.name.toLowerCase()) : false)
        : true;

      // Filter by location (address)
      const locationMatch = filters.location
        ? supplier.address === filters.location
        : true;

      // Filter by amount range (balance due)
      const minAmountMatch = filters.minAmount !== null
        ? Number(supplier.balanceDue || 0) >= filters.minAmount
        : true;

      const maxAmountMatch = filters.maxAmount !== null
        ? Number(supplier.balanceDue || 0) <= filters.maxAmount
        : true;

      // Check if supplier was created within date range
      const dateMatch = (filters.dateFrom || filters.dateTo)
        ? (() => {
            // Use a fallback date if neither field is available
            const dateToUse = supplier.createdAt || (new Date()).toISOString();
            const supplierDate = new Date(dateToUse);
            const fromMatch = filters.dateFrom
              ? supplierDate >= filters.dateFrom
              : true;
            const toMatch = filters.dateTo
              ? supplierDate <= filters.dateTo
              : true;
            return fromMatch && toMatch;
          })()
        : true;

      return nameMatch && locationMatch && minAmountMatch && maxAmountMatch && dateMatch;
    });
  }, [suppliers, filters]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="w-full">
          <SupplierFilters
            locations={uniqueLocations}
            onFiltersChange={setFilters}
          />
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-secondary hover:bg-secondary-dark text-white">
              <Plus className="h-4 w-4 mr-2" /> Add Supplier
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>{editingSupplier ? "Edit Supplier" : "Add New Supplier"}</DialogTitle>
              <DialogDescription>
                {editingSupplier
                  ? "Update the details of the existing supplier."
                  : "Add a new supplier to your system. Fill in all the required information."}
              </DialogDescription>
            </DialogHeader>
            <AddSupplierForm
              onSuccess={() => {
                setIsAddDialogOpen(false);
                setEditingSupplier(null);
              }}
              existingSupplier={editingSupplier}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier Name</TableHead>
              <TableHead>Contact Person</TableHead>
              <TableHead>Contact Info</TableHead>
              <TableHead>Products Supplied</TableHead>
              <TableHead className="text-right">Balance Due</TableHead>
              <TableHead className="text-right">Credit Limit</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliersLoading ? (
              Array(5).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                </TableRow>
              ))
            ) : filteredSuppliers?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No suppliers found
                </TableCell>
              </TableRow>
            ) : (
              filteredSuppliers?.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>{supplier.contactName}</TableCell>
                  <TableCell>
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center">
                        <Mail className="h-3 w-3 mr-1 text-muted-foreground" />
                        <span className="text-sm">{supplier.email}</span>
                      </div>
                      <div className="flex items-center">
                        <Phone className="h-3 w-3 mr-1 text-muted-foreground" />
                        <span className="text-sm">{supplier.phone}</span>
                      </div>
                      {supplier.address && (
                        <div className="flex items-center">
                          <MapPin className="h-3 w-3 mr-1 text-muted-foreground" />
                          <span className="text-sm">{supplier.address}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {supplier.tags && supplier.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {supplier.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">None</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end">
                      <span className="mr-1 text-red-500">₹</span>
                      <span className={`text-sm ${Number(supplier.balanceDue) > 0 ? "text-red-500 font-medium" : ""}`}>
                        {Number(supplier.balanceDue || 0).toFixed(2)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end">
                      <span className="mr-1 text-muted-foreground">₹</span>
                      <span className="text-sm">
                        {Number(supplier.creditLimit || 0).toFixed(2)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{renderRating(supplier.rating)}</TableCell>
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
                        <DropdownMenuItem onClick={() => setLocation(`/suppliers/${supplier.id}`)}>
                          <Eye className="h-4 w-4 mr-2 text-blue-600" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLocation(`/supplier-purchase/${supplier.id}`)}>
                          <ShoppingCart className="h-4 w-4 mr-2 text-green-600" />
                          Buy from Supplier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleEdit(supplier)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(supplier.id)}
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

      <AlertDialog open={supplierToDelete !== null} onOpenChange={(open) => !open && setSupplierToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the supplier and all associated data.
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
