import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { LogOut, Menu, Search, Settings, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import NotificationDropdown from './notification-dropdown';

interface HeaderProps {
  toggleSidebar: () => void;
}

export default function Header({ toggleSidebar }: HeaderProps) {
  const { user, logoutMutation } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <header className="bg-primary text-white shadow-md z-30 sticky top-0">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="lg:hidden mr-2 text-white hover:bg-primary-light focus:outline-none"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center">
              <span className="text-accent mr-2">✦</span>
              <h1 className="font-heading font-semibold text-xl">RoyalSpicyMasala</h1>
            </div>
          </div>

          <div className="flex items-center">
            <div className="relative mr-4">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchOpen(!searchOpen)}
                  className="sm:hidden mr-2 text-white hover:bg-primary-light"
                >
                  <Search className="h-5 w-5" />
                </Button>
                
                {searchOpen && (
                  <div className="fixed inset-0 bg-white z-50 p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-medium">Search</h2>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSearchOpen(false)}
                        className="text-gray-500"
                      >
                        <span className="sr-only">Close search</span>
                        {/* Close icon SVG */}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </Button>
                    </div>
                    <div className="relative flex-1">
                      <Input
                        type="text"
                        placeholder="Search inventory, suppliers, customers..."
                        className="w-full pl-9 focus:ring-primary focus:border-primary"
                      />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="hidden sm:block">
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Search inventory, suppliers..."
                      className="w-full sm:w-48 md:w-64 pl-9 focus:ring-primary focus:border-primary bg-primary-light text-white"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <NotificationDropdown />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center focus:outline-none hover:bg-primary-light rounded-md p-1 ml-2"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-accent text-primary text-sm">
                      {getInitials(user?.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className={cn(
                    "ml-2 font-medium transition-all duration-100",
                    "hidden sm:block"
                  )}>
                    {user?.fullName || 'User'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
