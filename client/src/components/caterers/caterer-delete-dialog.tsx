import React, { useState, useEffect } from 'react';
import { Caterer, DeleteCatererOptions, RelatedRecordsError } from '@/hooks/use-caterers';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface CatererDeleteDialogProps {
  caterer: Caterer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: number, options?: DeleteCatererOptions) => void;
  relatedRecords?: RelatedRecordsError['relatedRecords'];
}

export default function CatererDeleteDialog({
  caterer,
  open,
  onOpenChange,
  onDelete,
  relatedRecords,
}: CatererDeleteDialogProps) {
  console.log('CatererDeleteDialog rendered with:', { caterer, open, relatedRecords });
  const [deleteOption, setDeleteOption] = useState<'cancel' | 'cascade' | 'force' | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Show confirmation dialog automatically when related records are detected
  useEffect(() => {
    if (open && relatedRecords && relatedRecords.total > 0) {
      console.log('Related records detected, showing confirmation dialog automatically');
      setShowConfirmation(true);
    } else if (open && relatedRecords) {
      console.log('No related records detected, showing simple confirmation');
      setShowConfirmation(false);
    }
  }, [open, relatedRecords]);

  // Debug log whenever the component renders
  useEffect(() => {
    console.log('CatererDeleteDialog render state:', {
      open,
      showConfirmation,
      relatedRecords,
      hasRelatedRecords: relatedRecords && relatedRecords.total > 0
    });
  });

  // Reset state when dialog closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setDeleteOption(null);
      setShowConfirmation(false);
    }
    onOpenChange(open);
  };

  // Handle the initial delete action
  const handleDelete = () => {
    if (!caterer || !caterer.id) return;

    // If there are no related records, delete directly
    if (!relatedRecords || relatedRecords.total === 0) {
      console.log('No related records, deleting directly');
      onDelete(caterer.id);
      return;
    }

    // If there are related records, show options
    console.log('Related records found, showing options:', relatedRecords);
    setShowConfirmation(true);
  };

  // Handle the confirmation of delete with options
  const handleConfirmDelete = () => {
    if (!caterer || !caterer.id) return;

    console.log(`Confirming delete with option: ${deleteOption}`);

    if (deleteOption === 'cascade') {
      console.log('Using cascade delete option');
      onDelete(caterer.id, { cascade: true });
    } else if (deleteOption === 'force') {
      console.log('Using force delete option');
      onDelete(caterer.id, { force: true });
    } else {
      console.log('No valid delete option selected');
    }

    // Reset state
    setDeleteOption(null);
    setShowConfirmation(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        {!showConfirmation ? (
          // Initial delete confirmation
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Caterer</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the caterer "{caterer?.name}"?
                {relatedRecords && relatedRecords.total > 0 && (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800">
                    <div className="flex items-start">
                      <AlertTriangle className="h-5 w-5 mr-2 mt-0.5 text-amber-500" />
                      <div>
                        <p className="font-medium">This caterer has associated records:</p>
                        <ul className="list-disc list-inside mt-1 text-sm">
                          {relatedRecords.bills > 0 && (
                            <li>{relatedRecords.bills} bill{relatedRecords.bills !== 1 ? 's' : ''}</li>
                          )}
                          {relatedRecords.payments > 0 && (
                            <li>{relatedRecords.payments} payment{relatedRecords.payments !== 1 ? 's' : ''}</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-500 hover:bg-red-600"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : (
          // Options for handling related records
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Options</AlertDialogTitle>
              <AlertDialogDescription>
                Choose how to handle the associated records:
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="grid gap-4 py-4">
              <Button
                variant="outline"
                className={`flex justify-start p-4 h-auto ${
                  deleteOption === 'cancel' ? 'border-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => setDeleteOption('cancel')}
              >
                <X className="h-5 w-5 mr-2 text-blue-500" />
                <div className="text-left">
                  <div className="font-medium">Cancel Deletion</div>
                  <div className="text-sm text-muted-foreground">
                    Return without deleting the caterer or any associated records.
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className={`flex justify-start p-4 h-auto ${
                  deleteOption === 'cascade' ? 'border-amber-500 bg-amber-50' : ''
                }`}
                onClick={() => setDeleteOption('cascade')}
              >
                <Trash2 className="h-5 w-5 mr-2 text-amber-500" />
                <div className="text-left">
                  <div className="font-medium">Delete All Related Records First</div>
                  <div className="text-sm text-muted-foreground">
                    Delete all bills, payments, and other records associated with this caterer, then delete the caterer.
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className={`flex justify-start p-4 h-auto ${
                  deleteOption === 'force' ? 'border-red-500 bg-red-50' : ''
                }`}
                onClick={() => setDeleteOption('force')}
              >
                <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                <div className="text-left">
                  <div className="font-medium">Force Delete (Danger)</div>
                  <div className="text-sm text-muted-foreground">
                    Force delete the caterer directly. This may cause data inconsistencies and orphaned records.
                  </div>
                </div>
              </Button>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowConfirmation(false)}>Back</AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={deleteOption === 'cancel' || deleteOption === null}
              >
                Confirm
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
