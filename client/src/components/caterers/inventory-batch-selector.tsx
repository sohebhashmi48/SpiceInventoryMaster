import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useInventoryByProduct } from '@/hooks/use-inventory';
import { formatDate, formatQuantityWithUnit, UnitType, convertUnit } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import { Package, Calendar, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import UnitSelector from '@/components/ui/unit-selector';
import { debounce } from 'lodash';
import { cn } from '@/lib/utils';

interface InventoryBatchSelectorProps {
  productId: number;
  quantity: number;
  unit?: UnitType;
  onBatchSelect: (batchIds: number[], quantities: number[], totalQuantity: number, unit: UnitType) => void;
  onQuantityChange?: (totalQuantity: number) => void;
  onRequiredQuantityChange?: (requiredQuantity: number) => void;
  onUnitChange?: (unit: UnitType, convertedQuantity: number) => void;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function InventoryBatchSelector({
  productId,
  quantity,
  unit = 'kg',
  onBatchSelect,
  onQuantityChange,
  onRequiredQuantityChange,
  onUnitChange,
  disabled = false,
  open,
  onOpenChange
}: InventoryBatchSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedBatches, setSelectedBatches] = useState<Record<number, number>>({});
  const [localQuantity, setLocalQuantity] = useState(quantity);
  const [quantityErrors, setQuantityErrors] = useState<Record<number, string>>({});
  const [currentUnit, setCurrentUnit] = useState<UnitType>(unit);
  
  // Use refs to prevent unnecessary re-renders
  const lastProductIdRef = useRef(productId);
  const lastQuantityRef = useRef(quantity);
  const isInitializedRef = useRef(false);

  const { toast } = useToast();

  // Current toast reference for immediate replacement
  const currentToastRef = useRef<{id: string, dismiss: () => void} | null>(null);

  // Immediate replacement toast function
  const showImmediateToast = (title: string, description: string, variant: 'default' | 'destructive' = 'default') => {
    // Dismiss any existing toast immediately
    if (currentToastRef.current) {
      currentToastRef.current.dismiss();
    }

    // Show new toast and store reference
    const newToast = toast({
      title,
      description,
      variant,
    });

    currentToastRef.current = newToast;

    // Auto-dismiss after 500ms
    setTimeout(() => {
      if (currentToastRef.current && currentToastRef.current.id === newToast.id) {
        currentToastRef.current.dismiss();
        currentToastRef.current = null;
      }
    }, 500);
  };
  const { data: inventoryBatches, isLoading } = useInventoryByProduct(productId);

  // Memoize available batches with better comparison
  const availableBatches = useMemo(() => {
    if (!inventoryBatches?.length) return [];
    return inventoryBatches
      .filter(batch => batch.quantity > 0 && batch.status === 'active')
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  }, [inventoryBatches]);

  // Memoize batch conversion calculations only when needed
  const convertedBatchQuantities = useMemo(() => {
    if (!availableBatches.length) return {};
    
    const converted: Record<number, number> = {};
    availableBatches.forEach(batch => {
      if (batch.productUnit && batch.productUnit !== currentUnit) {
        converted[batch.id] = convertUnit(Number(batch.quantity), batch.productUnit as UnitType, currentUnit);
      } else {
        converted[batch.id] = Number(batch.quantity);
      }
    });
    return converted;
  }, [availableBatches, currentUnit]);

  // Optimize total calculations
  const calculatedTotals = useMemo(() => {
    const selectedEntries = Object.entries(selectedBatches).filter(([_, qty]) => qty > 0);
    const totalSelected = selectedEntries.reduce((sum, [_, qty]) => sum + Number(qty), 0);
    const remainingNeeded = Math.max(0, localQuantity - totalSelected);
    
    const batchIds = selectedEntries.map(([id]) => parseInt(id));
    const quantities = selectedEntries.map(([_, qty]) => qty);
    
    return {
      totalSelected: Number(totalSelected.toFixed(2)),
      remainingNeeded: Number(remainingNeeded.toFixed(2)),
      batchIds,
      quantities
    };
  }, [selectedBatches, localQuantity]);

  // Optimize selected batch details calculation
  const selectedBatchDetails = useMemo(() => {
    if (!inventoryBatches?.length || !Object.keys(selectedBatches).length) return [];
    
    return Object.entries(selectedBatches)
      .filter(([_, qty]) => qty > 0)
      .map(([batchId, qty]) => {
        const batch = inventoryBatches.find(b => b.id === parseInt(batchId));
        if (!batch) return null;
        
        const displayQuantity = convertedBatchQuantities[parseInt(batchId)] || qty;
        
        return {
          id: parseInt(batchId),
          batchNumber: batch.batchNumber || 'Unknown',
          quantity: displayQuantity,
          unitPrice: batch.unitPrice || 0
        };
      })
      .filter(Boolean);
  }, [selectedBatches, inventoryBatches, convertedBatchQuantities]);

  // Calculate total available quantity
  const totalAvailable = useMemo(() => {
    return availableBatches.reduce((sum, batch) => {
      const batchQuantity = convertedBatchQuantities[batch.id] || Number(batch.quantity);
      return sum + batchQuantity;
    }, 0);
  }, [availableBatches, convertedBatchQuantities]);

  // Debounced callbacks to prevent excessive updates
  const debouncedQuantityChange = useCallback(
    debounce((newTotal: number) => {
      onQuantityChange?.(newTotal);
    }, 500),
    [onQuantityChange]
  );

  const debouncedBatchSelect = useCallback(
    debounce((batchIds: number[], quantities: number[], totalQuantity: number, unit: UnitType) => {
      onBatchSelect(batchIds, quantities, totalQuantity, unit);
    }, 300),
    [onBatchSelect]
  );

  // Reset logic when product or quantity changes
  useEffect(() => {
    const productChanged = productId !== lastProductIdRef.current;
    const quantityChanged = quantity !== lastQuantityRef.current;
    
    if (productChanged) {
      setSelectedBatches({});
      setQuantityErrors({});
      lastProductIdRef.current = productId;
    }
    
    if (quantityChanged) {
      setLocalQuantity(quantity);
      lastQuantityRef.current = quantity;
    }
    
    isInitializedRef.current = true;
  }, [productId, quantity]);

  // Update parent components when selections change
  useEffect(() => {
    if (!isInitializedRef.current) return;
    
    const { totalSelected, batchIds, quantities } = calculatedTotals;
    
    // Debounce parent updates to prevent excessive re-renders
    debouncedQuantityChange(totalSelected);
    debouncedBatchSelect(batchIds, quantities, totalSelected, currentUnit);
  }, [calculatedTotals, currentUnit, debouncedQuantityChange, debouncedBatchSelect]);

  // Optimized quantity change handler
  const handleQuantityChange = useCallback((batchId: number, value: string) => {
    const numValue = Number((parseFloat(value) || 0).toFixed(2));
    const maxQuantity = convertedBatchQuantities[batchId] || 0;

    setQuantityErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[batchId];
      return newErrors;
    });

    if (numValue <= 0) {
      setSelectedBatches(prev => {
        const newBatches = { ...prev };
        delete newBatches[batchId];
        return newBatches;
      });
    } else if (numValue > maxQuantity) {
      setQuantityErrors(prev => ({
        ...prev,
        [batchId]: `Maximum available is ${maxQuantity.toFixed(2)}`
      }));
      
      setSelectedBatches(prev => ({
        ...prev,
        [batchId]: maxQuantity
      }));
      
      showImmediateToast("Quantity Adjusted", "Maximum available quantity set for this batch.", "destructive");
    } else {
      setSelectedBatches(prev => ({
        ...prev,
        [batchId]: numValue
      }));
    }
  }, [convertedBatchQuantities, toast]);

  // Optimized batch increment/decrement
  const adjustBatchQuantity = useCallback((batchId: number, increment: number) => {
    const currentValue = selectedBatches[batchId] || 0;
    const newValue = Number(Math.max(0, currentValue + increment).toFixed(2));
    const maxQuantity = convertedBatchQuantities[batchId] || 0;

    if (newValue <= 0) {
      setSelectedBatches(prev => {
        const newBatches = { ...prev };
        delete newBatches[batchId];
        return newBatches;
      });
    } else if (newValue > maxQuantity) {
      // Only show toast if user is trying to exceed maximum, not on every adjustment
      if (currentValue < maxQuantity) {
        showImmediateToast("Maximum Reached", "Cannot exceed available quantity.", "destructive");
      }
    } else {
      setSelectedBatches(prev => ({
        ...prev,
        [batchId]: newValue
      }));
    }
  }, [selectedBatches, convertedBatchQuantities]);

  // Optimized batch selection
  const selectBatch = useCallback((batchId: number, quantityToSelect: number) => {
    const maxQuantity = convertedBatchQuantities[batchId] || 0;
    const actualQuantity = Math.min(quantityToSelect, maxQuantity);
    
    if (actualQuantity > 0) {
      setSelectedBatches(prev => ({
        ...prev,
        [batchId]: actualQuantity
      }));
    }
  }, [convertedBatchQuantities]);

  // Optimized remove batch
  const removeBatch = useCallback((batchId: number) => {
    setSelectedBatches(prev => {
      const newBatches = { ...prev };
      delete newBatches[batchId];
      return newBatches;
    });
    
    setQuantityErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[batchId];
      return newErrors;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    const { totalSelected, batchIds, quantities } = calculatedTotals;

    if (onRequiredQuantityChange && totalSelected > 0) {
      onRequiredQuantityChange(totalSelected);
    }

    onBatchSelect(batchIds, quantities, totalSelected, currentUnit);

    // Close dialog using the appropriate method
    if (onOpenChange) {
      onOpenChange(false);
    } else {
      setIsOpen(false);
    }

    // Only show toast if batches were actually selected
    if (batchIds.length > 0) {
      showImmediateToast("Batches Selected", `Selected ${batchIds.length} batches with total quantity ${totalSelected} ${currentUnit}`);
    }
  }, [calculatedTotals, currentUnit, onBatchSelect, onRequiredQuantityChange, onOpenChange]);

  const isQuantityMet = calculatedTotals.totalSelected >= localQuantity;
  const isInsufficientStock = totalAvailable < localQuantity;

  // Use external open state if provided, otherwise use internal state
  const dialogOpen = open !== undefined ? open : isOpen;
  const handleOpenChange = (newOpen: boolean) => {
    console.log(`InventoryBatchSelector handleOpenChange called with: ${newOpen}, open prop: ${open}, isOpen: ${isOpen}`);
    if (onOpenChange) {
      onOpenChange(newOpen);
    } else {
      setIsOpen(newOpen);
    }
  };

  // Debug logging
  React.useEffect(() => {
    console.log(`InventoryBatchSelector rendered - productId: ${productId}, quantity: ${quantity}, open: ${open}, dialogOpen: ${dialogOpen}`);
  }, [productId, quantity, open, dialogOpen]);

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {open === undefined && (
        <DialogTrigger asChild>
          <Button
            variant={selectedBatchDetails.length > 0 ? "default" : "outline"}
            size="sm"
            disabled={disabled || isLoading}
            className="w-full"
          >
            <Package className="h-4 w-4 mr-2" />
            {isLoading ? 'Loading...' : (
              selectedBatchDetails.length > 0
                ? `${selectedBatchDetails.length} Batch${selectedBatchDetails.length > 1 ? 'es' : ''} Selected (${formatQuantityWithUnit(calculatedTotals.totalSelected, currentUnit, false)})`
                : 'Select Batches'
            )}
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Inventory Batches</DialogTitle>
        </DialogHeader>

        <div className="py-4 max-h-[calc(80vh-120px)] overflow-y-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 p-3 bg-slate-50 rounded-md border">
            <div className="flex flex-col space-y-2 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Required Quantity:</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-9 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-medium text-gray-700 flex items-center justify-center">
                    {Number(localQuantity.toFixed(2))}
                  </div>
                  <div className="h-9 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-medium text-gray-700 flex items-center justify-center min-w-[60px]">
                    {currentUnit}
                  </div>
                </div>
                <span className="text-xs text-gray-500 ml-2">
                  (Set quantity in Add Product section)
                </span>
              </div>
            </div>
            
            <div className="flex flex-col items-start md:items-end w-full md:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Selected:</span>
                <span className={`text-lg font-bold ${
                  calculatedTotals.totalSelected > localQuantity ? 'text-orange-500' :
                  isQuantityMet ? 'text-green-600' : 'text-red-600'
                }`}>
                  {Number(calculatedTotals.totalSelected.toFixed(2))} {currentUnit}
                </span>
                <span>/</span>
                <span className="text-lg font-bold">
                  {Number(localQuantity.toFixed(2))} {currentUnit}
                </span>
              </div>
              
              <div className="text-sm">
                {calculatedTotals.remainingNeeded > 0 ? (
                  <span className="text-blue-600">
                    Still need: {formatQuantityWithUnit(calculatedTotals.remainingNeeded, currentUnit, true)}
                  </span>
                ) : calculatedTotals.totalSelected > localQuantity ? (
                  <span className="text-orange-500">
                    Excess: {formatQuantityWithUnit(calculatedTotals.totalSelected - localQuantity, currentUnit, true)}
                  </span>
                ) : (
                  <span className="text-green-600">✓ Quantity complete</span>
                )}
              </div>
              
              <div className="w-full mt-2">
                <Progress
                  value={localQuantity > 0 ? Math.min(100, (calculatedTotals.totalSelected / localQuantity) * 100) : 0}
                  className={cn(
                    "h-3",
                    calculatedTotals.totalSelected > localQuantity
                      ? "bg-orange-100 [&>[data-role=indicator]]:bg-orange-500"
                      : calculatedTotals.totalSelected === localQuantity
                        ? "bg-green-100 [&>[data-role=indicator]]:bg-green-600"
                        : "bg-blue-100 [&>[data-role=indicator]]:bg-blue-600"
                  )}
                />
              </div>
            </div>
          </div>

          {/* Selected Batches Summary */}
          {selectedBatchDetails.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <h4 className="text-green-800 font-semibold mb-3 flex items-center">
                <Package className="h-4 w-4 mr-2" />
                Selected Batches Summary
              </h4>
              <div className="max-h-[200px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-green-50 z-10">
                    <TableRow className="border-green-200 hover:bg-green-50">
                      <TableHead className="text-left text-green-700 font-semibold py-3 px-3">Batch Number</TableHead>
                      <TableHead className="text-right text-green-700 font-semibold py-3 px-3">Quantity</TableHead>
                      <TableHead className="text-right text-green-700 font-semibold py-3 px-3">Unit Price</TableHead>
                      <TableHead className="text-right text-green-700 font-semibold py-3 px-3">Total Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedBatchDetails.map(batch => (
                      <TableRow key={batch.id} className="border-green-100">
                        <TableCell className="py-3 px-3 font-medium text-green-800">{batch.batchNumber}</TableCell>
                        <TableCell className="text-right py-3 px-3 font-medium">
                          {formatQuantityWithUnit(Number(batch.quantity), currentUnit, true)}
                        </TableCell>
                        <TableCell className="text-right py-3 px-3">
                          <div className="flex flex-col items-end">
                            <span className="font-medium">{formatCurrency(batch.unitPrice)}</span>
                            <span className="text-xs text-gray-500">per kg</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-3 px-3 font-semibold text-green-700">
                          {(() => {
                            const totalPrice = currentUnit === 'g' 
                              ? Number(batch.quantity) * Number(batch.unitPrice) / 1000
                              : Number(batch.quantity) * Number(batch.unitPrice);
                            return formatCurrency(Number(totalPrice.toFixed(2)));
                          })()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {isInsufficientStock && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4 flex items-start">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <p className="text-red-800 font-medium">Insufficient Stock</p>
                <p className="text-sm text-red-600">
                  Available: {formatQuantityWithUnit(totalAvailable, currentUnit, true)} / 
                  Required: {formatQuantityWithUnit(localQuantity, currentUnit, true)}
                </p>
              </div>
            </div>
          )}

          {availableBatches.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No inventory batches available for this product
            </div>
          ) : (
            <div className="overflow-auto max-h-[350px] border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead className="w-[25%] font-semibold py-3">Batch Number</TableHead>
                    <TableHead className="w-[20%] font-semibold py-3">Expiry Date</TableHead>
                    <TableHead className="text-right w-[15%] font-semibold py-3">Available</TableHead>
                    <TableHead className="text-right w-[15%] font-semibold py-3">Unit Price</TableHead>
                    <TableHead className="text-center w-[25%] font-semibold py-3">Select Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableBatches.map((batch) => {
                    const isSelected = !!selectedBatches[batch.id];
                    const availableQuantity = convertedBatchQuantities[batch.id] || Number(batch.quantity);
                    
                    return (
                      <TableRow
                        key={batch.id}
                        className={isSelected ? "bg-green-50 border-l-4 border-l-green-500" : ""}
                      >
                        <TableCell className="font-medium py-3">{batch.batchNumber}</TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                            {formatDate(new Date(batch.expiryDate))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-3 font-medium">
                          {formatQuantityWithUnit(availableQuantity, currentUnit, true)}
                        </TableCell>
                        <TableCell className="text-right py-3">
                          <div className="flex flex-col items-end">
                            <span className="font-medium">{formatCurrency(batch.unitPrice)}</span>
                            <span className="text-xs text-gray-500">per kg</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center py-3">
                          {isSelected ? (
                            <div className="flex flex-col space-y-2">
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => adjustBatchQuantity(batch.id, -0.5)}
                                >
                                  -
                                </Button>
                                <Input
                                  type="number"
                                  min="0.01"
                                  max={availableQuantity}
                                  step="0.5"
                                  value={selectedBatches[batch.id] || ''}
                                  onChange={(e) => handleQuantityChange(batch.id, e.target.value)}
                                  className={`w-20 text-center ${quantityErrors[batch.id] ? 'border-red-500' : ''}`}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => adjustBatchQuantity(batch.id, 0.5)}
                                >
                                  +
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => removeBatch(batch.id)}
                                >
                                  Remove
                                </Button>
                              </div>
                              {quantityErrors[batch.id] && (
                                <p className="text-xs text-red-500">{quantityErrors[batch.id]}</p>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col space-y-2">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const quantityToSelect = Math.min(calculatedTotals.remainingNeeded, availableQuantity);
                                    if (quantityToSelect > 0) {
                                      selectBatch(batch.id, quantityToSelect);
                                    }
                                  }}
                                  disabled={calculatedTotals.remainingNeeded <= 0}
                                  className="h-9"
                                >
                                  Select ({formatQuantityWithUnit(Math.min(calculatedTotals.remainingNeeded, availableQuantity), currentUnit, false)})
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="h-9"
                                  onClick={() => selectBatch(batch.id, availableQuantity)}
                                >
                                  Select All
                                </Button>
                              </div>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4 mt-4 flex justify-end gap-2 sticky bottom-0 bg-white">
          <DialogClose asChild>
            <Button variant="outline" className="w-28">Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleConfirm}
            disabled={(localQuantity > 0 && !isQuantityMet) || availableBatches.length === 0}
            className="w-40 bg-green-600 hover:bg-green-700"
          >
            Confirm Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}