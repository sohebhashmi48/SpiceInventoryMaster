import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Bell, AlertCircle, Clock, CheckCircle, X, ShoppingBag, CreditCard, ChefHat } from 'lucide-react';
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

interface Notification {
  id: number;
  type: 'payment_due' | 'low_stock' | 'new_order' | 'payment_received' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
  relatedId?: number;
}

export default function NotificationDropdown() {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);

  // State to manage notifications locally
  const [localNotifications, setLocalNotifications] = useState<Notification[]>([]);

  // Fetch notifications
  const { data: fetchedNotifications = [], refetch } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      try {
        // Try to fetch real notifications from the API
        const response = await fetch('/api/notifications', {
          credentials: 'include',
        });

        if (response.ok) {
          return await response.json();
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

  // Update local notifications when fetched notifications change
  useEffect(() => {
    setLocalNotifications(fetchedNotifications);
  }, [fetchedNotifications]);

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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'payment_due':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
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
                    {getNotificationIcon(notification.type)}
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
