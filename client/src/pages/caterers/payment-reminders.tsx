import React from 'react';
import { useQuery } from '@tanstack/react-query';
import EnhancedPaymentReminders from "@/components/caterers/enhanced-payment-reminders";
import CatererLayout from "@/components/caterers/caterer-layout";
import { Bell, AlertTriangle, CheckCircle } from "lucide-react";
import { Distribution } from '@/hooks/use-distributions';

export default function PaymentRemindersPage() {
  // Fetch payment reminders
  const { data: paymentReminders } = useQuery({
    queryKey: ['payment-reminders'],
    queryFn: async () => {
      const response = await fetch('/api/payment-reminders', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch payment reminders');
      }
      return response.json();
    },
  });

  // Fetch caterers for pending amounts count
  const { data: caterers } = useQuery<any[]>({
    queryKey: ['caterers'],
    queryFn: async () => {
      const response = await fetch('/api/caterers', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch caterers');
      }
      return response.json();
    },
  });

  // Fetch distributions for paid this month count
  const { data: distributions } = useQuery<Distribution[]>({
    queryKey: ['distributions'],
    queryFn: async () => {
      const response = await fetch('/api/distributions', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch distributions');
      }
      return response.json();
    },
  });

  // Calculate stats
  const activeRemindersCount = paymentReminders?.length || 0;
  const caterersWithPendingCount = caterers?.filter(caterer => Number(caterer.pendingAmount || 0) > 0).length || 0;
  const paidThisMonthCount = distributions?.filter(dist => {
    const distributionDate = new Date(dist.distributionDate);
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return distributionDate.getMonth() === currentMonth &&
           distributionDate.getFullYear() === currentYear &&
           dist.status === 'paid';
  }).length || 0;

  return (
    <CatererLayout
      title="Payment Reminders"
      description="Track and manage payment follow-ups for caterer bills"
    >
      <div className="space-y-6">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl shadow-lg">
              <Bell className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">Payment Reminders</h2>
              <p className="text-slate-600 mt-1">
                Set custom reminders for partial payments and follow-ups
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Active Reminders</span>
              </div>
              <p className="text-2xl font-bold text-blue-700 mt-1">{activeRemindersCount}</p>
            </div>
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-900">Caterers with Pending</span>
              </div>
              <p className="text-2xl font-bold text-orange-700 mt-1">{caterersWithPendingCount}</p>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Paid This Month</span>
              </div>
              <p className="text-2xl font-bold text-green-700 mt-1">{paidThisMonthCount}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <EnhancedPaymentReminders />
        </div>
      </div>
    </CatererLayout>
  );
}