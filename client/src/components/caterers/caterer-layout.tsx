import { ReactNode } from 'react';
import Layout from '@/components/layout/layout';
import CatererHorizontalNavigation from '@/components/layout/horizontal-navigation';

interface CatererLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export default function CatererLayout({
  children,
  title = "Caterer Management",
  description = "Manage your caterers, billing, and payments"
}: CatererLayoutProps) {
  return (
    <Layout>
      <div className="flex flex-col">
        {/* Caterer-specific horizontal navigation */}
        <CatererHorizontalNavigation />

        {/* Main content area */}
        <div className="flex-1 p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
          </div>
          {children}
        </div>
      </div>
    </Layout>
  );
}
