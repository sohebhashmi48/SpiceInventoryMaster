import { useState, useEffect } from "react";
import Layout from "@/components/layout/layout";
import PageHeader from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import AddExpenseForm from "@/components/expenses/add-expense-form";
import AddAssetForm from "@/components/assets/add-asset-form";
import ExpenseBillView from "@/components/expenses/expense-bill-view";
import ImagePopupModal from "@/components/common/image-popup-modal";
import { getReceiptImageUrl } from "@/lib/image-utils";
import { getAssetImageUrl, getAssetReceiptImageUrl } from "@/lib/asset-image-utils";
import { useToast } from "@/hooks/use-toast";
import {
  Calculator,
  Plus,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Image,
  Building2,
  Calendar,
  DollarSign,
  TrendingUp,
  CalendarIcon,
  X
} from "lucide-react";

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

export default function FinancialTrackerPage() {
  const [activeTab, setActiveTab] = useState<'today' | 'total-expense' | 'total-assets'>('today');
  const [isAddExpenseDialogOpen, setIsAddExpenseDialogOpen] = useState(false);
  const [isAddAssetDialogOpen, setIsAddAssetDialogOpen] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssetsLoading, setIsAssetsLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isBillViewOpen, setIsBillViewOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>("");
  const [isImagePopupOpen, setIsImagePopupOpen] = useState(false);

  // Filter states
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Export dialog states
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportDateFrom, setExportDateFrom] = useState<Date | undefined>(undefined);
  const [exportDateTo, setExportDateTo] = useState<Date | undefined>(undefined);

  // Pagination states
  const [expensesPerPage] = useState(10); // Number of expenses to show initially and per load
  const [visibleExpensesCount, setVisibleExpensesCount] = useState(10);

  const { toast } = useToast();

  // Fetch expenses from API
  const fetchExpenses = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/expenses');
      if (!response.ok) {
        throw new Error('Failed to fetch expenses');
      }
      const data = await response.json();
      console.log('Fetched expenses data:', data);
      // Log receipt images for debugging
      const expensesWithImages = data.filter((expense: Expense) => expense.receiptImage);
      if (expensesWithImages.length > 0) {
        console.log(`Found ${expensesWithImages.length} expenses with receipt images`);
      }
      setExpenses(data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch assets from API
  const fetchAssets = async () => {
    try {
      setIsAssetsLoading(true);
      console.log("Fetching assets...");

      const response = await fetch('/api/assets', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch assets: ${response.status}`);
      }

      const data = await response.json();
      console.log("Fetched assets:", data);

      setAssets(data);
    } catch (error) {
      console.error("Error fetching assets:", error);
      toast({
        title: "Error fetching assets",
        description: "Failed to load assets. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAssetsLoading(false);
    }
  };

  // Load expenses and assets on component mount
  useEffect(() => {
    fetchExpenses();
    fetchAssets();
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    resetPagination();
  }, [dateFilter, categoryFilter, searchQuery]);

  // Handle successful expense creation
  const handleExpenseCreated = () => {
    setIsAddExpenseDialogOpen(false);
    fetchExpenses(); // Refresh the list
  };

  // Handle successful asset creation
  const handleAssetCreated = () => {
    setIsAddAssetDialogOpen(false);
    fetchAssets(); // Refresh the assets list
  };

  // Format amount from paisa to rupees
  const formatAmount = (amount: number) => {
    return (amount / 100).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR'
    });
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  // Get today's expenses
  const getTodaysExpenses = () => {
    const today = new Date().toDateString();
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.expenseDate).toDateString();
      return expenseDate === today;
    });
  };

  // Calculate totals
  const getTotalExpenseAmount = () => {
    return expenses.reduce((sum, expense) => sum + expense.amount, 0);
  };

  const getTotalAssetAmount = () => {
    return assets.reduce((sum, asset) => sum + asset.amount, 0);
  };

  const getTodaysExpenseAmount = () => {
    return getTodaysExpenses().reduce((sum, expense) => sum + expense.amount, 0);
  };

  // Get filtered expenses for Total Expense tab
  const getFilteredExpenses = () => {
    return expenses.filter(expense => {
      // Date filter
      if (dateFilter) {
        const expenseDate = new Date(expense.expenseDate).toDateString();
        const filterDate = dateFilter.toDateString();
        if (expenseDate !== filterDate) return false;
      }

      // Category filter (using title as category for now, or you can add a category field)
      if (categoryFilter !== "all") {
        // You can modify this logic based on how categories are stored
        // For now, we'll use a simple title-based filtering
        if (!expense.title.toLowerCase().includes(categoryFilter.toLowerCase())) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        if (!expense.title.toLowerCase().includes(query)) return false;
      }

      return true;
    });
  };

  // Get visible expenses (with pagination)
  const getVisibleExpenses = () => {
    const filtered = getFilteredExpenses();
    return filtered.slice(0, visibleExpensesCount);
  };

  // Load more expenses
  const loadMoreExpenses = () => {
    setVisibleExpensesCount(prev => prev + expensesPerPage);
  };

  // Reset pagination when filters change
  const resetPagination = () => {
    setVisibleExpensesCount(expensesPerPage);
  };

  // Predefined expense categories
  const expenseCategories = [
    "food", "transport", "office", "equipment", "supplies", "utilities",
    "rent", "maintenance", "marketing", "travel", "fuel", "internet",
    "phone", "insurance", "software", "hardware", "stationery", "cleaning"
  ];

  // Get categories that actually exist in expenses
  const getAvailableCategories = () => {
    const availableCategories = expenseCategories.filter(category => {
      return expenses.some(expense =>
        expense.title.toLowerCase().includes(category.toLowerCase())
      );
    });

    // Also add any unique words from expense titles that might be categories
    const titleWords = new Set<string>();
    expenses.forEach(expense => {
      const words = expense.title.toLowerCase().split(/[\s,.-]+/);
      words.forEach(word => {
        if (word.length > 3 && !expenseCategories.includes(word)) {
          titleWords.add(word);
        }
      });
    });

    return [...availableCategories, ...Array.from(titleWords)].slice(0, 15);
  };

  // Clear all filters
  const clearFilters = () => {
    setDateFilter(undefined);
    setCategoryFilter("all");
    setSearchQuery("");
    resetPagination();
  };

  // Handle view bill
  const handleViewBill = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsBillViewOpen(true);
  };

  // Handle image popup
  const handleImageClick = (imageUrl: string) => {
    console.log('Opening image popup with URL:', imageUrl);
    setSelectedImageUrl(imageUrl);
    setIsImagePopupOpen(true);
  };

  // Handle delete expense
  const handleDeleteExpense = async (expense: Expense) => {
    if (!confirm(`Are you sure you want to delete "${expense.title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/expenses/${expense.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete expense');
      }

      // Refresh the expenses list
      fetchExpenses();
      alert('Expense deleted successfully');
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Failed to delete expense. Please try again.');
    }
  };

  // Handle edit expense
  const handleEditExpense = (expense: Expense) => {
    // For now, just show an alert. Later this can open an edit form
    alert(`Edit functionality for "${expense.title}" will be implemented soon.`);
  };

  // Handle CSV export
  const handleExportCSV = () => {
    if (!exportDateFrom || !exportDateTo) {
      toast({
        title: "Date range required",
        description: "Please select both start and end dates for export.",
        variant: "destructive",
      });
      return;
    }

    // Filter expenses by date range
    const filteredExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.expenseDate);
      return expenseDate >= exportDateFrom && expenseDate <= exportDateTo;
    });

    if (filteredExpenses.length === 0) {
      toast({
        title: "No data to export",
        description: "No expenses found in the selected date range.",
        variant: "destructive",
      });
      return;
    }

    // Create CSV content
    const headers = ['Date', 'Title', 'Amount (INR)', 'Expiry Date', 'Has Receipt', 'Created At'];
    const csvContent = [
      headers.join(','),
      ...filteredExpenses.map(expense => [
        formatDate(expense.expenseDate),
        `"${expense.title.replace(/"/g, '""')}"`, // Escape quotes in title
        (expense.amount / 100).toFixed(2), // Convert from paisa to rupees
        expense.expiryDate ? formatDate(expense.expiryDate) : '',
        expense.receiptImage ? 'Yes' : 'No',
        formatDate(expense.createdAt)
      ].join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `expenses_${format(exportDateFrom, 'yyyy-MM-dd')}_to_${format(exportDateTo, 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Close dialog and show success message
    setIsExportDialogOpen(false);
    toast({
      title: "Export successful",
      description: `Exported ${filteredExpenses.length} expenses to CSV file.`,
    });
  };

  return (
    <Layout>
      <PageHeader
        title="Financial Tracker"
        description="Track and manage your business expenses efficiently"
      >
        <div className="flex gap-2">
          <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Export Expenses to CSV</DialogTitle>
                <DialogDescription>
                  Select a date range to export expenses to an Excel-compatible CSV file.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="export-date-from">From Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {exportDateFrom ? format(exportDateFrom, "PPP") : "Select start date"}
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
                  <Label htmlFor="export-date-to">To Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {exportDateTo ? format(exportDateTo, "PPP") : "Select end date"}
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
          <Dialog open={isAddExpenseDialogOpen} onOpenChange={setIsAddExpenseDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-secondary hover:bg-secondary-dark text-white">
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader className="pb-4">
                <DialogTitle className="text-xl font-semibold">Add New Expense</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Fill in the details below to add a new expense to your financial tracker.
                </DialogDescription>
              </DialogHeader>
              <AddExpenseForm
                onSuccess={handleExpenseCreated}
                onCancel={() => setIsAddExpenseDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={isAddAssetDialogOpen} onOpenChange={setIsAddAssetDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-green-500 text-green-600 hover:bg-green-50">
                <Building2 className="h-4 w-4 mr-2" />
                Add Asset
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader className="pb-4">
                <DialogTitle className="text-xl font-semibold">Add New Asset</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Fill in the details below to add a new asset to your financial tracker.
                </DialogDescription>
              </DialogHeader>
              <AddAssetForm
                onSuccess={handleAssetCreated}
                onCancel={() => setIsAddAssetDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      <div className="space-y-6">

        {/* Modern Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'today' | 'total-expense' | 'total-assets')} className="mt-6">
          <TabsList>
            <TabsTrigger value="today" className="flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Today's Expense
              {getTodaysExpenses().length > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-800 text-xs rounded-full px-2 py-0.5">
                  {formatAmount(getTodaysExpenseAmount())}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="total-expense" className="flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Total Expense
              {(dateFilter || categoryFilter !== "all" || searchQuery.trim()) && (
                <span className="ml-1 bg-blue-100 text-blue-800 text-xs rounded-full px-1 py-0.5">
                  <Filter className="h-3 w-3" />
                </span>
              )}
              {expenses.length > 0 && (
                <span className="ml-2 bg-green-100 text-green-800 text-xs rounded-full px-2 py-0.5">
                  {(dateFilter || categoryFilter !== "all" || searchQuery.trim())
                    ? `${getFilteredExpenses().length}/${expenses.length}`
                    : formatAmount(getTotalExpenseAmount())
                  }
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="total-assets" className="flex items-center">
              <Building2 className="h-4 w-4 mr-2" />
              Total Assets
              {assets.length > 0 && (
                <span className="ml-2 bg-purple-100 text-purple-800 text-xs rounded-full px-2 py-0.5">
                  {formatAmount(getTotalAssetAmount())}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Summary Cards */}
          {activeTab === 'today' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Today's Expenses</p>
                      <p className="text-2xl font-bold">{getTodaysExpenses().length}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Today's Amount</p>
                      <p className="text-2xl font-bold">{formatAmount(getTodaysExpenseAmount())}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Avg per Expense</p>
                      <p className="text-2xl font-bold">
                        {getTodaysExpenses().length > 0
                          ? formatAmount(getTodaysExpenseAmount() / getTodaysExpenses().length)
                          : formatAmount(0)
                        }
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'total-expense' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {(dateFilter || categoryFilter !== "all" || searchQuery.trim()) ? "Filtered" : "Total"} Expenses
                      </p>
                      <p className="text-2xl font-bold">
                        {(dateFilter || categoryFilter !== "all" || searchQuery.trim())
                          ? getFilteredExpenses().length
                          : expenses.length
                        }
                      </p>
                      {(dateFilter || categoryFilter !== "all" || searchQuery.trim()) && (
                        <p className="text-xs text-muted-foreground">of {expenses.length} total</p>
                      )}
                    </div>
                    <Calculator className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {(dateFilter || categoryFilter !== "all" || searchQuery.trim()) ? "Filtered" : "Total"} Amount
                      </p>
                      <p className="text-2xl font-bold">
                        {(dateFilter || categoryFilter !== "all" || searchQuery.trim())
                          ? formatAmount(getFilteredExpenses().reduce((sum, expense) => sum + expense.amount, 0))
                          : formatAmount(getTotalExpenseAmount())
                        }
                      </p>
                      {(dateFilter || categoryFilter !== "all" || searchQuery.trim()) && (
                        <p className="text-xs text-muted-foreground">of {formatAmount(getTotalExpenseAmount())} total</p>
                      )}
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">With Receipts</p>
                      <p className="text-2xl font-bold">
                        {(dateFilter || categoryFilter !== "all" || searchQuery.trim())
                          ? getFilteredExpenses().filter(expense => expense.receiptImage).length
                          : expenses.filter(expense => expense.receiptImage).length
                        }
                      </p>
                      {(dateFilter || categoryFilter !== "all" || searchQuery.trim()) && (
                        <p className="text-xs text-muted-foreground">
                          of {expenses.filter(expense => expense.receiptImage).length} total
                        </p>
                      )}
                    </div>
                    <Image className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'total-assets' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Assets</p>
                      <p className="text-2xl font-bold">{assets.length}</p>
                    </div>
                    <Building2 className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                      <p className="text-2xl font-bold">{formatAmount(getTotalAssetAmount())}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Avg Asset Value</p>
                      <p className="text-2xl font-bold">
                        {assets.length > 0
                          ? formatAmount(getTotalAssetAmount() / assets.length)
                          : formatAmount(0)
                        }
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <TabsContent value="today" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Today's Expenses
                </CardTitle>
                <CardDescription>Expenses recorded today ({new Date().toLocaleDateString('en-IN')})</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
                    <p>Loading expenses...</p>
                  </div>
                ) : getTodaysExpenses().length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No expenses recorded today.</p>
                    <p className="text-sm">Click "Add Expense" to record today's first expense.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Showing {getTodaysExpenses().length} expense{getTodaysExpenses().length !== 1 ? 's' : ''} for today
                      </p>
                      <div className="text-sm font-medium">
                        Today's Total: {formatAmount(getTodaysExpenseAmount())}
                      </div>
                    </div>

                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Expiry</TableHead>
                            <TableHead>Receipt</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getTodaysExpenses().map((expense) => (
                            <TableRow key={expense.id}>
                              <TableCell>
                                <span className="text-lg">{expense.icon}</span>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{expense.title}</div>
                                <div className="text-sm text-muted-foreground">
                                  ID: {expense.id}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {formatDate(expense.expenseDate)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">
                                  {formatAmount(expense.amount)}
                                </div>
                              </TableCell>
                              <TableCell>
                                {expense.expiryDate ? (
                                  <Badge variant="outline" className="text-xs">
                                    {formatDate(expense.expiryDate)}
                                  </Badge>
                                ) : (
                                  <span className="text-sm text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {expense.receiptImage ? (
                                  <div className="flex items-center gap-2">
                                    <div className="relative w-12 h-12 bg-gray-100 rounded border overflow-hidden group">
                                      <img
                                        src={getReceiptImageUrl(expense.receiptImage) || ''}
                                        alt="Receipt"
                                        className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform"
                                        onClick={() => handleImageClick(getReceiptImageUrl(expense.receiptImage)!)}
                                        onError={(e) => {
                                          console.error('Failed to load receipt image for expense', expense.id, ':', getReceiptImageUrl(expense.receiptImage));
                                          // Hide the broken image and show a placeholder
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                          // Show error state in parent div
                                          const parent = target.parentElement;
                                          if (parent) {
                                            parent.innerHTML = '<span class="text-xs text-red-500 flex items-center justify-center w-full h-full">❌</span>';
                                          }
                                        }}
                                      />
                                      {/* Hover overlay */}
                                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                                        <Eye className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </div>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-xs text-green-600 font-medium">Receipt</span>
                                      <span className="text-xs text-muted-foreground">Click to view</span>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Image className="h-4 w-4 opacity-50" />
                                    No receipt
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleViewBill(expense)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditExpense(expense)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteExpense(expense)}
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
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="total-expense" className="mt-6">
            {/* Filters Card */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Search Input */}
                  <div className="flex-1">
                    <div className="relative">
                      <Input
                        placeholder="Search expenses..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                      <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  {/* Date Filter */}
                  <div className="w-full md:w-48">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFilter ? format(dateFilter, "PPP") : "Filter by date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={dateFilter}
                          onSelect={setDateFilter}
                          initialFocus
                        />
                        {dateFilter && (
                          <div className="p-3 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDateFilter(undefined)}
                              className="w-full"
                            >
                              Clear Date Filter
                            </Button>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Category Filter */}
                  <div className="w-full md:w-48">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {getAvailableCategories().map((category) => (
                          <SelectItem key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Clear Filters Button */}
                  {(dateFilter || categoryFilter !== "all" || searchQuery.trim()) && (
                    <Button
                      variant="outline"
                      onClick={clearFilters}
                      className="flex items-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Clear
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  All Expenses
                </CardTitle>
                <CardDescription>
                  Complete expense history and records
                  {(dateFilter || categoryFilter !== "all" || searchQuery.trim()) && (
                    <span className="ml-2 text-blue-600">
                      (Filtered: {getFilteredExpenses().length} of {expenses.length})
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
                    <p>Loading expenses...</p>
                  </div>
                ) : getFilteredExpenses().length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>
                      {expenses.length === 0
                        ? "No expenses found."
                        : "No expenses match the current filters."
                      }
                    </p>
                    <p className="text-sm">
                      {expenses.length === 0
                        ? "Click \"Add Expense\" to create your first expense record."
                        : "Try adjusting your filters or clear them to see all expenses."
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Showing {getVisibleExpenses().length} of {getFilteredExpenses().length} expense{getFilteredExpenses().length !== 1 ? 's' : ''}
                        {(dateFilter || categoryFilter !== "all" || searchQuery.trim()) && (
                          <span> (filtered from {expenses.length} total)</span>
                        )}
                      </p>
                      <div className="text-sm font-medium">
                        {(dateFilter || categoryFilter !== "all" || searchQuery.trim()) ? (
                          <>
                            Filtered Total: {formatAmount(getFilteredExpenses().reduce((sum, expense) => sum + expense.amount, 0))}
                            <span className="text-muted-foreground ml-2">
                              / Grand Total: {formatAmount(getTotalExpenseAmount())}
                            </span>
                          </>
                        ) : (
                          <>Grand Total: {formatAmount(getTotalExpenseAmount())}</>
                        )}
                      </div>
                    </div>

                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Expiry</TableHead>
                            <TableHead>Receipt</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getVisibleExpenses().map((expense) => (
                            <TableRow key={expense.id}>
                              <TableCell>
                                <span className="text-lg">{expense.icon}</span>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{expense.title}</div>
                                <div className="text-sm text-muted-foreground">
                                  ID: {expense.id}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {formatDate(expense.expenseDate)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">
                                  {formatAmount(expense.amount)}
                                </div>
                              </TableCell>
                              <TableCell>
                                {expense.expiryDate ? (
                                  <Badge variant="outline" className="text-xs">
                                    {formatDate(expense.expiryDate)}
                                  </Badge>
                                ) : (
                                  <span className="text-sm text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {expense.receiptImage ? (
                                  <div className="flex items-center gap-2">
                                    <div className="relative w-12 h-12 bg-gray-100 rounded border overflow-hidden group">
                                      <img
                                        src={getReceiptImageUrl(expense.receiptImage) || ''}
                                        alt="Receipt"
                                        className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform"
                                        onClick={() => handleImageClick(getReceiptImageUrl(expense.receiptImage)!)}
                                        onError={(e) => {
                                          console.error('Failed to load receipt image for expense', expense.id, ':', getReceiptImageUrl(expense.receiptImage));
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                          const parent = target.parentElement;
                                          if (parent) {
                                            parent.innerHTML = '<span class="text-xs text-red-500 flex items-center justify-center w-full h-full">❌</span>';
                                          }
                                        }}
                                      />
                                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                                        <Eye className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </div>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-xs text-green-600 font-medium">Receipt</span>
                                      <span className="text-xs text-muted-foreground">Click to view</span>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Image className="h-4 w-4 opacity-50" />
                                    No receipt
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleViewBill(expense)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditExpense(expense)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteExpense(expense)}
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

                    {/* Load More Button */}
                    {getFilteredExpenses().length > visibleExpensesCount && (
                      <div className="flex justify-center pt-4">
                        <Button
                          variant="outline"
                          onClick={loadMoreExpenses}
                          className="px-6"
                        >
                          Load More Expenses ({getFilteredExpenses().length - visibleExpensesCount} remaining)
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="total-assets" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="h-5 w-5 mr-2" />
                  Asset Management
                </CardTitle>
                <CardDescription>Manage your business assets and track their value</CardDescription>
              </CardHeader>
              <CardContent>
                {isAssetsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading assets...</p>
                  </div>
                ) : assets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No assets found.</p>
                    <p className="text-sm">Add your first asset using the "Add Asset" button above.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {assets.map((asset) => (
                        <Card key={asset.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              {/* Asset Image */}
                              {asset.assetImage ? (
                                <div className="w-full h-32 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg overflow-hidden border">
                                  <img
                                    src={getAssetImageUrl(asset.assetImage) || ''}
                                    alt={asset.title}
                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                                    onError={(e) => {
                                      console.error('Failed to load asset image:', asset.assetImage);
                                      console.error('Processed URL:', getAssetImageUrl(asset.assetImage));
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const parent = target.parentElement;
                                      if (parent) {
                                        parent.innerHTML = `
                                          <div class="w-full h-full flex items-center justify-center text-gray-400">
                                            <div class="text-center">
                                              <svg class="h-8 w-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m0 0h2M7 7h10M7 11h6m-6 4h6"></path>
                                              </svg>
                                              <p class="text-xs">Image not found</p>
                                            </div>
                                          </div>
                                        `;
                                      }
                                    }}
                                    onLoad={() => {
                                      console.log('Successfully loaded asset image:', asset.assetImage);
                                      console.log('Processed URL:', getAssetImageUrl(asset.assetImage));
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-full h-32 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center border border-dashed border-gray-300">
                                  <div className="text-center text-gray-400">
                                    <Building2 className="h-8 w-8 mx-auto mb-1" />
                                    <p className="text-xs">No image</p>
                                  </div>
                                </div>
                              )}

                              {/* Asset Details */}
                              <div>
                                <h3 className="font-semibold text-lg">{asset.title}</h3>
                                {asset.description && (
                                  <p className="text-sm text-muted-foreground line-clamp-2">{asset.description}</p>
                                )}
                              </div>

                              {/* Asset Info */}
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Purchase Amount:</span>
                                  <span className="font-medium">{formatAmount(asset.amount)}</span>
                                </div>
                                {asset.currentValue && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Current Value:</span>
                                    <span className="font-medium">{formatAmount(asset.currentValue)}</span>
                                  </div>
                                )}
                                {asset.category && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Category:</span>
                                    <span className="font-medium">{asset.category}</span>
                                  </div>
                                )}
                                {asset.location && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Location:</span>
                                    <span className="font-medium">{asset.location}</span>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Purchase Date:</span>
                                  <span className="font-medium">{formatDate(asset.purchaseDate)}</span>
                                </div>
                              </div>

                              {/* Receipt Image */}
                              {asset.receiptImage && (
                                <div className="flex items-center gap-2 pt-2 border-t">
                                  <div className="w-6 h-6 bg-gray-100 rounded border overflow-hidden">
                                    <img
                                      src={getAssetReceiptImageUrl(asset.receiptImage) || ''}
                                      alt="Receipt"
                                      className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform"
                                      onClick={() => handleImageClick(getAssetReceiptImageUrl(asset.receiptImage)!)}
                                      onError={(e) => {
                                        console.error('Failed to load asset receipt image:', asset.receiptImage);
                                        console.error('Processed URL:', getAssetReceiptImageUrl(asset.receiptImage));
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const parent = target.parentElement;
                                        if (parent) {
                                          parent.innerHTML = '<div class="w-full h-full bg-red-100 flex items-center justify-center"><span class="text-red-400 text-xs">!</span></div>';
                                        }
                                      }}
                                    />
                                  </div>
                                  <span className="text-xs text-green-600 font-medium">Receipt available</span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>


        </Tabs>

        {/* Bill View Dialog */}
        <Dialog open={isBillViewOpen} onOpenChange={setIsBillViewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-xl font-semibold">Expense Bill</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                View and download expense receipt
              </DialogDescription>
            </DialogHeader>
            {selectedExpense && (
              <ExpenseBillView
                expense={selectedExpense}
                onClose={() => setIsBillViewOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Image Popup Modal */}
        <ImagePopupModal
          isOpen={isImagePopupOpen}
          onClose={() => setIsImagePopupOpen(false)}
          imageUrl={selectedImageUrl}
          title="Receipt Image"
          alt="Expense Receipt"
        />
      </div>
    </Layout>
  );
}
