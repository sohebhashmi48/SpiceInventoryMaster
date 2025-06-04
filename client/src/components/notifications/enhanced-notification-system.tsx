import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { 
  Bell, 
  AlertTriangle, 
  Clock, 
  CalendarIcon, 
  User, 
  DollarSign,
  Check,
  X,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  filterVisibleNotifications, 
  addDismissedNotification,
  shouldShowNotification 
} from '@/utils/notification-utils';

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

interface EnhancedNotificationSystemProps {
  reminders: PaymentReminder[];
  onUpdateReminder: (id: string, updates: Partial<PaymentReminder>) => void;
  onNavigateAway?: () => void;
}

export default function EnhancedNotificationSystem({
  reminders,
  onUpdateReminder,
  onNavigateAway
}: EnhancedNotificationSystemProps) {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Filter notifications based on visibility rules
  const visibleNotifications = filterVisibleNotifications(reminders);

  // Get urgency color based on status
  const getUrgencyColor = (status: PaymentReminder['status']) => {
    switch (status) {
      case 'overdue':
        return 'bg-red-500 text-white';
      case 'due_today':
        return 'bg-orange-500 text-white';
      case 'upcoming':
        return 'bg-yellow-500 text-black';
      default:
        return 'bg-blue-500 text-white';
    }
  };

  // Get urgency icon
  const getUrgencyIcon = (status: PaymentReminder['status']) => {
    switch (status) {
      case 'overdue':
        return <AlertTriangle className="h-4 w-4" />;
      case 'due_today':
        return <Clock className="h-4 w-4" />;
      case 'upcoming':
        return <Bell className="h-4 w-4" />;
      default:
        return <CalendarIcon className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString()}`;
  };

  // Handle acknowledging a notification (permanent)
  const handleAcknowledge = async (reminder: PaymentReminder) => {
    setIsProcessing(reminder.id);
    try {
      const response = await fetch(`/api/payment-reminders/${reminder.id}/acknowledge`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        onUpdateReminder(reminder.id, {
          isAcknowledged: true,
          acknowledgedAt: new Date()
        });
        
        toast({
          title: "Reminder Acknowledged",
          description: `Payment reminder for ${reminder.catererName} has been permanently acknowledged.`,
          variant: "default",
        });

        // Navigate away after acknowledgment
        setTimeout(() => {
          onNavigateAway?.();
        }, 1500);
      } else {
        throw new Error('Failed to acknowledge reminder');
      }
    } catch (error) {
      console.error('Error acknowledging reminder:', error);
      toast({
        title: "Error",
        description: "Failed to acknowledge reminder. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(null);
    }
  };

  // Handle dismissing a notification (temporary)
  const handleDismiss = async (reminder: PaymentReminder) => {
    setIsProcessing(reminder.id);
    try {
      const response = await fetch(`/api/payment-reminders/${reminder.id}/dismiss`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        // Add to session storage for temporary dismissal
        addDismissedNotification(reminder.id);
        
        toast({
          title: "Reminder Dismissed",
          description: `Payment reminder for ${reminder.catererName} has been dismissed until app restart.`,
          variant: "default",
        });

        // Navigate away after dismissal
        setTimeout(() => {
          onNavigateAway?.();
        }, 1500);
      } else {
        throw new Error('Failed to dismiss reminder');
      }
    } catch (error) {
      console.error('Error dismissing reminder:', error);
      toast({
        title: "Error",
        description: "Failed to dismiss reminder. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(null);
    }
  };

  // Show toast notifications for visible reminders
  useEffect(() => {
    visibleNotifications.forEach(reminder => {
      const visibility = shouldShowNotification(reminder.originalDueDate);
      if (visibility.isExactlyTwoDaysBefore) {
        toast({
          title: "Payment Reminder - 2 Days Notice",
          description: `${reminder.catererName} - ${formatCurrency(reminder.amount)} due in 2 days`,
          variant: "default",
        });
      }
    });
  }, [visibleNotifications]);

  if (visibleNotifications.length === 0) {
    return null; // Don't render anything if no notifications should be visible
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bell className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Payment Reminders</h3>
          <Badge variant="destructive" className="ml-2">
            {visibleNotifications.length} due in 2 days
          </Badge>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {visibleNotifications.map((reminder) => (
          <Card key={reminder.id} className={cn(
            "transition-all duration-200 border-l-4 border-l-orange-500",
            "ring-2 ring-orange-200 bg-orange-50"
          )}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge className="bg-orange-500 text-white">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>Due in 2 days</span>
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{reminder.catererName}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <span className="text-lg font-semibold text-green-600">
                        {formatCurrency(reminder.amount)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CalendarIcon className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        Bill #{reminder.billNumber} • Due: {format(new Date(reminder.originalDueDate), "PPP")}
                      </span>
                    </div>
                    {reminder.notes && (
                      <p className="text-sm text-gray-600 mt-2">{reminder.notes}</p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-600 border-green-600 hover:bg-green-50"
                    onClick={() => handleAcknowledge(reminder)}
                    disabled={isProcessing === reminder.id}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-50"
                    onClick={() => handleDismiss(reminder)}
                    disabled={isProcessing === reminder.id}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Message */}
      <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
        <div className="flex items-start space-x-2">
          <Bell className="h-4 w-4 text-blue-600 mt-0.5" />
          <div>
            <p className="font-medium text-blue-800">Notification Controls:</p>
            <p className="mt-1">
              <Check className="h-3 w-3 inline text-green-600 mr-1" />
              <strong>Acknowledge:</strong> Permanently mark as handled (won't show again)
            </p>
            <p>
              <X className="h-3 w-3 inline text-red-600 mr-1" />
              <strong>Dismiss:</strong> Hide until app restart (temporary)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
