import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MEASUREMENT_UNITS, UnitType, convertUnit } from '@/lib/utils';

interface UnitSelectorProps {
  value: UnitType;
  onChange: (value: UnitType, convertedQuantity?: number) => void;
  quantity?: number;
  className?: string;
  disabled?: boolean;
}

export function UnitSelector({
  value,
  onChange,
  quantity,
  className = '',
  disabled = false
}: UnitSelectorProps) {
  const handleUnitChange = (newUnit: UnitType) => {
    // If quantity is provided, convert it to the new unit
    if (quantity !== undefined) {
      // Special handling for kg to g and g to kg conversions
      let convertedQuantity: number;

      if (value === 'kg' && newUnit === 'g') {
        // Convert kg to g (multiply by 1000)
        convertedQuantity = quantity * 1000;
        console.log(`UnitSelector: Converting ${quantity} kg to g = ${convertedQuantity} g`);
      } else if (value === 'g' && newUnit === 'kg') {
        // Convert g to kg (divide by 1000)
        convertedQuantity = quantity / 1000;
        console.log(`UnitSelector: Converting ${quantity} g to kg = ${convertedQuantity} kg`);
      } else {
        // Use the standard conversion function for other unit types
        convertedQuantity = convertUnit(quantity, value, newUnit);
        console.log(`UnitSelector: Converting ${quantity} ${value} to ${newUnit} = ${convertedQuantity} ${newUnit}`);
      }

      onChange(newUnit, convertedQuantity);
    } else {
      onChange(newUnit);
    }
  };

  return (
    <Select
      value={value}
      onValueChange={(val) => handleUnitChange(val as UnitType)}
      disabled={disabled}
    >
      <SelectTrigger className={`w-[100px] ${className}`}>
        <SelectValue placeholder="Unit" />
      </SelectTrigger>
      <SelectContent>
        {MEASUREMENT_UNITS.map((unit) => (
          <SelectItem key={unit.value} value={unit.value}>
            {unit.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default UnitSelector;
