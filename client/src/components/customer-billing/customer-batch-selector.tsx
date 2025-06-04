import React, { useState, useEffect, useMemo } from 'react';
import { useInventoryByProduct } from '@/hooks/use-inventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatQuantityWithUnit, UnitType } from '@/lib/utils';
import { Package, Calendar, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface CustomerBatchSelectorProps {
  productId: number;
  productName: string;
  requiredQuantity: number;
  unit?: UnitType;
  onBatchSelect: (batchIds: number[], quantities: number[], totalQuantity: number) => void;
  disabled?: boolean;
}

interface SelectedBatch {
  id: number;
  quantity: number;
  batchNumber: string;
  expiryDate: string;
  availableQuantity: number;
}

export default function CustomerBatchSelector({
  productId,
  productName,
  requiredQuantity,
  unit = 'kg',
  onBatchSelect,
  disabled = false
}: CustomerBatchSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedBatches, setSelectedBatches] = useState<Record<number, number>>({});
  const [quantityErrors, setQuantityErrors] = useState<Record<number, string>>({});

  const { toast } = useToast();
  const { data: inventoryBatches, isLoading } = useInventoryByProduct(productId);

  // Memoize available batches with FIFO sorting
  const availableBatches = useMemo(() => {
    if (!inventoryBatches?.length) return [];
    return inventoryBatches
      .filter(batch => batch.quantity > 0 && batch.status === 'active')
      .sort((a, b) => {
        // FIFO: Sort by expiry date first, then by purchase date
        const expiryDiff = new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
        if (expiryDiff !== 0) return expiryDiff;
        return new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime();
      });
  }, [inventoryBatches]);

  // Calculate selected batch details
  const selectedBatchDetails: SelectedBatch[] = useMemo(() => {
    return Object.entries(selectedBatches)
      .filter(([_, quantity]) => quantity > 0)
      .map(([batchId, quantity]) => {
        const batch = availableBatches.find(b => b.id === parseInt(batchId));
        return {
          id: parseInt(batchId),
          quantity,
          batchNumber: batch?.batchNumber || '',
          expiryDate: batch?.expiryDate || '',
          availableQuantity: batch?.quantity || 0,
        };
      });
  }, [selectedBatches, availableBatches]);

  // Calculate totals
  const totalSelected = selectedBatchDetails.reduce((sum, batch) => sum + batch.quantity, 0);
  const isQuantityMet = totalSelected >= requiredQuantity;

  // Auto-select batches using FIFO when dialog opens
  useEffect(() => {
    if (isOpen && availableBatches.length > 0 && Object.keys(selectedBatches).length === 0) {
      autoSelectBatches();
    }
  }, [isOpen, availableBatches]);

  const autoSelectBatches = () => {
    let remainingQuantity = requiredQuantity;
    const newSelectedBatches: Record<number, number> = {};

    for (const batch of availableBatches) {
      if (remainingQuantity <= 0) break;

      const quantityToTake = Math.min(remainingQuantity, batch.quantity);
      if (quantityToTake > 0) {
        newSelectedBatches[batch.id] = quantityToTake;
        remainingQuantity -= quantityToTake;
      }
    }

    setSelectedBatches(newSelectedBatches);
  };

  const updateBatchQuantity = (batchId: number, quantity: number) => {
    const batch = availableBatches.find(b => b.id === batchId);
    if (!batch) return;

    // Validate quantity
    if (quantity < 0) {
      setQuantityErrors(prev => ({
        ...prev,
        [batchId]: 'Quantity cannot be negative'
      }));
      return;
    }

    if (quantity > batch.quantity) {
      setQuantityErrors(prev => ({
        ...prev,
        [batchId]: `Only ${batch.quantity} ${unit} available`
      }));
      return;
    }

    // Clear error and update quantity
    setQuantityErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[batchId];
      return newErrors;
    });

    if (quantity === 0) {
      setSelectedBatches(prev => {
        const newBatches = { ...prev };
        delete newBatches[batchId];
        return newBatches;
      });
    } else {
      setSelectedBatches(prev => ({
        ...prev,
        [batchId]: quantity
      }));
    }
  };

  // Select a specific quantity for a batch
  const selectBatch = (batchId: number, quantityToSelect: number) => {
    const batch = availableBatches.find(b => b.id === batchId);
    if (!batch) return;

    const actualQuantity = Math.min(quantityToSelect, batch.quantity);
    if (actualQuantity > 0) {
      updateBatchQuantity(batchId, actualQuantity);
    }
  };

  // Adjust batch quantity by increment/decrement
  const adjustBatchQuantity = (batchId: number, increment: number) => {
    const currentQuantity = selectedBatches[batchId] || 0;
    const newQuantity = Math.max(0, currentQuantity + increment);
    updateBatchQuantity(batchId, newQuantity);
  };

  // Remove a batch selection
  const removeBatch = (batchId: number) => {
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
  };

  // Calculate remaining needed quantity
  const remainingNeeded = Math.max(0, requiredQuantity - totalSelected);

  const handleConfirm = () => {
    if (totalSelected === 0) {
      toast({
        title: 'No Batches Selected',
        description: 'Please select at least one batch.',
        variant: 'destructive',
      });
      return;
    }

    if (totalSelected < requiredQuantity) {
      toast({
        title: 'Insufficient Quantity',
        description: `Selected ${totalSelected} ${unit}, but ${requiredQuantity} ${unit} required.`,
        variant: 'destructive',
      });
      return;
    }

    const batchIds = selectedBatchDetails.map(batch => batch.id);
    const quantities = selectedBatchDetails.map(batch => batch.quantity);

    onBatchSelect(batchIds, quantities, totalSelected);
    setIsOpen(false);

    toast({
      title: 'Batches Selected',
      description: `Selected ${selectedBatchDetails.length} batch${selectedBatchDetails.length > 1 ? 'es' : ''} for ${productName}`,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getExpiryStatusBadge = (batch: any) => {
    if (!batch.expiryStatus) return null;

    switch (batch.expiryStatus) {
      case 'expired':
        return (
          <Badge variant="destructive" className="text-xs">
            <XCircle className="h-3 w-3 mr-1" />
            Expired
          </Badge>
        );
      case 'expiring_soon':
        return (
          <Badge variant="secondary" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {batch.daysToExpiry} days left
          </Badge>
        );
      default:
        return (
          <Badge variant="default" className="text-xs">
            <CheckCircle className="h-3 w-3 mr-1" />
            Good
          </Badge>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
              ? `${selectedBatchDetails.length} Batch${selectedBatchDetails.length > 1 ? 'es' : ''} Selected (${formatQuantityWithUnit(totalSelected, unit, false)})`
              : 'Select Batches'
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Inventory Batches - {productName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Required: {formatQuantityWithUnit(requiredQuantity, unit, false)}
                </p>
                <p className="text-sm text-blue-700">
                  Selected: {formatQuantityWithUnit(totalSelected, unit, false)}
                </p>
              </div>
              <div className="flex items-center">
                {isQuantityMet ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                )}
              </div>
            </div>
          </div>

          {/* Available Batches */}
          {isLoading ? (
            <div className="text-center py-4">Loading inventory batches...</div>
          ) : availableBatches.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No inventory batches available for this product.
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch Details</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Select Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableBatches.map((batch, index) => (
                    <TableRow key={batch.id}>
                      <TableCell>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">#{batch.batchNumber}</span>
                            {index < 3 && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                FIFO Recommended
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Rate: {formatCurrency(batch.unitPrice)}/{unit}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                            {formatDate(batch.expiryDate)}
                          </div>
                          {getExpiryStatusBadge(batch)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {formatQuantityWithUnit(batch.quantity, unit, false)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {selectedBatches[batch.id] ? (
                          // Show enhanced controls when batch is selected
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => adjustBatchQuantity(batch.id, -0.5)}
                                disabled={selectedBatches[batch.id] <= 0.5}
                              >
                                -
                              </Button>
                              <Input
                                type="number"
                                min="0"
                                max={batch.quantity}
                                step="0.01"
                                value={selectedBatches[batch.id] || ''}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value) || 0;
                                  updateBatchQuantity(batch.id, value);
                                }}
                                className={cn(
                                  "w-20 text-center",
                                  quantityErrors[batch.id] && "border-red-500"
                                )}
                                placeholder="0"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => adjustBatchQuantity(batch.id, 0.5)}
                                disabled={selectedBatches[batch.id] >= batch.quantity}
                              >
                                +
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => removeBatch(batch.id)}
                                className="h-8"
                              >
                                Remove
                              </Button>
                            </div>
                            {quantityErrors[batch.id] && (
                              <p className="text-xs text-red-500">{quantityErrors[batch.id]}</p>
                            )}
                          </div>
                        ) : (
                          // Show selection buttons when batch is not selected
                          <div className="flex flex-col space-y-2">
                            <div className="grid grid-cols-1 gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const quantityToSelect = Math.min(remainingNeeded, batch.quantity);
                                  if (quantityToSelect > 0) {
                                    selectBatch(batch.id, quantityToSelect);
                                  }
                                }}
                                disabled={remainingNeeded <= 0}
                                className="h-9"
                              >
                                Select Required ({formatQuantityWithUnit(Math.min(remainingNeeded, batch.quantity), unit, false)})
                              </Button>
                            </div>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={autoSelectBatches}
              disabled={availableBatches.length === 0}
            >
              Auto-Select (FIFO)
            </Button>
            <div className="space-x-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={totalSelected === 0 || Object.keys(quantityErrors).length > 0}
              >
                Confirm Selection
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
