import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Search, LayoutDashboard, PackageSearch, Store, Receipt,
  BarChart2, Users, Settings, HelpCircle, Leaf, FileText,
  ChefHat, CreditCard, DollarSign, History, Bell, ShoppingCart,
  ClipboardList, Calculator
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface SidebarProps {
  isMobileOpen: boolean;
  closeMobileSidebar: () => void;
}

export default function Sidebar({ isMobileOpen, closeMobileSidebar }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

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
      className={`bg-sidebar fixed inset-y-0 left-0 w-64 text-white flex-shrink-0 shadow-lg z-20
                 lg:relative lg:translate-x-0 transition-transform duration-300
                 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
    >
      <div className="h-full flex flex-col">

        <nav className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="px-4 mt-2 mb-4">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Main</p>
          </div>

          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              onClick={handleNavClick}
            >
              <a className={`flex items-center px-4 py-3 text-sm hover:bg-primary-light
                            ${isActive(item.path) ? 'sidebar-active' : ''}`}>
                {item.icon}
                <span className="ml-3">{item.name}</span>
              </a>
            </Link>
          ))}

          {/* Financial Management Section */}
          <div className="px-4 mt-6 mb-4">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Financial Management</p>
          </div>

          {financialItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              onClick={handleNavClick}
            >
              <a className={`flex items-center px-4 py-3 text-sm hover:bg-primary-light
                            ${isActive(item.path) ? 'sidebar-active' : ''}`}>
                {item.icon}
                <span className="ml-3">{item.name}</span>
              </a>
            </Link>
          ))}

          {user?.role === 'admin' && (
            <>
              <div className="px-4 mt-6 mb-4">
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Management</p>
              </div>

              {managementItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={handleNavClick}
                >
                  <a className={`flex items-center px-4 py-3 text-sm hover:bg-primary-light
                                ${isActive(item.path) ? 'sidebar-active' : ''}`}>
                    {item.icon}
                    <span className="ml-3">{item.name}</span>
                  </a>
                </Link>
              ))}
            </>
          )}
        </nav>
      </div>
    </aside>
  );
}
