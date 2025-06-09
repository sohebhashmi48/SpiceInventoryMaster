import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export default function PageHeader({ title, description, children, actions, className, icon }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-center md:justify-between mb-6", className)}>
      <div className="flex items-center gap-2">
        {icon && <div>{icon}</div>}
        <div>
          <h1 className="text-2xl font-heading font-bold text-neutral-900">{title}</h1>
          {description && <p className="text-neutral-600">{description}</p>}
        </div>
      </div>
      {(children || actions) && (
        <div className="mt-4 md:mt-0 flex space-x-2">
          {actions || children}
        </div>
      )}
    </div>
  );
}
