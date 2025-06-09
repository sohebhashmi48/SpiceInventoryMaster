import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Upload, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import AssetImageUpload from "./asset-image-upload";

// Asset form validation schema
const assetFormSchema = z.object({
  title: z.string().min(1, "Asset title is required"),
  description: z.string().optional(),
  purchaseDate: z.date({
    required_error: "Purchase date is required",
  }),
  expiryDate: z.date().optional(),
  warrantyExpiry: z.date().optional(),
  amount: z.number().min(0, "Amount must be positive"),
  currentValue: z.union([
    z.number().min(0, "Current value must be positive"),
    z.nan(),
    z.undefined()
  ]).optional().transform(val => {
    if (isNaN(val as number) || val === undefined) return undefined;
    return val as number;
  }),
  depreciationRate: z.union([
    z.number().min(0, "Depreciation rate must be between 0-100%").max(100, "Depreciation rate must be between 0-100%"),
    z.nan(),
    z.undefined()
  ]).optional().transform(val => {
    if (isNaN(val as number) || val === undefined) return undefined;
    return val as number;
  }),
  category: z.string().optional(),
  location: z.string().optional(),
  serialNumber: z.string().optional(),
});

type AssetFormValues = z.infer<typeof assetFormSchema>;

interface AddAssetFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

// Asset categories
const assetCategories = [
  "Technology",
  "Equipment", 
  "Furniture",
  "Vehicles",
  "Property",
  "Tools",
  "Electronics",
  "Office Supplies",
  "Machinery",
  "Other"
];

