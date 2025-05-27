import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import {
  ChefHat,
  CreditCard,
  Users,
  FileText,
  PieChart,
  Home,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CatererSidebarProps {
  className?: string;
}

export default function CatererSidebar({ className }: CatererSidebarProps) {
  const [location, setLocation] = useLocation();

  const isActive = (path: string) => {
    if (path === '/caterers' && location === '/caterers') {
      return true;
    }
    if (path !== '/caterers' && location.startsWith(path)) {
      return true;
    }
    return false;
  };

  const navItems = [
    { name: 'All Caterers', path: '/caterers', icon: <ChefHat className="h-4 w-4 mr-2" /> },
    { name: 'Billing', path: '/caterer-billing', icon: <CreditCard className="h-4 w-4 mr-2" /> },
    { name: 'Payment History', path: '/caterer-payments', icon: <FileText className="h-4 w-4 mr-2" /> },
    { name: 'Reports', path: '/caterer-reports', icon: <PieChart className="h-4 w-4 mr-2" /> },
  ];

  return (
    <div className={cn("space-y-4", className)}>
      <div className="px-3 py-2">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Caterer Management</h2>
        </div>
        <div className="space-y-1">
          <Button
            variant="secondary"
            size="sm"
            className="w-full justify-start"
            onClick={() => setLocation('/caterers/new')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Caterer
          </Button>
        </div>
      </div>
      <div className="px-3 py-2">
        <h2 className="mb-2 px-4 text-sm font-semibold tracking-tight">Navigation</h2>
        <div className="space-y-1">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant={isActive(item.path) ? "secondary" : "ghost"}
              size="sm"
              className="w-full justify-start"
              onClick={() => setLocation(item.path)}
            >
              {item.icon}
              {item.name}
            </Button>
          ))}
        </div>
      </div>
      <div className="px-3 py-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={() => setLocation('/')}
        >
          <Home className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
