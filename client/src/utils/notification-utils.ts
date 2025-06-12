import { differenceInDays, isToday, addDays } from 'date-fns';

export interface NotificationVisibilityResult {
  shouldShow: boolean;
  daysUntilDue: number;
  isExactlyTwoDaysBefore: boolean;
}

/**
 * Determines if a notification should be visible based on the 2-day rule
 * Notifications should only be visible when they are exactly 2 days before the due date
 */
export function shouldShowNotification(dueDate: Date): NotificationVisibilityResult {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  const daysUntilDue = differenceInDays(due, today);
  const isExactlyTwoDaysBefore = daysUntilDue === 2;
  
  return {
    shouldShow: isExactlyTwoDaysBefore,
    daysUntilDue,
    isExactlyTwoDaysBefore
  };
}

/**
 * Session storage keys for dismissed notifications
 */
export const DISMISSED_NOTIFICATIONS_KEY = 'dismissedNotifications';

/**
 * Get list of dismissed notification IDs from session storage
 */
export function getDismissedNotifications(): string[] {
  try {
    const dismissed = sessionStorage.getItem(DISMISSED_NOTIFICATIONS_KEY);
    return dismissed ? JSON.parse(dismissed) : [];
  } catch (error) {
    console.error('Error reading dismissed notifications from session storage:', error);
    return [];
  }
}

/**
 * Add a notification ID to the dismissed list in session storage
 */
export function addDismissedNotification(notificationId: string): void {
  try {
    const dismissed = getDismissedNotifications();
    if (!dismissed.includes(notificationId)) {
      dismissed.push(notificationId);
      sessionStorage.setItem(DISMISSED_NOTIFICATIONS_KEY, JSON.stringify(dismissed));
    }
  } catch (error) {
    console.error('Error saving dismissed notification to session storage:', error);
  }
}

/**
 * Check if a notification is dismissed in the current session
 */
export function isNotificationDismissed(notificationId: string): boolean {
  const dismissed = getDismissedNotifications();
  return dismissed.includes(notificationId);
}

/**
 * Clear all dismissed notifications from session storage
 */
export function clearDismissedNotifications(): void {
  try {
    sessionStorage.removeItem(DISMISSED_NOTIFICATIONS_KEY);
  } catch (error) {
    console.error('Error clearing dismissed notifications from session storage:', error);
  }
}

/**
 * Filter notifications based on visibility rules and user interactions
 */
export function filterVisibleNotifications<T extends {
  id: string;
  originalDueDate: Date;
  isAcknowledged: boolean;
  acknowledgedAt?: Date;
}>(notifications: T[]): T[] {
  const dismissedIds = getDismissedNotifications();
  const now = new Date();

  return notifications.filter(notification => {
    // Don't show acknowledged notifications that were acknowledged less than 24 hours ago
    if (notification.isAcknowledged && notification.acknowledgedAt) {
      const acknowledgedTime = new Date(notification.acknowledgedAt);
      const hoursSinceAcknowledged = (now.getTime() - acknowledgedTime.getTime()) / (1000 * 60 * 60);

      // Don't show if acknowledged less than 24 hours ago
      if (hoursSinceAcknowledged < 24) {
        return false;
      }
    }

    // Don't show dismissed notifications (session-based)
    if (dismissedIds.includes(notification.id)) {
      return false;
    }

    // Only show notifications that are exactly 2 days before due date
    const visibility = shouldShowNotification(notification.originalDueDate);
    return visibility.shouldShow;
  });
}
