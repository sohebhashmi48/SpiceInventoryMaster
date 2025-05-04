import { Card, CardContent } from "@/components/ui/card";
import { Package, Receipt, DollarSign, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ActivityItem {
  id: number;
  type: 'inventory' | 'invoice' | 'payment' | 'vendor';
  title: string;
  description: string;
  timestamp: Date;
}

const activities: ActivityItem[] = [
  {
    id: 1,
    type: 'inventory',
    title: 'Inventory Updated',
    description: 'Sarah added 15kg of Cinnamon to stock',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
  },
  {
    id: 2,
    type: 'invoice',
    title: 'Invoice Generated',
    description: 'Invoice #INV-7842 created for Global Foods Inc.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
  },
  {
    id: 3,
    type: 'payment',
    title: 'Payment Received',
    description: '$2,450.00 received from Eastern Spice Market',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
  },
  {
    id: 4,
    type: 'vendor',
    title: 'Vendor Added',
    description: 'New vendor "Premium Organics" added to the system',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4), // 4 days ago
  },
];

interface RecentActivityProps {
  className?: string;
  isLoading?: boolean;
}

export default function RecentActivity({ className, isLoading = false }: RecentActivityProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'inventory':
        return (
          <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center -ml-4">
            <Package className="text-white h-4 w-4" />
          </div>
        );
      case 'invoice':
        return (
          <div className="h-8 w-8 bg-secondary rounded-full flex items-center justify-center -ml-4">
            <Receipt className="text-white h-4 w-4" />
          </div>
        );
      case 'payment':
        return (
          <div className="h-8 w-8 bg-accent-dark rounded-full flex items-center justify-center -ml-4">
            <DollarSign className="text-white h-4 w-4" />
          </div>
        );
      case 'vendor':
        return (
          <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center -ml-4">
            <UserPlus className="text-white h-4 w-4" />
          </div>
        );
      default:
        return null;
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        return `Today, ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
      }
      return `Today, ${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
      return `Yesterday, ${date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })}`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
  };

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-heading font-semibold text-neutral-800">Recent Activity</h2>
          <a href="#" className="text-secondary text-sm font-medium">View All</a>
        </div>
        
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-neutral-200"></div>
          
          <div className="space-y-4">
            {isLoading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="flex ml-4 pb-4">
                  <Skeleton className="h-8 w-8 rounded-full -ml-4" />
                  <div className="ml-4 w-full">
                    <Skeleton className="h-4 w-2/3 mb-1" />
                    <Skeleton className="h-3 w-3/4 mb-1" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))
            ) : (
              activities.map((activity) => (
                <div key={activity.id} className="flex ml-4 pb-4">
                  <div className="flex-shrink-0 z-10">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-neutral-800">{activity.title}</p>
                    <p className="text-xs text-neutral-600">{activity.description}</p>
                    <p className="text-xs text-neutral-500 mt-1">{formatDate(activity.timestamp)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
