import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps } from "recharts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface InventoryTrend {
  period: string;
  value: number;
  quantity: number;
  transactions: number;
}

type TimeRange = "weekly" | "monthly" | "yearly";

interface SalesChartProps {
  className?: string;
}

export default function SalesChart({ className }: SalesChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("monthly");

  // Fetch real inventory trends data
  const { data: inventoryTrends, isLoading } = useQuery<InventoryTrend[]>({
    queryKey: ["/api/reports/inventory-trends", timeRange],
    queryFn: () => fetch(`/api/reports/inventory-trends?timeRange=${timeRange}`).then(res => res.json()),
  });

  // Process data for chart
  const data = inventoryTrends?.map(trend => ({
    name: trend.period,
    value: trend.value
  })) || [];

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border rounded shadow-sm">
          <p className="text-sm font-semibold">{`${label}`}</p>
          <p className="text-sm text-primary">{`₹${Number(payload[0].value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</p>
        </div>
      );
    }

    return null;
  };

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-heading font-semibold text-neutral-800">Sales Trend</h2>
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant={timeRange === "weekly" ? "default" : "outline"}
              className={timeRange === "weekly" ? "bg-primary text-white" : ""}
              onClick={() => setTimeRange("weekly")}
            >
              Weekly
            </Button>
            <Button
              size="sm"
              variant={timeRange === "monthly" ? "default" : "outline"}
              className={timeRange === "monthly" ? "bg-primary text-white" : ""}
              onClick={() => setTimeRange("monthly")}
            >
              Monthly
            </Button>
            <Button
              size="sm"
              variant={timeRange === "yearly" ? "default" : "outline"}
              className={timeRange === "yearly" ? "bg-primary text-white" : ""}
              onClick={() => setTimeRange("yearly")}
            >
              Yearly
            </Button>
          </div>
        </div>

        <div className="h-64 w-full">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Skeleton className="h-full w-full" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="value"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  barSize={timeRange === "monthly" ? 15 : 30}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
