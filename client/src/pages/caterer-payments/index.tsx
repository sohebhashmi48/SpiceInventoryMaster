import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/layout/layout';
import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table';
import {
  FileText, Plus, Search, Filter, ArrowUpDown, ChevronDown, DollarSign, Image, Printer
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useCatererPayments } from '@/hooks/use-caterer-payments';
import { useCaterers } from '@/hooks/use-caterers';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function CatererPaymentsPage() {
  const [, setLocation] = useLocation();
  const { data: payments, isLoading } = useCatererPayments();
  const { data: caterers } = useCaterers();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [catererFilter, setCatererFilter] = useState<number | 'all'>('all');
  const [paymentModeFilter, setPaymentModeFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  }>({ key: 'paymentDate', direction: 'desc' });

  // Helper function to navigate
  const navigate = (path: string) => setLocation(path);

  // Get caterer name by ID
  const getCatererName = (catererId: number) => {
    const caterer = caterers?.find(c => c.id === catererId);
    return caterer ? caterer.name : 'Unknown Caterer';
  };

  // Filter and sort payments
  const filteredPayments = payments
    ? payments
        .filter(payment => {
          // Filter by search term
          const searchMatch =
            getCatererName(payment.catererId).toLowerCase().includes(searchTerm.toLowerCase()) ||
            payment.paymentMode.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (payment.notes && payment.notes.toLowerCase().includes(searchTerm.toLowerCase()));

          // Filter by caterer
          const catererMatch = catererFilter === 'all' || payment.catererId === catererFilter;

          // Filter by payment mode
          const paymentModeMatch = paymentModeFilter === 'all' || payment.paymentMode === paymentModeFilter;

          return searchMatch && catererMatch && paymentModeMatch;
        })
        .sort((a, b) => {
          const { key, direction } = sortConfig;

          if (key === 'caterer') {
            const aName = getCatererName(a.catererId);
            const bName = getCatererName(b.catererId);
            return direction === 'asc'
              ? aName.localeCompare(bName)
              : bName.localeCompare(aName);
          }

          if (key === 'amount') {
            const aAmount = parseFloat(a.amount);
            const bAmount = parseFloat(b.amount);
            return direction === 'asc' ? aAmount - bAmount : bAmount - aAmount;
          }

          if (key === 'paymentDate') {
            const aDate = new Date(a.paymentDate);
            const bDate = new Date(b.paymentDate);
            return direction === 'asc'
              ? aDate.getTime() - bDate.getTime()
              : bDate.getTime() - aDate.getTime();
          }

          return 0;
        })
    : [];

  // Get unique payment modes
  const paymentModes = payments
    ? [...new Set(payments.map(payment => payment.paymentMode))]
    : [];

  // Handle sort
  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Print payment receipt
  const printPaymentReceipt = async (payment: any) => {
    const catererName = getCatererName(payment.catererId);

    // Show loading toast if we need to fetch items
    if (payment.distributionId) {
      toast({
        title: "🔄 Preparing Receipt",
        description: "Fetching bill details for complete receipt...",
        duration: 2000,
      });
    }

    // Fetch distribution items if distributionId exists
    let distributionItems: any[] = [];
    let distributionDetails: any = null;

    if (payment.distributionId) {
      try {
        const response = await fetch(`/api/distributions/${payment.distributionId}`, {
          credentials: 'include',
        });
        if (response.ok) {
          distributionDetails = await response.json();
          distributionItems = distributionDetails.items || [];
        }
      } catch (error) {
        console.error('Failed to fetch distribution items:', error);
        toast({
          title: "⚠️ Warning",
          description: "Could not fetch bill items. Printing payment receipt only.",
          variant: "destructive",
          duration: 3000,
        });
      }
    }

    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      alert('Please allow popups to print the receipt');
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Receipt - ${payment.id}</title>
          <style>
            @media print {
              @page { margin: 0.5in; }
              body { margin: 0; }
            }

            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.4;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }

            .header {
              text-align: center;
              border-bottom: 3px solid #d97706;
              padding-bottom: 20px;
              margin-bottom: 30px;
              background: linear-gradient(135deg, #f59e0b, #d97706);
              color: white;
              padding: 30px 20px;
              border-radius: 10px;
              margin: -20px -20px 30px -20px;
            }

            .company-name {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 5px;
              text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
            }

            .company-tagline {
              font-size: 14px;
              opacity: 0.9;
              margin-bottom: 10px;
            }

            .receipt-title {
              font-size: 24px;
              font-weight: bold;
              color: #1f2937;
              text-align: center;
              margin-bottom: 20px;
              padding: 15px;
              background: #f3f4f6;
              border-radius: 8px;
              border-left: 5px solid #d97706;
            }

            .receipt-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 30px;
            }

            .info-section {
              background: #f9fafb;
              padding: 20px;
              border-radius: 8px;
              border: 1px solid #e5e7eb;
            }

            .info-title {
              font-weight: bold;
              color: #374151;
              margin-bottom: 10px;
              font-size: 16px;
              border-bottom: 2px solid #d97706;
              padding-bottom: 5px;
            }

            .info-item {
              margin-bottom: 8px;
              display: flex;
              justify-content: space-between;
            }

            .info-label {
              font-weight: 500;
              color: #6b7280;
            }

            .info-value {
              font-weight: 600;
              color: #1f2937;
            }

            .amount-section {
              background: linear-gradient(135deg, #10b981, #059669);
              color: white;
              padding: 25px;
              border-radius: 10px;
              text-align: center;
              margin: 30px 0;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }

            .amount-label {
              font-size: 16px;
              margin-bottom: 10px;
              opacity: 0.9;
            }

            .amount-value {
              font-size: 36px;
              font-weight: bold;
              text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
            }

            .notes-section {
              background: #fef3c7;
              border: 1px solid #f59e0b;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }

            .notes-title {
              font-weight: bold;
              color: #92400e;
              margin-bottom: 10px;
            }

            .notes-content {
              color: #78350f;
              font-style: italic;
            }

            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              color: #6b7280;
            }

            .footer-message {
              font-size: 16px;
              font-weight: 600;
              color: #d97706;
              margin-bottom: 10px;
            }

            .footer-contact {
              font-size: 12px;
              line-height: 1.6;
            }

            .items-section {
              margin: 30px 0;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              overflow: hidden;
            }

            .items-title {
              background: #f3f4f6;
              padding: 15px 20px;
              font-weight: bold;
              color: #374151;
              border-bottom: 1px solid #e5e7eb;
              font-size: 16px;
            }

            .items-table {
              width: 100%;
              border-collapse: collapse;
            }

            .items-table th {
              background: #f9fafb;
              padding: 12px 8px;
              text-align: left;
              font-weight: 600;
              color: #374151;
              border-bottom: 1px solid #e5e7eb;
              font-size: 12px;
            }

            .items-table td {
              padding: 10px 8px;
              border-bottom: 1px solid #f3f4f6;
              font-size: 12px;
            }

            .items-table tr:last-child td {
              border-bottom: none;
            }

            .items-table .text-right {
              text-align: right;
            }

            .items-table .text-center {
              text-align: center;
            }

            .items-total {
              background: #f9fafb;
              font-weight: bold;
            }

            @media print {
              .header { margin: -20px -20px 20px -20px; }
              body { font-size: 12px; }
              .company-name { font-size: 24px; }
              .receipt-title { font-size: 20px; }
              .amount-value { font-size: 28px; }
              .items-table th, .items-table td { font-size: 10px; padding: 6px 4px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">🌶️ RoyalSpicyMasala</div>
            <div class="company-tagline">Premium Quality Spices Since 1995</div>
          </div>

          <div class="receipt-title">
            💰 Payment Receipt
          </div>

          <div class="receipt-info">
            <div class="info-section">
              <div class="info-title">📋 Receipt Details</div>
              <div class="info-item">
                <span class="info-label">Receipt No:</span>
                <span class="info-value">#PAY-${payment.id.toString().padStart(6, '0')}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Date:</span>
                <span class="info-value">${formatDate(payment.paymentDate)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Payment Mode:</span>
                <span class="info-value">${payment.paymentMode.charAt(0).toUpperCase() + payment.paymentMode.slice(1)}</span>
              </div>
              ${payment.referenceNo ? `
              <div class="info-item">
                <span class="info-label">Reference:</span>
                <span class="info-value">${payment.referenceNo}</span>
              </div>
              ` : ''}
            </div>

            <div class="info-section">
              <div class="info-title">👤 Caterer Details</div>
              <div class="info-item">
                <span class="info-label">Name:</span>
                <span class="info-value">${catererName}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Caterer ID:</span>
                <span class="info-value">#${payment.catererId}</span>
              </div>
              ${payment.distributionId ? `
              <div class="info-item">
                <span class="info-label">Bill Reference:</span>
                <span class="info-value">#DIST-${payment.distributionId}</span>
              </div>
              ` : ''}
            </div>
          </div>

          <div class="amount-section">
            <div class="amount-label">Amount Received</div>
            <div class="amount-value">₹${formatCurrency(payment.amount)}</div>
          </div>

          ${distributionItems.length > 0 ? `
          <div class="items-section">
            <div class="items-title">📦 Items Purchased ${distributionDetails ? `(Bill: ${distributionDetails.billNo})` : ''}</div>
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 5%;">#</th>
                  <th style="width: 35%;">Item Name</th>
                  <th style="width: 15%;" class="text-center">Quantity</th>
                  <th style="width: 15%;" class="text-right">Rate</th>
                  <th style="width: 10%;" class="text-center">GST%</th>
                  <th style="width: 20%;" class="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${distributionItems.map((item, index) => `
                <tr>
                  <td class="text-center">${index + 1}</td>
                  <td><strong>${item.itemName}</strong></td>
                  <td class="text-center">${parseFloat(item.quantity).toFixed(2)} ${item.unit}</td>
                  <td class="text-right">₹${parseFloat(item.rate).toFixed(2)}</td>
                  <td class="text-center">${parseFloat(item.gstPercentage).toFixed(1)}%</td>
                  <td class="text-right"><strong>₹${parseFloat(item.amount).toFixed(2)}</strong></td>
                </tr>
                `).join('')}
                ${distributionDetails ? `
                <tr class="items-total">
                  <td colspan="5" class="text-right"><strong>Subtotal:</strong></td>
                  <td class="text-right"><strong>₹${parseFloat(distributionDetails.totalAmount).toFixed(2)}</strong></td>
                </tr>
                <tr class="items-total">
                  <td colspan="5" class="text-right"><strong>GST Amount:</strong></td>
                  <td class="text-right"><strong>₹${parseFloat(distributionDetails.totalGstAmount).toFixed(2)}</strong></td>
                </tr>
                <tr class="items-total">
                  <td colspan="5" class="text-right"><strong>Grand Total:</strong></td>
                  <td class="text-right"><strong>₹${parseFloat(distributionDetails.grandTotal).toFixed(2)}</strong></td>
                </tr>
                ` : ''}
              </tbody>
            </table>
          </div>
          ` : ''}

          ${payment.notes ? `
          <div class="notes-section">
            <div class="notes-title">📝 Notes</div>
            <div class="notes-content">${payment.notes}</div>
          </div>
          ` : ''}

          <div class="footer">
            <div class="footer-message">🙏 Thank you for your payment! 🙏</div>
            <div class="footer-contact">
              📞 Contact: +91-9876543210 | 📧 info@royalspicymasala.com<br/>
              📍 Address: Spice Market, Mumbai | 🌐 www.royalspicymasala.com<br/>
              <strong>This is a computer-generated receipt and does not require a signature.</strong>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();

    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();

      // Show success toast
      const itemsText = distributionItems.length > 0 ? ` with ${distributionItems.length} items` : '';
      toast({
        title: "✅ Receipt Printed",
        description: `Payment receipt for ${catererName}${itemsText} has been sent to printer.`,
        duration: 3000,
      });
    };
  };

  return (
    <Layout>
      <PageHeader
        title="Caterer Payment History"
        description="View and manage all payments from caterers"
        icon={<FileText className="h-6 w-6 text-secondary" />}
      >
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (filteredPayments.length === 0) {
                toast({
                  title: "⚠️ No Payments",
                  description: "No payments available to print.",
                  variant: "destructive",
                });
                return;
              }

              if (filteredPayments.length > 10) {
                const confirmed = confirm(`You are about to print ${filteredPayments.length} receipts. This may take a while. Continue?`);
                if (!confirmed) return;
              }

              toast({
                title: "🖨️ Printing Started",
                description: `Printing ${filteredPayments.length} payment receipts...`,
              });

              // Print all visible payments with delay
              filteredPayments.forEach((payment, index) => {
                setTimeout(() => printPaymentReceipt(payment), index * 1500);
              });
            }}
            className="flex items-center gap-2"
            disabled={filteredPayments.length === 0}
          >
            <Printer className="h-4 w-4" />
            Print All ({filteredPayments.length})
          </Button>
          <Button onClick={() => navigate('/caterer-payments/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        </div>
      </PageHeader>

      <Card className="mt-6">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>Payment History</CardTitle>
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search payments..."
                  className="pl-8 w-full md:w-[250px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="ml-auto">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  <div className="p-2">
                    <h4 className="font-medium mb-1">Caterer</h4>
                    <select
                      className="w-full p-2 border rounded"
                      value={catererFilter === 'all' ? 'all' : catererFilter}
                      onChange={(e) => setCatererFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                    >
                      <option value="all">All Caterers</option>
                      {caterers?.map((caterer) => (
                        <option key={caterer.id} value={caterer.id}>
                          {caterer.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="p-2">
                    <h4 className="font-medium mb-1">Payment Mode</h4>
                    <select
                      className="w-full p-2 border rounded"
                      value={paymentModeFilter}
                      onChange={(e) => setPaymentModeFilter(e.target.value)}
                    >
                      <option value="all">All Payment Modes</option>
                      {paymentModes.map((mode) => (
                        <option key={mode} value={mode}>
                          {mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-10">
              <DollarSign className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Payments Found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || catererFilter !== 'all' || paymentModeFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'No payments have been recorded yet'}
              </p>
              <Button onClick={() => navigate('/caterer-payments/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Record First Payment
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('paymentDate')}>
                      <div className="flex items-center">
                        Date
                        {sortConfig.key === 'paymentDate' && (
                          <ArrowUpDown className={`ml-2 h-4 w-4 ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('caterer')}>
                      <div className="flex items-center">
                        Caterer
                        {sortConfig.key === 'caterer' && (
                          <ArrowUpDown className={`ml-2 h-4 w-4 ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('amount')}>
                      <div className="flex items-center">
                        Amount
                        {sortConfig.key === 'amount' && (
                          <ArrowUpDown className={`ml-2 h-4 w-4 ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} />
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Payment Mode</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Distribution</TableHead>
                    <TableHead>Receipt</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                      <TableCell>
                        <Button
                          variant="link"
                          className="p-0 h-auto text-left"
                          onClick={() => navigate(`/caterers/${payment.catererId}`)}
                        >
                          {getCatererName(payment.catererId)}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {payment.paymentMode}
                        </Badge>
                      </TableCell>
                      <TableCell>{payment.referenceNo || '-'}</TableCell>
                      <TableCell>
                        {payment.distributionId ? (
                          <Button
                            variant="link"
                            className="p-0 h-auto"
                            onClick={() => navigate(`/distributions/${payment.distributionId}`)}
                          >
                            View Bill
                          </Button>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {payment && payment.receiptImage ? (
                          <a
                            href={`/api/uploads/receipts/${payment.receiptImage}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-700 underline flex items-center"
                          >
                            <Image className="h-4 w-4 mr-1" />
                            View
                          </a>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{payment.notes || '-'}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => printPaymentReceipt(payment)}
                          className="flex items-center gap-1 hover:bg-primary/10"
                          disabled={isLoading}
                        >
                          <Printer className="h-4 w-4" />
                          Print
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}
