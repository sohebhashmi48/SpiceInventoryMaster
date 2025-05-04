import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { 
  Search, 
  Calendar as CalendarIcon, 
  X, 
  Filter, 
  MapPin,
  DollarSign,
  ChevronDown 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export type VendorFilters = {
  name: string;
  location: string;
  minAmount: number | null;
  maxAmount: number | null;
  dateFrom: Date | null;
  dateTo: Date | null;
};

const defaultFilters: VendorFilters = {
  name: "",
  location: "",
  minAmount: null,
  maxAmount: null,
  dateFrom: null,
  dateTo: null,
};

interface VendorFiltersProps {
  locations: string[];
  onFiltersChange: (filters: VendorFilters) => void;
}

export default function VendorFilters({ 
  locations, 
  onFiltersChange 
}: VendorFiltersProps) {
  const [filters, setFilters] = useState<VendorFilters>(defaultFilters);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [amountRange, setAmountRange] = useState<[number, number]>([0, 1000]);

  const handleNameChange = (name: string) => {
    const newFilters = { ...filters, name };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleLocationChange = (location: string) => {
    const newFilters = { ...filters, location };
    setFilters(newFilters);
    onFiltersChange(newFilters);
    setIsFiltersOpen(false);
  };

  const handleAmountChange = (values: number[]) => {
    setAmountRange([values[0], values[1]]);
  };

  const handleAmountChangeCommitted = () => {
    const newFilters = { 
      ...filters, 
      minAmount: amountRange[0] > 0 ? amountRange[0] : null,
      maxAmount: amountRange[1] < 1000 ? amountRange[1] : null
    };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleDateFromChange = (date: Date | undefined) => {
    const newFilters = { ...filters, dateFrom: date || null };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleDateToChange = (date: Date | undefined) => {
    const newFilters = { ...filters, dateTo: date || null };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleClearFilters = () => {
    setFilters(defaultFilters);
    setAmountRange([0, 1000]);
    onFiltersChange(defaultFilters);
  };

  // Count active filters (excluding name search which is treated separately)
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'name') return false;
    if (value === null) return false;
    if (value === '') return false;
    return true;
  }).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vendors by name..."
            className="pl-10"
            value={filters.name}
            onChange={(e) => handleNameChange(e.target.value)}
          />
        </div>
        
        <Popover open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-2 rounded-full bg-primary w-5 h-5 text-xs flex items-center justify-center text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="end">
            <div className="space-y-4">
              <h4 className="font-medium">Filter Vendors</h4>
              
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                    >
                      {filters.location || "Select location"}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search location..." />
                      <CommandEmpty>No location found.</CommandEmpty>
                      <CommandGroup>
                        {locations.map((location) => (
                          <CommandItem
                            key={location}
                            onSelect={() => handleLocationChange(location)}
                            className="cursor-pointer"
                          >
                            <MapPin className="mr-2 h-4 w-4" />
                            {location}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Amount Range</Label>
                  <span className="text-sm text-muted-foreground">
                    ${amountRange[0]} - ${amountRange[1]}
                  </span>
                </div>
                <Slider
                  defaultValue={[0, 1000]}
                  value={amountRange}
                  min={0}
                  max={1000}
                  step={50}
                  minStepsBetweenThumbs={1}
                  onValueChange={handleAmountChange}
                  onValueCommit={handleAmountChangeCommitted}
                  className="py-4"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Date From</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !filters.dateFrom && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateFrom ? (
                          format(filters.dateFrom, "PPP")
                        ) : (
                          <span>Select</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.dateFrom || undefined}
                        onSelect={handleDateFromChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <Label>Date To</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !filters.dateTo && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateTo ? (
                          format(filters.dateTo, "PPP")
                        ) : (
                          <span>Select</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.dateTo || undefined}
                        onSelect={handleDateToChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <div className="flex justify-between pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="text-muted-foreground"
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear Filters
                </Button>
                <Button size="sm" onClick={() => setIsFiltersOpen(false)}>
                  Apply Filters
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      {/* Active Filters Pills */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.location && (
            <div className="flex items-center bg-muted rounded-full px-3 py-1 text-sm">
              <MapPin className="h-3 w-3 mr-1" />
              <span>{filters.location}</span>
              <button onClick={() => handleLocationChange("")} className="ml-1 text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          
          {(filters.minAmount !== null || filters.maxAmount !== null) && (
            <div className="flex items-center bg-muted rounded-full px-3 py-1 text-sm">
              <DollarSign className="h-3 w-3 mr-1" />
              <span>
                {filters.minAmount !== null && filters.maxAmount !== null
                  ? `$${filters.minAmount} - $${filters.maxAmount}`
                  : filters.minAmount !== null
                  ? `Min: $${filters.minAmount}`
                  : `Max: $${filters.maxAmount}`}
              </span>
              <button 
                onClick={() => {
                  const newFilters = { ...filters, minAmount: null, maxAmount: null };
                  setFilters(newFilters);
                  setAmountRange([0, 1000]);
                  onFiltersChange(newFilters);
                }} 
                className="ml-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          
          {(filters.dateFrom !== null || filters.dateTo !== null) && (
            <div className="flex items-center bg-muted rounded-full px-3 py-1 text-sm">
              <CalendarIcon className="h-3 w-3 mr-1" />
              <span>
                {filters.dateFrom && filters.dateTo
                  ? `${format(filters.dateFrom, "PP")} - ${format(filters.dateTo, "PP")}`
                  : filters.dateFrom
                  ? `From: ${format(filters.dateFrom, "PP")}`
                  : `To: ${format(filters.dateTo!, "PP")}`}
              </span>
              <button 
                onClick={() => {
                  const newFilters = { ...filters, dateFrom: null, dateTo: null };
                  setFilters(newFilters);
                  onFiltersChange(newFilters);
                }} 
                className="ml-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          
          {activeFilterCount > 0 && (
            <button 
              onClick={handleClearFilters}
              className="flex items-center text-sm text-primary hover:text-primary/80"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}