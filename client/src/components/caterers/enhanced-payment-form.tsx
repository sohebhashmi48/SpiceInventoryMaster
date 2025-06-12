import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover, PopoverContent, PopoverTrigger
} from '@/components/ui/popover';
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { CalendarIcon, ArrowLeft, Save, Upload, Trash2, Image, AlertTriangle, CheckCircle, DollarSign } from 'lucide-react';
import { useCaterers } from '@/hooks/use-caterers';
import { useDistributionsByCaterer } from '@/hooks/use-distributions';
import { useCreateCatererPayment } from '@/hooks/use-caterer-payments';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

// Define the schema for the form
const paymentFormSchema = z.object({
  catererId: z.string().min(1, { message: "Caterer is required" }),
  distributionId: z.string().min(1, { message: "Please select a bill to pay" }).refine(
    (val) => val !== 'none',
    { message: "Please select a bill to pay" }
  ),
  paymentType: z.enum(['full', 'custom'], { required_error: "Payment type is required" }),
  amount: z.string().min(1, { message: "Amount is required" }).refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    { message: "Amount must be a positive number" }
  ),
  paymentDate: z.date({
    required_error: "Payment date is required",
  }),
  paymentMode: z.string().min(1, { message: "Payment mode is required" }),
  referenceNo: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

interface EnhancedPaymentFormProps {
  preselectedCatererId?: string;
  preselectedDistributionId?: string;
  preselectedAmount?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  isModal?: boolean; // New prop to indicate if used in modal
}

export default function EnhancedPaymentForm({
  preselectedCatererId,
  preselectedDistributionId,
  preselectedAmount,
  onSuccess,
  onCancel,
  isModal = false
}: EnhancedPaymentFormProps) {
  const [, setLocation] = useLocation();
  const createPayment = useCreateCatererPayment();

  // State for receipt image
  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // State for reminder dialog
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [reminderDate, setReminderDate] = useState<Date>(addDays(new Date(), 7));
  const [remainingBalance, setRemainingBalance] = useState<number>(0);

  // State for confirmation dialog and sequential processing
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<PaymentFormValues | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch caterers for dropdown
  const { data: caterers, isLoading: caterersLoading } = useCaterers();

  // Initialize form with default values
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      catererId: preselectedCatererId || '',
      distributionId: preselectedDistributionId || '',
      paymentType: 'full',
      amount: preselectedAmount || '',
      paymentDate: new Date(),
      paymentMode: 'cash',
      referenceNo: '',
      notes: '',
    },
  });

  // Watch for caterer ID changes to fetch distributions
  const watchedCatererId = form.watch('catererId');
  const watchedDistributionId = form.watch('distributionId');
  const watchedPaymentType = form.watch('paymentType');

  // Fetch distributions for selected caterer
  const { data: allDistributions, isLoading: distributionsLoading } = useDistributionsByCaterer(
    watchedCatererId ? parseInt(watchedCatererId) : 0
  );

  // Filter distributions to only show those with pending balance (balanceDue > 0)
  const distributions = allDistributions?.filter(distribution => {
    const balanceDue = parseFloat(distribution.balanceDue);
    const grandTotal = parseFloat(distribution.grandTotal);
    const amountPaid = parseFloat(distribution.amountPaid);

    // Only include bills where:
    // 1. Balance due is greater than 0, AND
    // 2. Amount paid is less than grand total (double check for data consistency)
    return balanceDue > 0 && amountPaid < grandTotal;
  }) || [];

  // Get selected distribution details
  const selectedDistribution = distributions?.find(d => d.id === parseInt(watchedDistributionId || '0'));

  // If a distribution was selected but is no longer in the filtered list (e.g., became fully paid),
  // clear the selection and show a warning
  useEffect(() => {
    if (watchedDistributionId && watchedDistributionId !== 'none' && !selectedDistribution && distributions.length > 0) {
      const originalDistribution = allDistributions?.find(d => d.id === parseInt(watchedDistributionId));
      if (originalDistribution && parseFloat(originalDistribution.balanceDue) <= 0) {
        form.setValue('distributionId', 'none');
        toast({
          title: "Bill selection cleared",
          description: "The selected bill is now fully paid. Please select a different bill or record a general payment.",
          variant: "default",
        });
      }
    }
  }, [watchedDistributionId, selectedDistribution, distributions, allDistributions, form, toast]);

  // Auto-fill form values when data loads
  useEffect(() => {
    console.log('Form auto-fill effect triggered', {
      preselectedCatererId,
      preselectedDistributionId,
      preselectedAmount,
      caterers: caterers?.length,
      distributions: distributions?.length
    });

    // Set caterer if preselected and caterers are loaded
    if (preselectedCatererId && caterers && caterers.length > 0) {
      const catererExists = caterers.find(c => c.id.toString() === preselectedCatererId);
      if (catererExists && form.getValues('catererId') !== preselectedCatererId) {
        console.log('Setting caterer ID:', preselectedCatererId);
        form.setValue('catererId', preselectedCatererId);
      }
    }

    // Set distribution if preselected and distributions are loaded
    if (preselectedDistributionId && distributions && distributions.length > 0) {
      const distributionExists = distributions.find(d => d.id.toString() === preselectedDistributionId);
      if (distributionExists && form.getValues('distributionId') !== preselectedDistributionId) {
        console.log('Setting distribution ID:', preselectedDistributionId);
        form.setValue('distributionId', preselectedDistributionId);
      }
    } else if (!preselectedDistributionId && distributions && distributions.length > 0 && watchedCatererId) {
      // Auto-select first available bill if no specific bill is preselected
      const currentDistributionId = form.getValues('distributionId');
      if (!currentDistributionId || currentDistributionId === '') {
        console.log('Auto-selecting first available bill:', distributions[0].id);
        form.setValue('distributionId', distributions[0].id.toString());
      }
    }

    // Set amount if preselected, but only if the field is empty (don't override user input)
    const currentAmount = form.getValues('amount');
    if (preselectedAmount && (!currentAmount || currentAmount === '')) {
      console.log('Setting amount:', preselectedAmount);
      form.setValue('amount', preselectedAmount);
      form.setValue('paymentType', 'custom'); // Set to custom when amount is preselected
    }
  }, [preselectedCatererId, preselectedDistributionId, preselectedAmount, caterers, distributions, watchedCatererId]);

  // Auto-fill amount when distribution is selected or payment type changes
 useEffect(() => {
  if (selectedDistribution) {
    // Auto-fill full amount when 'full' payment type is selected
    if (watchedPaymentType === 'full') {
      const balanceDue = parseFloat(selectedDistribution.balanceDue.toString());
      console.log('Auto-filling full amount:', balanceDue);
      
      // Set the amount value to the full balance due and trigger validation
      form.setValue('amount', balanceDue.toString());
      form.trigger('amount');
    } 
    // Clear amount if custom payment type is selected and no preselected amount is set
    else if (watchedPaymentType === 'custom' && !preselectedAmount) {
      form.setValue('amount', '');
      form.trigger('amount');
    }
  }
}, [selectedDistribution, watchedPaymentType, preselectedAmount, form]);


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
    if (receiptPreview) {
      URL.revokeObjectURL(receiptPreview);
      setReceiptPreview(null);
    }
  };

  // Upload receipt image to server
  const uploadReceiptImage = async (): Promise<string | null> => {
    if (!receiptImage) return null;

    console.log("Starting receipt upload...", receiptImage.name, receiptImage.size);

    try {
      const formData = new FormData();
      formData.append('receipt', receiptImage);

      console.log("Sending upload request to /api/receipts/upload");
      const response = await fetch('/api/receipts/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      console.log("Upload response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Upload failed with response:", errorText);
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("Upload successful, response data:", data);
      return data.filename;
    } catch (error) {
      console.error('Receipt upload error:', error);
      toast({
        title: "Failed to upload receipt",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      return null;
    }
  };

  // Check if reminder is needed for any partial payment (cascading reminders)
  const checkReminderNeeded = (paymentAmount: number, totalBalance: number) => {
    const remaining = totalBalance - paymentAmount;

    // Trigger reminder for ANY partial payment, regardless of payment type
    // This enables cascading reminders for multiple successive partial payments
    if (remaining > 0) {
      setRemainingBalance(remaining);
      setShowReminderDialog(true);
      return true;
    }
    return false;
  };

  // Handle form submission - show confirmation dialog first
  const onSubmit = async (data: PaymentFormValues) => {
    console.log("🔍 Form submission started", data);
    console.log("🔍 Raw form data.amount:", data.amount, typeof data.amount);
    console.log("🔍 Parsed amount:", parseFloat(data.amount));

    // Prevent multiple submissions
    if (isProcessing) {
      console.log("🔍 Already processing, ignoring submission");
      return;
    }

    // Additional validation: Check if trying to pay against a fully paid bill
    if (data.distributionId && data.distributionId !== 'none') {
      const selectedBill = allDistributions?.find(d => d.id === parseInt(data.distributionId!));
      if (selectedBill) {
        const balanceDue = parseFloat(selectedBill.balanceDue);
        const grandTotal = parseFloat(selectedBill.grandTotal);
        const amountPaid = parseFloat(selectedBill.amountPaid);

        if (balanceDue <= 0 || amountPaid >= grandTotal) {
          toast({
            title: "Cannot record payment",
            description: "This bill is already fully paid. Please select a different bill or record a general payment.",
            variant: "destructive",
          });
          return;
        }

        // Check if payment amount exceeds balance due
        const paymentAmount = parseFloat(data.amount);
        if (paymentAmount > balanceDue) {
          toast({
            title: "Payment amount too high",
            description: `Payment amount (₹${paymentAmount.toLocaleString()}) cannot exceed the balance due (₹${balanceDue.toLocaleString()}).`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    // Show confirmation dialog instead of proceeding directly
    setPendingFormData(data);
    setShowConfirmDialog(true);
  };

  // Handle confirmed payment submission
  const handleConfirmedSubmit = async () => {
    if (!pendingFormData || isProcessing) return;

    setIsProcessing(true);
    setShowConfirmDialog(false);
    setIsUploading(true);
    try {
      // Upload receipt image if one is selected
      let receiptFilename = null;
      if (receiptImage) {
        console.log("Uploading receipt image...");
        receiptFilename = await uploadReceiptImage();
        console.log("Receipt image uploaded:", receiptFilename);

        // If upload failed, stop the submission
        if (!receiptFilename) {
          console.error("Receipt upload failed, stopping submission");
          setIsUploading(false);
          setIsProcessing(false);
          return;
        }
      }

      const paymentAmount = parseFloat(pendingFormData.amount);
      const totalBalance = selectedDistribution ? parseFloat(selectedDistribution.balanceDue.toString()) : 0;

      // Check if reminder is needed for partial payments
      if (checkReminderNeeded(paymentAmount, totalBalance)) {
        setIsUploading(false); // Reset loading state
        setIsProcessing(false);
        return; // Wait for reminder dialog completion
      }

      // Prepare payment data
      const paymentData = {
        catererId: parseInt(pendingFormData.catererId),
        distributionId: pendingFormData.distributionId && pendingFormData.distributionId !== 'none' ? parseInt(pendingFormData.distributionId) : undefined,
        amount: parseFloat(pendingFormData.amount),
        paymentDate: pendingFormData.paymentDate.toISOString(),
        paymentMode: pendingFormData.paymentMode,
        referenceNo: pendingFormData.referenceNo || undefined,
        notes: pendingFormData.notes || undefined,
        receiptImage: receiptFilename || undefined
      };

      console.log("🔍 Final payment data being sent:", paymentData);
      console.log("🔍 Payment amount in final data:", paymentData.amount, typeof paymentData.amount);

      // Create the payment
      await createPayment.mutateAsync(paymentData);

      toast({
        title: "Payment recorded",
        description: "The payment has been recorded successfully.",
      });

      // Call success callback or navigate
      if (onSuccess) {
        onSuccess();
      } else {
        // Always redirect to billing history after payment
        setLocation('/distributions');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: "Failed to record payment",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
      setPendingFormData(null);
    }
  };

  // Handle skipping reminder
  const handleSkipReminder = async () => {
    setShowReminderDialog(false);

    const formData = form.getValues();
    console.log("🔍 Skip reminder - form data:", formData);
    console.log("🔍 Skip reminder - amount:", formData.amount, typeof formData.amount);

    try {
      // Continue with payment submission without creating reminder
      const paymentData = {
        catererId: parseInt(formData.catererId),
        distributionId: formData.distributionId && formData.distributionId !== 'none' ? parseInt(formData.distributionId) : undefined,
        amount: parseFloat(formData.amount),
        paymentDate: formData.paymentDate.toISOString(),
        paymentMode: formData.paymentMode,
        referenceNo: formData.referenceNo || undefined,
        notes: formData.notes || undefined,
        receiptImage: undefined // Already handled
      };

      await createPayment.mutateAsync(paymentData);

      toast({
        title: "Payment recorded",
        description: "The payment has been recorded successfully.",
      });

      if (onSuccess) {
        onSuccess();
      } else {
        // Always redirect to billing history after payment
        setLocation('/distributions');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: "Failed to record payment",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  // Handle reminder confirmation
  const handleReminderConfirm = async () => {
    setShowReminderDialog(false);

    const formData = form.getValues();
    console.log("🔍 Reminder confirm - form data:", formData);
    console.log("🔍 Reminder confirm - amount:", formData.amount, typeof formData.amount);

    try {
      // First, create the payment reminder
      const reminderData = {
        catererId: parseInt(formData.catererId),
        distributionId: formData.distributionId && formData.distributionId !== 'none' ? parseInt(formData.distributionId) : undefined,
        amount: remainingBalance,
        originalDueDate: selectedDistribution?.distributionDate || new Date(),
        reminderDate: reminderDate,
        notes: `Reminder for remaining balance after partial payment of ₹${parseFloat(formData.amount).toLocaleString()}. Bill: ${selectedDistribution?.billNo}. Total paid so far: ₹${(parseFloat(selectedDistribution?.amountPaid || '0') + parseFloat(formData.amount)).toLocaleString()}`
      };

      console.log("Creating payment reminder:", reminderData);

      const reminderResponse = await fetch('/api/payment-reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(reminderData),
      });

      if (!reminderResponse.ok) {
        throw new Error('Failed to create payment reminder');
      }

      // Continue with payment submission
      const paymentData = {
        catererId: parseInt(formData.catererId),
        distributionId: formData.distributionId && formData.distributionId !== 'none' ? parseInt(formData.distributionId) : undefined,
        amount: parseFloat(formData.amount),
        paymentDate: formData.paymentDate.toISOString(),
        paymentMode: formData.paymentMode,
        referenceNo: formData.referenceNo || undefined,
        notes: formData.notes || undefined,
        receiptImage: undefined // Already handled
      };

      await createPayment.mutateAsync(paymentData);

      toast({
        title: "Payment recorded with reminder",
        description: `Payment recorded successfully. Reminder set for ${format(reminderDate, 'PPP')} for remaining balance of ₹${remainingBalance.toLocaleString()}`,
      });

      if (onSuccess) {
        onSuccess();
      } else {
        // Always redirect to billing history after payment
        setLocation('/distributions');
      }
    } catch (error) {
      console.error('Error recording payment or creating reminder:', error);
      toast({
        title: "Failed to record payment",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className={cn(
          "grid gap-6",
          isModal ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
        )}>
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
              <CardDescription>Enter the payment information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="catererId">Caterer *</Label>
                <Controller
                  control={form.control}
                  name="catererId"
                  render={({ field }) => (
                    <Select
                      disabled={!!preselectedCatererId || caterersLoading}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a caterer" />
                      </SelectTrigger>
                      <SelectContent>
                        {caterers?.map((caterer) => (
                          <SelectItem key={caterer.id} value={caterer.id.toString()}>
                            {caterer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.catererId && (
                  <p className="text-sm text-red-500">{form.formState.errors.catererId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="distributionId">Select Bill to Pay *</Label>
                <Controller
                  control={form.control}
                  name="distributionId"
                  render={({ field }) => (
                    <Select
                      disabled={!watchedCatererId || distributionsLoading}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          !watchedCatererId
                            ? "Select a caterer first"
                            : distributionsLoading
                              ? "Loading bills..."
                              : distributions.length === 0
                                ? "No bills with pending balance"
                                : "Select a bill to pay"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {distributions.length === 0 && watchedCatererId && !distributionsLoading ? (
                          <SelectItem value="no-bills" disabled>
                            No bills with pending balance found
                          </SelectItem>
                        ) : (
                          distributions.map((distribution) => {
                            const balanceDue = parseFloat(distribution.balanceDue);
                            const grandTotal = parseFloat(distribution.grandTotal);
                            const amountPaid = parseFloat(distribution.amountPaid);

                            return (
                              <SelectItem key={distribution.id} value={distribution.id.toString()}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{distribution.billNo}</span>
                                  <span className="text-sm text-muted-foreground">
                                    Total: ₹{grandTotal.toLocaleString()} |
                                    Paid: ₹{amountPaid.toLocaleString()} |
                                    <span className="text-red-600 font-medium">
                                      Due: ₹{balanceDue.toLocaleString()}
                                    </span>
                                  </span>
                                </div>
                              </SelectItem>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.distributionId && (
                  <p className="text-sm text-red-500">{form.formState.errors.distributionId.message}</p>
                )}
                {distributions.length === 0 && watchedCatererId && !distributionsLoading && (
                  <p className="text-sm text-orange-600 bg-orange-50 p-2 rounded border border-orange-200">
                    ⚠️ No bills with pending balance found for this caterer. Please create a new bill first or select a different caterer.
                  </p>
                )}
              </div>

              {selectedDistribution && (
                <div className="space-y-2">
                  <Label htmlFor="paymentType">Payment Amount *</Label>
                  <Controller
                    control={form.control}
                    name="paymentType"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full">
                            Pay Full Amount (₹{selectedDistribution.balanceDue.toLocaleString()})
                          </SelectItem>
                          <SelectItem value="custom">Pay Custom Amount</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {form.formState.errors.paymentType && (
                    <p className="text-sm text-red-500">{form.formState.errors.paymentType.message}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={selectedDistribution ? parseFloat(selectedDistribution.balanceDue) : undefined}
                  disabled={watchedPaymentType === 'full' && !!selectedDistribution}
                  {...form.register("amount")}
                  placeholder={
                    selectedDistribution
                      ? `Enter amount (max: ₹${parseFloat(selectedDistribution.balanceDue).toLocaleString()})`
                      : "Enter payment amount"
                  }
                />
                {selectedDistribution && (
                  <p className="text-sm text-muted-foreground">
                    Maximum payment amount: ₹{parseFloat(selectedDistribution.balanceDue).toLocaleString()}
                  </p>
                )}
                {form.formState.errors.amount && (
                  <p className="text-sm text-red-500">{form.formState.errors.amount.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentDate">Payment Date *</Label>
                <Controller
                  control={form.control}
                  name="paymentDate"
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "PPP") : "Select a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {form.formState.errors.paymentDate && (
                  <p className="text-sm text-red-500">{form.formState.errors.paymentDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMode">Payment Mode *</Label>
                <Controller
                  control={form.control}
                  name="paymentMode"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="bank">Bank Transfer</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.paymentMode && (
                  <p className="text-sm text-red-500">{form.formState.errors.paymentMode.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="referenceNo">Reference Number (Optional)</Label>
                <Input
                  id="referenceNo"
                  {...form.register("referenceNo")}
                  placeholder="Enter reference number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  {...form.register("notes")}
                  placeholder="Enter any additional notes"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Image className="h-5 w-5 mr-2 text-blue-600" />
                Receipt Image (Optional)
              </CardTitle>
              <CardDescription>Upload a receipt image if available</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={cn(
                "border-2 border-dashed border-blue-200 dark:border-blue-900 rounded-lg text-center",
                isModal ? "p-4" : "p-6"
              )}>
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
            </CardContent>
          </Card>
        </div>

        {!isModal && (
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel || (() => setLocation('/caterer-payments'))}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUploading || createPayment.isPending}
              className="min-w-[150px]"
            >
              {(isUploading || createPayment.isPending) ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </div>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Record Payment
                </>
              )}
            </Button>
          </div>
        )}

        {isModal && (
          <div className="flex justify-end space-x-4 pt-4 border-t bg-background sticky bottom-0 -mx-6 px-6 pb-6">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUploading || createPayment.isPending || isProcessing}
              className="min-w-[150px]"
            >
              {(isUploading || createPayment.isPending || isProcessing) ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isProcessing ? 'Processing...' : 'Saving...'}
                </div>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Record Payment
                </>
              )}
            </Button>
          </div>
        )}
      </form>

      {/* Payment Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Confirm Payment
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <div className="text-base">
                Please confirm the payment details:
              </div>
              {pendingFormData && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Caterer:</span>
                    <span>{caterers?.find(c => c.id.toString() === pendingFormData.catererId)?.name}</span>
                  </div>
                  {pendingFormData.distributionId && pendingFormData.distributionId !== 'none' && (
                    <div className="flex justify-between">
                      <span className="font-medium">Bill:</span>
                      <span>{selectedDistribution?.billNo}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="font-medium">Payment Amount:</span>
                    <span className="text-lg font-bold text-green-600">
                      ₹{parseFloat(pendingFormData.amount).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Payment Mode:</span>
                    <span className="capitalize">{pendingFormData.paymentMode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Date:</span>
                    <span>{format(pendingFormData.paymentDate, 'PPP')}</span>
                  </div>
                  {selectedDistribution && (
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between text-sm">
                        <span>Bill Total:</span>
                        <span>₹{parseFloat(selectedDistribution.grandTotal).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Already Paid:</span>
                        <span>₹{parseFloat(selectedDistribution.amountPaid).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm font-medium">
                        <span>Remaining After Payment:</span>
                        <span className={parseFloat(selectedDistribution.balanceDue) - parseFloat(pendingFormData.amount) <= 0 ? 'text-green-600' : 'text-orange-600'}>
                          ₹{(parseFloat(selectedDistribution.balanceDue) - parseFloat(pendingFormData.amount)).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowConfirmDialog(false);
                setPendingFormData(null);
              }}
              disabled={isProcessing}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmedSubmit}
              disabled={isProcessing || isUploading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing || isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Confirm Payment
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reminder Dialog */}
      <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
              Set Payment Reminder
            </DialogTitle>
            <DialogDescription>
              You have a remaining balance of ₹{remainingBalance.toLocaleString()}.
              {selectedDistribution && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-700">
                    💡 This is a partial payment. Total paid so far: ₹{(parseFloat(selectedDistribution.amountPaid) + parseFloat(form.getValues('amount'))).toLocaleString()}
                    of ₹{parseFloat(selectedDistribution.grandTotal).toLocaleString()}
                  </p>
                </div>
              )}
              <div className="mt-2">
                Would you like to set a reminder for the next payment?
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDistribution && (
              <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="font-medium text-slate-900 mb-2">Bill Details</h4>
                <div className="text-sm text-slate-600 space-y-1">
                  <p><span className="font-medium">Bill No:</span> {selectedDistribution.billNo}</p>
                  <p><span className="font-medium">Bill Date:</span> {new Date(selectedDistribution.distributionDate).toLocaleDateString()}</p>
                  <p><span className="font-medium">Total Amount:</span> ₹{parseFloat(selectedDistribution.grandTotal).toLocaleString()}</p>
                  <p><span className="font-medium">Previously Paid:</span> ₹{parseFloat(selectedDistribution.amountPaid).toLocaleString()}</p>
                  <p><span className="font-medium text-green-600">Amount Paying Now:</span> ₹{parseFloat(form.getValues('amount')).toLocaleString()}</p>
                  <p><span className="font-medium text-blue-600">Total After This Payment:</span> ₹{(parseFloat(selectedDistribution.amountPaid) + parseFloat(form.getValues('amount'))).toLocaleString()}</p>
                  <p><span className="font-medium text-orange-600">Remaining Balance:</span> ₹{remainingBalance.toLocaleString()}</p>
                </div>
              </div>
            )}
            <div>
              <Label>Next Payment Reminder Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(reminderDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={reminderDate}
                    onSelect={(date) => date && setReminderDate(date)}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-slate-500 mt-1">
                Choose a future date when you want to be reminded about the remaining payment
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleSkipReminder}>
              Skip Reminder
            </Button>
            <Button onClick={handleReminderConfirm}>
              Set Reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
