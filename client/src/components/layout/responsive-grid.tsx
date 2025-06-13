import { ReactNode } from 'react';

interface ResponsiveGridProps {
  children: ReactNode;
  cols?: number;
  className?: string;
  gap?: string;
}

export default function ResponsiveGrid({ 
  children, 
  cols = 2,
  gap = "gap-4",
  className = ""
}: ResponsiveGridProps) {
  const gridClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
  };

  const gridColumnClass = gridClasses[cols as keyof typeof gridClasses] || gridClasses[2];

  return (
    <div className={`grid ${gridColumnClass} ${gap} ${className}`}>
      {children}
    </div>
  );
}
