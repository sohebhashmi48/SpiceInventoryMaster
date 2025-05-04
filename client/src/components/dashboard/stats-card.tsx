import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  changeValue?: number;
  changeLabel?: string;
  className?: string;
}

export function StatCard({ 
  title, 
  value, 
  icon, 
  changeValue, 
  changeLabel,
  className 
}: StatCardProps) {
  const isPositive = changeValue !== undefined && changeValue >= 0;
  
  return (
    <Card className={cn("", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-neutral-600 text-sm">{title}</p>
          <div className="text-secondary">{icon}</div>
        </div>
        <p className="text-2xl font-bold text-neutral-900">{value}</p>
        {changeValue !== undefined && (
          <div className="flex items-center mt-2">
            <span className={`text-sm flex items-center ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {isPositive ? (
                <ArrowUpIcon className="h-4 w-4 mr-1" />
              ) : (
                <ArrowDownIcon className="h-4 w-4 mr-1" />
              )}
              {Math.abs(changeValue)}%
            </span>
            {changeLabel && (
              <span className="text-neutral-500 text-xs ml-2">{changeLabel}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default StatCard;
