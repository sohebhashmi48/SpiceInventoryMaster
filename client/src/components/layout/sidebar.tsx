import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, PackageSearch, Store, Receipt,
  BarChart2, Users, Settings, HelpCircle, Leaf, FileText,
  ChefHat, CreditCard, DollarSign, History, Bell, ShoppingCart,
  ClipboardList, Calculator, Menu, X
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isMobileOpen: boolean;
  closeMobileSidebar: () => void;
}

export default function Sidebar({ isMobileOpen, closeMobileSidebar }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  

  const isActive = (path: string) => location === path;

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard className="h-5 w-5" /> },
    { name: 'Orders', path: '/orders', icon: <ClipboardList className="h-5 w-5" /> },
    { name: 'Inventory', path: '/inventory', icon: <PackageSearch className="h-5 w-5" /> },
    { name: 'Products', path: '/spices', icon: <Leaf className="h-5 w-5" /> },
    { name: 'Suppliers', path: '/suppliers', icon: <Store className="h-5 w-5" /> },
    { name: 'Customer Billing', path: '/customer-billing', icon: <ShoppingCart className="h-5 w-5" /> },
    { name: 'Caterers', path: '/caterers', icon: <ChefHat className="h-5 w-5" /> },
    { name: 'Purchases', path: '/purchases', icon: <FileText className="h-5 w-5" /> },
    { name: 'Reports', path: '/reports', icon: <BarChart2 className="h-5 w-5" /> },
  ];

  const financialItems = [
    { name: 'Financial Tracker', path: '/financial-tracker', icon: <Calculator className="h-5 w-5" /> },
  ];

  const managementItems = [
    { name: 'Users', path: '/users', icon: <Users className="h-5 w-5" /> },
    { name: 'Settings', path: '/settings', icon: <Settings className="h-5 w-5" /> },
  ];

  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      closeMobileSidebar();
    }
  };

  return (
    <aside
      className={`bg-primary text-white fixed inset-y-0 left-0 w-full transform transition-transform duration-300 ease-in-out z-30 shadow-lg overflow-y-auto overflow-x-hidden
                 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
                 sm:relative sm:translate-x-0 sm:inset-auto sm:w-64 sm:top-0 sm:bottom-0 sm:left-0`}
    >
      <div className="flex flex-col h-full">
        {/* Mobile Close Button */}
        <div className="flex justify-end p-4 sm:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={closeMobileSidebar}
            className="text-white"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close menu</span>
          </Button>
        </div>

        <div className="flex-1 px-2 sm:px-4">
          {/* Sidebar Menu without search */}


          {/* Navigation */}
          <nav className="py-2">
            <div className="mb-2">
              <p className="text-xs font-medium text-primary-foreground/70 uppercase tracking-wider px-2 sm:px-3 mb-2">
                Main
              </p>
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={handleNavClick}
                  className={cn(
                    "flex items-center px-2 sm:px-3 py-2.5 text-sm rounded-md transition-colors w-full",
                    isActive(item.path)
                      ? "bg-accent text-primary"
                      : "text-primary-foreground/80 hover:bg-primary-dark"
                  )}
                >
                  <span className="flex items-center">
                    {item.icon}
                    <span className="ml-3">{item.name}</span>
                  </span>
                </Link>
              ))}
            </div>

            <div className="mb-2">
              <p className="text-xs font-medium text-primary-foreground/70 uppercase tracking-wider px-2 sm:px-3 mb-2">
                Financial Management
              </p>
              {financialItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={handleNavClick}
                  className={cn(
                    "flex items-center px-2 sm:px-3 py-2.5 text-sm rounded-md transition-colors w-full",
                    isActive(item.path)
                      ? "bg-accent text-primary"
                      : "text-primary-foreground/80 hover:bg-primary-dark"
                  )}
                >
                  <span className="flex items-center">
                    {item.icon}
                    <span className="ml-3">{item.name}</span>
                  </span>
                </Link>
              ))}
            </div>

            {user?.role === 'admin' && (
              <div className="mb-2">
                <p className="text-xs font-medium text-primary-foreground/70 uppercase tracking-wider px-2 sm:px-3 mb-2">
                  Management
                </p>
                {managementItems.map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={handleNavClick}
                    className={cn(
                      "flex items-center px-2 sm:px-3 py-2.5 text-sm rounded-md transition-colors w-full",
                      isActive(item.path)
                        ? "bg-accent text-primary"
                        : "text-primary-foreground/80 hover:bg-primary-dark"
                    )}
                  >
                    <span className="flex items-center">
                      {item.icon}
                      <span className="ml-3">{item.name}</span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </nav>
        </div>

        <div className="hidden sm:block pb-4 px-4">
          <div className="p-4 bg-primary-dark rounded-md">
            <p className="text-xs font-medium text-primary-foreground/70 uppercase tracking-wider mb-2">
              Application Version
            </p>
            <p className="text-sm text-primary-foreground">v1.0.0</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