export default function AddAssetForm({ onSuccess, onCancel }: AddAssetFormProps) {
  const [selectedReceiptImage, setSelectedReceiptImage] = useState<File | null>(null);
  const [receiptImagePreview, setReceiptImagePreview] = useState<string | null>(null);
  const [assetImageUrl, setAssetImageUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      description: "",
      purchaseDate: new Date(),
      expiryDate: undefined,
      warrantyExpiry: undefined,
      amount: 0,
      currentValue: undefined,
      depreciationRate: undefined,
      category: "",
      location: "",
      serialNumber: "",
    },
  });

  const handleReceiptImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedReceiptImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setReceiptImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeReceiptImage = () => {
    setSelectedReceiptImage(null);
    setReceiptImagePreview(null);
  };

  const onSubmit = async (data: AssetFormValues) => {
    try {
      console.log("=== ASSET FORM SUBMISSION STARTED ===");
      console.log("Asset data:", data);
      console.log("Form errors:", form.formState.errors);
      console.log("Selected receipt image:", selectedReceiptImage);
      console.log("Asset image URL:", assetImageUrl);

      // Upload receipt image first if selected
      let receiptImageUrl = null;
      if (selectedReceiptImage) {
        console.log("Uploading receipt image...");
        const formData = new FormData();
        formData.append('receiptImage', selectedReceiptImage);

        const uploadResponse = await fetch('/api/assets/upload-receipt', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!uploadResponse.ok) {
          throw new Error(`Receipt image upload failed: ${uploadResponse.status}`);
        }

        const uploadData = await uploadResponse.json();
        receiptImageUrl = uploadData.url;
        console.log("Receipt image uploaded successfully:", receiptImageUrl);
      }

      // Asset image is already uploaded via the AssetImageUpload component

      // Convert amount from rupees to paisa (multiply by 100)
      const assetData = {
        ...data,
        amount: Math.round(data.amount * 100),
        currentValue: data.currentValue ? Math.round(data.currentValue * 100) : null,
        receiptImage: receiptImageUrl,
        assetImage: assetImageUrl,
      };

      console.log("Submitting asset data:", assetData);

      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assetData),
        credentials: 'include',
      });

      console.log("Asset creation response status:", response.status);
      console.log("Asset creation response headers:", response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Asset creation failed with response:", errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        throw new Error(errorData.message || `Failed to create asset: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log("Asset created successfully:", result);

      toast({
        title: "Asset created successfully",
        description: `${data.title} has been added to your assets.`,
      });

      onSuccess();
    } catch (error) {
      console.error("Error creating asset:", error);
      toast({
        title: "Failed to create asset",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Row 1: Asset Image Upload */}
      <AssetImageUpload
        currentImageUrl={assetImageUrl}
        onImageChange={setAssetImageUrl}
        label="Asset Image"
      />

      {/* Row 2: Title */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm font-medium">Asset Title</Label>
        <Input
          id="title"
          placeholder="Enter asset title"
          {...form.register("title")}
        />
        {form.formState.errors.title && (
          <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
        )}
      </div>

      {/* Row 2: Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium">Description (Optional)</Label>
        <Textarea
          id="description"
          placeholder="Enter asset description"
          className="min-h-[80px]"
          {...form.register("description")}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Row 3: Category and Location */}
        <div className="space-y-2">
          <Label htmlFor="category" className="text-sm font-medium">Category</Label>
          <Select onValueChange={(value) => form.setValue("category", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {assetCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location" className="text-sm font-medium">Location</Label>
          <Input
            id="location"
            placeholder="Enter asset location"
            {...form.register("location")}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Row 4: Purchase Date and Amount */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Purchase Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !form.watch("purchaseDate") && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {form.watch("purchaseDate") ? (
                  format(form.watch("purchaseDate"), "PPP")
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={form.watch("purchaseDate")}
                onSelect={(date) => date && form.setValue("purchaseDate", date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {form.formState.errors.purchaseDate && (
            <p className="text-sm text-red-500">{form.formState.errors.purchaseDate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount" className="text-sm font-medium">Purchase Amount (₹)</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            {...form.register("amount", { valueAsNumber: true })}
          />
          {form.formState.errors.amount && (
            <p className="text-sm text-red-500">{form.formState.errors.amount.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Row 5: Current Value and Depreciation Rate */}
        <div className="space-y-2">
          <Label htmlFor="currentValue" className="text-sm font-medium">Current Value (₹) - Optional</Label>
          <Input
            id="currentValue"
            type="number"
            step="0.01"
            min="0"
            placeholder="Leave empty if not applicable"
            {...form.register("currentValue", {
              setValueAs: (value) => {
                if (value === "" || value === null || value === undefined) return undefined;
                const num = parseFloat(value);
                return isNaN(num) ? undefined : num;
              }
            })}
          />
          {form.formState.errors.currentValue && (
            <p className="text-sm text-red-500">{form.formState.errors.currentValue.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="depreciationRate" className="text-sm font-medium">Depreciation Rate (% per year) - Optional</Label>
          <Input
            id="depreciationRate"
            type="number"
            step="0.1"
            min="0"
            max="100"
            placeholder="Leave empty if not applicable"
            {...form.register("depreciationRate", {
              setValueAs: (value) => {
                if (value === "" || value === null || value === undefined) return undefined;
                const num = parseFloat(value);
                return isNaN(num) ? undefined : num;
              }
            })}
          />
          {form.formState.errors.depreciationRate && (
            <p className="text-sm text-red-500">{form.formState.errors.depreciationRate.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Row 6: Serial Number and Warranty Expiry */}
        <div className="space-y-2">
          <Label htmlFor="serialNumber" className="text-sm font-medium">Serial Number - Optional</Label>
          <Input
            id="serialNumber"
            placeholder="Enter serial number"
            {...form.register("serialNumber")}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Warranty Expiry - Optional</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !form.watch("warrantyExpiry") && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {form.watch("warrantyExpiry") ? (
                  format(form.watch("warrantyExpiry"), "PPP")
                ) : (
                  <span>Pick warranty expiry date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={form.watch("warrantyExpiry")}
                onSelect={(date) => form.setValue("warrantyExpiry", date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Row 7: Receipt Image Upload */}
      <div className="space-y-2">
        <Label htmlFor="receiptImage" className="text-sm font-medium">Receipt/Document Image</Label>
        <div className="flex items-center gap-4">
          <Input
            id="receipt-image-upload"
            type="file"
            accept="image/*"
            onChange={handleReceiptImageChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10"
            onClick={() => document.getElementById('receipt-image-upload')?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Receipt
          </Button>
          {receiptImagePreview && (
            <div className="relative">
              <img
                src={receiptImagePreview}
                alt="Receipt preview"
                className="h-12 w-12 object-cover rounded border"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0"
                onClick={removeReceiptImage}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-4 pt-6 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-green-600 hover:bg-green-700 text-white"
          disabled={form.formState.isSubmitting}
          onClick={() => {
            console.log("Add Asset button clicked");
            console.log("Form valid:", form.formState.isValid);
            console.log("Form errors:", form.formState.errors);
          }}
        >
          {form.formState.isSubmitting ? "Adding..." : "Add Asset"}
        </Button>
      </div>
    </form>
  );
}
