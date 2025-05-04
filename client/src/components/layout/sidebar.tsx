import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, LayoutDashboard, PackageSearch, Store, Receipt, BarChart2, Users, Settings, HelpCircle } from 'lucide-react';
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
    { name: 'Inventory', path: '/inventory', icon: <PackageSearch className="h-5 w-5" /> },
    { name: 'Vendors', path: '/vendors', icon: <Store className="h-5 w-5" /> },
    { name: 'Billing', path: '/billing', icon: <Receipt className="h-5 w-5" /> },
    { name: 'Reports', path: '/reports', icon: <BarChart2 className="h-5 w-5" /> },
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
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search..."
              className="bg-primary w-full pl-10 pr-4 py-2 rounded-md text-sm text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-accent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
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
        
        <div className="p-4 border-t border-sidebar-border">
          <div className="bg-primary-light rounded-md p-3">
            <div className="flex items-center">
              <HelpCircle className="h-5 w-5 text-accent" />
              <p className="ml-2 text-sm font-medium">Need help?</p>
            </div>
            <p className="mt-2 text-xs text-neutral-300">Check our documentation for guides and tips</p>
            <Button variant="secondary" size="sm" className="mt-2 w-full bg-accent text-primary-dark hover:bg-accent-light">
              View Docs
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
