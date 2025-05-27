import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Vendor } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Phone, MapPin, Edit, Trash2, Plus, Star, ShoppingCart, Eye, DollarSign } from "lucide-react";
import AddSupplierForm from "./add-supplier-form";

interface FilterValues {
  searchTerm: string;
  ratingFilter: number | null;
  statusFilter: boolean | null;
}

interface SupplierGridProps {
  filterValues?: FilterValues;
}

export default function SupplierGrid({ filterValues }: SupplierGridProps = {}) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Vendor | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<number | null>(null);

  const { data: suppliers, isLoading: suppliersLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: number) => {
      console.log(`Deleting supplier ID: ${id}`);
      const response = await apiRequest("DELETE", `/api/vendors/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Delete failed:", errorData);
        throw new Error(errorData.message || "Failed to delete supplier");
      }
      return response;
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
      console.error("Delete mutation error:", error);
      console.log("Error type:", typeof error);
      console.log("Error stringified:", JSON.stringify(error, null, 2));

      // Get the error message from the response if available
      let errorMessage = "";
      if (error.message) {
        errorMessage = error.message;
      } else if ((error as any).response && (error as any).response.data && (error as any).response.data.error) {
        errorMessage = (error as any).response.data.error;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else {
        errorMessage = JSON.stringify(error);
      }

      console.log("Extracted error message:", errorMessage);

      // Check if the error is due to foreign key constraint
      if (errorMessage && (
        errorMessage.includes("foreign key constraint") ||
        errorMessage.includes("Cannot delete or update a parent row") ||
        errorMessage.includes("ER_ROW_IS_REFERENCED")
      )) {
        // Show options dialog instead of error toast
        setSupplierWithOptions(supplierToDelete);
        setOptionsDialogOpen(true);
        setSupplierToDelete(null);
      } else {
        toast({
          title: "Error",
          description: `Failed to delete supplier: ${errorMessage}`,
          variant: "destructive",
        });
      }
    },
  });

  // Force delete mutation
  const forceDeleteMutation = useMutation({
    mutationFn: async (id: number) => {
      console.log(`Attempting force delete for supplier ID: ${id}`);
      // Use fetch directly to ensure query parameters are handled correctly
      const response = await fetch(`/api/vendors/${id}?force=true`, {
        method: "DELETE",
        credentials: "include"
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Force delete failed:", errorData);
        throw new Error(errorData.message || "Failed to force delete supplier");
      }
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Supplier and all related records deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      setOptionsDialogOpen(false);
      setSupplierWithOptions(null);
    },
    onError: (error) => {
      console.error("Force delete mutation error:", error);
      console.log("Force delete error type:", typeof error);
      console.log("Force delete error stringified:", JSON.stringify(error, null, 2));

      // Get the error message from the response if available
      let errorMessage = "";
      if (error.message) {
        errorMessage = error.message;
      } else if ((error as any).response && (error as any).response.data && (error as any).response.data.error) {
        errorMessage = (error as any).response.data.error;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else {
        errorMessage = JSON.stringify(error);
      }

      console.log("Force delete extracted error message:", errorMessage);

      toast({
        title: "Error",
        description: `Failed to force delete supplier: ${errorMessage}`,
        variant: "destructive",
      });
    },
  });

  // State for options dialog (mark as inactive or force delete)
  const [optionsDialogOpen, setOptionsDialogOpen] = useState(false);
  const [supplierWithOptions, setSupplierWithOptions] = useState<number | null>(null);

  // State for marking supplier as inactive
  const [inactiveConfirmOpen, setInactiveConfirmOpen] = useState(false);
  const [supplierToMarkInactive, setSupplierToMarkInactive] = useState<number | null>(null);

  // Mutation for marking supplier as inactive
  const markInactiveMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/vendors/${id}`, { isActive: false });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Supplier marked as inactive",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      setSupplierToMarkInactive(null);
      setInactiveConfirmOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to mark supplier as inactive: ${error.message}`,
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

  // State for purchase confirmation
  const [purchaseConfirmOpen, setPurchaseConfirmOpen] = useState(false);
  const [supplierToPurchaseFrom, setSupplierToPurchaseFrom] = useState<Vendor | null>(null);

  const handleEdit = (supplier: Vendor) => {
    setEditingSupplier(supplier);
    setIsAddDialogOpen(true);
  };

  const renderRating = (rating: number | null) => {
    if (!rating) return null;

    return (
      <div className="flex mt-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${
              star <= rating
                ? "text-yellow-500 fill-current"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  // Filter suppliers based on filter values
  const filteredSuppliers = useMemo(() => {
    if (!suppliers) return [];

    return suppliers.filter(supplier => {
      // Apply search filter
      if (filterValues?.searchTerm) {
        const searchTermLower = filterValues.searchTerm.toLowerCase();
        const nameMatch = supplier.name?.toLowerCase().includes(searchTermLower);
        const contactMatch = supplier.contactName?.toLowerCase().includes(searchTermLower);
        const emailMatch = supplier.email?.toLowerCase().includes(searchTermLower);
        const phoneMatch = supplier.phone?.toLowerCase().includes(searchTermLower);
        const addressMatch = supplier.address?.toLowerCase().includes(searchTermLower);

        // Check if any tags match the search term
        const tagMatch = supplier.tags?.some(tag =>
          tag.toLowerCase().includes(searchTermLower)
        );

        if (!(nameMatch || contactMatch || emailMatch || phoneMatch || addressMatch || tagMatch)) {
          return false;
        }
      }

      // Apply rating filter
      if (filterValues?.ratingFilter !== null && supplier.rating) {
        if (supplier.rating < filterValues.ratingFilter) {
          return false;
        }
      }

      // Apply status filter
      if (filterValues?.statusFilter !== null) {
        if (supplier.isActive !== filterValues.statusFilter) {
          return false;
        }
      }

      return true;
    });
  }, [suppliers, filterValues]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Button
          variant="outline"
          onClick={() => setLocation('/purchase-history')}
          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 border-blue-200"
        >
          <Eye className="h-4 w-4 mr-2" /> Show All Purchases
        </Button>

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

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {suppliersLoading
          ? Array(8)
              .fill(0)
              .map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-5">
                      <Skeleton className="h-6 w-3/4 mb-3" />
                      <Skeleton className="h-4 w-1/2 mb-3" />
                      <div className="space-y-2 mt-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                      <div className="mt-3">
                        <Skeleton className="h-4 w-full mt-2" />
                        <div className="flex gap-1 mt-1">
                          <Skeleton className="h-6 w-16 rounded-full" />
                          <Skeleton className="h-6 w-16 rounded-full" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between p-3 pt-0 border-t">
                    <Skeleton className="h-9 w-full rounded-md" />
                  </CardFooter>
                </Card>
              ))
          : filteredSuppliers.length > 0 ? filteredSuppliers.map((supplier) => (
              <Card key={supplier.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-xl line-clamp-1">{supplier.name}</h3>
                      <Badge
                        variant={Number(supplier.balanceDue || 0) > 0 ? "destructive" : "outline"}
                        className="ml-2 shrink-0"
                      >
                        {Number(supplier.balanceDue || 0) > 0 ? "Due" : "Paid"}
                      </Badge>
                    </div>
                    {supplier.contactName && (
                      <p className="text-sm text-muted-foreground mb-3">{supplier.contactName}</p>
                    )}
                    {renderRating(supplier.rating)}

                    <div className="mt-4 space-y-2">
                      {supplier.email && (
                        <div className="flex items-center text-sm">
                          <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="truncate">{supplier.email}</span>
                        </div>
                      )}
                      {supplier.phone && (
                        <div className="flex items-center text-sm">
                          <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{supplier.phone}</span>
                        </div>
                      )}
                      {supplier.address && (
                        <div className="flex items-start text-sm">
                          <MapPin className="h-4 w-4 mr-2 text-muted-foreground mt-0.5" />
                          <span className="line-clamp-1">{supplier.address}</span>
                        </div>
                      )}

                      {/* Display supplier tags */}
                      {supplier.tags && supplier.tags.length > 0 && (
                        <div className="mt-3">
                          <div className="text-sm text-muted-foreground mb-1">Products Supplied:</div>
                          <div className="flex flex-wrap gap-1">
                            {supplier.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-sm">
                                {tag}
                              </Badge>
                            ))}
                            {supplier.tags.length > 3 && (
                              <Badge variant="outline" className="text-sm">
                                +{supplier.tags.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2 p-3 pt-0 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(supplier)}
                    className="flex-1 h-9 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(supplier.id)}
                    className="flex-1 h-9 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 px-2"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLocation(`/suppliers/${supplier.id}`)}
                    className="flex-1 h-9 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Details
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSupplierToPurchaseFrom(supplier);
                      setPurchaseConfirmOpen(true);
                    }}
                    className="flex-1 h-9 text-sm text-green-600 hover:text-green-800 hover:bg-green-50 px-2"
                  >
                    <ShoppingCart className="h-4 w-4 mr-1" />
                    Buy
                  </Button>
                </CardFooter>
              </Card>
            )) : (
              <div className="col-span-full text-center py-8">
                <div className="text-gray-500 mb-2">No suppliers found matching your filters</div>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Reset filters if parent component provided a way to do so
                    if (filterValues) {
                      window.location.reload(); // Simple way to reset all filters
                    }
                  }}
                >
                  Reset Filters
                </Button>
              </div>
            )}
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

      {/* Options dialog when supplier can't be deleted */}
      <AlertDialog open={optionsDialogOpen} onOpenChange={setOptionsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supplier Has Related Records</AlertDialogTitle>
            <AlertDialogDescription>
              This supplier cannot be deleted because it has related inventory items or purchases.
              Please choose one of the following options:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div className="flex flex-col space-y-2 border p-4 rounded-md">
                <h3 className="font-medium">Mark as Inactive</h3>
                <p className="text-sm text-muted-foreground">
                  This will keep the supplier in the system but mark it as inactive.
                  Inactive suppliers will not appear in new transactions.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setOptionsDialogOpen(false);
                    if (supplierWithOptions) {
                      setSupplierToMarkInactive(supplierWithOptions);
                      setInactiveConfirmOpen(true);
                    }
                  }}
                  className="mt-2 w-full"
                >
                  Mark as Inactive
                </Button>
              </div>

              <div className="flex flex-col space-y-2 border p-4 rounded-md border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
                <h3 className="font-medium text-red-600 dark:text-red-400">Force Delete (Danger)</h3>
                <p className="text-sm text-red-600 dark:text-red-400">
                  This will delete the supplier AND all related records including purchases, inventory items, and purchase history.
                  This action cannot be undone and may affect your inventory and reporting.
                </p>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (supplierWithOptions) {
                      console.log(`Force delete button clicked for supplier ID: ${supplierWithOptions}`);
                      forceDeleteMutation.mutate(supplierWithOptions);
                    }
                  }}
                  className="mt-2 w-full"
                >
                  Force Delete Everything
                </Button>
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOptionsDialogOpen(false)}>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog for marking supplier as inactive */}
      <AlertDialog open={inactiveConfirmOpen} onOpenChange={setInactiveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Inactive?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this supplier as inactive?
              Inactive suppliers will not appear in new transactions but will still be visible in reports and history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setInactiveConfirmOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (supplierToMarkInactive) {
                  markInactiveMutation.mutate(supplierToMarkInactive);
                }
              }}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Mark as Inactive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Purchase confirmation dialog */}
      <AlertDialog open={purchaseConfirmOpen} onOpenChange={setPurchaseConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Purchase</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to make a purchase from {supplierToPurchaseFrom?.name}?
              {supplierToPurchaseFrom && Number(supplierToPurchaseFrom.creditLimit || 0) > 0 && (
                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                  <div className="text-sm font-medium">Credit Information:</div>
                  <div className="grid grid-cols-2 gap-1 text-xs mt-1">
                    <div>Available Credit:</div>
                    <div className="font-medium">
                      ₹{Math.max(0, Number(supplierToPurchaseFrom.creditLimit || 0) - Number(supplierToPurchaseFrom.balanceDue || 0)).toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPurchaseConfirmOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (supplierToPurchaseFrom) {
                  setLocation(`/supplier-purchase/${supplierToPurchaseFrom.id}`);
                  setPurchaseConfirmOpen(false);
                }
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Proceed to Purchase
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
