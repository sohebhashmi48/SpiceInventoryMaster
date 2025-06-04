import React from 'react';
import { useLocation } from 'wouter';
import Layout from '@/components/layout/layout';
import NotificationManager from '@/components/notifications/notification-manager';

export default function NotificationsPage() {
  const [location] = useLocation();
  
  // Check if we should show only active notifications (e.g., from a direct link)
  const showOnlyActive = new URLSearchParams(window.location.search).get('active') === 'true';

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <NotificationManager showOnlyActiveNotifications={showOnlyActive} />
      </div>
    </Layout>
  );
}
