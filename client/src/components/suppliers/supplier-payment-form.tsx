import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Vendor } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, CreditCard, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

interface SupplierPaymentFormProps {
  supplierId: number;
  supplier: Vendor;
  initialData?: {
    amount: string;
    reference: string;
  } | null;
  onPaymentSuccess?: () => void;
}

export default function SupplierPaymentForm({
  supplierId,
  supplier,
  initialData,
  onPaymentSuccess
}: SupplierPaymentFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const balanceDue = parseFloat(supplier.balanceDue?.toString() || '0');
  const hasOutstandingBalance = balanceDue > 0;

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: initialData?.amount || (hasOutstandingBalance ? balanceDue.toString() : ""),
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: "cash",
      referenceNo: initialData?.reference || "",
      notes: "",
    },
  });

  // Update form when initialData changes
  React.useEffect(() => {
    if (initialData) {
      form.setValue("amount", initialData.amount);
      form.setValue("referenceNo", initialData.reference);
    }
  }, [initialData, form]);

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
        description: "Payment has been successfully recorded and supplier balance updated.",
        duration: 4000,
      });

      // Reset form
      form.reset({
        amount: "",
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: "cash",
        referenceNo: "",
        notes: "",
      });

      // Refresh queries
      queryClient.invalidateQueries({ queryKey: [`/api/suppliers/${supplierId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/vendors/${supplierId}/payments`] });
      
      // Call success callback
      onPaymentSuccess?.();
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

  const handlePayFullAmount = () => {
    if (hasOutstandingBalance) {
      form.setValue("amount", balanceDue.toString());
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2 text-green-600" />
            Record Payment
          </div>
          <div className="text-sm font-normal">
            {hasOutstandingBalance ? (
              <span className="text-red-600 font-medium">
                Due: {formatCurrency(balanceDue)}
              </span>
            ) : (
              <span className="text-green-600 font-medium">
                ✅ No Outstanding Balance
              </span>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Balance Status Alert */}
        {hasOutstandingBalance ? (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>{supplier.name}</strong> has an outstanding balance of{" "}
              <strong>{formatCurrency(balanceDue)}</strong>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>{supplier.name}</strong> has no outstanding balance. All payments are up to date.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Amount Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              {hasOutstandingBalance && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePayFullAmount}
                  className="text-xs"
                >
                  Pay Full Amount ({formatCurrency(balanceDue)})
                </Button>
              )}
            </div>

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
          </div>

          {/* Payment Method and Reference */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              {form.formState.errors.paymentMethod && (
                <p className="text-sm text-red-600">{form.formState.errors.paymentMethod.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="referenceNo">Reference Number</Label>
              <Input
                id="referenceNo"
                placeholder="Transaction ID, Cheque No, etc."
                {...form.register("referenceNo")}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about this payment..."
              rows={3}
              {...form.register("notes")}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
              disabled={isSubmitting}
            >
              Clear Form
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
      </CardContent>
    </Card>
  );
}
