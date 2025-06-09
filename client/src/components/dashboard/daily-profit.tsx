import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Package,
  RefreshCw
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface DailyProfitData {
  totalProfit: number;
  totalRevenue: number;
  totalCost: number;
  ordersDelivered: number;
  itemsSold: number;
  profitMargin: number;
  previousDayProfit: number;
  profitChange: number;
  profitChangePercentage: number;
}

interface DailyProfitProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export default function DailyProfit({ autoRefresh = true, refreshInterval = 30000 }: DailyProfitProps) {
  // Fetch daily profit data
  const { data: profitData, isLoading, refetch } = useQuery<DailyProfitData>({
    queryKey: ['daily-profit'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/daily-profit');
      if (!response.ok) {
        throw new Error('Failed to fetch daily profit data');
      }
      return response.json();
    },
    refetchInterval: autoRefresh ? refreshInterval : false,
    refetchIntervalInBackground: true
  });



  const getProfitTrend = () => {
    if (!profitData) return null;
    
    const { profitChange, profitChangePercentage } = profitData;
    
    if (profitChange > 0) {
      return {
        icon: <TrendingUp className="h-4 w-4" />,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        text: `+${formatCurrency(profitChange)} (+${profitChangePercentage.toFixed(1)}%)`
      };
    } else if (profitChange < 0) {
      return {
        icon: <TrendingDown className="h-4 w-4" />,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        text: `${formatCurrency(profitChange)} (${profitChangePercentage.toFixed(1)}%)`
      };
    } else {
      return {
        icon: <DollarSign className="h-4 w-4" />,
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        text: 'No change'
      };
    }
  };

  const trend = getProfitTrend();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Today's Profit
          </CardTitle>
          <CardDescription>Daily profit calculation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="bg-gray-200 rounded h-8 w-32"></div>
            <div className="bg-gray-200 rounded h-4 w-24"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-200 rounded h-16"></div>
              <div className="bg-gray-200 rounded h-16"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!profitData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Today's Profit
          </CardTitle>
          <CardDescription>Daily profit calculation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No data available</h3>
            <p className="text-gray-500">Profit data will appear when customers place orders through your showcase</p>
            <button
              onClick={() => refetch()}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show data even if profit is 0
  const hasAnyData = profitData.ordersDelivered > 0 || profitData.totalRevenue > 0;

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-white/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
            <DollarSign className="h-4 w-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Today's Profit</CardTitle>
            <CardDescription className="text-xs">Daily showcase orders</CardDescription>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          disabled={isLoading}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-0">
        {!hasAnyData ? (
          <div className="text-center py-3">
            <div className="text-xl font-bold text-gray-400 mb-1">
              {formatCurrency(0)}
            </div>
            <p className="text-xs text-gray-500">No showcase orders today</p>
          </div>
        ) : (
          <>
            {/* Main Profit Display */}
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {formatCurrency(profitData.totalProfit)}
              </div>
              {trend && (
                <Badge className={`${trend.bgColor} ${trend.color} flex items-center gap-1 w-fit mx-auto text-xs`}>
                  {trend.icon}
                  {trend.text}
                </Badge>
              )}
            </div>
          </>
        )}

        {/* Always show breakdown and metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-green-600" />
              <span className="text-xs font-medium text-green-800">Revenue</span>
            </div>
            <div className="text-sm font-bold text-green-900">
              {formatCurrency(profitData.totalRevenue)}
            </div>
          </div>

          <div className="bg-red-50 rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingDown className="h-3.5 w-3.5 text-red-600" />
              <span className="text-xs font-medium text-red-800">Cost</span>
            </div>
            <div className="text-sm font-bold text-red-900">
              {formatCurrency(profitData.totalCost)}
            </div>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
          <div className="text-center">
            <div className="text-xs text-gray-500">Orders</div>
            <div className="text-sm font-semibold">{Math.round(profitData.ordersDelivered)}</div>
          </div>

          <div className="text-center">
            <div className="text-xs text-gray-500">Items</div>
            <div className="text-sm font-semibold">{Math.round(profitData.itemsSold)}</div>
          </div>

          <div className="text-center">
            <div className="text-xs text-gray-500">Margin</div>
            <div className="text-sm font-semibold">
              {profitData.profitMargin ? profitData.profitMargin.toFixed(1) : '0.0'}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
