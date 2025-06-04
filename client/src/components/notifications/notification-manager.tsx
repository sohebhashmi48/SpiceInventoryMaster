import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Bell, Settings, AlertTriangle } from 'lucide-react';
import { useLocation } from 'wouter';

import EnhancedNotificationSystem from './enhanced-notification-system';
import NotificationSystem from './notification-system';
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

interface NotificationManagerProps {
  showOnlyActiveNotifications?: boolean;
}

export default function NotificationManager({
  showOnlyActiveNotifications = false
}: NotificationManagerProps) {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(showOnlyActiveNotifications ? 'active' : 'manage');

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
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Update reminder mutation
  const updateReminderMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PaymentReminder> }) => {
      const response = await fetch(`/api/payment-reminders/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        throw new Error('Failed to update reminder');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-reminders'] });
    },
  });

  // Add reminder mutation
  const addReminderMutation = useMutation({
    mutationFn: async (reminder: Omit<PaymentReminder, 'id'>) => {
      const response = await fetch('/api/payment-reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(reminder),
      });
      if (!response.ok) {
        throw new Error('Failed to add reminder');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-reminders'] });
      toast({
        title: "Reminder Added",
        description: "Payment reminder has been created successfully",
      });
    },
  });

  // Delete reminder mutation
  const deleteReminderMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/payment-reminders/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to delete reminder');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-reminders'] });
      toast({
        title: "Reminder Deleted",
        description: "Payment reminder has been deleted successfully",
      });
    },
  });

  // Handler functions
  const handleUpdateReminder = (id: string, updates: Partial<PaymentReminder>) => {
    updateReminderMutation.mutate({ id, updates });
  };

  const handleAddReminder = (reminder: Omit<PaymentReminder, 'id'>) => {
    addReminderMutation.mutate(reminder);
  };

  const handleDeleteReminder = (id: string) => {
    deleteReminderMutation.mutate(id);
  };

  const handleNavigateAway = () => {
    // Navigate to dashboard or previous page
    setLocation('/dashboard');
  };

  // Filter notifications for active tab
  const activeNotifications = filterVisibleNotifications(reminders);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading notifications...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">Failed to load notifications</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['payment-reminders'] })}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // If showing only active notifications and there are none, return null
  if (showOnlyActiveNotifications && activeNotifications.length === 0) {
    return null;
  }

  // If showing only active notifications, render just the enhanced system
  if (showOnlyActiveNotifications) {
    return (
      <EnhancedNotificationSystem
        reminders={reminders}
        onUpdateReminder={handleUpdateReminder}
        onNavigateAway={handleNavigateAway}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Notification Center</h2>
          {activeNotifications.length > 0 && (
            <Badge variant="destructive">
              {activeNotifications.length} urgent
            </Badge>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active" className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Active Notifications</span>
            {activeNotifications.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeNotifications.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Manage Reminders</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Active Notifications (2 Days Before Due)</CardTitle>
            </CardHeader>
            <CardContent>
              <EnhancedNotificationSystem
                reminders={reminders}
                onUpdateReminder={handleUpdateReminder}
                onNavigateAway={handleNavigateAway}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Manage All Reminders</CardTitle>
            </CardHeader>
            <CardContent>
              <NotificationSystem
                reminders={reminders}
                onUpdateReminder={handleUpdateReminder}
                onAddReminder={handleAddReminder}
                onDeleteReminder={handleDeleteReminder}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
