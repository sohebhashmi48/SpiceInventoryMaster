import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useToast } from "../../hooks/use-toast";
import { Vendor, insertVendorSchema } from "@shared/schema";
import { Button } from "../ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Loader2, Star } from "lucide-react";
import { Separator } from "../ui/separator";

// Extend the insertVendorSchema with additional validation
const formSchema = insertVendorSchema.extend({
  phone: z.string().min(7, "Phone number is too short").optional().nullable(),
  email: z.string().email("Invalid email address").optional().nullable(),
  contactName: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  paymentTerms: z.string().optional().nullable(),
  balanceDue: z.coerce.number().min(0, "Balance due cannot be negative").optional().nullable(),
  totalPaid: z.coerce.number().min(0, "Total paid cannot be negative").optional().nullable(),
  notes: z.string().optional().nullable(),
  rating: z.coerce.number().min(1, "Rating must be between 1 and 5").max(5, "Rating must be between 1 and 5").optional().nullable(),
});

type VendorFormValues = z.infer<typeof formSchema>;

interface AddVendorFormProps {
  onSuccess: () => void;
  existingVendor?: Vendor | null;
}

export default function AddVendorForm({ onSuccess, existingVendor }: AddVendorFormProps) {
  const { toast } = useToast();

  const createVendorMutation = useMutation({
    mutationFn: async (data: VendorFormValues) => {
      if (existingVendor) {
        await apiRequest("PATCH", `/api/vendors/${existingVendor.id}`, data);
        return existingVendor.id;
      } else {
        const res = await apiRequest("POST", "/api/vendors", data);
        const newVendor = await res.json();
        return newVendor.id;
      }
    },
    onSuccess: () => {
      toast({
        title: `Vendor ${existingVendor ? "updated" : "created"} successfully`,
        description: `The vendor has been ${existingVendor ? "updated" : "added"} to your records.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      onSuccess();
    },
    onError: (error) => {
      console.error("AddVendorForm mutation error:", error);
      toast({
        title: `Failed to ${existingVendor ? "update" : "create"} vendor`,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Initialize the form with default values or existing vendor data
  const form = useForm<VendorFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: existingVendor ? {
      ...existingVendor,
      // Convert numeric string values to numbers for the form
      balanceDue: existingVendor.balanceDue ? Number(existingVendor.balanceDue) : null,
      totalPaid: existingVendor.totalPaid ? Number(existingVendor.totalPaid) : null,
      rating: existingVendor.rating ? Number(existingVendor.rating) : null,
    } : {
      name: "",
      contactName: "",
      email: "",
      phone: "",
      address: "",
      isActive: true,
      paymentTerms: "",
      balanceDue: null,
      totalPaid: null,
      notes: "",
      rating: null,
    },
  });

  const onSubmit = (data: VendorFormValues) => {
    createVendorMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vendor Name</FormLabel>
                <FormControl>
                  <Input placeholder="Company name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contactName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Person</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Contact name"
                    value={field.value || ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={field.value || ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input
                    placeholder="+1 (555) 123-4567"
                    value={field.value || ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input
                  placeholder="Full address"
                  value={field.value || ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  ref={field.ref}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Financial Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Financial Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="paymentTerms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Terms</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Net 30, COD"
                      value={field.value || ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Credit Limit field removed */}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="balanceDue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Balance Due ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={field.value === null ? "" : field.value}
                      onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      min="0"
                      step="0.01"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="totalPaid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Paid ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={field.value === null ? "" : field.value}
                      onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      min="0"
                      step="0.01"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Additional notes about this vendor, payment history, etc."
                    value={field.value || ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="rating"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vendor Rating</FormLabel>
                <FormControl>
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => field.onChange(star)}
                        className={`p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                          (field.value || 0) >= star
                            ? "text-yellow-500 hover:text-yellow-600"
                            : "text-gray-300 hover:text-yellow-400"
                        }`}
                      >
                        <Star
                          className={`h-6 w-6 ${
                            (field.value || 0) >= star ? "fill-current" : ""
                          }`}
                        />
                      </button>
                    ))}
                    {field.value ? (
                      <button
                        type="button"
                        onClick={() => field.onChange(null)}
                        className="ml-2 text-xs text-muted-foreground hover:text-destructive"
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                </FormControl>
                <FormDescription className="text-xs text-muted-foreground">
                  Rate this vendor based on quality, reliability, and service.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isActive"
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
                <FormLabel>Active</FormLabel>
                <p className="text-sm text-muted-foreground">
                  Is this vendor currently active?
                </p>
              </div>
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
            disabled={createVendorMutation.isPending}
            className="bg-secondary hover:bg-secondary-dark text-white"
          >
            {createVendorMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {existingVendor ? "Update" : "Save"} Vendor
          </Button>
        </div>
      </form>
    </Form>
  );
}
