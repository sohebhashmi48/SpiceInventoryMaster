import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Spice, Vendor, purchaseWithItemsSchema, purchaseWithItemsFormSchema } from "@shared/schema";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
import {
  Plus,
  Trash2,
  Save,
  ShoppingCart,
  Scale,
  Package,
  IndianRupee,
  Percent,
  Calculator,
  CheckCircle,
  Upload,
  Image
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Measurement units
const MEASUREMENT_UNITS = [
  { value: "kg", label: "Kilogram (kg)" },
  { value: "g", label: "Gram (g)" },
  { value: "lb", label: "Pound (lb)" },
  { value: "oz", label: "Ounce (oz)" },
  { value: "l", label: "Liter (l)" },
  { value: "ml", label: "Milliliter (ml)" },
  { value: "pcs", label: "Pieces (pcs)" },
  { value: "box", label: "Box" },
  { value: "pack", label: "Pack" },
];

// Create a form schema based on the purchaseWithItemsFormSchema for lenient validation during data entry
const formSchema = purchaseWithItemsFormSchema.extend({
  // Transform the string date from the input to a Date object
  purchaseDate: z.string()
    .refine(val => !isNaN(Date.parse(val)), {
      message: "Please enter a valid date"
    })
    .transform(val => new Date(val)),

  // Add vendorId field
  vendorId: z.number().min(1, "Please select a supplier"),

  // Add payment fields
  paymentAmount: z.string().optional(),
  paymentMethod: z.string().optional(),
  paymentDate: z.string()
    .optional()
    .refine(val => !val || !isNaN(Date.parse(val)), {
      message: "Please enter a valid date"
    })
    .transform(val => val ? new Date(val) : undefined),
  paymentNotes: z.string().optional(),
  isPaid: z.boolean().default(false),
});

type PurchaseFormValues = z.infer<typeof formSchema>;

// Generate a unique bill number
const generateBillNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `PO-${year}${month}${day}-${random}`;
};

interface SupplierPurchaseFormProps {
  supplierId?: number;
}

