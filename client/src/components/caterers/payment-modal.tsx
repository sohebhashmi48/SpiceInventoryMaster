import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  PaymentDialog,
  PaymentDialogContent,
  PaymentDialogDescription,
  PaymentDialogHeader,
  PaymentDialogTitle,
  PaymentDialogTrigger,
} from '@/components/ui/payment-dialog';
import { CreditCard } from 'lucide-react';
import EnhancedPaymentForm from './enhanced-payment-form';

interface PaymentModalProps {
  triggerText?: string;
  triggerVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  triggerSize?: "default" | "sm" | "lg" | "icon";
  triggerClassName?: string;
  preselectedCatererId?: string;
  preselectedDistributionId?: string;
  preselectedAmount?: string;
  onSuccess?: () => void;
  children?: React.ReactNode;
}

export default function PaymentModal({
  triggerText = "Pay Now",
  triggerVariant = "default",
  triggerSize = "default",
  triggerClassName,
  preselectedCatererId,
  preselectedDistributionId,
  preselectedAmount,
  onSuccess,
  children
}: PaymentModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSuccess = () => {
    setIsOpen(false);
    if (onSuccess) {
      onSuccess();
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  return (
    <PaymentDialog open={isOpen} onOpenChange={setIsOpen}>
      <PaymentDialogTrigger asChild>
        {children || (
          <Button
            variant={triggerVariant}
            size={triggerSize}
            className={triggerClassName}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            {triggerText}
          </Button>
        )}
      </PaymentDialogTrigger>
      <PaymentDialogContent>
        <PaymentDialogHeader>
          <PaymentDialogTitle>Record Payment</PaymentDialogTitle>
          <PaymentDialogDescription>
            Enter payment details to record a new payment transaction.
          </PaymentDialogDescription>
        </PaymentDialogHeader>

        <EnhancedPaymentForm
          preselectedCatererId={preselectedCatererId}
          preselectedDistributionId={preselectedDistributionId}
          preselectedAmount={preselectedAmount}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
          isModal={true}
        />
      </PaymentDialogContent>
    </PaymentDialog>
  );
}
