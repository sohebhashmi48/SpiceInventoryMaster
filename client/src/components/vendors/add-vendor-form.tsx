import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Vendor, insertVendorSchema } from "@shared/schema";
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
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

// Extend the insertVendorSchema with additional validation
const formSchema = insertVendorSchema.extend({
  phone: z.string().min(7, "Phone number is too short"),
  email: z.string().email("Invalid email address"),
  rating: z.coerce.number().min(0).max(5).nullable().optional(),
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
    } : {
      name: "",
      contactName: "",
      email: "",
      phone: "",
      address: "",
      location: "",
      paymentTerms: "Net 30",
      moneyOwed: "0",
      moneyPaid: "0",
      rating: null,
      notes: "",
      deliveryPersonName: "",
      deliveryPersonContact: ""
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
                  <Input placeholder="Contact name" {...field} />
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
                  <Input type="email" placeholder="email@example.com" {...field} />
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
                  <Input placeholder="+1 (555) 123-4567" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Input placeholder="Full address" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location/Region</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. North, Downtown, East" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="paymentTerms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Terms</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Net 30" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="moneyOwed"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount Owed ($)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="moneyPaid"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount Paid ($)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="rating"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rating (0-5)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="0" 
                    max="5" 
                    step="0.5" 
                    placeholder="Vendor rating"
                    value={field.value === null ? "" : field.value}
                    onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
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
            name="deliveryPersonName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Delivery Person Name</FormLabel>
                <FormControl>
                  <Input placeholder="Name of delivery personnel" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="deliveryPersonContact"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Delivery Person Contact</FormLabel>
                <FormControl>
                  <Input placeholder="Phone number" {...field} />
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
                <Textarea 
                  placeholder="Additional information about this vendor" 
                  className="min-h-[80px]"
                  {...field} 
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
