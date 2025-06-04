import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Receipt,
  ChevronDown,
  ChevronRight,
  Calendar,
  Search,
  FileText,
  Printer,
  TrendingUp,
  Users,
  DollarSign
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface CustomerBillItem {
  id: number;
  productName: string;
  quantity: number;
  unit: string;
  pricePerKg: number;
  marketPricePerKg: number;
  total: number;
}

interface TodayTransaction {
  id: number;
  billNo: string;
  billDate: string;
  clientName: string;
  clientMobile: string;
  clientEmail?: string;
  clientAddress?: string;
  totalAmount: number;
  marketTotal: number;
  savings: number;
  itemCount: number;
  paymentMethod?: string;
  status: string;
  items: CustomerBillItem[];
  createdAt: string;
}

export default function TodayTransactions() {
  const [openTransactionId, setOpenTransactionId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Toggle transaction details
  const toggleTransaction = (transactionId: number) => {
    setOpenTransactionId(openTransactionId === transactionId ? null : transactionId);
  };

  // Print bill functionality for today's transactions
  const printBill = (transaction: TodayTransaction) => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Generate the print content (same as transaction history)
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - Bill #${transaction.billNo}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              background: white;
              color: black;
              font-size: 12px;
            }
            .print-container {
              max-width: 800px;
              margin: 0 auto;
            }
            .company-header {
              background: linear-gradient(135deg, #8B4513 0%, #D2691E 100%);
              color: white;
              padding: 20px;
              margin: -20px -20px 20px -20px;
              text-align: center;
            }
            .company-header h1 {
              margin: 0;
              font-size: 28px;
              text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
            }
            .company-tagline {
              font-size: 14px;
              margin: 5px 0;
              color: #FFE4B5;
            }
            .invoice-details {
              display: flex;
              justify-content: space-between;
              margin: 20px 0;
              padding: 15px;
              background: #FFF8DC;
              border: 1px solid #8B4513;
              border-radius: 5px;
            }
            .customer-details {
              background: #FFF8DC;
              padding: 15px;
              border: 1px solid #8B4513;
              border-radius: 5px;
              margin: 10px 0;
            }
            .customer-details h3 {
              margin: 0 0 10px 0;
              color: #8B4513;
              border-bottom: 1px solid #D2691E;
              padding-bottom: 5px;
            }
            .customer-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
            }
            .customer-field {
              margin: 5px 0;
            }
            .customer-label {
              font-weight: bold;
              color: #8B4513;
              display: inline-block;
              min-width: 80px;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
              box-shadow: 0 1px 4px rgba(0,0,0,0.1);
            }
            .items-table th {
              background: linear-gradient(135deg, #8B4513 0%, #D2691E 100%);
              color: white;
              padding: 12px 8px;
              text-align: center;
              font-weight: bold;
              border: 1px solid #654321;
            }
            .items-table td {
              border: 1px solid #D2691E;
              padding: 10px 8px;
              text-align: center;
              background: white;
            }
            .items-table tr:nth-child(even) td {
              background: #FFF8DC;
            }
            .product-name {
              text-align: left;
              font-weight: 600;
              color: #8B4513;
            }
            .total-amount {
              font-weight: bold;
              color: #8B4513;
            }
            .savings-section {
              background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
              color: #8B4513;
              padding: 15px;
              border-radius: 5px;
              margin: 15px 0;
              text-align: center;
              border: 2px solid #8B4513;
            }
            .savings-title {
              font-size: 14px;
              font-weight: bold;
              margin: 0 0 5px 0;
            }
            .savings-amount {
              font-size: 20px;
              font-weight: bold;
              margin: 5px 0;
            }
            .total-section {
              background: linear-gradient(135deg, #8B4513 0%, #D2691E 100%);
              color: white;
              padding: 20px;
              border-radius: 5px;
              margin: 15px 0;
              text-align: center;
              box-shadow: 0 2px 6px rgba(0,0,0,0.2);
            }
            .total-title {
              font-size: 16px;
              font-weight: bold;
              margin: 0 0 8px 0;
            }
            .total-amount-large {
              font-size: 28px;
              font-weight: bold;
              margin: 8px 0;
              text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
            }
            .footer {
              background: #FFF8DC;
              border: 1px solid #8B4513;
              border-radius: 5px;
              padding: 15px;
              margin: 20px 0 0 0;
              text-align: center;
            }
            .footer-message {
              font-size: 14px;
              font-weight: bold;
              color: #8B4513;
              margin: 0 0 5px 0;
            }
            .footer-branding {
              font-size: 12px;
              color: #D2691E;
              margin: 5px 0;
              font-weight: 600;
            }
            @media print {
              body { margin: 0; padding: 15px; }
              .print-container { max-width: none; }
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            <!-- Company Header -->
            <div class="company-header">
              <h1>🌶️ RoyalSpicyMasala</h1>
              <div class="company-tagline">Premium Quality Spices & Masalas</div>
              <div style="font-size: 11px; margin-top: 8px;">
                📍 123 Spice Market, Trade Center, Mumbai - 400001<br/>
                📞 +91-9876543210 | ✉️ info@royalspicymasala.com
              </div>
            </div>

            <!-- Invoice Details -->
            <div class="invoice-details">
              <div>
                <h2 style="margin: 0; color: #8B4513;">INVOICE</h2>
                <div style="font-size: 11px; color: #666; margin-top: 5px;">
                  Bill #: ${transaction.billNo || 'N/A'}<br/>
                  Date: ${formatDate(transaction.billDate)}<br/>
                  Status: ${transaction.status || 'completed'}
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 11px; color: #666;">
                  Total Items: ${Number(transaction.itemCount || 0)}<br/>
                  Payment: ${transaction.paymentMethod || 'Cash'}
                </div>
              </div>
            </div>

            <!-- Customer Details -->
            <div class="customer-details">
              <h3>Bill To:</h3>
              <div class="customer-grid">
                <div>
                  <div class="customer-field">
                    <span class="customer-label">Name:</span> ${transaction.clientName || 'N/A'}
                  </div>
                  <div class="customer-field">
                    <span class="customer-label">Mobile:</span> ${transaction.clientMobile || 'N/A'}
                  </div>
                </div>
                <div>
                  <div class="customer-field">
                    <span class="customer-label">Email:</span> ${transaction.clientEmail || 'N/A'}
                  </div>
                  <div class="customer-field">
                    <span class="customer-label">Address:</span> ${transaction.clientAddress || 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            <!-- Items Table -->
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 8%;">S.No.</th>
                  <th style="width: 40%;">Product Name</th>
                  <th style="width: 15%;">Quantity</th>
                  <th style="width: 17%;">Unit Price</th>
                  <th style="width: 20%;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${transaction.items.map((item, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td class="product-name">
                      ${item.productName || 'Unknown Product'}<br/>
                      <small style="color: #666; font-size: 10px;">₹${Number(item.pricePerKg || 0).toFixed(2)}/kg</small>
                    </td>
                    <td>${Number(item.quantity || 0).toFixed(3)} ${item.unit || 'kg'}</td>
                    <td>₹${Number(item.pricePerKg || 0).toFixed(2)}</td>
                    <td class="total-amount">₹${Number(item.total || 0).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            ${Number(transaction.savings || 0) > 0 ? `
              <!-- Savings Section -->
              <div class="savings-section">
                <div class="savings-title">🎉 Congratulations! You Saved</div>
                <div class="savings-amount">₹${Number(transaction.savings || 0).toFixed(2)}</div>
                <div style="font-size: 11px; margin-top: 5px;">
                  Market Price: ₹${Number(transaction.marketTotal || 0).toFixed(2)} | Your Price: ₹${Number(transaction.totalAmount || 0).toFixed(2)}
                </div>
              </div>
            ` : ''}

            <!-- Total Section -->
            <div class="total-section">
              <div class="total-title">Grand Total</div>
              <div class="total-amount-large">₹${Number(transaction.totalAmount || 0).toFixed(2)}</div>
              <div style="font-size: 12px; color: #FFE4B5; margin-top: 5px;">
                Total Items: ${Number(transaction.itemCount || 0)}
              </div>
            </div>

            <!-- Footer -->
            <div class="footer">
              <div class="footer-message">🙏 Thank you for shopping with us! 🙏</div>
              <div class="footer-branding">RoyalSpicyMasala - Your Trusted Spice Partner</div>
              <div style="font-size: 10px; color: #666; margin-top: 8px;">
                For queries: +91-9876543210 | Visit: www.royalspicymasala.com<br/>
                Follow us: @RoyalSpicyMasala | Quality Guaranteed Since 1995
              </div>
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
    };
  };

  // Fetch today's transactions
  const { data: transactions, isLoading } = useQuery<TodayTransaction[]>({
    queryKey: ['today-transactions'],
    queryFn: async () => {
      console.log('Fetching today\'s transactions...');

      const response = await fetch('/api/customer-bills/today', {
        credentials: "include",
      });

      if (!response.ok) {
        console.error(`Failed to fetch today's transactions: ${response.status}`);
        throw new Error(`Failed to fetch today's transactions: ${response.status}`);
      }

      const data = await response.json();
      console.log('Today\'s transactions data:', data);
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Filter transactions based on search term
  const filteredTransactions = transactions?.filter(transaction =>
    transaction.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.clientMobile?.includes(searchTerm) ||
    transaction.billNo?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Calculate totals
  const totalSales = filteredTransactions.reduce((sum, t) => sum + (Number(t.totalAmount) || 0), 0);
  const totalSavings = filteredTransactions.reduce((sum, t) => sum + (Number(t.savings) || 0), 0);
  const totalCustomers = new Set(filteredTransactions.map(t => t.clientMobile)).size;

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-lg flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-primary" />
              Today's Transactions
            </CardTitle>
            <div className="text-sm text-gray-500 mt-1">
              {formatDate(new Date())} - Real-time updates
            </div>
          </div>
          
          {/* Today's Summary Stats */}
          <div className="flex flex-wrap gap-4">
            <div className="text-center">
              <div className="text-sm text-gray-500">Total Sales</div>
              <div className="font-semibold text-green-600">{formatCurrency(totalSales)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500">Customers</div>
              <div className="font-semibold text-blue-600">{totalCustomers}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500">Transactions</div>
              <div className="font-semibold text-purple-600">{filteredTransactions.length}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500">Total Savings</div>
              <div className="font-semibold text-orange-600">{formatCurrency(totalSavings)}</div>
            </div>
          </div>
        </div>

        {/* Search within today's transactions */}
        <div className="flex items-center gap-4 mt-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search today's transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
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
        ) : !filteredTransactions || filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border border-dashed rounded-md">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Transactions Today</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? 'No transactions match your search.' : 'No customer transactions have been recorded today yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTransactions.map((transaction) => (
              <Collapsible
                key={transaction.id}
                open={openTransactionId === transaction.id}
                onOpenChange={() => toggleTransaction(transaction.id)}
                className="border rounded-md overflow-hidden"
              >
                <div className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
                     onClick={() => toggleTransaction(transaction.id)}>
                  <div className="flex items-center space-x-4">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                        {openTransactionId === transaction.id ?
                          <ChevronDown className="h-4 w-4" /> :
                          <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                    <div>
                      <div className="font-medium flex items-center">
                        <Receipt className="h-4 w-4 mr-2 text-primary" />
                        Bill #{transaction.billNo || 'N/A'}
                        <Badge variant="outline" className="ml-2 text-xs">
                          {transaction.status || 'completed'}
                        </Badge>
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {transaction.paymentMethod || 'Cash'}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <span>{transaction.clientName} - {transaction.clientMobile}</span>
                        <span className="ml-2 text-xs">
                          {new Date(transaction.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="font-medium text-green-600">
                        {formatCurrency(transaction.totalAmount || 0)}
                      </div>
                      {(transaction.savings || 0) > 0 && (
                        <div className="text-xs text-orange-600">
                          Saved: {formatCurrency(transaction.savings || 0)}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent collapsible toggle
                        printBill(transaction);
                      }}
                      className="flex items-center space-x-1"
                    >
                      <Printer className="h-4 w-4" />
                      <span className="hidden sm:inline">Print</span>
                    </Button>
                  </div>
                </div>

                <CollapsibleContent>
                  <div className="p-4 bg-white border-t">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Transaction Details */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-3">Transaction Details</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Bill Number:</span>
                            <span className="text-sm font-medium">{transaction.billNo || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Time:</span>
                            <span className="text-sm font-medium">{new Date(transaction.createdAt).toLocaleTimeString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Items:</span>
                            <span className="text-sm font-medium">{transaction.itemCount || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Payment Method:</span>
                            <span className="text-sm font-medium">{transaction.paymentMethod || 'Cash'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Market Total:</span>
                            <span className="text-sm font-medium">{formatCurrency(transaction.marketTotal || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">You Saved:</span>
                            <span className="text-sm font-medium text-orange-600">{formatCurrency(transaction.savings || 0)}</span>
                          </div>
                          <div className="flex justify-between border-t pt-2">
                            <span className="text-sm font-medium">Total Paid:</span>
                            <span className="text-sm font-bold text-green-600">{formatCurrency(transaction.totalAmount || 0)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Items List */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-3">Items Purchased</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {(transaction.items || []).map((item, index) => (
                            <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                              <div className="flex-1">
                                <div className="text-sm font-medium">{item.productName || 'Unknown Product'}</div>
                                <div className="text-xs text-gray-500">
                                  {Number(item.quantity || 0).toFixed(2)} {item.unit || 'kg'} × ₹{Number(item.pricePerKg || 0).toFixed(2)}/kg
                                </div>
                              </div>
                              <div className="text-sm font-medium">
                                ₹{Number(item.total || 0).toFixed(2)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
