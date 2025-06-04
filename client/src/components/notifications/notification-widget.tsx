import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, AlertTriangle, ChevronRight } from 'lucide-react';
import { Link } from 'wouter';
import { format } from 'date-fns';

import { filterVisibleNotifications } from '@/utils/notification-utils';

interface PaymentReminder {
  id: string;
  catererId: number;
  catererName: string;
  amount: number;
  billNumber: string;
  originalDueDate: Date;
  reminderDate: Date;
  status: 'pending' | 'overdue' | 'due_today' | 'upcoming';
  isRead: boolean;
  isAcknowledged: boolean;
  acknowledgedAt?: Date;
  notes?: string;
}

interface NotificationWidgetProps {
  maxItems?: number;
  showHeader?: boolean;
  compact?: boolean;
}

export default function NotificationWidget({
  maxItems = 3,
  showHeader = true,
  compact = false
}: NotificationWidgetProps) {
  // Fetch payment reminders
  const { data: reminders = [], isLoading, error } = useQuery<PaymentReminder[]>({
    queryKey: ['payment-reminders'],
    queryFn: async () => {
      const response = await fetch('/api/payment-reminders', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch payment reminders');
      }
      const data = await response.json();

      // Map the data to include caterer names and ensure proper date parsing
      return data.map((reminder: any) => ({
        ...reminder,
        originalDueDate: new Date(reminder.originalDueDate),
        reminderDate: new Date(reminder.reminderDate),
        catererName: reminder.catererName || `Caterer ${reminder.catererId}`,
        billNumber: reminder.billNumber || `R-${reminder.id.slice(0, 8)}`,
        isAcknowledged: Boolean(reminder.isAcknowledged),
        acknowledgedAt: reminder.acknowledgedAt ? new Date(reminder.acknowledgedAt) : undefined
      }));
    },
    staleTime: 1000 * 60 * 2, // 2 minutes for widget
  });

  // Filter notifications that should be visible (2 days before due date)
  const activeNotifications = filterVisibleNotifications(reminders).slice(0, maxItems);

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <Card className={compact ? "shadow-sm" : ""}>
        {showHeader && (
          <CardHeader className={compact ? "pb-2" : ""}>
            <CardTitle className={`flex items-center space-x-2 ${compact ? "text-sm" : "text-base"}`}>
              <Bell className={`${compact ? "h-4 w-4" : "h-5 w-5"} text-primary`} />
              <span>Notifications</span>
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className={compact ? "pt-0" : ""}>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={compact ? "shadow-sm" : ""}>
        {showHeader && (
          <CardHeader className={compact ? "pb-2" : ""}>
            <CardTitle className={`flex items-center space-x-2 ${compact ? "text-sm" : "text-base"}`}>
              <AlertTriangle className={`${compact ? "h-4 w-4" : "h-5 w-5"} text-red-500`} />
              <span>Notifications</span>
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className={compact ? "pt-0" : ""}>
          <p className={`text-red-600 ${compact ? "text-xs" : "text-sm"}`}>
            Failed to load notifications
          </p>
        </CardContent>
      </Card>
    );
  }

  // Don't render if no active notifications
  if (activeNotifications.length === 0) {
    return null;
  }

  return (
    <Card className={`${compact ? "shadow-sm" : ""} border-l-4 border-l-orange-500 bg-orange-50`}>
      {showHeader && (
        <CardHeader className={compact ? "pb-2" : ""}>
          <CardTitle className={`flex items-center justify-between ${compact ? "text-sm" : "text-base"}`}>
            <div className="flex items-center space-x-2">
              <Bell className={`${compact ? "h-4 w-4" : "h-5 w-5"} text-orange-600`} />
              <span>Payment Reminders</span>
              <Badge variant="destructive" className={compact ? "text-xs px-1" : ""}>
                {activeNotifications.length} urgent
              </Badge>
            </div>
            <Link to="/notifications">
              <Button variant="ghost" size={compact ? "sm" : "default"} className="p-1">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={compact ? "pt-0 space-y-2" : "space-y-3"}>
        {activeNotifications.map((reminder) => (
          <div
            key={reminder.id}
            className={`${compact ? "p-2" : "p-3"} bg-white rounded-lg border border-orange-200 hover:border-orange-300 transition-colors`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <Badge className={`bg-orange-500 text-white ${compact ? "text-xs px-1" : ""}`}>
                    Due in 2 days
                  </Badge>
                </div>
                <p className={`font-medium text-gray-900 truncate ${compact ? "text-sm" : ""}`}>
                  {reminder.catererName}
                </p>
                <p className={`text-green-600 font-semibold ${compact ? "text-sm" : ""}`}>
                  {formatCurrency(reminder.amount)}
                </p>
                <p className={`text-gray-600 ${compact ? "text-xs" : "text-sm"}`}>
                  Bill #{reminder.billNumber} • Due: {format(reminder.originalDueDate, "MMM dd")}
                </p>
              </div>
              <Link to="/notifications">
                <Button
                  variant="outline"
                  size={compact ? "sm" : "default"}
                  className={`${compact ? "text-xs px-2" : ""} text-orange-600 border-orange-600 hover:bg-orange-50`}
                >
                  View
                </Button>
              </Link>
            </div>
          </div>
        ))}

        {reminders.length > maxItems && (
          <div className="text-center pt-2">
            <Link to="/notifications">
              <Button
                variant="outline"
                size={compact ? "sm" : "default"}
                className={`${compact ? "text-xs" : "text-sm"} text-orange-600 border-orange-600 hover:bg-orange-50`}
              >
                View All Notifications ({filterVisibleNotifications(reminders).length})
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
