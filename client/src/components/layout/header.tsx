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
import { BellIcon, LogOut, Menu, Settings, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

interface HeaderProps {
  toggleSidebar: () => void;
}

export default function Header({ toggleSidebar }: HeaderProps) {
  const { user, logoutMutation } = useAuth();
  const [notificationCount] = useState(3);

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
              <h1 className="font-heading font-semibold text-xl">SpiceManager</h1>
            </div>
          </div>
          
          <div className="flex items-center">
            <div className="relative mr-4">
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative p-2 rounded-full hover:bg-primary-light focus:outline-none"
              >
                <BellIcon className="h-5 w-5" />
                {notificationCount > 0 && (
                  <span className="absolute top-1 right-1 bg-secondary text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </Button>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex items-center focus:outline-none hover:bg-primary-light rounded-md p-1"
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
              <DropdownMenuContent align="end">
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
