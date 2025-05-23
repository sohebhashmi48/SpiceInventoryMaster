import { useState, useMemo } from "react";
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
import { MoreHorizontal, Edit, Trash2, Mail, Phone, DollarSign, MapPin, Plus, Star } from "lucide-react";
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

export default function VendorTable() {
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

  // Extract unique locations for the filter dropdown
  const uniqueLocations = useMemo(() => {
    if (!vendors) return [];
    const locations = vendors
      .map(vendor => vendor.address)
      .filter((address): address is string => Boolean(address));
    // Convert Set to Array to avoid iteration issues
    return Array.from(new Set(locations));
  }, [vendors]);

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

  const filteredVendors = useMemo(() => {
    if (!vendors) return [];

    return vendors.filter(vendor => {
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
      // Using purchaseDate as a proxy if createdAt is not available
      const dateMatch = (filters.dateFrom || filters.dateTo)
        ? (() => {
            // Use a fallback date if neither field is available
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
    });
  }, [vendors, filters]);

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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor Name</TableHead>
              <TableHead>Contact Person</TableHead>
              <TableHead>Contact Info</TableHead>
              <TableHead>Payment Terms</TableHead>
              <TableHead className="text-right">Balance Due</TableHead>
              <TableHead className="text-right">Credit Limit</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendorsLoading ? (
              Array(5).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                </TableRow>
              ))
            ) : filteredVendors?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No vendors found
                </TableCell>
              </TableRow>
            ) : (
              filteredVendors?.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell className="font-medium">{vendor.name}</TableCell>
                  <TableCell>{vendor.contactName}</TableCell>
                  <TableCell>
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center">
                        <Mail className="h-3 w-3 mr-1 text-muted-foreground" />
                        <span className="text-sm">{vendor.email}</span>
                      </div>
                      <div className="flex items-center">
                        <Phone className="h-3 w-3 mr-1 text-muted-foreground" />
                        <span className="text-sm">{vendor.phone}</span>
                      </div>
                      {vendor.address && (
                        <div className="flex items-center">
                          <MapPin className="h-3 w-3 mr-1 text-muted-foreground" />
                          <span className="text-sm">{vendor.address}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{vendor.paymentTerms || "N/A"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end">
                      <DollarSign className="h-3 w-3 mr-1 text-red-500" />
                      <span className={`text-sm ${Number(vendor.balanceDue) > 0 ? "text-red-500 font-medium" : ""}`}>
                        ${Number(vendor.balanceDue || 0).toFixed(2)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end">
                      <DollarSign className="h-3 w-3 mr-1 text-muted-foreground" />
                      <span className="text-sm">
                        ${Number(vendor.creditLimit || 0).toFixed(2)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{renderRating(vendor.rating)}</TableCell>
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
                        <DropdownMenuItem onClick={() => handleEdit(vendor)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(vendor.id)}
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
