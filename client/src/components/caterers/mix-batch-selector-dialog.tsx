import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useInventoryByProduct } from '@/hooks/use-inventory';
import { formatDate, formatQuantityWithUnit, UnitType, convertUnit, formatCurrency } from '@/lib/utils';
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
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Package, Calendar, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface MixBatchSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: number;
  quantity: number;
  unit?: UnitType;
  onBatchSelect: (batchIds: number[], quantities: number[], totalQuantity: number, unit: UnitType) => void;
}

export default function MixBatchSelectorDialog({
  open,
  onOpenChange,
  productId,
  quantity,
  unit = 'kg',
  onBatchSelect
}: MixBatchSelectorDialogProps) {
  const [selectedBatches, setSelectedBatches] = useState<Record<number, number>>({});
  const [quantityErrors, setQuantityErrors] = useState<Record<number, string>>({});
  const { toast } = useToast();

  const { data: inventoryBatches, isLoading } = useInventoryByProduct(productId);

  // Available batches
  const availableBatches = useMemo(() => {
    if (!inventoryBatches?.length) return [];
    return inventoryBatches
      .filter(batch => batch.quantity > 0 && batch.status === 'active')
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  }, [inventoryBatches]);

  // Convert batch quantities to current unit
  const convertedBatchQuantities = useMemo(() => {
    if (!availableBatches.length) return {};
    
    const converted: Record<number, number> = {};
    availableBatches.forEach(batch => {
      if (batch.productUnit && batch.productUnit !== unit) {
        converted[batch.id] = convertUnit(Number(batch.quantity), batch.productUnit as UnitType, unit);
      } else {
        converted[batch.id] = Number(batch.quantity);
      }
    });
    return converted;
  }, [availableBatches, unit]);

  // Calculate totals
  const calculatedTotals = useMemo(() => {
    const selectedEntries = Object.entries(selectedBatches).filter(([_, qty]) => qty > 0);
    const totalSelected = selectedEntries.reduce((sum, [_, qty]) => sum + Number(qty), 0);
    const remainingNeeded = Math.max(0, quantity - totalSelected);
    
    const batchIds = selectedEntries.map(([id]) => parseInt(id));
    const quantities = selectedEntries.map(([_, qty]) => qty);
    
    return {
      totalSelected: Number(totalSelected.toFixed(2)),
      remainingNeeded: Number(remainingNeeded.toFixed(2)),
      batchIds,
      quantities
    };
  }, [selectedBatches, quantity]);

  // Calculate total available quantity
  const totalAvailable = useMemo(() => {
    return availableBatches.reduce((sum, batch) => {
      const batchQuantity = convertedBatchQuantities[batch.id] || Number(batch.quantity);
      return sum + batchQuantity;
    }, 0);
  }, [availableBatches, convertedBatchQuantities]);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedBatches({});
      setQuantityErrors({});
    }
  }, [open, productId]);

  // Handle quantity change
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
      
      toast({
        title: "Quantity Adjusted",
        description: "Maximum available quantity set for this batch.",
        variant: "destructive",
      });
    } else {
      setSelectedBatches(prev => ({
        ...prev,
        [batchId]: numValue
      }));
    }
  }, [convertedBatchQuantities, toast]);

  // Select batch
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

  // Remove batch
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

  // Handle confirm
  const handleConfirm = useCallback(() => {
    const { totalSelected, batchIds, quantities } = calculatedTotals;
    onBatchSelect(batchIds, quantities, totalSelected, unit);
    onOpenChange(false);
    
    if (batchIds.length > 0) {
      toast({
        title: "Batches Selected",
        description: `Selected ${batchIds.length} batches with total quantity ${totalSelected} ${unit}`,
      });
    }
  }, [calculatedTotals, unit, onBatchSelect, onOpenChange, toast]);

  const isQuantityMet = calculatedTotals.totalSelected >= quantity;
  const isInsufficientStock = totalAvailable < quantity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Inventory Batches for Mix Product</DialogTitle>
        </DialogHeader>

        <div className="py-4 max-h-[calc(80vh-120px)] overflow-y-auto">
          {/* Quantity Summary */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 p-3 bg-slate-50 rounded-md border">
            <div className="flex flex-col space-y-2 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Required Quantity:</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-9 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-medium text-gray-700 flex items-center justify-center">
                    {Number(quantity.toFixed(2))}
                  </div>
                  <div className="h-9 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-medium text-gray-700 flex items-center justify-center min-w-[60px]">
                    {unit}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-start md:items-end w-full md:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Selected:</span>
                <span className={`text-lg font-bold ${
                  calculatedTotals.totalSelected > quantity ? 'text-orange-500' :
                  isQuantityMet ? 'text-green-600' : 'text-red-600'
                }`}>
                  {Number(calculatedTotals.totalSelected.toFixed(2))} {unit}
                </span>
                <span>/</span>
                <span className="text-lg font-bold">
                  {Number(quantity.toFixed(2))} {unit}
                </span>
              </div>
              
              <div className="text-sm">
                {calculatedTotals.remainingNeeded > 0 ? (
                  <span className="text-blue-600">
                    Still need: {formatQuantityWithUnit(calculatedTotals.remainingNeeded, unit, true)}
                  </span>
                ) : calculatedTotals.totalSelected > quantity ? (
                  <span className="text-orange-500">
                    Excess: {formatQuantityWithUnit(calculatedTotals.totalSelected - quantity, unit, true)}
                  </span>
                ) : (
                  <span className="text-green-600">✓ Quantity complete</span>
                )}
              </div>
              
              <div className="w-full mt-2">
                <Progress
                  value={quantity > 0 ? Math.min(100, (calculatedTotals.totalSelected / quantity) * 100) : 0}
                  className={cn(
                    "h-3",
                    calculatedTotals.totalSelected > quantity
                      ? "bg-orange-100 [&>[data-role=indicator]]:bg-orange-500"
                      : calculatedTotals.totalSelected === quantity
                        ? "bg-green-100 [&>[data-role=indicator]]:bg-green-600"
                        : "bg-blue-100 [&>[data-role=indicator]]:bg-blue-600"
                  )}
                />
              </div>
            </div>
          </div>

          {isInsufficientStock && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4 flex items-start">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <p className="text-red-800 font-medium">Insufficient Stock</p>
                <p className="text-sm text-red-600">
                  Available: {formatQuantityWithUnit(totalAvailable, unit, true)} / 
                  Required: {formatQuantityWithUnit(quantity, unit, true)}
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
                          {formatQuantityWithUnit(availableQuantity, unit, true)}
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
                                  Select ({formatQuantityWithUnit(Math.min(calculatedTotals.remainingNeeded, availableQuantity), unit, false)})
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
            disabled={(quantity > 0 && !isQuantityMet) || availableBatches.length === 0}
            className="w-40 bg-green-600 hover:bg-green-700"
          >
            Confirm Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
