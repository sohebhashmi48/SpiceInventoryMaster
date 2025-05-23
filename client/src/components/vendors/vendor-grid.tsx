import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Vendor } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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
import AddVendorForm from "./add-vendor-form";
import VendorFilters, { VendorFilters as FilterType } from "./vendor-filters";
import VendorCard from "./vendor-card";

export default function VendorGrid() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<FilterType>({
    name: "",
    location: "",
    minAmount: null,
    maxAmount: null,
    dateFrom: null,
    dateTo: null
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [vendorToDelete, setVendorToDelete] = useState<number | null>(null);

  const { data: vendors, isLoading: vendorsLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  // Extract unique locations from addresses for the filter dropdown
  const uniqueLocations = vendors
    ? Array.from(new Set(vendors
        .map(vendor => vendor.address)
        .filter((address): address is string => Boolean(address))))
    : [];

  const deleteVendorMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/vendors/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Vendor deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      setVendorToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete vendor: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: number) => {
    setVendorToDelete(id);
  };

  const confirmDelete = () => {
    if (vendorToDelete !== null) {
      deleteVendorMutation.mutate(vendorToDelete);
    }
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setIsAddDialogOpen(true);
  };

  const filteredVendors = vendors
    ? vendors.filter(vendor => {
        // Filter by name (search across name, contact name, email)
        const nameMatch = filters.name
          ? vendor.name.toLowerCase().includes(filters.name.toLowerCase()) ||
            (vendor.contactName ? vendor.contactName.toLowerCase().includes(filters.name.toLowerCase()) : false) ||
            (vendor.email ? vendor.email.toLowerCase().includes(filters.name.toLowerCase()) : false)
          : true;

        // Filter by location (address)
        const locationMatch = filters.location
          ? vendor.address === filters.location
          : true;

        // Filter by amount range (balance due)
        const minAmountMatch = filters.minAmount !== null
          ? Number(vendor.balanceDue || 0) >= filters.minAmount
          : true;

        const maxAmountMatch = filters.maxAmount !== null
          ? Number(vendor.balanceDue || 0) <= filters.maxAmount
          : true;

        // Check if vendor was created within date range
        const dateMatch = (filters.dateFrom || filters.dateTo)
          ? (() => {
              const dateToUse = vendor.createdAt || (new Date()).toISOString();
              const vendorDate = new Date(dateToUse);
              const fromMatch = filters.dateFrom
                ? vendorDate >= filters.dateFrom
                : true;
              const toMatch = filters.dateTo
                ? vendorDate <= filters.dateTo
                : true;
              return fromMatch && toMatch;
            })()
          : true;

        return nameMatch && locationMatch && minAmountMatch && maxAmountMatch && dateMatch;
      })
    : [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="w-full">
          <VendorFilters
            locations={uniqueLocations}
            onFiltersChange={setFilters}
          />
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-secondary hover:bg-secondary-dark text-white">
              <Plus className="h-4 w-4 mr-2" /> Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>{editingVendor ? "Edit Vendor" : "Add New Vendor"}</DialogTitle>
              <DialogDescription>
                {editingVendor
                  ? "Update the details of the existing vendor."
                  : "Add a new vendor to your system. Fill in all the required information."}
              </DialogDescription>
            </DialogHeader>
            <AddVendorForm
              onSuccess={() => {
                setIsAddDialogOpen(false);
                setEditingVendor(null);
              }}
              existingVendor={editingVendor}
            />
          </DialogContent>
        </Dialog>
      </div>

      {vendorsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="border rounded-md p-4 h-64">
              <div className="space-y-3">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <div className="pt-2 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <div className="pt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredVendors.length === 0 ? (
        <div className="text-center py-12 border rounded-md bg-muted/10">
          <p className="text-muted-foreground">No vendors found matching your criteria.</p>
          <Button
            variant="link"
            onClick={() => setFilters({
              name: "",
              location: "",
              minAmount: null,
              maxAmount: null,
              dateFrom: null,
              dateTo: null
            })}
            className="mt-2"
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredVendors.map((vendor) => (
            <VendorCard
              key={vendor.id}
              vendor={vendor}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <AlertDialog open={vendorToDelete !== null} onOpenChange={(open) => !open && setVendorToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the vendor and all associated data.
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
