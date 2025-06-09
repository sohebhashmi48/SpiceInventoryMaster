import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, CreditCard } from "lucide-react";

// Payment form schema
const paymentSchema = z.object({
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    "Amount must be a positive number"
  ),
  paymentDate: z.string().min(1, "Payment date is required"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  referenceNo: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface SupplierPaymentModalProps {
  children: React.ReactNode;
  supplierId: string;
  supplierName: string;
  preselectedAmount?: string;
  onSuccess?: () => void;
}

export default function SupplierPaymentModal({
  children,
  supplierId,
  supplierName,
  preselectedAmount,
  onSuccess
}: SupplierPaymentModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: preselectedAmount || "",
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: "cash",
      referenceNo: "",
      notes: "",
    },
  });

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        amount: preselectedAmount || "",
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: "cash",
        referenceNo: "",
        notes: "",
      });
    }
  }, [isOpen, preselectedAmount, form]);

  // Payment mutation
  const paymentMutation = useMutation({
    mutationFn: async (data: PaymentFormValues) => {
      const response = await fetch(`/api/vendors/${supplierId}/payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          amount: parseFloat(data.amount),
          paymentDate: new Date(data.paymentDate),
          paymentMethod: data.paymentMethod,
          referenceNo: data.referenceNo || undefined,
          notes: data.notes || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to record payment");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "✅ Payment Recorded",
        description: `Payment for ${supplierName} has been successfully recorded.`,
        duration: 4000,
      });

      // Close modal and reset form
      setIsOpen(false);
      form.reset();

      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      queryClient.invalidateQueries({ queryKey: [`/api/vendors/${supplierId}/payments`] });
      
      // Call success callback
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Payment Failed",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const onSubmit = async (data: PaymentFormValues) => {
    setIsSubmitting(true);
    try {
      await paymentMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2 text-green-600" />
            Record Payment
          </DialogTitle>
          <DialogDescription>
            Record a payment for <strong>{supplierName}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Payment Amount *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="pl-10"
                {...form.register("amount")}
              />
            </div>
            {form.formState.errors.amount && (
              <p className="text-sm text-red-600">{form.formState.errors.amount.message}</p>
            )}
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label htmlFor="paymentDate">Payment Date *</Label>
            <Input
              id="paymentDate"
              type="date"
              {...form.register("paymentDate")}
            />
            {form.formState.errors.paymentDate && (
              <p className="text-sm text-red-600">{form.formState.errors.paymentDate.message}</p>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method *</Label>
            <Select
              value={form.watch("paymentMethod")}
              onValueChange={(value) => form.setValue("paymentMethod", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank">Bank Transfer</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reference Number */}
          <div className="space-y-2">
            <Label htmlFor="referenceNo">Reference Number</Label>
            <Input
              id="referenceNo"
              placeholder="Transaction ID, Cheque No, etc."
              {...form.register("referenceNo")}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes..."
              rows={2}
              {...form.register("notes")}
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !form.formState.isValid}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isSubmitting ? "Recording..." : "Record Payment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
