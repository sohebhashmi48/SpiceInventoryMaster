import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Spice, Vendor, Inventory, insertInventorySchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Barcode } from '@/components/common/barcode-scanner';

// Extend the insertInventorySchema with additional validation
const formSchema = insertInventorySchema.extend({
  productId: z.coerce.number().min(1, "Please select a product"),
  supplierId: z.coerce.number().min(1, "Please select a supplier"),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
  unitPrice: z.coerce.number().min(0.01, "Unit price must be greater than 0"),
  // Transform the string date from the input to a Date object
  expiryDate: z.string()
    .refine(val => !isNaN(Date.parse(val)), {
      message: "Please enter a valid date"
    })
    .transform(val => new Date(val)),
});

type InventoryFormValues = z.infer<typeof formSchema>;

interface AddInventoryFormProps {
  onSuccess: () => void;
  existingItem?: Inventory | null;
}

export default function AddInventoryForm({ onSuccess, existingItem }: AddInventoryFormProps) {
  const { toast } = useToast();
  const [scanningBarcode, setScanningBarcode] = useState(false);

  const { data: spices, isLoading: spicesLoading } = useQuery<Spice[]>({
    queryKey: ["/api/products"],
  });

  const { data: vendors, isLoading: vendorsLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const createInventoryMutation = useMutation({
    mutationFn: async (data: InventoryFormValues) => {
      // Calculate total value from quantity and unit price
      const totalValue = (Number(data.quantity) * Number(data.unitPrice)).toString();

      // Format the date as YYYY-MM-DD for the API
      const formattedData = {
        ...data,
        totalValue,
        // Convert Date objects to ISO strings for the API
        expiryDate: data.expiryDate instanceof Date ? data.expiryDate.toISOString() : data.expiryDate,
        purchaseDate: data.purchaseDate instanceof Date ? data.purchaseDate.toISOString() : data.purchaseDate
      };

      console.log("Submitting data:", formattedData);

      if (existingItem) {
        await apiRequest("PATCH", `/api/inventory/${existingItem.id}`, formattedData);
        return existingItem.id;
      } else {
        const res = await apiRequest("POST", "/api/inventory", formattedData);
        const newItem = await res.json();
        return newItem.id;
      }
    },
    onSuccess: () => {
      toast({
        title: `Inventory ${existingItem ? "updated" : "created"} successfully`,
        description: `The inventory item has been ${existingItem ? "updated" : "added"} to your records.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: `Failed to ${existingItem ? "update" : "create"} inventory`,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Initialize the form with default values or existing item data
  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: existingItem ? {
      productId: existingItem.productId,
      supplierId: existingItem.supplierId,
      batchNumber: existingItem.batchNumber,
      quantity: Number(existingItem.quantity),
      unitPrice: Number(existingItem.unitPrice),
      totalValue: existingItem.totalValue,
      // Keep the date as a Date object for the form
      expiryDate: new Date(existingItem.expiryDate),
      barcode: existingItem.barcode || "",
      notes: existingItem.notes || "",
      status: existingItem.status,
      purchaseDate: existingItem.purchaseDate ? new Date(existingItem.purchaseDate) : undefined
    } : {
      productId: 0,
      supplierId: 0,
      batchNumber: "",
      quantity: 0,
      unitPrice: 0,
      totalValue: "0",
      // Create a Date object for 30 days from now
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      barcode: "",
      notes: "",
      status: "active",
      purchaseDate: new Date()
    },
  });

  // Handle barcode scanning
  const handleBarcodeScanned = (barcode: string) => {
    form.setValue("barcode", barcode);
    setScanningBarcode(false);
    toast({
      title: "Barcode scanned",
      description: `Barcode ${barcode} has been captured`,
    });
  };

  // Update total value when quantity or unit price changes
  useEffect(() => {
    const quantity = form.watch("quantity");
    const unitPrice = form.watch("unitPrice");

    if (quantity && unitPrice) {
      const totalValue = (Number(quantity) * Number(unitPrice)).toFixed(2);
      form.setValue("totalValue", totalValue);
    }
  }, [form.watch("quantity"), form.watch("unitPrice")]);

  const onSubmit = (data: InventoryFormValues) => {
    createInventoryMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="productId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product</FormLabel>
                <Select
                  disabled={spicesLoading}
                  onValueChange={field.onChange}
                  value={field.value.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {spices?.map((spice) => (
                      <SelectItem key={spice.id} value={spice.id.toString()}>
                        {spice.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="supplierId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Supplier</FormLabel>
                <Select
                  disabled={vendorsLoading}
                  onValueChange={field.onChange}
                  value={field.value.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {vendors?.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id.toString()}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="batchNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Batch Number</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. B12345" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="expiryDate"
            render={({ field: { onChange, value, ...rest } }) => (
              <FormItem>
                <FormLabel>Expiry Date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={value instanceof Date ? value.toISOString().split('T')[0] : value}
                    onChange={(e) => {
                      // Ensure date is in YYYY-MM-DD format without timezone info
                      const dateValue = e.target.value;
                      onChange(dateValue);
                    }}
                    {...rest}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => {
              // Get the selected product to show its unit
              const productId = form.watch("productId");
              const selectedProduct = spices?.find(s => s.id === productId);
              const unit = selectedProduct?.unit || "kg";

              return (
                <FormItem>
                  <FormLabel>Quantity ({unit})</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <FormField
            control={form.control}
            name="unitPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit Price ($)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="totalValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Value ($)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" readOnly {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="barcode"
          render={({ field: { value, onChange, ...rest } }) => (
            <FormItem>
              <FormLabel>Barcode</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input
                    placeholder="Enter or scan barcode"
                    value={value || ""}
                    onChange={onChange}
                    {...rest}
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setScanningBarcode(!scanningBarcode)}
                >
                  {scanningBarcode ? "Cancel" : "Scan"}
                </Button>
              </div>
              {scanningBarcode && (
                <div className="mt-2">
                  <Barcode onScan={handleBarcodeScanned} />
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field: { value, onChange, ...rest } }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Input
                  placeholder="Optional notes about this item"
                  value={value || ""}
                  onChange={onChange}
                  {...rest}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator />

        <div className="flex justify-end space-x-2">
          <Button variant="outline" type="button" onClick={onSuccess}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createInventoryMutation.isPending}
            className="bg-secondary hover:bg-secondary-dark text-white"
          >
            {createInventoryMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {existingItem ? "Update" : "Save"} Item
          </Button>
        </div>
      </form>
    </Form>
  );
}
