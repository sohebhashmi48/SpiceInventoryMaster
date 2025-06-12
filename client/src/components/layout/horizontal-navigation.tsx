import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Search, ChefHat, CreditCard, DollarSign, BarChart2, Plus, Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CatererHorizontalNavigationProps {
  className?: string;
}

export default function CatererHorizontalNavigation({ className }: CatererHorizontalNavigationProps) {
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  const isActive = (path: string) => {
    if (path === '/caterers' && location === '/caterers') {
      return true;
    }
    if (path !== '/caterers' && location.startsWith(path)) {
      return true;
    }
    return false;
  };

  const catererNavItems = [
    { name: 'All Caterers', path: '/caterers', icon: <ChefHat className="h-4 w-4" /> },
    { name: 'Billing', path: '/caterer-billing', icon: <CreditCard className="h-4 w-4" /> },
    { name: 'Payments', path: '/caterer-payments', icon: <DollarSign className="h-4 w-4" /> },
    { name: 'Pending Bills', path: '/caterers/pending-bills', icon: <Bell className="h-4 w-4" /> },
    { name: 'Reports', path: '/caterer-reports', icon: <BarChart2 className="h-4 w-4" /> },
  ];

  return (
    <nav className={cn("bg-white border-b border-gray-200 shadow-sm", className)}>
      <div className="px-4">
        <div className="flex items-center justify-between h-12">
          {/* Navigation Items */}
          <div className="flex items-center space-x-1">
            {catererNavItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <a className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive(item.path)
                    ? "bg-primary text-white"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                )}>
                  {item.icon}
                  <span className="ml-2">{item.name}</span>
                </a>
              </Link>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search caterers..."
                className="w-48 pl-10 pr-4 py-1.5 text-sm border-gray-300 focus:border-primary focus:ring-primary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Add New Caterer Button */}
            <Link href="/caterers/new">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Caterer
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
