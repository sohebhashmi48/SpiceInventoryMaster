import { Card, CardContent } from "@/components/ui/card";
import { 
  AlertTriangle, 
  Clock, 
  ShoppingCart 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Alert } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

interface RecentAlertsProps {
  className?: string;
}

export default function RecentAlerts({ className }: RecentAlertsProps) {
  const { data: alerts, isLoading } = useQuery<Alert[]>({
    queryKey: ["/api/alerts?status=active"],
  });

  const renderAlertIcon = (type: string) => {
    switch (type) {
      case 'low_stock':
        return <AlertTriangle className="text-red-500 h-5 w-5 mr-3" />;
      case 'expiry':
        return <Clock className="text-yellow-500 h-5 w-5 mr-3" />;
      case 'order':
        return <ShoppingCart className="text-blue-500 h-5 w-5 mr-3" />;
      default:
        return <AlertTriangle className="text-red-500 h-5 w-5 mr-3" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'low_stock':
        return 'bg-red-50 border-l-4 border-red-500';
      case 'expiry':
        return 'bg-yellow-50 border-l-4 border-yellow-500';
      case 'order':
        return 'bg-blue-50 border-l-4 border-blue-500';
      default:
        return 'bg-red-50 border-l-4 border-red-500';
    }
  };

  const formatDate = (dateString: Date) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      if (diffHours === 0) {
        return 'Just now';
      }
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else {
      return `${diffDays} days ago`;
    }
  };

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-heading font-semibold text-neutral-800">Recent Alerts</h2>
          <a href="#" className="text-secondary text-sm font-medium">View All</a>
        </div>
        
        <div className="space-y-4">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="flex items-start p-3 bg-neutral-50 rounded-md">
                <Skeleton className="h-5 w-5 mr-3 rounded-full" />
                <div className="w-full">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2 mb-1" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))
          ) : alerts && alerts.length > 0 ? (
            alerts.slice(0, 3).map((alert) => (
              <div 
                key={alert.id} 
                className={`flex items-start p-3 rounded-md ${getAlertColor(alert.type)}`}
              >
                {renderAlertIcon(alert.type)}
                <div>
                  <p className="text-sm font-medium text-neutral-800">{alert.message}</p>
                  {alert.type === 'low_stock' && (
                    <p className="text-xs text-neutral-600 mt-1">Current stock: 2.3kg (Minimum: 5kg)</p>
                  )}
                  {alert.type === 'expiry' && (
                    <p className="text-xs text-neutral-600 mt-1">Batch #A2048 expires in 15 days</p>
                  )}
                  <p className="text-xs text-neutral-500 mt-1">{formatDate(alert.createdAt)}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center p-6 text-center">
              <div>
                <div className="flex justify-center mb-2">
                  <AlertTriangle className="h-8 w-8 text-neutral-300" />
                </div>
                <p className="text-neutral-500">No active alerts</p>
                <p className="text-xs text-neutral-400 mt-1">Everything is running smoothly</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
