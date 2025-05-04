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
  spiceId: z.coerce.number().min(1, "Please select a spice"),
  vendorId: z.coerce.number().min(1, "Please select a vendor"),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
  unitPrice: z.coerce.number().min(0.01, "Unit price must be greater than 0"),
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
    queryKey: ["/api/spices"],
  });
  
  const { data: vendors, isLoading: vendorsLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });
  
  const createInventoryMutation = useMutation({
    mutationFn: async (data: InventoryFormValues) => {
      // Calculate total value from quantity and unit price
      const totalValue = (Number(data.quantity) * Number(data.unitPrice)).toString();
      const payload = { ...data, totalValue };
      
      if (existingItem) {
        await apiRequest("PATCH", `/api/inventory/${existingItem.id}`, payload);
        return existingItem.id;
      } else {
        const res = await apiRequest("POST", "/api/inventory", payload);
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
      ...existingItem,
      expiryDate: new Date(existingItem.expiryDate).toISOString().split('T')[0], // Format date for input
    } : {
      spiceId: 0,
      vendorId: 0,
      batchNumber: "",
      quantity: 0,
      unitPrice: 0,
      totalValue: "0",
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      barcode: "",
      notes: "",
      status: "active",
      purchaseDate: new Date().toISOString()
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
            name="spiceId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Spice</FormLabel>
                <Select 
                  disabled={spicesLoading}
                  onValueChange={field.onChange} 
                  value={field.value.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select spice" />
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
            name="vendorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vendor</FormLabel>
                <Select 
                  disabled={vendorsLoading}
                  onValueChange={field.onChange} 
                  value={field.value.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor" />
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
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expiry Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
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
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity (kg)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
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
          render={({ field }) => (
            <FormItem>
              <FormLabel>Barcode</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input placeholder="Enter or scan barcode" {...field} />
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
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Input placeholder="Optional notes about this item" {...field} />
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
