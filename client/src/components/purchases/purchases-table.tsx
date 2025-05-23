import { useState } from "react";
import { Purchase } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Printer, Trash2, Eye, FileText, Calendar, Building, DollarSign } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PurchasesTableProps {
  purchases: Purchase[];
  isLoading: boolean;
}

export default function PurchasesTable({ purchases, isLoading }: PurchasesTableProps) {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(null);

  const deletePurchaseMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/purchases/${id}`);
      return id;
    },
    onSuccess: () => {
      toast({
        title: "Purchase deleted",
        description: "The purchase has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete purchase",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: number) => {
    setSelectedPurchaseId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedPurchaseId) {
      deletePurchaseMutation.mutate(selectedPurchaseId);
    }
    setDeleteDialogOpen(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const printPurchase = (purchase: Purchase) => {
    // Create a printable version of the purchase
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Purchase Bill - ${purchase.billNo}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 20px; }
              .company-info { margin-bottom: 20px; }
              .bill-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .totals { margin-top: 20px; text-align: right; }
              .footer { margin-top: 40px; text-align: center; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>PURCHASE BILL</h2>
            </div>
            <div class="company-info">
              <h3>${purchase.companyName}</h3>
              <p>${purchase.companyAddress}</p>
            </div>
            <div class="bill-info">
              <div>
                <p><strong>Bill No:</strong> ${purchase.billNo}</p>
                <p><strong>Page No:</strong> ${purchase.pageNo}</p>
              </div>
              <div>
                <p><strong>Date:</strong> ${formatDate(purchase.purchaseDate)}</p>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Quantity</th>
                  <th>Rate</th>
                  <th>GST %</th>
                  <th>GST Amount</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                <!-- Items would be populated here in a real implementation -->
                <tr>
                  <td colspan="6" style="text-align: center;">Item details not available in this view</td>
                </tr>
              </tbody>
            </table>
            <div class="totals">
              <p><strong>Total Amount:</strong> ${parseFloat(purchase.totalAmount).toFixed(2)}</p>
              <p><strong>GST Amount:</strong> ${parseFloat(purchase.totalGstAmount).toFixed(2)}</p>
              <p><strong>Grand Total:</strong> ${parseFloat(purchase.grandTotal).toFixed(2)}</p>
            </div>
            <div class="footer">
              <p>This is a computer generated bill</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl text-blue-800 dark:text-blue-300">Purchase History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-16 w-full rounded-md" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (purchases.length === 0) {
    return (
      <Card className="shadow-md border-t-4 border-t-blue-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl text-blue-800 dark:text-blue-300">Purchase History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10 bg-blue-50 dark:bg-gray-800 rounded-md">
            <FileText className="h-12 w-12 mx-auto text-blue-400 dark:text-blue-500 mb-3" />
            <p className="text-blue-700 dark:text-blue-300">No purchases found. Create your first purchase entry.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-md border-t-4 border-t-blue-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl text-blue-800 dark:text-blue-300">Purchase History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="border-collapse">
              <TableHeader>
                <TableRow className="bg-blue-50 dark:bg-gray-800">
                  <TableHead className="text-blue-700 dark:text-blue-300 font-medium">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      Bill No
                    </div>
                  </TableHead>
                  <TableHead className="text-blue-700 dark:text-blue-300 font-medium">
                    <div className="flex items-center">
                      <Building className="h-4 w-4 mr-2" />
                      Company
                    </div>
                  </TableHead>
                  <TableHead className="text-blue-700 dark:text-blue-300 font-medium">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      Date
                    </div>
                  </TableHead>
                  <TableHead className="text-right text-blue-700 dark:text-blue-300 font-medium">
                    <div className="flex items-center justify-end">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Amount
                    </div>
                  </TableHead>
                  <TableHead className="text-right text-blue-700 dark:text-blue-300 font-medium">GST</TableHead>
                  <TableHead className="text-right text-blue-700 dark:text-blue-300 font-medium">Total</TableHead>
                  <TableHead className="text-right text-blue-700 dark:text-blue-300 font-medium">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((purchase, index) => (
                  <TableRow
                    key={purchase.id}
                    className={cn(
                      "hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors",
                      index % 2 === 0 ? "bg-white dark:bg-gray-950" : "bg-gray-50 dark:bg-gray-900"
                    )}
                  >
                    <TableCell className="font-medium text-blue-700 dark:text-blue-300">
                      {purchase.billNo}
                    </TableCell>
                    <TableCell className="text-gray-700 dark:text-gray-300">
                      {purchase.companyName}
                    </TableCell>
                    <TableCell className="text-gray-700 dark:text-gray-300">
                      {formatDate(purchase.purchaseDate)}
                    </TableCell>
                    <TableCell className="text-right text-gray-700 dark:text-gray-300">
                      ₹ {parseFloat(purchase.totalAmount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-gray-700 dark:text-gray-300">
                      ₹ {parseFloat(purchase.totalGstAmount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-blue-800 dark:text-blue-200">
                      ₹ {parseFloat(purchase.grandTotal).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => printPurchase(purchase)}
                          title="Print"
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-200 dark:hover:bg-blue-900/20"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                          onClick={() => handleDelete(purchase.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="border-t-4 border-t-red-500">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 dark:text-red-400 flex items-center">
              <Trash2 className="h-5 w-5 mr-2" />
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the purchase entry and all its items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/20">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
