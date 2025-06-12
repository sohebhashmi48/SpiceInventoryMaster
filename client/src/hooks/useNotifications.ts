import { useQuery } from '@tanstack/react-query';

export interface PaymentReminder {
  id: number;
  billNo: string;
  catererId: number;
  catererName: string;
  distributionDate: string;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  nextPaymentDate: string;
  reminderDate: string;
  status: string;
  notes?: string;
}

export interface Notification {
  id: string;
  type: 'payment_reminder';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  isOverdue: boolean;
  data: {
    distributionId: number;
    catererId: number;
    catererName: string;
    billNo: string;
    balanceDue: number;
    reminderDate: string;
    nextPaymentDate: string;
  };
  createdAt: string;
}

export interface NotificationsResponse {
  success: boolean;
  data: Notification[];
  count: number;
}

// Fetch all notifications
export const useNotifications = () => {
  return useQuery<NotificationsResponse>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await fetch('/api/notifications', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
    staleTime: 10000, // Consider data stale after 10 seconds
  });
};

// Fetch payment reminders specifically
export const usePaymentReminders = () => {
  return useQuery<{ success: boolean; data: PaymentReminder[] }>({
    queryKey: ['payment-reminders'],
    queryFn: async () => {
      const response = await fetch('/api/notifications/payment-reminders', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch payment reminders');
      }
      
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000,
  });
};

// Helper function to get notification count
export const useNotificationCount = () => {
  const { data } = useNotifications();
  return data?.count || 0;
};

// Helper function to get high priority notifications
export const useHighPriorityNotifications = () => {
  const { data } = useNotifications();
  return data?.data?.filter(notification => notification.priority === 'high') || [];
};

// Helper function to get overdue notifications
export const useOverdueNotifications = () => {
  const { data } = useNotifications();
  return data?.data?.filter(notification => notification.isOverdue) || [];
};
