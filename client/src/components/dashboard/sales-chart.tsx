import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps, AreaChart, Area } from "recharts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface SalesTrend {
  period: string;
  revenue: number;
  orders: number;
  profit: number;
  date?: string;
}

type TimeRange = "daily" | "weekly" | "monthly" | "yearly";

interface SalesChartProps {
  className?: string;
}

export default function SalesChart({ className }: SalesChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("daily");

  // Fetch sales trends data from orders
  const { data: salesTrends, isLoading, error } = useQuery<SalesTrend[]>({
    queryKey: ["/api/dashboard/sales-trends", timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/sales-trends?timeRange=${timeRange}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch sales trends');
      }
      const data = await response.json();
      console.log(`Sales trends (${timeRange}):`, data);
      return data;
    },
    refetchInterval: timeRange === "daily" ? 30000 : 300000, // Refresh every 30s for daily, 5min for others
    refetchIntervalInBackground: true
  });

  // Process data for chart
  const data = salesTrends?.map(trend => ({
    name: trend.period,
    revenue: trend.revenue,
    orders: trend.orders,
    profit: trend.profit,
    date: trend.date
  })) || [];

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="text-sm font-semibold mb-2">{`${label}`}</p>
          <div className="space-y-1">
            <p className="text-sm text-green-600">
              <span className="font-medium">Revenue:</span> ₹{Number(data?.revenue || 0).toLocaleString('en-IN')}
            </p>
            <p className="text-sm text-blue-600">
              <span className="font-medium">Orders:</span> {data?.orders || 0}
            </p>
            <p className="text-sm text-purple-600">
              <span className="font-medium">Profit:</span> ₹{Number(data?.profit || 0).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className={cn("", className)}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-800">Sales Trend</h3>
            {timeRange === "daily" && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-600 font-medium">LIVE</span>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {timeRange === "daily" && "Real-time hourly sales"}
            {timeRange === "weekly" && "Last 7 days performance"}
            {timeRange === "monthly" && "Last 30 days overview"}
            {timeRange === "yearly" && "Last 12 months summary"}
          </p>
        </div>
        <div className="flex space-x-1">
          <Button
            size="sm"
            variant={timeRange === "daily" ? "default" : "outline"}
            className={`h-7 px-3 text-xs ${timeRange === "daily" ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-gray-200"}`}
            onClick={() => setTimeRange("daily")}
          >
            Daily
          </Button>
          <Button
            size="sm"
            variant={timeRange === "weekly" ? "default" : "outline"}
            className={`h-7 px-3 text-xs ${timeRange === "weekly" ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-gray-200"}`}
            onClick={() => setTimeRange("weekly")}
          >
            Weekly
          </Button>
          <Button
            size="sm"
            variant={timeRange === "monthly" ? "default" : "outline"}
            className={`h-7 px-3 text-xs ${timeRange === "monthly" ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-gray-200"}`}
            onClick={() => setTimeRange("monthly")}
          >
            Monthly
          </Button>
          <Button
            size="sm"
            variant={timeRange === "yearly" ? "default" : "outline"}
            className={`h-7 px-3 text-xs ${timeRange === "yearly" ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-gray-200"}`}
            onClick={() => setTimeRange("yearly")}
          >
            Yearly
          </Button>
        </div>
      </div>

        <div className="h-72 w-full">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Skeleton className="h-full w-full" />
            </div>
          ) : data.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-gray-400 mb-2">📊</div>
                <p className="text-sm text-gray-500">No sales data available</p>
                <p className="text-xs text-gray-400">
                  {error ? 'Error loading data' : 'Data will appear when orders are placed'}
                </p>
                {error && (
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-2 px-3 py-1 bg-primary text-white text-xs rounded hover:bg-primary/90"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {timeRange === "daily" ? (
                <AreaChart
                  data={data}
                  margin={{
                    top: 10,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: "hsl(var(--primary))", strokeWidth: 2 }}
                  />
                </AreaChart>
              ) : (
                <LineChart
                  data={data}
                  margin={{
                    top: 10,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 7, stroke: "hsl(var(--primary))", strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </div>

        {/* Compact Summary Stats */}
        {!isLoading && data.length > 0 && (
          <div className="mt-3 space-y-2">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-gradient-to-r from-gray-50 to-blue-50/30 rounded-xl">
              <div className="text-center">
                <div className="text-sm font-bold text-blue-600">
                  ₹{data.reduce((sum, item) => sum + item.revenue, 0).toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-gray-500">Revenue</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-purple-600">
                  {data.reduce((sum, item) => sum + item.orders, 0)}
                </div>
                <div className="text-xs text-gray-500">Orders</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-green-600">
                  ₹{data.reduce((sum, item) => sum + item.profit, 0).toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-gray-500">Profit</div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
