import { useLocation } from 'wouter';
import Layout from '@/components/layout/layout';
import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, DollarSign } from 'lucide-react';
import EnhancedPaymentForm from '@/components/caterers/enhanced-payment-form';

export default function NewCatererPaymentPage() {
  const [location, setLocation] = useLocation();

  // Get parameters from URL query params if available
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const preselectedCatererId = urlParams.get('catererId');
  const preselectedDistributionId = urlParams.get('distributionId');
  const preselectedAmount = urlParams.get('amount');

  // Log the parameters for debugging
  console.log('URL params:', { location, preselectedCatererId, preselectedDistributionId, preselectedAmount });

  return (
    <Layout>
      <PageHeader
        title="Record Caterer Payment"
        description="Record a new payment from a caterer"
        icon={<DollarSign className="h-6 w-6 text-primary" />}
      >
        <Button
          variant="outline"
          onClick={() => {
            if (preselectedCatererId) {
              setLocation(`/caterers/${preselectedCatererId}`);
            } else {
              setLocation('/caterer-payments');
            }
          }}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      <div className="mt-6">
        <EnhancedPaymentForm
          preselectedCatererId={preselectedCatererId || undefined}
          preselectedDistributionId={preselectedDistributionId || undefined}
          preselectedAmount={preselectedAmount || undefined}
          onSuccess={() => {
            if (preselectedCatererId) {
              setLocation(`/caterers/${preselectedCatererId}`);
            } else {
              setLocation('/caterer-payments');
            }
          }}
          onCancel={() => {
            if (preselectedCatererId) {
              setLocation(`/caterers/${preselectedCatererId}`);
            } else {
              setLocation('/caterer-payments');
            }
          }}
        />
      </div>
    </Layout>
  );
}
