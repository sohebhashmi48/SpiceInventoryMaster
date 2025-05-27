import React from 'react';
import Layout from '@/components/layout/layout';
import PageHeader from '@/components/common/page-header';
import ModernCatererBillingUI from '@/components/caterers/modern-caterer-billing-ui';
import { FileText, Plus } from 'lucide-react';

export default function CatererBillingPage() {
  return (
    <Layout>
      <PageHeader
        title="Caterer Billing"
        description="Create and manage bills for caterers"
        icon={<FileText className="h-6 w-6 text-secondary" />}
      >
        {/* Header content can be added here if needed */}
      </PageHeader>
      
      <div className="mt-6">
        <ModernCatererBillingUI />
      </div>
    </Layout>
  );
}
