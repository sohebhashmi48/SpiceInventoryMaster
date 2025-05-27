import { useEffect } from 'react';
import Layout from '@/components/layout/layout';
import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, DollarSign } from 'lucide-react';
import { useLocation } from 'wouter';

export default function CatererPaymentFormRedirect() {
  const [location, setLocation] = useLocation();
  
  // Extract caterer ID from URL if present
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const catererId = urlParams.get('catererId');
  
  useEffect(() => {
    // Redirect to the actual payment form page
    window.location.href = `/caterer-payments/new${catererId ? `?catererId=${catererId}` : ''}`;
  }, [catererId]);
  
  return (
    <Layout>
      <PageHeader
        title="Record Caterer Payment"
        description="Redirecting to payment form..."
        icon={<DollarSign className="h-6 w-6 text-primary" />}
      >
        <Button
          variant="outline"
          onClick={() => {
            if (catererId) {
              window.location.href = `/caterers/${catererId}`;
            } else {
              window.location.href = '/caterers';
            }
          }}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </PageHeader>
      
      <div className="mt-6 flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg font-medium">Redirecting to payment form...</p>
          <p className="text-muted-foreground mt-2">If you are not redirected automatically, click the button below.</p>
          <Button 
            className="mt-4"
            onClick={() => {
              window.location.href = `/caterer-payments/new${catererId ? `?catererId=${catererId}` : ''}`;
            }}
          >
            Go to Payment Form
          </Button>
        </div>
      </div>
    </Layout>
  );
}
