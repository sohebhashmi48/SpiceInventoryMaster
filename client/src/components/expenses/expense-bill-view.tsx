import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, Printer, X } from "lucide-react";
import { getReceiptImageUrl } from "@/lib/image-utils";

interface Expense {
  id: number;
  icon: string;
  title: string;
  expenseDate: string;
  expiryDate?: string;
  receiptImage?: string;
  amount: number;
  createdAt: string;
  updatedAt?: string;
}

interface ExpenseBillViewProps {
  expense: Expense;
  onClose?: () => void;
}

export default function ExpenseBillView({ expense, onClose }: ExpenseBillViewProps) {
  // Format amount from paisa to rupees
  const formatAmount = (amount: number) => {
    return (amount / 100).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR'
    });
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format time
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Create a simple text receipt
    const receiptContent = `
EXPENSE RECEIPT
===============

Expense ID: ${expense.id}
Title: ${expense.title}
Date: ${formatDate(expense.expenseDate)}
Amount: ${formatAmount(expense.amount)}
${expense.expiryDate ? `Expiry Date: ${formatDate(expense.expiryDate)}` : ''}

Created: ${formatDateTime(expense.createdAt)}
${expense.updatedAt ? `Updated: ${formatDateTime(expense.updatedAt)}` : ''}

Generated on: ${new Date().toLocaleString('en-IN')}
    `.trim();

    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense-${expense.id}-${expense.title.replace(/[^a-zA-Z0-9]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="print:shadow-none">
        <CardHeader className="text-center border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{expense.icon}</span>
              <CardTitle className="text-xl">Expense Receipt</CardTitle>
            </div>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose} className="print:hidden">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            Receipt ID: #{expense.id}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6 p-6">
          {/* Expense Details */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Expense Title</label>
                <div className="text-lg font-semibold">{expense.title}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Amount</label>
                <div className="text-2xl font-bold text-green-600">
                  {formatAmount(expense.amount)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Expense Date</label>
                <div className="font-medium">{formatDate(expense.expenseDate)}</div>
              </div>
              {expense.expiryDate && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Expiry Date</label>
                  <div className="font-medium">
                    <Badge variant="outline">{formatDate(expense.expiryDate)}</Badge>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Receipt Image */}
          {expense.receiptImage && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Receipt Image</label>
              <div className="border rounded-lg p-4 bg-gray-50">
                <img
                  src={getReceiptImageUrl(expense.receiptImage) || ''}
                  alt="Receipt"
                  className="max-w-full h-auto rounded"
                  onError={(e) => {
                    console.error('Failed to load receipt image in bill view:', expense.receiptImage);
                    console.error('Original URL:', expense.receiptImage);
                    console.error('Processed URL attempted:', getReceiptImageUrl(expense.receiptImage));
                    // Show error message
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `
                        <div class="text-center py-8 text-muted-foreground">
                          <div class="text-4xl mb-2">📷</div>
                          <p class="font-medium">Receipt image not found</p>
                          <p class="text-sm">The receipt image could not be loaded.</p>
                          <p class="text-xs font-mono bg-gray-100 p-2 rounded mt-2">${expense.receiptImage}</p>
                        </div>
                      `;
                    }
                  }}
                  onLoad={() => {
                    console.log('Successfully loaded receipt image in bill view:', expense.receiptImage);
                    console.log('Processed URL:', getReceiptImageUrl(expense.receiptImage));
                  }}
                />
              </div>
            </div>
          )}

          <Separator />

          {/* Metadata */}
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Created:</span>
              <span>{formatDateTime(expense.createdAt)}</span>
            </div>
            {expense.updatedAt && (
              <div className="flex justify-between">
                <span>Last Updated:</span>
                <span>{formatDateTime(expense.updatedAt)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Generated:</span>
              <span>{new Date().toLocaleString('en-IN')}</span>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex justify-center gap-4 print:hidden">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground pt-4 border-t">
            <p>SpiceInventoryMaster - Financial Tracker</p>
            <p>This is a computer-generated receipt</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
