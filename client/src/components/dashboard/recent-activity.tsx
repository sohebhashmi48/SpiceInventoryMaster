import { Card, CardContent } from "@/components/ui/card";
import { Package, Receipt, DollarSign, UserPlus, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";

interface RecentActivity {
  id: string;
  type: 'inventory' | 'distribution' | 'payment' | 'supplier';
  title: string;
  description: string;
  timestamp: string;
  entityId?: number;
  amount?: number;
}

interface RecentActivityProps {
  className?: string;
  isLoading?: boolean;
}

export default function RecentActivity({ className, isLoading = false }: RecentActivityProps) {
  // Fetch real recent activities data
  const { data: activities, isLoading: activitiesLoading } = useQuery<RecentActivity[]>({
    queryKey: ["/api/dashboard/recent-activities"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'inventory':
        return (
          <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center -ml-4">
            <Package className="text-white h-4 w-4" />
          </div>
        );
      case 'distribution':
        return (
          <div className="h-8 w-8 bg-secondary rounded-full flex items-center justify-center -ml-4">
            <ShoppingCart className="text-white h-4 w-4" />
          </div>
        );
      case 'payment':
        return (
          <div className="h-8 w-8 bg-green-600 rounded-full flex items-center justify-center -ml-4">
            <DollarSign className="text-white h-4 w-4" />
          </div>
        );
      case 'supplier':
        return (
          <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center -ml-4">
            <UserPlus className="text-white h-4 w-4" />
          </div>
        );
      default:
        return (
          <div className="h-8 w-8 bg-gray-500 rounded-full flex items-center justify-center -ml-4">
            <Receipt className="text-white h-4 w-4" />
          </div>
        );
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
      }
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
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

  const isDataLoading = isLoading || activitiesLoading;

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
            {isDataLoading ? (
              Array(5).fill(0).map((_, i) => (
                <div key={i} className="flex ml-4 pb-4">
                  <Skeleton className="h-8 w-8 rounded-full -ml-4" />
                  <div className="ml-4 w-full">
                    <Skeleton className="h-4 w-2/3 mb-1" />
                    <Skeleton className="h-3 w-3/4 mb-1" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))
            ) : activities && activities.length > 0 ? (
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
            ) : (
              <div className="text-center py-8">
                <Package className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500 text-sm">No recent activities</p>
                <p className="text-gray-400 text-xs">Activities will appear here as you use the system</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
