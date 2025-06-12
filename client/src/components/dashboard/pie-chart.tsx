import { Card, CardContent } from "@/components/ui/card";
import { MoreVertical, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PieChart as ReChartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  TooltipProps
} from "recharts";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface CategoryPerformance {
  category: string;
  productCount: number;
  totalStock: number;
  avgPrice: number;
  lowStockCount: number;
}

const COLORS = [
  "hsl(var(--secondary))",
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))"
];

interface PieChartProps {
  className?: string;
}

export default function PieChart({ className }: PieChartProps) {
  // Fetch real category performance data
  const { data: categoryPerformance, isLoading } = useQuery<CategoryPerformance[]>({
    queryKey: ["/api/reports/category-performance"],
    queryFn: async () => {
      const response = await fetch('/api/reports/category-performance', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch category performance');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchIntervalInBackground: true,
  });

  // Process data for pie chart
  const data = categoryPerformance?.map((cat, index) => ({
    name: cat.category,
    value: cat.totalStock,
    fill: COLORS[index % COLORS.length]
  })) || [];

  const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border rounded shadow-sm">
          <p className="text-sm font-semibold">{`${payload[0].name}`}</p>
          <p className="text-sm text-primary">{`${payload[0].value} items`}</p>
        </div>
      );
    }

    return null;
  };

  return (
    <Card className={cn("bg-white/80 backdrop-blur-sm border-white/20", className)}>
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
            <h3 className="font-semibold text-gray-800">Category Stock</h3>
          </div>
        </div>

        <div className="h-40 w-full">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Skeleton className="h-28 w-28 rounded-full" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ReChartsPieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </ReChartsPieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="mt-3 space-y-1.5">
          {data.slice(0, 3).map((entry, index) => (
            <div key={`legend-${index}`} className="flex items-center justify-between">
              <div className="flex items-center">
                <span
                  className="h-2.5 w-2.5 rounded-full mr-2"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-xs text-gray-700">{entry.name}</span>
              </div>
              <span className="text-xs font-medium text-gray-600">{entry.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
