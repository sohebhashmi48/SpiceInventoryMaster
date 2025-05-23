import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Spice, Category } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  MoreHorizontal,
  Search,
  Edit,
  Trash2,
  Eye,
  Check,
  X,
  ArrowUpDown
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import AddSpiceForm from "./add-spice-form";
import { Skeleton } from "@/components/ui/skeleton";

export default function SpicesTable() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedSpice, setSelectedSpice] = useState<Spice | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof Spice>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [averagePrices, setAveragePrices] = useState<Record<string, number | null>>({});

  const { data: spices, isLoading: spicesLoading, refetch } = useQuery<Spice[]>({
    queryKey: ["/api/products"],
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  // Function to fetch average price for a product
  const fetchAveragePrice = async (productName: string) => {
    try {
      const response = await fetch(`/api/products/${encodeURIComponent(productName)}/average-price`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        return data.averagePrice;
      }
      return null;
    } catch (error) {
      console.error(`Error fetching average price for ${productName}:`, error);
      return null;
    }
  };

  // Fetch average prices for all products when the spices data changes
  useEffect(() => {
    const loadAveragePrices = async () => {
      if (!spices) return;

      const priceData: Record<string, number | null> = {};

      for (const spice of spices) {
        priceData[spice.name] = await fetchAveragePrice(spice.name);
      }

      setAveragePrices(priceData);
    };

    loadAveragePrices();
  }, [spices]);

  // Filter spices based on search term
  const filteredSpices = spices?.filter(spice =>
    spice.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    spice.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    spice.origin?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort spices based on sort field and direction
  const sortedSpices = [...(filteredSpices || [])].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }

    if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
      return sortDirection === 'asc'
        ? (aValue === bValue ? 0 : aValue ? -1 : 1)
        : (aValue === bValue ? 0 : aValue ? 1 : -1);
    }

    return 0;
  });

  // Get category name by id
  const getCategoryName = (categoryId: number) => {
    if (!categories) {
      console.warn("Categories data not loaded yet");
      return "Loading...";
    }
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) {
      console.warn(`Category not found for categoryId: ${categoryId}`);
      return "Category Not Found";
    }
    return category.name;
  };

  // Toggle sort direction when clicking on a column header
  const toggleSort = (field: keyof Spice) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get avatar text (first letters of name)
  const getAvatarText = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (spicesLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-[250px]" />
          <Skeleton className="h-10 w-[100px]" />
        </div>
        <div className="rounded-md border">
          <div className="h-12 px-4 border-b flex items-center bg-slate-50">
            <Skeleton className="h-5 w-full" />
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 flex justify-between items-center border-b">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-3 w-[150px]" />
                </div>
              </div>
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative max-w-md">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 max-w-md"
          />
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-secondary hover:bg-secondary-dark text-white">
              Add New Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>
                Add a new product to your inventory catalog.
              </DialogDescription>
            </DialogHeader>
            <AddSpiceForm onSuccess={() => setIsAddDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">
                <div
                  className="flex items-center cursor-pointer"
                  onClick={() => toggleSort('name')}
                >
                  Product Name
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Origin</TableHead>
              <TableHead>
                <div className="flex items-center">
                  Avg. Price (Inventory)
                  <span className="text-xs text-muted-foreground ml-1">(calculated)</span>
                </div>
              </TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>
                <div
                  className="flex items-center cursor-pointer"
                  onClick={() => toggleSort('isActive')}
                >
                  Status
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedSpices && sortedSpices.length > 0 ? (
              sortedSpices.map((spice) => (
                <TableRow key={spice.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-9 w-9 text-foreground border">
                        {spice.imagePath ? (
                          <img
                            src={`/api${spice.imagePath}`}
                            alt={spice.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <AvatarFallback className="bg-secondary/10 text-secondary">
                            {getAvatarText(spice.name)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <div className="font-medium">{spice.name}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                          {spice.description || "No description"}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getCategoryName(spice.categoryId)}</TableCell>
                  <TableCell>{spice.origin || "Unknown"}</TableCell>
                  <TableCell>
                    {averagePrices[spice.name] !== undefined ? (
                      averagePrices[spice.name] !== null ? (
                        <span className="text-green-600 font-medium">₹{averagePrices[spice.name]?.toFixed(2)}/{spice.unit}</span>
                      ) : (
                        <span className="text-muted-foreground italic">No inventory data</span>
                      )
                    ) : (
                      <span className="text-muted-foreground">Loading...</span>
                    )}
                  </TableCell>
                  <TableCell>{spice.unit}</TableCell>
                  <TableCell>
                    {spice.isActive ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <Check className="mr-1 h-3 w-3" /> Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        <X className="mr-1 h-3 w-3" /> Inactive
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
                        <DropdownMenuItem onClick={() => {
                          setSelectedSpice(spice);
                          setIsViewDialogOpen(true);
                        }}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setSelectedSpice(spice);
                          setIsAddDialogOpen(true);
                        }}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={async () => {
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
                        }}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                  {searchTerm ? "No products found matching your search" : "No products found. Add your first product."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) setSelectedSpice(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedSpice ? "Edit Product" : "Add New Product"}</DialogTitle>
            <DialogDescription>
              {selectedSpice ? "Edit the product details below." : "Add a new product to your inventory catalog."}
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
                <p><strong>Category:</strong> {categories?.find(c => c.id === selectedSpice.categoryId)?.name || "Unknown"}</p>
                <p><strong>Origin:</strong> {selectedSpice.origin || "Unknown"}</p>
                <p><strong>Description:</strong> {selectedSpice.description || "No description"}</p>
                <p>
                  <strong>Price (from Inventory):</strong> {
                    averagePrices[selectedSpice.name] !== undefined ? (
                      averagePrices[selectedSpice.name] !== null ? (
                        <span className="text-green-600 font-medium">₹{averagePrices[selectedSpice.name]?.toFixed(2)} / {selectedSpice.unit}</span>
                      ) : (
                        <span className="text-muted-foreground italic">No inventory data</span>
                      )
                    ) : (
                      <span className="text-muted-foreground">Loading...</span>
                    )
                  }
                </p>
                <p><strong>Stock Quantity:</strong> {selectedSpice.stocksQty}</p>
                <p><strong>Status:</strong> {selectedSpice.isActive ? "Active" : "Inactive"}</p>
              </div>
            </div>
          ) : (
            <p>No spice selected.</p>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}