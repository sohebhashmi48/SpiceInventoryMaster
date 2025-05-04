import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps } from "recharts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Sample data for the chart
const monthlySalesData = [
  { name: "Jan", value: 4000 },
  { name: "Feb", value: 3000 },
  { name: "Mar", value: 2000 },
  { name: "Apr", value: 2780 },
  { name: "May", value: 1890 },
  { name: "Jun", value: 2390 },
  { name: "Jul", value: 3490 },
  { name: "Aug", value: 4000 },
  { name: "Sep", value: 3200 },
  { name: "Oct", value: 2800 },
  { name: "Nov", value: 4300 },
  { name: "Dec", value: 5000 },
];

const weeklySalesData = [
  { name: "Week 1", value: 1200 },
  { name: "Week 2", value: 940 },
  { name: "Week 3", value: 1290 },
  { name: "Week 4", value: 1500 },
];

const yearlySalesData = [
  { name: "2020", value: 35000 },
  { name: "2021", value: 45000 },
  { name: "2022", value: 55000 },
  { name: "2023", value: 65000 },
];

type TimeRange = "weekly" | "monthly" | "yearly";

interface SalesChartProps {
  className?: string;
}

export default function SalesChart({ className }: SalesChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("monthly");

  const data = 
    timeRange === "weekly" 
      ? weeklySalesData 
      : timeRange === "yearly" 
        ? yearlySalesData 
        : monthlySalesData;

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border rounded shadow-sm">
          <p className="text-sm font-semibold">{`${label}`}</p>
          <p className="text-sm text-primary">{`$${payload[0].value}`}</p>
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
        </div>
      </CardContent>
    </Card>
  );
}