export default function SupplierPurchaseForm({ supplierId }: SupplierPurchaseFormProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isCalculating, setIsCalculating] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [purchaseData, setPurchaseData] = useState<PurchaseFormValues | null>(null);
  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [tempItem, setTempItem] = useState({
    itemName: "",
    quantity: "1", // Default to 1 for better user experience
    unit: "kg",
    rate: "",
    gstPercentage: "0",
    gstAmount: "0",
    amount: "0",
  });
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const paymentSectionRef = useRef<HTMLDivElement>(null);

  // Fetch supplier details if supplierId is provided
  const { data: supplier } = useQuery<Vendor>({
    queryKey: [`/api/vendors/${supplierId}`],
    enabled: !!supplierId,
  });

  // Fetch products (spices)
  const { data: products } = useQuery<Spice[]>({
    queryKey: ["/api/products"],
  });

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  // Initialize the form with default values
  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      companyAddress: "",
      billNo: generateBillNumber(),
      pageNo: "1",
      purchaseDate: today,
      totalAmount: "0",
      totalGstAmount: "0",
      grandTotal: "0",
      status: "active",
      vendorId: supplierId || 0,
      items: [],
      paymentAmount: "",
      paymentMethod: "",
      paymentDate: today,
      paymentNotes: "",
      isPaid: false,
    },
  });

  // Use field array for dynamic item inputs
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Update form with supplier details when supplier data is loaded
  useEffect(() => {
    if (supplier) {
      form.setValue("companyName", supplier.name);
      form.setValue("companyAddress", supplier.address || "");
      form.setValue("vendorId", supplier.id);
    }
  }, [supplier, form]);

  // Calculate totals when items change
  useEffect(() => {
    if (isCalculating) return;

    setIsCalculating(true);

    try {
      const items = form.getValues("items");

      if (!items || items.length === 0) {
        form.setValue("totalAmount", "0");
        form.setValue("totalGstAmount", "0");
        form.setValue("grandTotal", "0");
        return;
      }

      let totalAmount = 0;
      let totalGstAmount = 0;

      items.forEach(item => {
        if (item.amount) totalAmount += parseFloat(item.amount.toString());
        if (item.gstAmount) totalGstAmount += parseFloat(item.gstAmount.toString());
      });

      const grandTotal = totalAmount + totalGstAmount;

      form.setValue("totalAmount", totalAmount.toFixed(2));
      form.setValue("totalGstAmount", totalGstAmount.toFixed(2));
      form.setValue("grandTotal", grandTotal.toFixed(2));
    } finally {
      setIsCalculating(false);
    }
  }, [form.watch("items")]);

  // Watch for payment section expansion and prevent unwanted scrolling
  const isPaid = form.watch("isPaid");
  useEffect(() => {
    if (isPaid) {
      // Store current scroll position before any DOM changes
      const currentScrollY = window.scrollY;
      const currentScrollX = window.scrollX;

      // Temporarily lock scroll position
      const lockScroll = () => {
        window.scrollTo(currentScrollX, currentScrollY);
      };

      // Add scroll lock
      window.addEventListener('scroll', lockScroll, { passive: false });

      // Remove scroll lock after a short delay to allow DOM to settle
      const timeout = setTimeout(() => {
        window.removeEventListener('scroll', lockScroll);
      }, 100);

      return () => {
        clearTimeout(timeout);
        window.removeEventListener('scroll', lockScroll);
      };
    }
  }, [isPaid]);

  // Calculate amount and GST for temp item
  const calculateTempItemValues = () => {
    if (isCalculating) return;

    setIsCalculating(true);

    try {
      const quantity = parseFloat(tempItem.quantity) || 0;
      const rate = parseFloat(tempItem.rate) || 0;
      const gstPercentage = parseFloat(tempItem.gstPercentage) || 0;

      const amount = quantity * rate;
      const gstAmount = (amount * gstPercentage) / 100;

      setTempItem(prev => ({
        ...prev,
        amount: amount.toFixed(2),
        gstAmount: gstAmount.toFixed(2),
      }));
    } finally {
      setIsCalculating(false);
    }
  };

  // Add temp item to the form
  const addTempItemToForm = () => {
    if (!tempItem.itemName || !tempItem.quantity || !tempItem.rate) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields for the item",
        variant: "destructive",
      });
      return;
    }

    append({
      itemName: tempItem.itemName,
      quantity: tempItem.quantity,
      unit: tempItem.unit,
      rate: tempItem.rate,
      gstPercentage: tempItem.gstPercentage,
      gstAmount: tempItem.gstAmount,
      amount: tempItem.amount,
    });

    // Reset temp item
    setTempItem({
      itemName: "",
      quantity: "1", // Default to 1 for better user experience
      unit: "kg",
      rate: "",
      gstPercentage: "0",
      gstAmount: "0",
      amount: "0",
    });

    // Reset selected product
    setSelectedProductId("");
  };

  // Handle product selection
  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);

    const selectedProduct = products?.find(p => p.id.toString() === productId);
    if (selectedProduct) {
      // Update temp item with product details
      setTempItem(prev => ({
        ...prev,
        itemName: selectedProduct.name,
        unit: selectedProduct.unit || "kg",
        rate: selectedProduct.price ? selectedProduct.price.toString() : "",
      }));

      // Calculate amount and GST after a short delay to ensure state is updated
      setTimeout(() => {
        calculateTempItemValues();
      }, 50);
    }
  };

  // Handle receipt image upload
  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPEG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    // Set the file and create a preview
    setReceiptImage(file);
    setReceiptPreview(URL.createObjectURL(file));
  };

  // Remove receipt image
  const removeReceiptImage = () => {
    setReceiptImage(null);
    setReceiptPreview(null);
    if (receiptPreview) {
      URL.revokeObjectURL(receiptPreview);
    }
  };

  // Upload receipt image to server
  const uploadReceiptImage = async (): Promise<string | null> => {
    if (!receiptImage) return null;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('receipt', receiptImage);

      const response = await fetch('/api/receipts/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const data = await response.json();
      return data.filename;
    } catch (error) {
      console.error('Receipt upload error:', error);
      toast({
        title: "Failed to upload receipt",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Create purchase mutation
  const createPurchaseMutation = useMutation({
    mutationFn: async (data: PurchaseFormValues) => {
      // First create the purchase
      const res = await apiRequest("POST", "/api/purchases", data);
      const purchaseResult = await res.json();

      // If payment is included, update the supplier's balance
      if (data.isPaid && data.paymentAmount && parseFloat(data.paymentAmount) > 0) {
        // Update the supplier's balance
        await apiRequest("POST", `/api/vendors/${data.vendorId}/payment`, {
          amount: data.paymentAmount,
          paymentDate: data.paymentDate || new Date(),
          paymentMethod: data.paymentMethod || "Cash",
          notes: data.paymentNotes || `Payment for purchase ${data.billNo}`,
          purchaseId: purchaseResult.id
        });
      } else {
        // If not paid, update the supplier's balance due
        await apiRequest("PATCH", `/api/vendors/${data.vendorId}`, {
          balanceDue: (parseFloat(supplier?.balanceDue?.toString() || "0") + parseFloat(data.grandTotal)).toString()
        });
      }

      return purchaseResult;
    },
    onSuccess: () => {
      toast({
        title: "Purchase created successfully",
        description: "The purchase has been saved and inventory has been updated.",
      });

      // Invalidate all relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      // Invalidate inventory history since new inventory was created
      queryClient.invalidateQueries({ queryKey: ["inventory-history"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-history-all"] });

      // Redirect to inventory page after a short delay to allow queries to invalidate
      setTimeout(() => {
        setLocation("/inventory");
      }, 500);
    },
    onError: (error) => {
      toast({
        title: "Failed to create purchase",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: PurchaseFormValues) => {
    // Filter out items with empty names before submitting
    const filteredItems = data.items.filter(item => item.itemName && item.itemName.trim() !== "");

    // If no valid items, show an error
    if (filteredItems.length === 0) {
      toast({
        title: "No items to purchase",
        description: "Please add at least one item before saving the purchase",
        variant: "destructive",
      });
      return;
    }

    // Validate that all items have valid rates and quantities
    for (const item of filteredItems) {
      const rate = typeof item.rate === 'string' ? parseFloat(item.rate) : item.rate;
      const quantity = typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity;

      if (!rate || rate <= 0) {
        toast({
          title: "Invalid rate",
          description: `Please enter a valid rate for ${item.itemName}`,
          variant: "destructive",
        });
        return;
      }

      if (!quantity || quantity <= 0) {
        toast({
          title: "Invalid quantity",
          description: `Please enter a valid quantity for ${item.itemName}`,
          variant: "destructive",
        });
        return;
      }
    }

    // Update the data with filtered items
    const filteredData = {
      ...data,
      items: filteredItems
    };

    // Store the data and open confirmation dialog
    setPurchaseData(filteredData);
    setConfirmDialogOpen(true);
  };

  // Function to handle confirmed submission
  const handleConfirmedSubmit = async () => {
    if (purchaseData) {
      setIsUploading(true);
      try {
        // Upload receipt image if one is selected
        let receiptFilename = null;
        if (receiptImage) {
          receiptFilename = await uploadReceiptImage();
        }

        // Add receipt image filename to purchase data
        const dataWithReceipt = {
          ...purchaseData,
          receiptImage: receiptFilename
        };

        // The form schema will automatically transform the date string to a Date object
        createPurchaseMutation.mutate(dataWithReceipt);
        setConfirmDialogOpen(false);
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Supplier Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier Name</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly={!!supplierId} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier Address</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly={!!supplierId} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Purchase Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="billNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bill No</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pageNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Page No</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2 text-blue-600" />
              Purchase Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md mb-6">
              <div className="grid grid-cols-1 md:grid-cols-7 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                    <div className="flex items-center">
                      <Package className="h-3.5 w-3.5 mr-1" />
                      Product
                    </div>
                  </label>
                  <Select
                    value={selectedProductId}
                    onValueChange={handleProductSelect}
                  >
                    <SelectTrigger className="border-blue-200 focus:border-blue-400 dark:border-blue-900">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.map((product) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                    <div className="flex items-center">
                      <Scale className="h-3.5 w-3.5 mr-1" />
                      Quantity
                    </div>
                  </label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="border-blue-200 focus:border-blue-400 dark:border-blue-900"
                    value={tempItem.quantity}
                    onChange={(e) => {
                      setTempItem(prev => ({...prev, quantity: e.target.value}));
                      setTimeout(() => calculateTempItemValues(), 50);
                    }}
                    onBlur={calculateTempItemValues}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                    <div className="flex items-center">
                      <Scale className="h-3.5 w-3.5 mr-1" />
                      Unit
                    </div>
                  </label>
                  <Select
                    value={tempItem.unit}
                    onValueChange={(value) => setTempItem({...tempItem, unit: value})}
                  >
                    <SelectTrigger className="border-blue-200 focus:border-blue-400 dark:border-blue-900">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {MEASUREMENT_UNITS.map((unit) => (
                        <SelectItem key={unit.value} value={unit.value}>
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                    <div className="flex items-center">
                      <IndianRupee className="h-3.5 w-3.5 mr-1" />
                      Rate
                    </div>
                  </label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="border-blue-200 focus:border-blue-400 dark:border-blue-900"
                    value={tempItem.rate}
                    onChange={(e) => {
                      setTempItem(prev => ({...prev, rate: e.target.value}));
                      setTimeout(() => calculateTempItemValues(), 50);
                    }}
                    onBlur={calculateTempItemValues}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                    <div className="flex items-center">
                      <Percent className="h-3.5 w-3.5 mr-1" />
                      GST %
                    </div>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className="border-blue-200 focus:border-blue-400 dark:border-blue-900"
                    value={tempItem.gstPercentage}
                    onChange={(e) => {
                      setTempItem(prev => ({...prev, gstPercentage: e.target.value}));
                      setTimeout(() => calculateTempItemValues(), 50);
                    }}
                    onBlur={calculateTempItemValues}
                  />
                </div>

                <div className="md:col-span-1 flex items-end">
                  <Button
                    type="button"
                    onClick={addTempItemToForm}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </div>

            {fields.length > 0 ? (
              <div className="border rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Product
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Rate
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        GST
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Amount
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                    {fields.map((field, index) => (
                      <tr key={field.id}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <Controller
                            control={form.control}
                            name={`items.${index}.itemName`}
                            render={({ field }) => (
                              <Input {...field} className="border-0 p-0 h-auto focus-visible:ring-0" />
                            )}
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <div className="flex items-center space-x-1">
                            <Controller
                              control={form.control}
                              name={`items.${index}.quantity`}
                              render={({ field }) => (
                                <Input {...field} type="number" className="border-0 p-0 h-auto w-16 focus-visible:ring-0" />
                              )}
                            />
                            <span className="text-gray-500">
                              {form.getValues(`items.${index}.unit`)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <Controller
                            control={form.control}
                            name={`items.${index}.rate`}
                            render={({ field }) => (
                              <Input {...field} type="number" className="border-0 p-0 h-auto w-20 focus-visible:ring-0" />
                            )}
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <div className="flex items-center space-x-1">
                            <Controller
                              control={form.control}
                              name={`items.${index}.gstPercentage`}
                              render={({ field }) => (
                                <Input {...field} type="number" className="border-0 p-0 h-auto w-12 focus-visible:ring-0" />
                              )}
                            />
                            <span className="text-gray-500">%</span>
                            <span className="text-gray-400 mx-1">=</span>
                            <Controller
                              control={form.control}
                              name={`items.${index}.gstAmount`}
                              render={({ field }) => (
                                <Input {...field} readOnly className="border-0 p-0 h-auto w-16 focus-visible:ring-0 bg-transparent" />
                              )}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <Controller
                            control={form.control}
                            name={`items.${index}.amount`}
                            render={({ field }) => (
                              <Input {...field} readOnly className="border-0 p-0 h-auto w-20 focus-visible:ring-0 bg-transparent" />
                            )}
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 border border-dashed rounded-md">
                No items added yet. Use the form above to add purchase items.
              </div>
            )}

            <div className="mt-6 flex flex-col items-end">
              <div className="w-full max-w-xs space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                  <span className="font-medium">
                    ₹{parseFloat(form.watch("totalAmount") || "0").toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">GST Total:</span>
                  <span className="font-medium">
                    ₹{parseFloat(form.watch("totalGstAmount") || "0").toFixed(2)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-base font-semibold">
                  <span>Grand Total:</span>
                  <span className="text-blue-600 dark:text-blue-400">
                    ₹{parseFloat(form.watch("grandTotal") || "0").toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Receipt Upload Card */}
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Image className="h-5 w-5 mr-2 text-blue-600" />
              Receipt Image
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="border-2 border-dashed border-blue-200 dark:border-blue-900 rounded-lg p-6 text-center">
                  {receiptPreview ? (
                    <div className="space-y-4">
                      <img
                        src={receiptPreview}
                        alt="Receipt preview"
                        className="max-h-48 mx-auto object-contain"
                      />
                      <div className="flex justify-center space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={removeReceiptImage}
                          className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="h-12 w-12 mx-auto text-blue-400" />
                      <div className="text-blue-700 dark:text-blue-300">
                        <p className="font-medium">Upload Receipt Image</p>
                        <p className="text-sm text-blue-500 dark:text-blue-400">
                          Drag and drop or click to browse
                        </p>
                      </div>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleReceiptUpload}
                        className="hidden"
                        id="receipt-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('receipt-upload')?.click()}
                        className="border-blue-200 text-blue-700 hover:bg-blue-50"
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        Select Image
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="bg-blue-50 dark:bg-gray-800 p-4 rounded-lg h-full">
                  <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2">Receipt Guidelines</h4>
                  <ul className="text-sm space-y-2 text-blue-600 dark:text-blue-400">
                    <li>• Upload a clear image of the receipt</li>
                    <li>• Make sure all details are visible</li>
                    <li>• Maximum file size: 5MB</li>
                    <li>• Supported formats: JPEG, PNG, GIF</li>
                    <li>• The receipt will be stored with the purchase record</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6" id="payment-section" ref={paymentSectionRef}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <IndianRupee className="h-5 w-5 mr-2 text-green-600" />
              Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <FormField
                  control={form.control}
                  name="isPaid"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4 mt-1"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Pay Now</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Check this if you want to record payment now
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {/* Fixed height container to prevent layout shifts */}
              <div
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  form.watch("isPaid") ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="paymentAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Amount</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Enter payment amount"
                              onChange={(e) => {
                                field.onChange(e);
                                // Auto-fill with grand total if empty and user starts typing
                                if (!field.value && e.target.value) {
                                  const grandTotal = form.getValues("grandTotal");
                                  form.setValue("paymentAmount", grandTotal);
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Method</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select payment method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Cash">Cash</SelectItem>
                              <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                              <SelectItem value="Check">Check</SelectItem>
                              <SelectItem value="Credit Card">Credit Card</SelectItem>
                              <SelectItem value="UPI">UPI</SelectItem>
                              <SelectItem value="Credit">Credit (Supplier Credit)</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="paymentDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="paymentNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Notes</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter any notes about this payment" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4 mt-6 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation("/suppliers")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Purchase & Update Inventory
          </Button>
        </div>
      </form>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-green-600">
              <CheckCircle className="h-5 w-5 mr-2" />
              Confirm Purchase
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to complete this purchase?
              This will add the items to your inventory and update your supplier records.

              {purchaseData && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="font-medium">Total Items:</div>
                    <div>{purchaseData.items.length}</div>

                    <div className="font-medium">Total Amount:</div>
                    <div>₹{parseFloat(purchaseData.totalAmount).toFixed(2)}</div>

                    <div className="font-medium">GST Amount:</div>
                    <div>₹{parseFloat(purchaseData.totalGstAmount).toFixed(2)}</div>

                    <div className="font-medium">Grand Total:</div>
                    <div className="font-bold">₹{parseFloat(purchaseData.grandTotal).toFixed(2)}</div>

                    {purchaseData.isPaid && (
                      <>
                        <div className="font-medium">Payment Method:</div>
                        <div>{purchaseData.paymentMethod}</div>
                      </>
                    )}

                    <div className="font-medium">Receipt Image:</div>
                    <div>{receiptImage ? "Yes (will be uploaded)" : "No"}</div>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmedSubmit}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Confirm & Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}
