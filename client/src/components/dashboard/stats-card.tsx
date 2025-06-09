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
    <Card className={cn("border-0 shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white/90 to-gray-50/30 backdrop-blur-sm hover:scale-[1.02] group border-white/20", className)}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <p className="text-gray-600 text-xs font-medium mb-1.5 uppercase tracking-wide">{title}</p>
            <p className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">{value}</p>
          </div>
          <div className="p-1.5 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-lg text-blue-600 group-hover:from-blue-500/20 group-hover:to-indigo-500/20 transition-all duration-200">
            {icon}
          </div>
        </div>

        <div className="pt-1.5 border-t border-gray-100/50">
          {changeValue !== undefined ? (
            <div className="flex items-center gap-1.5">
              <span className={`text-xs flex items-center font-medium px-1.5 py-0.5 rounded-full ${
                isPositive
                  ? 'text-emerald-700 bg-emerald-50'
                  : 'text-red-700 bg-red-50'
              }`}>
                {isPositive ? (
                  <ArrowUpIcon className="h-2.5 w-2.5 mr-0.5" />
                ) : (
                  <ArrowDownIcon className="h-2.5 w-2.5 mr-0.5" />
                )}
                {Math.abs(changeValue).toFixed(1)}%
              </span>
              {changeLabel && (
                <span className="text-gray-500 text-xs">{changeLabel}</span>
              )}
            </div>
          ) : changeLabel && (
            <p className="text-gray-500 text-xs font-medium">{changeLabel}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default StatCard;
