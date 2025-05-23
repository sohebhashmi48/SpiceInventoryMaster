import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Search, Filter, X } from "lucide-react";
import { format } from "date-fns";

export interface SupplierFilters {
  name: string;
  location: string;
  minAmount: number | null;
  maxAmount: number | null;
  dateFrom: Date | null;
  dateTo: Date | null;
}

interface SupplierFiltersProps {
  locations: string[];
  onFiltersChange: (filters: SupplierFilters) => void;
}

export default function SupplierFilters({ locations, onFiltersChange }: SupplierFiltersProps) {
  const [filters, setFilters] = useState<SupplierFilters>({
    name: "",
    location: "",
    minAmount: null,
    maxAmount: null,
    dateFrom: null,
    dateTo: null,
  });

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Update parent component when filters change
  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === "minAmount" || name === "maxAmount") {
      setFilters({
        ...filters,
        [name]: value === "" ? null : parseFloat(value),
      });
    } else {
      setFilters({
        ...filters,
        [name]: value,
      });
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFilters({
      ...filters,
      [name]: value,
    });
  };

  const handleDateChange = (name: string, date: Date | null) => {
    setFilters({
      ...filters,
      [name]: date,
    });
  };

  const resetFilters = () => {
    setFilters({
      name: "",
      location: "",
      minAmount: null,
      maxAmount: null,
      dateFrom: null,
      dateTo: null,
    });
  };

  const hasActiveFilters = () => {
    return (
      filters.location !== "" ||
      filters.minAmount !== null ||
      filters.maxAmount !== null ||
      filters.dateFrom !== null ||
      filters.dateTo !== null
    );
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex space-x-2">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            name="name"
            placeholder="Search suppliers..."
            value={filters.name}
            onChange={handleInputChange}
            className="pl-10 w-full"
          />
          {filters.name && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
              onClick={() => setFilters({ ...filters, name: "" })}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={hasActiveFilters() ? "default" : "outline"}
              size="icon"
              className="shrink-0"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="end">
            <div className="space-y-4">
              <h4 className="font-medium">Filter Suppliers</h4>
              
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Select
                  value={filters.location}
                  onValueChange={(value) => handleSelectChange("location", value)}
                >
                  <SelectTrigger id="location">
                    <SelectValue placeholder="All locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All locations</SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Balance Due Range</Label>
                <div className="flex space-x-2">
                  <Input
                    type="number"
                    name="minAmount"
                    placeholder="Min"
                    value={filters.minAmount === null ? "" : filters.minAmount}
                    onChange={handleInputChange}
                    className="w-1/2"
                  />
                  <Input
                    type="number"
                    name="maxAmount"
                    placeholder="Max"
                    value={filters.maxAmount === null ? "" : filters.maxAmount}
                    onChange={handleInputChange}
                    className="w-1/2"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Date Range</Label>
                <div className="flex space-x-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-1/2 justify-start text-left font-normal"
                      >
                        {filters.dateFrom ? (
                          format(filters.dateFrom, "PPP")
                        ) : (
                          <span className="text-muted-foreground">From</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.dateFrom || undefined}
                        onSelect={(date) => handleDateChange("dateFrom", date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-1/2 justify-start text-left font-normal"
                      >
                        {filters.dateTo ? (
                          format(filters.dateTo, "PPP")
                        ) : (
                          <span className="text-muted-foreground">To</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.dateTo || undefined}
                        onSelect={(date) => handleDateChange("dateTo", date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  Reset
                </Button>
                <Button size="sm" onClick={() => setIsFilterOpen(false)}>
                  Apply Filters
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {hasActiveFilters() && (
        <div className="flex flex-wrap gap-2">
          {filters.location && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Location: {filters.location}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 ml-1"
                onClick={() => setFilters({ ...filters, location: "" })}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {(filters.minAmount !== null || filters.maxAmount !== null) && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Balance: 
              {filters.minAmount !== null ? ` $${filters.minAmount}` : " $0"} 
              {" - "} 
              {filters.maxAmount !== null ? `$${filters.maxAmount}` : "∞"}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 ml-1"
                onClick={() => setFilters({ ...filters, minAmount: null, maxAmount: null })}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {(filters.dateFrom !== null || filters.dateTo !== null) && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Date: 
              {filters.dateFrom ? ` ${format(filters.dateFrom, "PP")}` : " Any"} 
              {" - "} 
              {filters.dateTo ? `${format(filters.dateTo, "PP")}` : "Any"}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 ml-1"
                onClick={() => setFilters({ ...filters, dateFrom: null, dateTo: null })}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={resetFilters}
          >
            Clear All
          </Button>
        </div>
      )}
    </div>
  );
}
