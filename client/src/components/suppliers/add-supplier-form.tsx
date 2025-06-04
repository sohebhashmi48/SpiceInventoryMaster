import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Vendor } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import SupplierImageUpload from "./supplier-image-upload";

// Define the form schema
const supplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required"),
  contactName: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  newTag: z.string().optional(),
  supplierImage: z.string().optional(),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

interface AddSupplierFormProps {
  onSuccess: () => void;
  existingSupplier?: Vendor | null;
}

export default function AddSupplierForm({ onSuccess, existingSupplier }: AddSupplierFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supplierImage, setSupplierImage] = useState<string | null>(existingSupplier?.supplierImage || null);

  // Fetch all products to suggest as tags
  const { data: products } = useQuery<any[]>({
    queryKey: ["/api/products"],
  });

  // Get product names for tag suggestions
  const productNames = products?.map(product => product.name) || [];

  // Initialize form with default values
  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
      contactName: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
      tags: [],
      newTag: "",
      supplierImage: "",
    },
  });

  // Update form values when editing an existing supplier
  useEffect(() => {
    if (existingSupplier) {
      form.reset({
        name: existingSupplier.name,
        contactName: existingSupplier.contactName || "",
        email: existingSupplier.email || "",
        phone: existingSupplier.phone || "",
        address: existingSupplier.address || "",
        notes: existingSupplier.notes || "",
        tags: existingSupplier.tags || [],
        newTag: "",
        supplierImage: existingSupplier.supplierImage || "",
      });
      setSupplierImage(existingSupplier.supplierImage || null);
    }
  }, [existingSupplier, form]);

  // Create supplier mutation
  const createSupplierMutation = useMutation({
    mutationFn: async (data: SupplierFormValues) => {
      // Don't manually convert creditLimit - let the schema handle it
      return await apiRequest("POST", "/api/vendors", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({
        title: "Success",
        description: "Supplier added successfully",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add supplier: ${error.message}`,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  // Update supplier mutation
  const updateSupplierMutation = useMutation({
    mutationFn: async (data: SupplierFormValues & { id: number }) => {
      const { id, ...updateData } = data;
      // Don't manually convert creditLimit - let the schema handle it
      return await apiRequest("PATCH", `/api/vendors/${id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({
        title: "Success",
        description: "Supplier updated successfully",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update supplier: ${error.message}`,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  // Add a new tag
  const addTag = () => {
    const newTag = form.getValues("newTag")?.trim();
    if (!newTag) return;

    const currentTags = form.getValues("tags") || [];

    // Don't add duplicate tags
    if (!currentTags.includes(newTag)) {
      form.setValue("tags", [...currentTags, newTag]);
    }

    // Clear the input
    form.setValue("newTag", "");
  };

  // Remove a tag
  const removeTag = (tagToRemove: string) => {
    const currentTags = form.getValues("tags") || [];
    form.setValue("tags", currentTags.filter(tag => tag !== tagToRemove));
  };

  // Handle form submission
  const onSubmit = (data: SupplierFormValues) => {
    setIsSubmitting(true);

    // Remove the newTag field before submitting
    const { newTag, ...submitData } = data;

    // Include the supplier image
    const formattedData = {
      ...submitData,
      supplierImage: supplierImage,
    };

    if (existingSupplier) {
      updateSupplierMutation.mutate({
        ...formattedData,
        id: existingSupplier.id,
      });
    } else {
      createSupplierMutation.mutate(formattedData);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Supplier Name *</Label>
          <Input
            id="name"
            {...form.register("name")}
            placeholder="Enter supplier name"
          />
          {form.formState.errors.name && (
            <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactName">Contact Person</Label>
          <Input
            id="contactName"
            {...form.register("contactName")}
            placeholder="Enter contact person name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            {...form.register("email")}
            placeholder="Enter email address"
          />
          {form.formState.errors.email && (
            <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            {...form.register("phone")}
            placeholder="Enter phone number"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="address">Address</Label>
          <Textarea
            id="address"
            {...form.register("address")}
            placeholder="Enter address"
            rows={3}
          />
        </div>

        {/* Credit Limit field removed */}

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            {...form.register("notes")}
            placeholder="Enter additional notes"
            rows={3}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="tags">Products Supplied (Tags)</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {form.watch("tags")?.map((tag, index) => (
              <Badge key={index} variant="secondary" className="px-3 py-1">
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-2 text-gray-500 hover:text-gray-700"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              id="newTag"
              {...form.register("newTag")}
              placeholder="Add product this supplier sells"
              list="product-suggestions"
            />
            <datalist id="product-suggestions">
              {productNames.map((name, index) => (
                <option key={index} value={name} />
              ))}
            </datalist>
            <Button
              type="button"
              onClick={addTag}
              variant="outline"
              className="shrink-0"
            >
              Add Tag
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Add products that this supplier sells to help with filtering and organization.
          </p>
        </div>

        {/* Supplier Image Upload */}
        <div className="space-y-2 md:col-span-2">
          <SupplierImageUpload
            currentImage={supplierImage}
            onImageChange={setSupplierImage}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <span className="animate-spin mr-2">⟳</span>
              {existingSupplier ? "Updating..." : "Saving..."}
            </>
          ) : existingSupplier ? (
            "Update Supplier"
          ) : (
            "Add Supplier"
          )}
        </Button>
      </div>
    </form>
  );
}
