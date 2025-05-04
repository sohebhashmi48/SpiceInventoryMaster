import { useState } from "react";
import Layout from "@/components/layout/layout";
import PageHeader from "@/components/common/page-header";
import InvoicesTable from "@/components/billing/invoices-table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Receipt, FileText, CheckCheck, Clock, Ban, DollarSign, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Invoice, Transaction } from "@shared/schema";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import CreateInvoiceForm from "@/components/billing/create-invoice-form";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";

export default function BillingPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("invoices");
  
  const { data: invoices } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });
  
  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });
  
  const paidInvoices = invoices?.filter(invoice => invoice.status.toLowerCase() === "paid");
  const unpaidInvoices = invoices?.filter(invoice => invoice.status.toLowerCase() === "unpaid");
  const pendingInvoices = invoices?.filter(invoice => invoice.status.toLowerCase() === "pending");
  
  const totalPaid = paidInvoices?.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0) || 0;
  const totalUnpaid = unpaidInvoices?.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0) || 0;
  const totalPending = pendingInvoices?.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0) || 0;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Layout>
      <PageHeader
        title="Billing & Invoices"
        description="Manage invoices and track financial transactions"
      >
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-secondary hover:bg-secondary-dark text-white">
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
              <DialogDescription>
                Create a new invoice for a vendor. Add items and set payment terms.
              </DialogDescription>
            </DialogHeader>
            <CreateInvoiceForm
              onSuccess={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </PageHeader>
      
      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-lg font-medium">
              <CheckCheck className="mr-2 h-4 w-4 text-green-500" />
              Paid Invoices
            </CardTitle>
            <CardDescription>Total amount of paid invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPaid)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {paidInvoices?.length || 0} invoices
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-lg font-medium">
              <FileText className="mr-2 h-4 w-4 text-red-500" />
              Unpaid Invoices
            </CardTitle>
            <CardDescription>Total outstanding amount</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalUnpaid)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {unpaidInvoices?.length || 0} invoices
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-lg font-medium">
              <Clock className="mr-2 h-4 w-4 text-yellow-500" />
              Pending Invoices
            </CardTitle>
            <CardDescription>Invoices awaiting action</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPending)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingInvoices?.length || 0} invoices
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="invoices" className="flex items-center">
            <Receipt className="h-4 w-4 mr-2" />
            All Invoices
          </TabsTrigger>
          <TabsTrigger value="paid" className="flex items-center">
            <CheckCheck className="h-4 w-4 mr-2" />
            Paid
            {paidInvoices && paidInvoices.length > 0 && (
              <span className="ml-2 bg-green-100 text-green-800 text-xs rounded-full px-2 py-0.5">
                {paidInvoices.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="unpaid" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Unpaid
            {unpaidInvoices && unpaidInvoices.length > 0 && (
              <span className="ml-2 bg-red-100 text-red-800 text-xs rounded-full px-2 py-0.5">
                {unpaidInvoices.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            Pending
            {pendingInvoices && pendingInvoices.length > 0 && (
              <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs rounded-full px-2 py-0.5">
                {pendingInvoices.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center">
            <DollarSign className="h-4 w-4 mr-2" />
            Payments
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="invoices" className="mt-6">
          <InvoicesTable />
        </TabsContent>
        
        <TabsContent value="paid" className="mt-6">
          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-r-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <CheckCheck className="h-5 w-5 text-green-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Paid Invoices</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>These invoices have been paid in full.</p>
                </div>
              </div>
            </div>
          </div>
          <InvoicesTable />
        </TabsContent>
        
        <TabsContent value="unpaid" className="mt-6">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <FileText className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Unpaid Invoices</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>These invoices require payment. Review and process them as soon as possible.</p>
                </div>
              </div>
            </div>
          </div>
          <InvoicesTable />
        </TabsContent>
        
        <TabsContent value="pending" className="mt-6">
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6 rounded-r-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Pending Invoices</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>These invoices are waiting for review or approval.</p>
                </div>
              </div>
            </div>
          </div>
          <InvoicesTable />
        </TabsContent>
        
        <TabsContent value="payments" className="mt-6">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <DollarSign className="h-5 w-5 text-blue-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Payment Transactions</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>View all payment transactions with vendors.</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Payments table would go here */}
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="p-3 text-left font-medium text-slate-700">Date</th>
                  <th className="p-3 text-left font-medium text-slate-700">Vendor</th>
                  <th className="p-3 text-left font-medium text-slate-700">Invoice #</th>
                  <th className="p-3 text-left font-medium text-slate-700">Type</th>
                  <th className="p-3 text-right font-medium text-slate-700">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions && transactions.length > 0 ? (
                  transactions.map((transaction, index) => (
                    <tr key={transaction.id} className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="p-3 text-slate-700">
                        {new Date(transaction.transactionDate).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-slate-700">Vendor #{transaction.vendorId}</td>
                      <td className="p-3 text-slate-700">
                        {transaction.invoiceId ? `INV-${transaction.invoiceId}` : "-"}
                      </td>
                      <td className="p-3 text-slate-700">
                        {transaction.type === "payment" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Payment
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Receipt
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right text-slate-700 font-medium">
                        ${Number(transaction.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500">
                      No payment transactions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
