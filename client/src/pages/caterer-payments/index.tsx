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
  Tabs, TabsContent, TabsList, TabsTrigger
} from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import {
  Popover, PopoverContent, PopoverTrigger
} from '@/components/ui/popover';
import {
  FileText, Plus, Search, Filter, ArrowUpDown, ChevronDown, ChevronRight, DollarSign, Image, Printer,
  Calendar, TrendingUp, AlertCircle, Clock, Target, Download, CalendarIcon, CreditCard, Receipt
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useCatererPayments } from '@/hooks/use-caterer-payments';
import { useCaterers } from '@/hooks/use-caterers';
import { useDistributions } from '@/hooks/use-distributions';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useEffect } from 'react';

export default function CatererPaymentsPage() {
  const [, setLocation] = useLocation();
  const { data: payments, isLoading } = useCatererPayments();
  const { data: caterers } = useCaterers();
  const { data: distributions } = useDistributions();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [catererFilter, setCatererFilter] = useState<number | 'all'>('all');
  const [paymentModeFilter, setPaymentModeFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  }>({ key: 'paymentDate', direction: 'desc' });
  const [activeTab, setActiveTab] = useState('today-bills');

  // Date filtering states
  const [showTodayOnly, setShowTodayOnly] = useState(true);
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);

  // Export dialog states
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportDateFrom, setExportDateFrom] = useState<Date | null>(null);
  const [exportDateTo, setExportDateTo] = useState<Date | null>(null);

  // Collapsible payment states
  const [expandedPayments, setExpandedPayments] = useState<number[]>([]);
  const [paymentDetails, setPaymentDetails] = useState<{[key: number]: any}>({});
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Helper function to navigate
  const navigate = (path: string) => setLocation(path);

  // Get caterer name by ID
  const getCatererName = (catererId: number) => {
    const caterer = caterers?.find(c => c.id === catererId);
    return caterer ? caterer.name : 'Unknown Caterer';
  };

  // Toggle payment expansion (details are already loaded)
  const togglePayment = (paymentId: number) => {
    if (expandedPayments.includes(paymentId)) {
      setExpandedPayments(prev => prev.filter(id => id !== paymentId));
    } else {
      setExpandedPayments(prev => [...prev, paymentId]);
    }
  };

  // Fetch distribution details for all payments when payments data is loaded
  useEffect(() => {
    const fetchAllDistributionDetails = async () => {
      if (!payments || payments.length === 0) return;

      setIsLoadingDetails(true);
      const newPaymentDetails: {[key: number]: any} = {};

      // Get unique distribution IDs from payments
      const distributionIds = [...new Set(
        payments
          .filter(payment => payment.distributionId)
          .map(payment => payment.distributionId)
      )];

      console.log('🔍 Distribution IDs to fetch:', distributionIds);
      console.log('🔍 Payments with distribution IDs:', payments.filter(p => p.distributionId));

      // Fetch details for each distribution
      await Promise.all(
        distributionIds.map(async (distributionId) => {
          try {
            console.log(`📡 Fetching distribution ${distributionId}...`);
            const response = await fetch(`/api/distributions/${distributionId}`, {
              credentials: 'include',
            });

            if (response.ok) {
              const distributionDetails = await response.json();
              console.log(`✅ Distribution ${distributionId} response:`, {
                id: distributionDetails.id,
                billNo: distributionDetails.billNo,
                hasItems: !!(distributionDetails.items),
                itemsCount: distributionDetails.items?.length || 0,
                items: distributionDetails.items
              });

              // Find all payments for this distribution
              const paymentsForDistribution = payments.filter(p => p.distributionId === distributionId);
              console.log(`📋 Payments for distribution ${distributionId}:`, paymentsForDistribution.map(p => p.id));

              paymentsForDistribution.forEach(payment => {
                const itemsCopy = [...(distributionDetails.items || [])];
                console.log(`💾 Setting ${itemsCopy.length} items for payment ${payment.id}`);
                newPaymentDetails[payment.id] = {
                  distributionDetails: { ...distributionDetails },
                  distributionItems: itemsCopy
                };
              });
            } else {
              console.error(`❌ Failed to fetch distribution ${distributionId}: ${response.status}`);
            }
          } catch (error) {
            console.error(`❌ Error fetching distribution ${distributionId}:`, error);
          }
        })
      );

      console.log('🏁 Final payment details:', newPaymentDetails);
      setPaymentDetails(newPaymentDetails);
      setIsLoadingDetails(false);
    };

    fetchAllDistributionDetails();
  }, [payments]);

  // Fetch today's profit data
  const { data: profitData } = useQuery({
    queryKey: ['daily-profit'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/daily-profit', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch daily profit data');
      }
      return response.json();
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Calculate financial metrics
  const calculateFinancialMetrics = () => {
    if (!distributions || !payments) {
      return {
        todaysBills: 0,
        totalBills: 0,
        billsPending: 0,
        balanceDue: 0,
        catererProfit: 0,
      };
    }

    const today = new Date().toDateString();

    // Today's bills
    const todaysBills = distributions.filter(dist =>
      new Date(dist.distributionDate).toDateString() === today
    ).length;

    // Total bills
    const totalBills = distributions.length;

    // Bills pending (status not completed)
    const billsPending = distributions.filter(dist =>
      dist.status !== 'completed' && dist.status !== 'paid'
    ).length;

    // Calculate total balance due using distribution-based calculation for accuracy
    const totalBilled = distributions.reduce((sum, dist) => {
      const amount = parseFloat(dist.grandTotal || '0');
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    // Use distribution-based balance calculation for accuracy
    const balanceDue = distributions.reduce((sum, dist) => {
      const balance = parseFloat(dist.balanceDue || '0');
      return sum + (isNaN(balance) ? 0 : balance);
    }, 0);

    const totalPaid = payments.reduce((sum, payment) => {
      const amount = parseFloat(payment.amount || '0');
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    // Calculate caterer profit (today's caterer bills revenue - estimated cost)
    // For simplicity, assume 30% profit margin on caterer sales
    const todaysCatererRevenue = distributions
      .filter(dist => new Date(dist.distributionDate).toDateString() === today)
      .reduce((sum, dist) => {
        const amount = parseFloat(dist.grandTotal || '0');
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);

    const catererProfit = todaysCatererRevenue * 0.3; // 30% profit margin

    return {
      todaysBills,
      totalBills,
      billsPending,
      balanceDue,
      catererProfit,
    };
  };

  const metrics = calculateFinancialMetrics();

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

          // Filter by date
          const paymentDate = new Date(payment.paymentDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          let dateMatch = true;
          if (showTodayOnly) {
            const paymentDateOnly = new Date(paymentDate);
            paymentDateOnly.setHours(0, 0, 0, 0);
            dateMatch = paymentDateOnly.getTime() === today.getTime();
          } else if (dateFrom || dateTo) {
            if (dateFrom && dateTo) {
              const fromDate = new Date(dateFrom);
              fromDate.setHours(0, 0, 0, 0);
              const toDate = new Date(dateTo);
              toDate.setHours(23, 59, 59, 999);
              dateMatch = paymentDate >= fromDate && paymentDate <= toDate;
            } else if (dateFrom) {
              const fromDate = new Date(dateFrom);
              fromDate.setHours(0, 0, 0, 0);
              dateMatch = paymentDate >= fromDate;
            } else if (dateTo) {
              const toDate = new Date(dateTo);
              toDate.setHours(23, 59, 59, 999);
              dateMatch = paymentDate <= toDate;
            }
          }

          return searchMatch && catererMatch && paymentModeMatch && dateMatch;
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
            const dateComparison = direction === 'asc'
              ? aDate.getTime() - bDate.getTime()
              : bDate.getTime() - aDate.getTime();

            // If dates are the same, sort by ID (latest ID first)
            if (dateComparison === 0) {
              return direction === 'asc' ? a.id - b.id : b.id - a.id;
            }
            return dateComparison;
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

  // Handle CSV export
  const handleExportCSV = () => {
    if (!exportDateFrom || !exportDateTo) {
      toast({
        title: "Date range required",
        description: "Please select both start and end dates for export.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    // Filter payments by date range
    const filteredExportPayments = payments?.filter(payment => {
      const paymentDate = new Date(payment.paymentDate);
      const fromDate = new Date(exportDateFrom);
      fromDate.setHours(0, 0, 0, 0);
      const toDate = new Date(exportDateTo);
      toDate.setHours(23, 59, 59, 999);
      return paymentDate >= fromDate && paymentDate <= toDate;
    }) || [];

    if (filteredExportPayments.length === 0) {
      toast({
        title: "No data to export",
        description: "No payments found in the selected date range.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    // Create CSV content
    const headers = [
      'Date',
      'Caterer Name',
      'Amount (INR)',
      'Payment Mode',
      'Reference No',
      'Distribution ID',
      'Notes',
      'Created At'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredExportPayments.map(payment => [
        formatDate(payment.paymentDate),
        `"${getCatererName(payment.catererId).replace(/"/g, '""')}"`, // Escape quotes
        parseFloat(payment.amount).toFixed(2),
        `"${payment.paymentMode.replace(/"/g, '""')}"`,
        payment.referenceNo ? `"${payment.referenceNo.replace(/"/g, '""')}"` : '',
        payment.distributionId || '',
        payment.notes ? `"${payment.notes.replace(/"/g, '""')}"` : '',
        formatDate(payment.createdAt)
      ].join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `caterer-payments-${format(exportDateFrom, 'yyyy-MM-dd')}-to-${format(exportDateTo, 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export successful",
      description: `Exported ${filteredExportPayments.length} payment records.`,
      duration: 3000,
    });

    setIsExportDialogOpen(false);
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
            <div class="amount-value">${formatCurrency(payment.amount)}</div>
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
          <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Export Payment History</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>From Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {exportDateFrom ? format(exportDateFrom, "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={exportDateFrom}
                          onSelect={setExportDateFrom}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>To Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {exportDateTo ? format(exportDateTo, "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={exportDateTo}
                          onSelect={setExportDateTo}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsExportDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleExportCSV}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/caterer-payments/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const response = await fetch('/api/distributions/35', {
                    credentials: 'include',
                  });
                  if (response.ok) {
                    const data = await response.json();
                    console.log('🧪 Test API Response for Distribution 35:', data);
                    alert(`Distribution 35 has ${data.items?.length || 0} items: ${data.items?.map(i => i.itemName).join(', ') || 'None'}`);
                  } else {
                    alert(`API Error: ${response.status}`);
                  }
                } catch (error) {
                  console.error('Test API Error:', error);
                  alert('API Test Failed');
                }
              }}
            >
              Test API
            </Button>
          </div>
        </div>
      </PageHeader>

      {/* Financial Metrics Tabs */}
      <div className="mt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="today-bills" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Today's Bills
            </TabsTrigger>
            <TabsTrigger value="total-bills" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Total Bills
            </TabsTrigger>
            <TabsTrigger value="bills-pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Bills Pending
            </TabsTrigger>
            <TabsTrigger value="balance-due" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Balance Due
            </TabsTrigger>
            <TabsTrigger value="todays-profit" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Caterer Profit
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today-bills" className="mt-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-center py-4">
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {metrics.todaysBills}
                  </div>
                  <p className="text-sm text-gray-600">Bills created today</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="total-bills" className="mt-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-center py-4">
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    {metrics.totalBills}
                  </div>
                  <p className="text-sm text-gray-600">Total bills created</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bills-pending" className="mt-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-center py-4">
                  <div className="text-3xl font-bold text-orange-600 mb-1">
                    {metrics.billsPending}
                  </div>
                  <p className="text-sm text-gray-600">Bills pending completion</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="balance-due" className="mt-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-center py-4">
                  <div className="text-3xl font-bold text-red-600 mb-1">
                    {formatCurrency(metrics.balanceDue)}
                  </div>
                  <p className="text-sm text-gray-600">Outstanding balance</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="todays-profit" className="mt-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-center py-4">
                  <div className="text-3xl font-bold text-purple-600 mb-1">
                    {formatCurrency(metrics.catererProfit)}
                  </div>
                  <p className="text-sm text-gray-600">Caterer profit today</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Card className="mt-6">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4">
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

            {/* Date Filter Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="flex items-center gap-2">
                <Button
                  variant={showTodayOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setShowTodayOnly(true);
                    setDateFrom(null);
                    setDateTo(null);
                  }}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Today's Bills
                </Button>
                <Button
                  variant={!showTodayOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowTodayOnly(false)}
                >
                  All Bills
                </Button>
              </div>

              {!showTodayOnly && (
                <div className="flex flex-col md:flex-row gap-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">From:</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-[140px] justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFrom ? format(dateFrom, "MMM dd") : "Select"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={dateFrom}
                          onSelect={setDateFrom}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">To:</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-[140px] justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateTo ? format(dateTo, "MMM dd") : "Select"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={dateTo}
                          onSelect={setDateTo}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  {(dateFrom || dateTo) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDateFrom(null);
                        setDateTo(null);
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              )}
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
                {searchTerm || catererFilter !== 'all' || paymentModeFilter !== 'all' || !showTodayOnly || dateFrom || dateTo
                  ? showTodayOnly
                    ? 'No payments recorded today. Try viewing all bills or adjusting filters.'
                    : 'Try adjusting your search, date range, or filters'
                  : 'No payments have been recorded yet'}
              </p>
              <Button onClick={() => navigate('/caterer-payments/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPayments.map((payment) => {
                const catererName = getCatererName(payment.catererId);
                const isExpanded = expandedPayments.includes(payment.id);
                const details = paymentDetails[payment.id];

                // Debug each payment's data
                if (payment.distributionId) {
                  console.log(`🎯 Rendering Payment ${payment.id} (Distribution ${payment.distributionId}):`, {
                    hasDetails: !!details,
                    hasDistributionDetails: !!(details?.distributionDetails),
                    hasDistributionItems: !!(details?.distributionItems),
                    itemsCount: details?.distributionItems?.length || 0,
                    isExpanded,
                    items: details?.distributionItems
                  });
                }

                return (
                  <Collapsible
                    key={payment.id}
                    open={isExpanded}
                    onOpenChange={() => togglePayment(payment.id)}
                    className="border rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* Payment Summary Header */}
                    <div
                      className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => togglePayment(payment.id)}
                    >
                      <div className="flex items-center space-x-4">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                            {isExpanded ?
                              <ChevronDown className="h-4 w-4" /> :
                              <ChevronRight className="h-4 w-4" />
                            }
                          </Button>
                        </CollapsibleTrigger>
                        <div className="flex items-center space-x-3">
                          <CreditCard className="h-5 w-5 text-green-600" />
                          <div>
                            <div className="font-medium text-lg">
                              Payment #{payment.id.toString().padStart(6, '0')}
                            </div>
                            <div className="text-sm text-gray-600">
                              {formatDate(payment.paymentDate)} • {catererName}
                            </div>
                            {/* Show payment vs bill summary */}
                            {payment.distributionId && details && details.distributionDetails && (
                              <div className="text-xs text-gray-500 mt-1">
                                Paid ₹{parseFloat(payment.amount).toFixed(2)} of ₹{parseFloat(details.distributionDetails.grandTotal).toFixed(2)}
                                {parseFloat(details.distributionDetails.balanceDue || '0') > 0 && (
                                  <span className="text-red-600 ml-1">
                                    (₹{parseFloat(details.distributionDetails.balanceDue).toFixed(2)} due)
                                  </span>
                                )}
                                {/* Show items count when collapsed */}
                                {!isExpanded && details.distributionItems && details.distributionItems.length > 0 && (
                                  <span className="ml-2 text-blue-600">
                                    • {details.distributionItems.length} items purchased
                                  </span>
                                )}
                              </div>
                            )}
                            {/* Show bill reference when details are loading or unavailable */}
                            {payment.distributionId && !details && (
                              <div className="text-xs text-gray-500 mt-1">
                                {isLoadingDetails ? (
                                  "Loading bill details..."
                                ) : (
                                  `Bill: #DIST-${payment.distributionId} • Click to view details`
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(payment.amount)}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="capitalize">
                              {payment.paymentMode}
                            </Badge>
                            {/* Payment Status Badge */}
                            {payment.distributionId ? (
                              details && details.distributionDetails ? (
                                <Badge
                                  variant={
                                    parseFloat(details.distributionDetails.balanceDue || '0') === 0
                                      ? "default"
                                      : parseFloat(details.distributionDetails.balanceDue || '0') < parseFloat(details.distributionDetails.grandTotal || '0')
                                        ? "secondary"
                                        : "destructive"
                                  }
                                  className="ml-2"
                                >
                                  {parseFloat(details.distributionDetails.balanceDue || '0') === 0
                                    ? "Fully Paid"
                                    : parseFloat(details.distributionDetails.balanceDue || '0') < parseFloat(details.distributionDetails.grandTotal || '0')
                                      ? "Partial Payment"
                                      : "Unpaid"
                                  }
                                </Badge>
                              ) : isLoadingDetails ? (
                                <Badge variant="outline" className="ml-2">Loading...</Badge>
                              ) : (
                                <Badge variant="outline" className="ml-2">Bill Details Unavailable</Badge>
                              )
                            ) : (
                              <Badge variant="default" className="ml-2">Payment Only</Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            printPaymentReceipt(payment);
                          }}
                          className="flex items-center gap-1 hover:bg-primary/10"
                          disabled={isLoading}
                        >
                          <Printer className="h-4 w-4" />
                          Print
                        </Button>
                      </div>
                    </div>

                    {/* Detailed Payment Information */}
                    <CollapsibleContent className="p-6 bg-white border-t">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Payment Details */}
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2 mb-3">
                            <Receipt className="h-5 w-5 text-blue-600" />
                            <h3 className="text-lg font-semibold text-gray-900">Payment Details</h3>
                          </div>

                          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Receipt No:</span>
                              <span className="font-medium">#PAY-{payment.id.toString().padStart(6, '0')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Date:</span>
                              <span className="font-medium">{formatDate(payment.paymentDate)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Payment Mode:</span>
                              <Badge variant="outline" className="capitalize">
                                {payment.paymentMode}
                              </Badge>
                            </div>
                            {payment.referenceNo && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Reference:</span>
                                <span className="font-medium">{payment.referenceNo}</span>
                              </div>
                            )}
                            <div className="flex justify-between border-t pt-3">
                              <span className="text-gray-600">Amount Paid:</span>
                              <span className="text-xl font-bold text-green-600">{formatCurrency(payment.amount)}</span>
                            </div>
                            {/* Show bill total if available */}
                            {details && details.distributionDetails && (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Bill Total:</span>
                                  <span className="font-medium">{formatCurrency(details.distributionDetails.grandTotal)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Balance Due:</span>
                                  <span className={`font-medium ${parseFloat(details.distributionDetails.balanceDue || '0') > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {formatCurrency(details.distributionDetails.balanceDue || '0')}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>

                          {payment.notes && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                              <div className="flex items-center space-x-2 mb-2">
                                <AlertCircle className="h-4 w-4 text-yellow-600" />
                                <span className="font-medium text-yellow-800">Notes</span>
                              </div>
                              <p className="text-yellow-700">{payment.notes}</p>
                            </div>
                          )}

                          {payment.receiptImage && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <div className="flex items-center space-x-2 mb-2">
                                <Image className="h-4 w-4 text-blue-600" />
                                <span className="font-medium text-blue-800">Receipt Image</span>
                              </div>
                              <a
                                href={`/api/uploads/receipts/${payment.receiptImage}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline"
                              >
                                View Receipt Image
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Caterer Details */}
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2 mb-3">
                            <DollarSign className="h-5 w-5 text-purple-600" />
                            <h3 className="text-lg font-semibold text-gray-900">Caterer Information</h3>
                          </div>

                          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Caterer Name:</span>
                              <Button
                                variant="link"
                                className="p-0 h-auto font-medium"
                                onClick={() => navigate(`/caterers/${payment.catererId}`)}
                              >
                                {catererName}
                              </Button>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Caterer ID:</span>
                              <span className="font-medium">#{payment.catererId}</span>
                            </div>
                            {payment.distributionId && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Bill Reference:</span>
                                <Button
                                  variant="link"
                                  className="p-0 h-auto font-medium"
                                  onClick={() => navigate(`/distributions/${payment.distributionId}`)}
                                >
                                  #DIST-{payment.distributionId}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Bill Details Section */}
                      {details && details.distributionDetails && (
                        <div className="mt-6 border-t pt-6">
                          <div className="flex items-center space-x-2 mb-4">
                            <FileText className="h-5 w-5 text-orange-600" />
                            <h3 className="text-lg font-semibold text-gray-900">
                              Bill Details - {details.distributionDetails.billNo}
                            </h3>
                          </div>

                          {/* Bill Summary */}
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="text-center">
                                <div className="text-sm text-gray-600">Subtotal</div>
                                <div className="text-lg font-semibold">₹{parseFloat(details.distributionDetails.totalAmount).toFixed(2)}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-sm text-gray-600">GST Amount</div>
                                <div className="text-lg font-semibold">₹{parseFloat(details.distributionDetails.totalGstAmount).toFixed(2)}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-sm text-gray-600">Grand Total</div>
                                <div className="text-lg font-bold text-orange-600">₹{parseFloat(details.distributionDetails.grandTotal).toFixed(2)}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-sm text-gray-600">Balance Due</div>
                                <div className={`text-lg font-bold ${parseFloat(details.distributionDetails.balanceDue || '0') > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  ₹{parseFloat(details.distributionDetails.balanceDue || '0').toFixed(2)}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Debug Info - Only show for payments that should have items */}
                          {payment.distributionId === 35 && (
                            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-xs">
                              <strong>🎯 Payment {payment.id} (Should have items):</strong><br/>
                              Distribution ID: {payment.distributionId}<br/>
                              Has Details: {details ? 'Yes' : 'No'}<br/>
                              Has Items: {details?.distributionItems ? 'Yes' : 'No'}<br/>
                              Items Count: {details?.distributionItems?.length || 0}<br/>
                              Items: {details?.distributionItems ? details.distributionItems.map(i => i.itemName).join(', ') : 'None'}
                            </div>
                          )}
                          {payment.distributionId && payment.distributionId !== 35 && (
                            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded text-xs">
                              <strong>Payment {payment.id} (Should be empty):</strong><br/>
                              Distribution ID: {payment.distributionId}<br/>
                              Items Count: {details?.distributionItems?.length || 0}
                            </div>
                          )}

                          {/* Items Table */}
                          {details && details.distributionItems && Array.isArray(details.distributionItems) && details.distributionItems.length > 0 ? (
                            <div key={`items-${payment.id}-${payment.distributionId}`} className="border rounded-lg overflow-hidden">
                              <div className="bg-gray-50 px-4 py-3 border-b">
                                <h4 className="font-medium text-gray-900">
                                  Items Purchased ({details.distributionItems.length} items) - Distribution #{payment.distributionId}
                                </h4>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">GST%</th>
                                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {details.distributionItems.map((item: any, index: number) => (
                                      <tr key={`${payment.id}-${item.id || index}`} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-center">{index + 1}</td>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.itemName}</td>
                                        <td className="px-4 py-3 text-sm text-center">
                                          {parseFloat(item.quantity).toFixed(2)} {item.unit}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right">₹{parseFloat(item.rate).toFixed(2)}</td>
                                        <td className="px-4 py-3 text-sm text-center">{parseFloat(item.gstPercentage).toFixed(1)}%</td>
                                        <td className="px-4 py-3 text-sm font-medium text-right">₹{parseFloat(item.amount).toFixed(2)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}
