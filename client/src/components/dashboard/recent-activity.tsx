import { Card, CardContent } from "@/components/ui/card";
import { Package, Receipt, DollarSign, UserPlus, ShoppingCart, Plus, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";

interface RecentActivity {
  id: string;
  type: 'inventory' | 'distribution' | 'payment' | 'supplier' | 'order' | 'product';
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
          <div className="h-7 w-7 bg-blue-500 rounded-full flex items-center justify-center -ml-3.5">
            <Package className="text-white h-3.5 w-3.5" />
          </div>
        );
      case 'distribution':
        return (
          <div className="h-7 w-7 bg-purple-500 rounded-full flex items-center justify-center -ml-3.5">
            <ShoppingCart className="text-white h-3.5 w-3.5" />
          </div>
        );
      case 'payment':
        return (
          <div className="h-7 w-7 bg-green-500 rounded-full flex items-center justify-center -ml-3.5">
            <DollarSign className="text-white h-3.5 w-3.5" />
          </div>
        );
      case 'supplier':
        return (
          <div className="h-7 w-7 bg-indigo-500 rounded-full flex items-center justify-center -ml-3.5">
            <UserPlus className="text-white h-3.5 w-3.5" />
          </div>
        );
      case 'order':
        return (
          <div className="h-7 w-7 bg-orange-500 rounded-full flex items-center justify-center -ml-3.5">
            <FileText className="text-white h-3.5 w-3.5" />
          </div>
        );
      case 'product':
        return (
          <div className="h-7 w-7 bg-emerald-500 rounded-full flex items-center justify-center -ml-3.5">
            <Plus className="text-white h-3.5 w-3.5" />
          </div>
        );
      default:
        return (
          <div className="h-7 w-7 bg-gray-500 rounded-full flex items-center justify-center -ml-3.5">
            <Receipt className="text-white h-3.5 w-3.5" />
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
    <div className={cn("", className)}>
      <div className="relative max-h-96 overflow-y-auto">
        <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        <div className="space-y-3">
          {isDataLoading ? (
            Array(8).fill(0).map((_, i) => (
              <div key={i} className="flex ml-3.5 pb-3">
                <Skeleton className="h-7 w-7 rounded-full -ml-3.5" />
                <div className="ml-3 w-full">
                  <Skeleton className="h-3 w-2/3 mb-1" />
                  <Skeleton className="h-3 w-3/4 mb-1" />
                  <Skeleton className="h-2 w-1/3" />
                </div>
              </div>
            ))
          ) : activities && activities.length > 0 ? (
            activities.map((activity) => (
              <div key={activity.id} className="flex ml-3.5 pb-2">
                <div className="flex-shrink-0 z-10">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-800">{activity.title}</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{activity.description}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatDate(activity.timestamp)}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6">
              <Package className="h-6 w-6 mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500 text-xs">No recent activities</p>
              <p className="text-gray-400 text-xs">Activities will appear here as you use the system</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
