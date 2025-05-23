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
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedSpice, setSelectedSpice] = useState<Spice | null>(null);

  const { data: spices, isLoading: spicesLoading, refetch } = useQuery<Spice[]>({
    queryKey: ["/api/products"],
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

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

    return matchesSearch && matchesCategory && matchesStatus;
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

  const getCategoryName = (categoryId: number) => {
    return categories?.find(c => c.id === categoryId)?.name || "Unknown";
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
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

          <Select value={sortField} onValueChange={setSortField}>
            <SelectTrigger className="w-[150px]">
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

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {sortedSpices.length} {sortedSpices.length === 1 ? "product" : "products"}
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
                <p><strong>Price:</strong> ${selectedSpice.price} / {selectedSpice.unit}</p>
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
