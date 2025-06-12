import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import CatererLayout from '@/components/caterers/caterer-layout';

export default function DistributionsPage() {
  const [, navigate] = useLocation();

  // Redirect to payment history page
  useEffect(() => {
    navigate('/caterer-payments');
  }, [navigate]);

  return (
    <CatererLayout title="Redirecting..." description="Redirecting to payment history">
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecting to payment history...</p>
        </div>
      </div>
    </CatererLayout>
  );
}
