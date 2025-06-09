import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";


import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Available icons for expenses
const expenseIcons = [
  { value: "🏢", label: "Office" },
  { value: "🚗", label: "Transport" },
  { value: "💡", label: "Utilities" },
  { value: "📱", label: "Technology" },
  { value: "🍽️", label: "Food" },
  { value: "🏥", label: "Health" },
  { value: "📚", label: "Education" },
  { value: "🎯", label: "Marketing" },
  { value: "🔧", label: "maintain" },
  { value: "📄", label: "Supplies" },
  { value: "💼", label: "Business" },
  { value: "🏪", label: "Retail" },
  { value: "📞", label: "Network" },
  { value: "🎨", label: "Creative" },
  { value: "💰", label: "Financial" },
  { value: "🏠", label: "Rent" },
  { value: "⚡", label: "Energy" },
  { value: "🌐", label: "Internet" },
  { value: "📦", label: "Shipping" },
  { value: "🎪", label: "Events" },
];

// Form validation schema
const expenseFormSchema = z.object({
  icon: z.string().min(1, "Please select an icon"),
  title: z.string().min(1, "Expense title is required").max(255, "Title must be less than 255 characters"),
  description: z.string().optional(),
  date: z.date({
    required_error: "Expense date is required",
  }),
  expiryDate: z.date().optional(),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  image: z.any().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

interface AddExpenseFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function AddExpenseForm({ onSuccess, onCancel }: AddExpenseFormProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      icon: "",
      title: "",
      description: "",
      date: new Date(),
      expiryDate: undefined,
      amount: 0,
    },
  });

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    const fileInput = document.getElementById('image-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const onSubmit = async (data: ExpenseFormValues) => {
    try {
      console.log("Expense data:", data);
      console.log("Selected image:", selectedImage);

      // Upload image first if selected
      let receiptImageUrl = null;
      if (selectedImage) {
        console.log("Uploading receipt image...");
        const formData = new FormData();
        formData.append('receiptImage', selectedImage);

        const uploadResponse = await fetch('/api/expenses/upload-receipt', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!uploadResponse.ok) {
          throw new Error(`Image upload failed: ${uploadResponse.status}`);
        }

        const uploadData = await uploadResponse.json();
        receiptImageUrl = uploadData.url;
        console.log("Receipt image uploaded successfully:", receiptImageUrl);
      }

      // Prepare the expense data for API
      const expenseData = {
        icon: data.icon,
        title: data.title,
        expenseDate: data.date.toISOString().split('T')[0], // Format as YYYY-MM-DD
        expiryDate: data.expiryDate ? data.expiryDate.toISOString().split('T')[0] : null,
        amount: Math.round(data.amount * 100), // Convert to paisa/cents as integer
        receiptImage: receiptImageUrl
      };

      console.log("Sending expense data to API:", expenseData);

      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(expenseData),
        credentials: 'include', // Include session cookies
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);

      // Check if response is HTML (error page) instead of JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const htmlText = await response.text();
        console.error("Server returned HTML instead of JSON:", htmlText);
        throw new Error('Server error: Please check if the expenses table exists in the database');
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API error response:", errorData);
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const createdExpense = await response.json();
      console.log("Expense created successfully:", createdExpense);

      // Reset form
      form.reset();
      setSelectedImage(null);
      setImagePreview(null);

      // Call success callback
      onSuccess?.();
    } catch (error) {
      console.error("Error adding expense:", error);

      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      // Show user-friendly error message
      if (errorMessage.includes('expenses table')) {
        errorMessage = 'Database table not found. Please run the SQL query to create the expenses table.';
      }

      alert(`Failed to add expense: ${errorMessage}`);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Row 1: Icon and Title */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Icon Selection */}
          <div className="space-y-2">
            <Label htmlFor="icon" className="text-sm font-medium">Icon *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-10",
                    !form.watch("icon") && "text-muted-foreground"
                  )}
                >
                  {form.watch("icon") ? (
                    <span className="flex items-center gap-2">
                      <span className="text-lg">{form.watch("icon")}</span>
                      <span className="text-sm">{expenseIcons.find(icon => icon.value === form.watch("icon"))?.label}</span>
                    </span>
                  ) : (
                    <span className="text-sm">Select icon</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-3">
                <div className="grid grid-cols-5 gap-1">
{expenseIcons.map((icon) => (
  <Button
    key={icon.value}
    variant="ghost"
    className="flex flex-col items-center p-2 h-16 cursor-pointer hover:bg-gray-100 rounded-md"
    onClick={() => form.setValue("icon", icon.value)}
  >
    <span className="text-lg mb-1">{icon.value}</span>
    <span className="text-xs text-center leading-tight">{icon.label}</span>
  </Button>
))}
                </div>
              </PopoverContent>
            </Popover>
            {form.formState.errors.icon && (
              <p className="text-xs text-red-500">{form.formState.errors.icon.message}</p>
            )}
          </div>

          {/* Expense Title */}
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">Expense Title *</Label>
            <Input
              id="title"
              placeholder="Enter expense title"
              className="h-10"
              {...form.register("title")}
            />
            {form.formState.errors.title && (
              <p className="text-xs text-red-500">{form.formState.errors.title.message}</p>
            )}
          </div>
        </div>

        {/* Row 2: Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium">Description</Label>
          <Textarea
            id="description"
            placeholder="Enter expense description (optional)"
            rows={2}
            className="resize-none"
            {...form.register("description")}
          />
        </div>

        {/* Row 3: Date, Expiry Date, and Amount */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Expense Date */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Expense Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-10",
                    !form.watch("date") && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  <span className="text-sm">
                    {form.watch("date") ? format(form.watch("date"), "dd/MM/yyyy") : "Pick date"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={form.watch("date")}
                  onSelect={(date) => form.setValue("date", date || new Date())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {form.formState.errors.date && (
              <p className="text-xs text-red-500">{form.formState.errors.date.message}</p>
            )}
          </div>

          {/* Expiry Date */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Expiry Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-10",
                    !form.watch("expiryDate") && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  <span className="text-sm">
                    {form.watch("expiryDate") ? format(form.watch("expiryDate") as Date, "dd/MM/yyyy") : "Optional"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={form.watch("expiryDate")}
                  onSelect={(date) => form.setValue("expiryDate", date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium">Amount (₹) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              className="h-10"
              {...form.register("amount", { valueAsNumber: true })}
            />
            {form.formState.errors.amount && (
              <p className="text-xs text-red-500">{form.formState.errors.amount.message}</p>
            )}
          </div>
        </div>

        {/* Row 4: Image Upload */}
        <div className="space-y-2">
          <Label htmlFor="image" className="text-sm font-medium">Receipt Image</Label>
          <div className="flex items-center gap-4">
            <Input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10"
              onClick={() => document.getElementById('image-upload')?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Receipt
            </Button>
            {imagePreview && (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Receipt preview"
                  className="h-12 w-12 object-cover rounded border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0"
                  onClick={removeImage}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            className="bg-secondary hover:bg-secondary-dark text-white min-w-[120px]"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Adding..." : "Add Expense"}
          </Button>
        </div>
      </form>
    </div>
  );
}
