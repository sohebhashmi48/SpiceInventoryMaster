import { ReactNode } from 'react';

interface SectionWrapperProps {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export default function SectionWrapper({ 
  title, 
  actions, 
  children, 
  className = "",
  collapsible = false,
  defaultCollapsed = false
}: SectionWrapperProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <section className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          {collapsible && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="mr-2 text-primary hover:text-primary-dark focus:outline-none"
              aria-expanded={!isCollapsed}
              aria-controls={`${title.toLowerCase().replace(/\s+/g, '-')}-content`}
            >
              <span className={`transform transition-transform ${isCollapsed ? 'rotate-180' : 'rotate-90'}`}>
                ▼
              </span>
              <span className="sr-only">{isCollapsed ? 'Expand' : 'Collapse'} {title}</span>
            </button>
          )}
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        </div>
        {actions && <div className="flex-shrink-0">{actions}</div>}
      </div>
      
      <div 
        id={`${title.toLowerCase().replace(/\s+/g, '-')}-content`}
        className={`transition-all duration-300 ease-in-out ${
          collapsible ? (isCollapsed ? 'max-h-0 overflow-hidden' : 'max-h-screen') : 'min-h-0'
        }`}
      >
        {children}
      </div>
    </section>
  );
}
