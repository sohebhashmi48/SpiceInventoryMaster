import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { purchaseWithItemsSchema, purchaseWithItemsFormSchema } from "@shared/schema";
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
import { Plus, Trash2, Save, Printer, RotateCcw, ShoppingCart, Scale, Upload, Image } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Create a form schema based on the purchaseWithItemsFormSchema for lenient validation during data entry
const formSchema = purchaseWithItemsFormSchema.extend({
  // Transform the string date from the input to a Date object
  purchaseDate: z.string()
    .refine(val => !isNaN(Date.parse(val)), {
      message: "Please enter a valid date"
    })
    .transform(val => new Date(val)),
});

type PurchaseFormValues = z.infer<typeof formSchema>;

// Define the available units for measurement
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
  { value: "bag", label: "Bag" },
];

// Define the type for a temporary item
interface TempItem {
  itemName: string;
  quantity: string;
  unit: string;
  rate: string;
  gstPercentage: string;
  gstAmount: string;
  amount: string;
}

export default function PurchaseEntryForm() {
  const { toast } = useToast();
  const [isCalculating, setIsCalculating] = useState(false);
  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [tempItem, setTempItem] = useState<TempItem>({
    itemName: "",
    quantity: "1",
    unit: "kg", // Default unit is kg
    rate: "0",
    gstPercentage: "18",
    gstAmount: "0",
    amount: "0",
  });

  // Generate a unique bill number
  const generateBillNumber = () => {
    return `BILL-${Date.now().toString().slice(-6)}`;
  };

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
      items: [],
    },
  });

  // Use field array for dynamic item inputs
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Calculate totals when items change
  useEffect(() => {
    if (isCalculating) return;

    setIsCalculating(true);

    try {
      const values = form.getValues();

      // Calculate GST amount and total for each item
      values.items.forEach((item, index) => {
        const quantity = parseFloat(item.quantity.toString()) || 0;
        const rate = parseFloat(item.rate.toString()) || 0;
        const gstPercentage = parseFloat(item.gstPercentage.toString()) || 0;

        const itemTotal = quantity * rate;
        const gstAmount = (itemTotal * gstPercentage) / 100;

        form.setValue(`items.${index}.gstAmount`, gstAmount.toFixed(2));
        form.setValue(`items.${index}.amount`, (itemTotal + gstAmount).toFixed(2));
      });

      // Calculate invoice totals
      const totalAmount = values.items.reduce((sum, item) => {
        const quantity = parseFloat(item.quantity.toString()) || 0;
        const rate = parseFloat(item.rate.toString()) || 0;
        return sum + (quantity * rate);
      }, 0);

      const totalGstAmount = values.items.reduce((sum, item) => {
        return sum + (parseFloat(item.gstAmount.toString()) || 0);
      }, 0);

      const grandTotal = totalAmount + totalGstAmount;

      form.setValue("totalAmount", totalAmount.toFixed(2));
      form.setValue("totalGstAmount", totalGstAmount.toFixed(2));
      form.setValue("grandTotal", grandTotal.toFixed(2));
    } finally {
      setIsCalculating(false);
    }
  }, [form.watch("items")]);

  // Calculate temporary item values in real-time
  useEffect(() => {
    const quantity = parseFloat(tempItem.quantity) || 0;
    const rate = parseFloat(tempItem.rate) || 0;
    const gstPercentage = parseFloat(tempItem.gstPercentage) || 0;

    const itemTotal = quantity * rate;
    const gstAmount = (itemTotal * gstPercentage) / 100;

    setTempItem(prev => ({
      ...prev,
      gstAmount: gstAmount.toFixed(2),
      amount: (itemTotal + gstAmount).toFixed(2)
    }));
  }, [tempItem.quantity, tempItem.rate, tempItem.gstPercentage]);

  // Add new item row from the temporary item
  const addItem = () => {
    // Only add if item name is not empty
    if (tempItem.itemName.trim() === "") {
      toast({
        title: "Item name required",
        description: "Please enter an item name before adding",
        variant: "destructive",
      });
      return;
    }

    // Add the current temp item to the form
    append({...tempItem});

    // Reset the temp item for the next entry
    setTempItem({
      itemName: "",
      quantity: "1",
      unit: "kg", // Keep the default unit
      rate: "0",
      gstPercentage: "18",
      gstAmount: "0",
      amount: "0",
    });
  };

  // Create purchase mutation
  const createPurchaseMutation = useMutation({
    mutationFn: async (data: PurchaseFormValues) => {
      const res = await apiRequest("POST", "/api/purchases", data);
      return await res.json();
    },
    onSuccess: (_, data) => {
      // Store the isPaid value before resetting the form
      const shouldRedirect = data.isPaid;

      toast({
        title: "Purchase created successfully",
        description: "The purchase has been saved to the system and inventory has been updated.",
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });

      // Reset the form
      resetForm();

      // Redirect to inventory page if payment was made
      if (shouldRedirect) {
        console.log("Redirecting to inventory page after successful purchase with payment");
        // Use a small timeout to ensure the toast is visible before redirecting
        setTimeout(() => {
          window.location.href = "/inventory";
        }, 1500);
      }
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

    // Upload receipt image if one is selected
    let receiptFilename = null;
    if (receiptImage) {
      receiptFilename = await uploadReceiptImage();
    }

    // Update the data with filtered items and receipt image
    const filteredData = {
      ...data,
      items: filteredItems,
      receiptImage: receiptFilename
    };

    // The form schema will automatically transform the date string to a Date object
    // which is what the server expects
    createPurchaseMutation.mutate(filteredData);
  };

  const resetForm = () => {
    form.reset({
      companyName: "",
      companyAddress: "",
      billNo: generateBillNumber(),
      pageNo: "1",
      purchaseDate: today,
      totalAmount: "0",
      totalGstAmount: "0",
      grandTotal: "0",
      status: "active",
      items: [],
    });

    // Reset receipt image
    removeReceiptImage();
  };

  const printBill = () => {
    window.print();
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

  // Remove receipt image
  const removeReceiptImage = () => {
    setReceiptImage(null);
    setReceiptPreview(null);
    if (receiptPreview) {
      URL.revokeObjectURL(receiptPreview);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6">
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl text-blue-800 dark:text-blue-300 flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2" />
              Purchase Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-blue-700 dark:text-blue-300">Company Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Company Name"
                          {...field}
                          className="border-blue-200 focus:border-blue-400 dark:border-blue-900"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div>
                <FormField
                  control={form.control}
                  name="companyAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-blue-700 dark:text-blue-300">Company Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Company Address"
                          {...field}
                          className="border-blue-200 focus:border-blue-400 dark:border-blue-900"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div>
                <FormField
                  control={form.control}
                  name="billNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-blue-700 dark:text-blue-300">Bill No</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Bill Number"
                          {...field}
                          className="border-blue-200 focus:border-blue-400 dark:border-blue-900"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div>
                <FormField
                  control={form.control}
                  name="pageNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-blue-700 dark:text-blue-300">Page No</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Page Number"
                          {...field}
                          className="border-blue-200 focus:border-blue-400 dark:border-blue-900"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div>
                <FormField
                  control={form.control}
                  name="purchaseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-blue-700 dark:text-blue-300">Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          className="border-blue-200 focus:border-blue-400 dark:border-blue-900"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Item Entry Card */}
        <Card className="shadow-md border-t-4 border-t-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl text-blue-800 dark:text-blue-300">
              Item Entry
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {/* Temporary Item Form */}
            <div className="bg-blue-50 dark:bg-gray-800 p-4 rounded-lg mb-6 border border-blue-200 dark:border-blue-900">
              <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                    Item Name
                  </label>
                  <Input
                    placeholder="Enter item name"
                    value={tempItem.itemName}
                    onChange={(e) => setTempItem({...tempItem, itemName: e.target.value})}
                    className="border-blue-200 focus:border-blue-400 dark:border-blue-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                    Quantity
                  </label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={tempItem.quantity}
                    onChange={(e) => setTempItem({...tempItem, quantity: e.target.value})}
                    className="border-blue-200 focus:border-blue-400 dark:border-blue-900"
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
                    Rate
                  </label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={tempItem.rate}
                    onChange={(e) => setTempItem({...tempItem, rate: e.target.value})}
                    className="border-blue-200 focus:border-blue-400 dark:border-blue-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                    GST %
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={tempItem.gstPercentage}
                    onChange={(e) => setTempItem({...tempItem, gstPercentage: e.target.value})}
                    className="border-blue-200 focus:border-blue-400 dark:border-blue-900"
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={addItem}
                    className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Item
                  </Button>
                </div>
              </div>

              <div className="mt-3 text-right text-sm text-blue-700 dark:text-blue-300">
                <span className="font-medium">Amount:</span> {parseFloat(tempItem.amount).toFixed(2)}
                <span className="ml-4 font-medium">GST:</span> {parseFloat(tempItem.gstAmount).toFixed(2)}
              </div>
            </div>

            {/* Added Items List - Read-only table */}
            {fields.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-blue-800 dark:text-blue-300 mb-3">Added Items</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-blue-50 dark:bg-gray-800 text-left">
                        <th className="p-3 text-blue-700 dark:text-blue-300 font-medium">Item Name</th>
                        <th className="p-3 text-blue-700 dark:text-blue-300 font-medium">Quantity</th>
                        <th className="p-3 text-blue-700 dark:text-blue-300 font-medium">Unit</th>
                        <th className="p-3 text-blue-700 dark:text-blue-300 font-medium">Rate</th>
                        <th className="p-3 text-blue-700 dark:text-blue-300 font-medium">GST %</th>
                        <th className="p-3 text-blue-700 dark:text-blue-300 font-medium text-right">Amount</th>
                        <th className="p-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields
                        .filter((field, index) => {
                          // Filter out items with empty names
                          const itemName = form.watch(`items.${index}.itemName`);
                          return itemName && itemName.trim() !== "";
                        })
                        .map((field, index) => {
                          // Get the values from the form
                          const itemName = form.watch(`items.${index}.itemName`);
                          const quantity = form.watch(`items.${index}.quantity`);
                          const unit = form.watch(`items.${index}.unit`);
                          const rate = form.watch(`items.${index}.rate`);
                          const gstPercentage = form.watch(`items.${index}.gstPercentage`);
                          const amount = form.watch(`items.${index}.amount`);

                          // Find the unit label
                          const unitLabel = MEASUREMENT_UNITS.find(u => u.value === unit)?.label || unit;

                          return (
                            <tr
                              key={field.id}
                              className="border-b border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            >
                              <td className="p-3 text-gray-700 dark:text-gray-300">{itemName}</td>
                              <td className="p-3 text-gray-700 dark:text-gray-300">{quantity}</td>
                              <td className="p-3 text-gray-700 dark:text-gray-300">{unitLabel}</td>
                              <td className="p-3 text-gray-700 dark:text-gray-300">₹ {parseFloat(rate).toFixed(2)}</td>
                              <td className="p-3 text-gray-700 dark:text-gray-300">{gstPercentage}%</td>
                              <td className="p-3 text-gray-700 dark:text-gray-300 text-right font-medium">₹ {parseFloat(amount).toFixed(2)}</td>
                              <td className="p-3 text-right">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  onClick={() => remove(index)}
                                  title="Remove item"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Receipt Upload Section */}
            <div className="mt-6 border-t pt-6">
              <h3 className="text-lg font-medium text-blue-700 dark:text-blue-300 mb-4 flex items-center">
                <Image className="h-5 w-5 mr-2" />
                Receipt Image
              </h3>

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
            </div>
          </CardContent>
        </Card>

        {/* Totals Card */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 shadow-md">
          <CardContent className="p-6">
            <div className="flex flex-col items-end space-y-2">
              <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                <div className="text-right font-medium text-blue-700 dark:text-blue-300">Total:</div>
                <div className="text-right text-blue-800 dark:text-blue-200">
                  ₹ {parseFloat(form.watch("totalAmount")).toFixed(2)}
                </div>

                <div className="text-right font-medium text-blue-700 dark:text-blue-300">GST Amount:</div>
                <div className="text-right text-blue-800 dark:text-blue-200">
                  ₹ {parseFloat(form.watch("totalGstAmount")).toFixed(2)}
                </div>

                <Separator className="col-span-2 my-1 bg-blue-200 dark:bg-blue-800" />

                <div className="text-right font-medium text-lg text-blue-800 dark:text-blue-200">Grand Total:</div>
                <div className="text-right font-bold text-lg text-blue-900 dark:text-blue-100">
                  ₹ {parseFloat(form.watch("grandTotal")).toFixed(2)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={resetForm}
            className="border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/20"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Form
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={printBill}
            className="border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/20"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Bill
          </Button>

          <Button
            type="submit"
            disabled={createPurchaseMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Purchase
          </Button>
        </div>
      </form>
    </Form>
  );
}
