import { useState, useRef, useEffect, useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Category, insertSpiceSchema, Spice } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, Image as ImageIcon } from "lucide-react";

// Add more validation to the insert schema but remove price and stocksQty
const spiceFormSchema = insertSpiceSchema.extend({
  categoryId: z.coerce.number().min(1, "Please select a category"),
  unit: z.string().min(1, "Please select a unit"),
  description: z.string().optional(),
  origin: z.string().optional(),
  isActive: z.boolean().default(true),
  // We'll handle the image separately since it's a file
  image: z.any().optional(),
});

type SpiceFormValues = z.infer<typeof spiceFormSchema>;

interface AddSpiceFormProps {
  onSuccess: () => void;
  existingSpice?: Spice;
}

export default function AddSpiceForm({ onSuccess, existingSpice }: AddSpiceFormProps) {
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState<string | null>(existingSpice?.imagePath || null);
  const [averagePrice, setAveragePrice] = useState<number | null>(null);
  const [marketPrice, setMarketPrice] = useState<number>(existingSpice?.marketPrice || 0);
  const [retailPrice, setRetailPrice] = useState<number>(existingSpice?.retailPrice || 0);
  const [catererPrice, setCatererPrice] = useState<number>(existingSpice?.catererPrice || 0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const isEditMode = !!existingSpice;

const createSpiceMutation = useMutation({
    mutationFn: async (data: SpiceFormValues) => {
      // Create a FormData object to handle file upload
      const formData = new FormData();

      // Add all form fields to the FormData
      formData.append('name', data.name);
      formData.append('categoryId', String(data.categoryId));
      formData.append('unit', data.unit);

      // Use average price from inventory if available
      if (averagePrice !== null) {
        formData.append('price', String(averagePrice));
      } else {
        // Default to 0 if no average price is available
        formData.append('price', '0');
      }

      // Add the new price fields
      formData.append('marketPrice', String(marketPrice));
      formData.append('retailPrice', String(retailPrice));
      formData.append('catererPrice', String(catererPrice));

      // Default stocksQty to 0 - will be updated by inventory
      formData.append('stocksQty', '0');
      formData.append('isActive', String(data.isActive));

      if (data.description) formData.append('description', data.description);
      if (data.origin) formData.append('origin', data.origin);

      // Add the image file if it exists
      if (data.image && data.image[0]) {
        formData.append('image', data.image[0]);
      }

      if (isEditMode) {
        const res = await fetch(`/api/products/${existingSpice?.id}`, {
          method: 'PATCH',
          body: formData,
          credentials: 'include'
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || "Failed to update product");
        }
        return await res.json();
      } else {
        const res = await fetch('/api/products', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || "Failed to create product");
        }
        return await res.json();
      }
    },
    onSuccess: () => {
      toast({
        title: isEditMode ? "Product updated successfully" : "Product created successfully",
        description: isEditMode ? "The product has been updated in your catalog." : "The new product has been added to your catalog.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: isEditMode ? "Failed to update product" : "Failed to create product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle image preview
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Function to fetch average price from inventory (memoized to prevent infinite loops)
  const fetchAveragePrice = useCallback(async (productName: string) => {
    if (!productName.trim()) return;

    try {
      const response = await fetch(`/api/products/${encodeURIComponent(productName)}/average-price`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setAveragePrice(data.averagePrice);
        console.log(`Average price for ${productName}: ${data.averagePrice}`);
      } else {
        // If no price data is available, reset the average price
        setAveragePrice(null);
        console.log(`No price data available for ${productName}`);
      }
    } catch (error) {
      console.error("Error fetching average price:", error);
      setAveragePrice(null);
    }
  }, []);

  // Initialize the form with default values or existing spice values
  const form = useForm<SpiceFormValues>({
    resolver: zodResolver(spiceFormSchema),
    defaultValues: {
      name: existingSpice?.name || "",
      description: existingSpice?.description || "",
      categoryId: existingSpice?.categoryId ?? undefined,
      unit: existingSpice?.unit || "kg",
      origin: existingSpice?.origin || "",
      isActive: existingSpice?.isActive ?? true,
      image: undefined,
    },
  });

  // Get the current product name
  const productName = form.watch("name");

  // Add effect to fetch average price when product name changes
  useEffect(() => {
    if (productName && productName.trim().length > 2) {
      fetchAveragePrice(productName);
    } else {
      setAveragePrice(null);
    }
  }, [productName, fetchAveragePrice]);

  const onSubmit = (data: SpiceFormValues) => {
    createSpiceMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 relative pb-16">
        {/* Product Name and Category in first row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Product Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter product name"
                    {...field}
                    className="h-10 px-3 py-2 rounded-md border"
                  />
                </FormControl>
                <FormMessage className="text-xs text-red-500" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Category</FormLabel>
                <Select
                  disabled={categoriesLoading}
                  onValueChange={(value) => field.onChange(parseInt(value))}
                  value={field.value?.toString() ?? ""}
                >
                  <FormControl>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories?.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-xs text-red-500" />
              </FormItem>
            )}
          />
        </div>

        {/* Description field */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter product description"
                  className="min-h-[100px] resize-none px-3 py-2 rounded-md border"
                  value={field.value || ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  ref={field.ref}
                />
              </FormControl>
              <FormMessage className="text-xs text-red-500" />
            </FormItem>
          )}
        />

        {/* Unit and Origin in one row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Unit</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || "kg"}>
                  <FormControl>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="kg">Kilogram (kg)</SelectItem>
                    <SelectItem value="g">Gram (g)</SelectItem>
                    <SelectItem value="lb">Pound (lb)</SelectItem>
                    <SelectItem value="oz">Ounce (oz)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage className="text-xs text-red-500" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="origin"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Origin/Country</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter country of origin"
                    value={field.value || ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    ref={field.ref}
                    className="h-10 px-3 py-2 rounded-md border"
                  />
                </FormControl>
                <FormMessage className="text-xs text-red-500" />
              </FormItem>
            )}
          />
        </div>

        {/* Average Price Display */}
        <div className="bg-gray-50 p-4 rounded-md border">
          <div className="text-sm font-medium mb-2">Average Price from Inventory</div>
          <div className="h-10 px-3 py-2 rounded-md border bg-white flex items-center">
            {averagePrice !== null ? (
              <span className="text-green-600 font-medium">₹{averagePrice.toFixed(2)}</span>
            ) : (
              <span className="text-muted-foreground italic">No price data available</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            This price is automatically calculated from your inventory
          </div>
        </div>

        {/* Price Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Market Price */}
          <div className="flex flex-col space-y-2">
            <div className="text-sm font-medium">Market Price</div>
            <div className="flex items-center border rounded-md overflow-hidden">
              <span className="px-3 py-2 bg-gray-100 text-gray-700">₹</span>
              <Input
                type="text"
                inputMode="decimal"
                value={marketPrice || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/^0+(?=\d)/, ''); // Remove leading zeros
                  const numValue = value === '' ? 0 : parseFloat(value);
                  if (!isNaN(numValue) || value === '') {
                    setMarketPrice(numValue);
                  }
                }}
                className="border-0 h-10"
              />
              <span className="px-3 py-2 bg-gray-100 text-gray-700">/{form.watch("unit") || "kg"}</span>
            </div>
            <div className="text-xs text-blue-600">
              Standard selling price
            </div>
          </div>

          {/* Retail Price */}
          <div className="flex flex-col space-y-2">
            <div className="text-sm font-medium">Retail Price</div>
            <div className="flex items-center border rounded-md overflow-hidden">
              <span className="px-3 py-2 bg-gray-100 text-gray-700">₹</span>
              <Input
                type="text"
                inputMode="decimal"
                value={retailPrice || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/^0+(?=\d)/, ''); // Remove leading zeros
                  const numValue = value === '' ? 0 : parseFloat(value);
                  if (!isNaN(numValue) || value === '') {
                    setRetailPrice(numValue);
                  }
                }}
                className="border-0 h-10"
              />
              <span className="px-3 py-2 bg-gray-100 text-gray-700">/{form.watch("unit") || "kg"}</span>
            </div>
            <div className="text-xs text-orange-600">
              Price for retail customers
            </div>
          </div>

          {/* Caterer Price */}
          <div className="flex flex-col space-y-2">
            <div className="text-sm font-medium">Caterer Price</div>
            <div className="flex items-center border rounded-md overflow-hidden">
              <span className="px-3 py-2 bg-gray-100 text-gray-700">₹</span>
              <Input
                type="text"
                inputMode="decimal"
                value={catererPrice || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/^0+(?=\d)/, ''); // Remove leading zeros
                  const numValue = value === '' ? 0 : parseFloat(value);
                  if (!isNaN(numValue) || value === '') {
                    setCatererPrice(numValue);
                  }
                }}
                className="border-0 h-10"
              />
              <span className="px-3 py-2 bg-gray-100 text-gray-700">/{form.watch("unit") || "kg"}</span>
            </div>
            <div className="text-xs text-purple-600">
              Special price for caterers
            </div>
          </div>
        </div>

        {/* Active Status */}
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-white">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Active Status</FormLabel>
                <FormDescription className="text-xs text-gray-500">
                  Enable this to make the product visible in your catalog
                </FormDescription>
                <FormMessage />
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Product Image */}
        <FormField
          control={form.control}
          name="image"
          render={({ field: { onChange } }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Product Image</FormLabel>
              <FormControl>
                <div className="border rounded-md p-4 bg-white">
                  <div className="flex flex-wrap items-start gap-4">
                    {imagePreview ? (
                      <div className="w-40 h-40 relative rounded-md overflow-hidden border flex-shrink-0 bg-white">
                        <img
                          src={imagePreview.startsWith('data:') ? imagePreview : `/api${imagePreview}`}
                          alt="Product preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-40 h-40 flex items-center justify-center rounded-md border flex-shrink-0 bg-gray-50">
                        <ImageIcon className="h-10 w-10 text-gray-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex flex-col gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          ref={fileInputRef}
                          onChange={(e) => {
                            handleImageChange(e);
                            onChange(e.target.files);
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          {imagePreview ? "Change Image" : "Upload Image"}
                        </Button>
                        {imagePreview && (
                          <Button
                            type="button"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => {
                              setImagePreview(null);
                              onChange(null);
                            }}
                          >
                            Remove Image
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </FormControl>
              <FormDescription className="text-xs text-gray-500 mt-2">
                Upload an image of the product. Recommended size: 500x500 pixels.
              </FormDescription>
              <FormMessage className="text-xs text-red-500" />
            </FormItem>
          )}
        />

        {/* Form Buttons */}
        <div className="flex justify-end space-x-2 sticky bottom-0 left-0 right-0 bg-white py-4 border-t mt-8 z-10">
          <Button
            variant="outline"
            type="button"
            onClick={onSuccess}
            className="px-4 py-2 h-10"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createSpiceMutation.isPending}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 h-10"
          >
            {createSpiceMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isEditMode ? "Update Product" : "Add Product"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
