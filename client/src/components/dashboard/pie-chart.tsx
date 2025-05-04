import { Card, CardContent } from "@/components/ui/card";
import { MoreVertical } from "lucide-react";
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

const data = [
  { name: "Turmeric", value: 24 },
  { name: "Cinnamon", value: 18 },
  { name: "Paprika", value: 16 },
  { name: "Cumin", value: 14 },
  { name: "Other", value: 28 },
];

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
  const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border rounded shadow-sm">
          <p className="text-sm font-semibold">{`${payload[0].name}`}</p>
          <p className="text-sm text-primary">{`${payload[0].value}%`}</p>
        </div>
      );
    }
  
    return null;
  };

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-heading font-semibold text-neutral-800">Top Selling Spices</h2>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4 text-neutral-500" />
          </Button>
        </div>
        
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ReChartsPieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </ReChartsPieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4">
          {data.slice(0, 3).map((entry, index) => (
            <div key={`legend-${index}`} className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <span
                  className="h-3 w-3 rounded-full mr-2"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm text-neutral-700">{entry.name}</span>
              </div>
              <span className="text-sm font-medium">{entry.value}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
