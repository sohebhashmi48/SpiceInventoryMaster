import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Bell, AlertCircle, Clock, CheckCircle, X, ShoppingBag, CreditCard, ChefHat, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { useNotifications } from '@/hooks/useNotifications';

interface Notification {
  id: number;
  type: 'payment_due' | 'payment_reminder' | 'low_stock' | 'new_order' | 'payment_received' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
  relatedId?: number;
  priority?: 'high' | 'medium' | 'low';
  isOverdue?: boolean;
}

export default function NotificationDropdown() {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);

  // State to manage notifications locally
  const [localNotifications, setLocalNotifications] = useState<Notification[]>([]);

  // Fetch payment reminder notifications
  const { data: notificationsData } = useNotifications();

  // Fetch notifications
  const { data: fetchedNotifications = [], refetch } = useQuery<Notification[]>({
    queryKey: ['legacy-notifications'],
    queryFn: async () => {
      try {
        // Try to fetch real notifications from the API
        const response = await fetch('/api/notifications', {
          credentials: 'include',
        });

        if (response.ok) {
          const result = await response.json();
          // Handle both array and object responses
          if (Array.isArray(result)) {
            return result;
          } else if (result.data && Array.isArray(result.data)) {
            return result.data;
          } else {
            return [];
          }
        }

        // If API endpoint doesn't exist or fails, return empty array
        console.log('No notifications API endpoint available');
        return [];
      } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Update local notifications when fetched notifications or payment reminders change
  useEffect(() => {
    // Ensure fetchedNotifications is an array
    const existingNotifications = Array.isArray(fetchedNotifications) ? fetchedNotifications : [];
    const allNotifications: Notification[] = [...existingNotifications];

    // Add payment reminder notifications
    if (notificationsData?.data) {
      const paymentNotifications: Notification[] = notificationsData.data.map(notification => ({
        id: parseInt(notification.id.replace('payment-', '')),
        type: 'payment_reminder' as const,
        title: notification.title,
        message: notification.message,
        timestamp: notification.createdAt,
        read: false,
        link: `/caterer-billing`,
        relatedId: notification.data.distributionId,
        priority: notification.priority,
        isOverdue: notification.isOverdue
      }));

      allNotifications.push(...paymentNotifications);
    }

    // Sort by priority and timestamp (high priority and recent first)
    allNotifications.sort((a, b) => {
      // First sort by priority
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority || 'low'];
      const bPriority = priorityOrder[b.priority || 'low'];

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      // Then sort by timestamp (newest first)
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    setLocalNotifications(allNotifications);
  }, [fetchedNotifications, notificationsData]);

  const unreadCount = localNotifications.filter(n => !n.read).length;

  const markAsRead = (id: number) => {
    // Update local state
    setLocalNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    );

    // Try to update on the server if API exists
    try {
      fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        credentials: 'include',
      }).catch(error => {
        console.error('Error marking notification as read:', error);
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = () => {
    // Update local state
    setLocalNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );

    // Try to update on the server if API exists
    try {
      fetch('/api/notifications/read-all', {
        method: 'PATCH',
        credentials: 'include',
      }).catch(error => {
        console.error('Error marking all notifications as read:', error);
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const dismissNotification = (id: number) => {
    // Remove from local state
    setLocalNotifications(prev =>
      prev.filter(notification => notification.id !== id)
    );

    // Try to update on the server if API exists
    try {
      fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      }).catch(error => {
        console.error('Error dismissing notification:', error);
      });
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  const getNotificationIcon = (type: string, isOverdue?: boolean) => {
    switch (type) {
      case 'payment_due':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'payment_reminder':
        return isOverdue
          ? <AlertCircle className="h-4 w-4 text-red-500" />
          : <Calendar className="h-4 w-4 text-orange-500" />;
      case 'low_stock':
        return <ShoppingBag className="h-4 w-4 text-orange-500" />;
      case 'payment_received':
        return <CreditCard className="h-4 w-4 text-green-500" />;
      case 'new_order':
        return <ChefHat className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.link) {
      navigate(notification.link);
    }
    markAsRead(notification.id);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] bg-red-500">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <div className="flex items-center justify-between p-2">
          <DropdownMenuLabel className="text-base">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-8">
              Mark all as read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup className="max-h-[400px] overflow-y-auto">
          {localNotifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <p>No notifications</p>
            </div>
          ) : (
            localNotifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`p-3 cursor-pointer ${!notification.read ? 'bg-muted/50' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type, notification.isOverdue)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-start">
                      <p className={`text-sm font-medium ${!notification.read ? 'text-primary' : ''}`}>
                        {notification.title}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 -mr-1 -mt-1 text-muted-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissNotification(notification.id);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">{notification.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <div className="p-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => {
              navigate('/notifications');
              setOpen(false);
            }}
          >
            View all notifications
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
