import React, { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search, User, Phone, Calendar, Filter } from "lucide-react";
import Layout from "@/components/layout/layout";
import PageHeader from "@/components/common/page-header";
import CustomerTransactionHistory from "@/components/customer-billing/customer-transaction-history";
import TodayTransactions from "@/components/customer-billing/today-transactions";

export default function CustomerTransactionHistoryPage() {
  const [, setLocation] = useLocation();
  const [searchCriteria, setSearchCriteria] = useState({
    clientName: '',
    clientMobile: '',
    dateFilter: 'today', // today, yesterday, week, month, all
    paymentMethod: 'all', // all, cash, card, bank_transfer, credit, upi
  });
  const [showHistory, setShowHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<'today' | 'search'>('today');

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchCriteria.clientName.trim() && !searchCriteria.clientMobile.trim()) {
      return;
    }

    setShowHistory(true);
    setActiveTab('search');
  };

  // Clear search and results
  const handleClear = () => {
    setSearchCriteria(prev => ({
      ...prev,
      clientName: '',
      clientMobile: ''
    }));
    setShowHistory(false);
  };

  // Switch to today's transactions
  const showTodayTransactions = () => {
    setActiveTab('today');
    setShowHistory(false);
  };

  return (
    <Layout>
      <div className="no-print">
        <PageHeader
          title="Customer Transaction History"
          description="Search and view customer purchase history"
        />
      </div>

      <div className="space-y-6">
        {/* Back Button */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setLocation('/customer-billing')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Customer Billing
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <Button
            variant={activeTab === 'today' ? 'default' : 'ghost'}
            onClick={showTodayTransactions}
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            Today's Transactions
          </Button>
          <Button
            variant={activeTab === 'search' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('search')}
            className="flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            Search Customer
          </Button>
        </div>

        {/* Search Form - Only show when search tab is active */}
        {activeTab === 'search' && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="h-5 w-5 mr-2 text-primary" />
                Search & Filter Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="clientName" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Customer Name
                    </Label>
                    <Input
                      id="clientName"
                      type="text"
                      placeholder="Enter customer name"
                      value={searchCriteria.clientName}
                      onChange={(e) => setSearchCriteria(prev => ({
                        ...prev,
                        clientName: e.target.value
                      }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="clientMobile" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Mobile Number
                    </Label>
                    <Input
                      id="clientMobile"
                      type="tel"
                      placeholder="Enter mobile number"
                      value={searchCriteria.clientMobile}
                      onChange={(e) => setSearchCriteria(prev => ({
                        ...prev,
                        clientMobile: e.target.value
                      }))}
                    />
                  </div>
                </div>

                {/* Filter Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dateFilter" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Date Range
                    </Label>
                    <Select
                      value={searchCriteria.dateFilter}
                      onValueChange={(value) => setSearchCriteria(prev => ({
                        ...prev,
                        dateFilter: value
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select date range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="yesterday">Yesterday</SelectItem>
                        <SelectItem value="week">Last 7 Days</SelectItem>
                        <SelectItem value="month">Last 30 Days</SelectItem>
                        <SelectItem value="all">All Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="paymentMethod" className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Payment Method
                    </Label>
                    <Select
                      value={searchCriteria.paymentMethod}
                      onValueChange={(value) => setSearchCriteria(prev => ({
                        ...prev,
                        paymentMethod: value
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Methods</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="credit">Credit</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={!searchCriteria.clientName.trim() && !searchCriteria.clientMobile.trim()}
                    className="flex items-center gap-2"
                  >
                    <Search className="h-4 w-4" />
                    Search Transactions
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClear}
                    disabled={!showHistory}
                  >
                    Clear Results
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Today's Transactions */}
        {activeTab === 'today' && (
          <TodayTransactions />
        )}

        {/* Search Results */}
        {activeTab === 'search' && showHistory && (
          <CustomerTransactionHistory
            clientMobile={searchCriteria.clientMobile || undefined}
            clientName={searchCriteria.clientName || undefined}
            dateFilter={searchCriteria.dateFilter}
            paymentMethod={searchCriteria.paymentMethod}
          />
        )}

        {/* Instructions Card for Search Tab */}
        {activeTab === 'search' && !showHistory && (
          <Card className="border-dashed">
            <CardContent className="text-center py-12">
              <Search className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Search Customer Transactions
              </h3>
              <p className="text-gray-500 mb-4">
                Enter customer name or mobile number to view their transaction history
              </p>
              <div className="text-sm text-gray-400">
                <p>• You can search by customer name or mobile number</p>
                <p>• Use filters to narrow down results by date and payment method</p>
                <p>• Both name and mobile fields are optional, but at least one is required</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
