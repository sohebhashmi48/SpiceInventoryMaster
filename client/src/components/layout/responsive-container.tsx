import { ReactNode } from 'react';

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  disablePadding?: boolean;
}

export default function ResponsiveContainer({ 
  children, 
  className = '', 
  disablePadding = false 
}: ResponsiveContainerProps) {
  return (
    <div className={`w-full ${!disablePadding ? 'px-4 py-2 sm:p-4' : ''} ${className}`}>
      {children}
    </div>
  );
}
