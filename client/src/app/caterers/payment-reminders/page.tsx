import { Metadata } from "next";
import EnhancedPaymentReminders from "@/components/caterers/enhanced-payment-reminders";
import CatererLayout from "@/components/caterers/caterer-layout";
import { Bell } from "lucide-react";

export const metadata: Metadata = {
  title: "Payment Reminders | Spice Inventory",
  description: "Manage payment reminders for caterers",
};

export default function PaymentRemindersPage() {
  return (
    <CatererLayout 
      title="Payment Reminders" 
      description="Manage and track payment reminders for caterers"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="h-6 w-6 text-primary" />
            <h2 className="text-3xl font-bold tracking-tight">Payment Reminders</h2>
          </div>
        </div>
        <div className="grid gap-4">
          <EnhancedPaymentReminders />
        </div>
      </div>
    </CatererLayout>
  );
} 