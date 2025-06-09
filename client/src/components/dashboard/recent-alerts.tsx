import { Card, CardContent } from "@/components/ui/card";
import {
  AlertTriangle,
  Clock,
  ShoppingCart,
  PackageX
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Alert, Inventory } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

interface RecentAlertsProps {
  className?: string;
}

export default function RecentAlerts({ className }: RecentAlertsProps) {
  const [, setLocation] = useLocation();

  // Fetch inventory alerts
  const { data: lowStockItems, isLoading: lowStockLoading } = useQuery<Inventory[]>({
    queryKey: ["/api/inventory/alerts/low-stock"],
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchIntervalInBackground: true,
  });

  const { data: expiringItems, isLoading: expiringLoading } = useQuery<Inventory[]>({
    queryKey: ["/api/inventory/alerts/expiring"],
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchIntervalInBackground: true,
  });

  const isLoading = lowStockLoading || expiringLoading;

  // Create alert objects from inventory data
  const inventoryAlerts = [];

  if (lowStockItems) {
    const outOfStockItems = lowStockItems.filter(item => Number(item.quantity) === 0);
    const lowStockOnlyItems = lowStockItems.filter(item => Number(item.quantity) > 0);

    if (outOfStockItems.length > 0) {
      inventoryAlerts.push({
        id: 'out-of-stock',
        type: 'out_of_stock',
        message: `${outOfStockItems.length} item(s) are completely out of stock`,
        createdAt: new Date().toISOString(),
        items: outOfStockItems
      });
    }

    if (lowStockOnlyItems.length > 0) {
      inventoryAlerts.push({
        id: 'low-stock',
        type: 'low_stock',
        message: `${lowStockOnlyItems.length} item(s) are running low on stock`,
        createdAt: new Date().toISOString(),
        items: lowStockOnlyItems
      });
    }
  }

  if (expiringItems && expiringItems.length > 0) {
    inventoryAlerts.push({
      id: 'expiring',
      type: 'expiry',
      message: `${expiringItems.length} item(s) will expire within 30 days`,
      createdAt: new Date().toISOString(),
      items: expiringItems
    });
  }

  const renderAlertIcon = (type: string) => {
    switch (type) {
      case 'low_stock':
        return <AlertTriangle className="text-orange-500 h-5 w-5 mr-3" />;
      case 'out_of_stock':
        return <PackageX className="text-red-500 h-5 w-5 mr-3" />;
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
        return 'bg-orange-50 border-l-4 border-orange-500';
      case 'out_of_stock':
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
          ) : inventoryAlerts && inventoryAlerts.length > 0 ? (
            inventoryAlerts.slice(0, 3).map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start p-3 rounded-md cursor-pointer hover:opacity-80 transition-opacity ${getAlertColor(alert.type)}`}
                onClick={() => setLocation('/inventory')}
              >
                {renderAlertIcon(alert.type)}
                <div>
                  <p className="text-sm font-medium text-neutral-800">{alert.message}</p>
                  {(alert.type === 'low_stock' || alert.type === 'out_of_stock' || alert.type === 'expiry') && alert.items && (
                    <p className="text-xs text-neutral-600 mt-1">
                      Items: {alert.items.slice(0, 2).map(item => item.productName).join(', ')}
                      {alert.items.length > 2 && ` +${alert.items.length - 2} more`}
                    </p>
                  )}
                  <p className="text-xs text-neutral-500 mt-1">Click to view inventory</p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center p-6 text-center">
              <div>
                <div className="flex justify-center mb-2">
                  <div className="text-green-400 text-4xl">✅</div>
                </div>
                <p className="text-neutral-500">No active alerts</p>
                <p className="text-xs text-neutral-400 mt-1">All inventory items are well stocked</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
