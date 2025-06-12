import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, Pie, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { CalendarIcon, Download, RefreshCw } from 'lucide-react';

// Define colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'];

// Custom tooltip formatter for profit margins
const ProfitMarginTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-4 border rounded-md shadow-md">
        <p className="font-bold">{data.name}</p>
        <p className="text-sm">Purchase Price: ₹{Number(data.avgPurchasePrice).toFixed(2)}</p>
        <p className="text-sm">Selling Price: ₹{Number(data.sellingPrice).toFixed(2)}</p>
        <p className="text-sm">Profit per Unit: ₹{Number(data.profitPerUnit).toFixed(2)}</p>
        <p className="text-sm font-semibold">Margin: {Number(data.marginPercentage).toFixed(2)}%</p>
      </div>
    );
  }
  return null;
};

interface InventoryAnalytics {
  // Basic metrics
  categoryDistribution: Array<{
    category: string;
    count: number;
  }>;
  stockLevels: {
    lowStock: number;
    adequateStock: number;
  };
  topProducts: Array<{
    name: string;
    stocks_qty: number;
    unit: string;
  }>;
  inventoryTrends: Array<{
    month: string;
    totalQuantity: number;
    totalValue: number;
  }>;
  metrics: {
    totalValue: number;
    lowStockCount: number;
    mostStocked: {
      name: string;
      stocks_qty: number;
      unit: string;
    } | null;
    leastStocked: {
      name: string;
      stocks_qty: number;
      unit: string;
    } | null;
  };

  // Advanced analytics
  profitMargins: Array<{
    id: number;
    name: string;
    unit: string;
    avgPurchasePrice: number;
    sellingPrice: number;
    profitPerUnit: number;
    marginPercentage: number;
  }>;

  expiryInsights: Array<{
    name: string;
    quantity: number;
    unit: string;
    expiry_date: string;
    daysUntilExpiry: number;
  }>;

  supplierReliability: Array<{
    supplierName: string;
    totalOrders: number;
    totalQuantity: number;
    avgUnitPrice: number;
  }>;

  purchaseFrequency: Array<{
    name: string;
    purchaseCount: number;
    totalQuantity: number;
    unit: string;
  }>;

  coPurchaseAnalysis: Array<{
    product1: string;
    product2: string;
    purchasedTogether: number;
  }>;
}

export default function InventoryDashboard() {
  const [analytics, setAnalytics] = useState<InventoryAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/inventory/analytics');
      if (!response.ok) {
        throw new Error('Failed to fetch inventory analytics');
      }
      const data = await response.json();
      setAnalytics(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error fetching inventory analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleExport = () => {
    if (!analytics) return;

    // Create CSV content
    const csvContent = [
      // Basic Analytics
      '# BASIC INVENTORY ANALYTICS',
      '',
      // Category distribution
      '## Category Distribution',
      'Category,Count',
      ...analytics.categoryDistribution.map(item => `${item.category},${item.count}`),
      '',
      // Stock levels
      '## Stock Levels',
      'Stock Status,Count',
      `Low Stock,${analytics.stockLevels.lowStock}`,
      `Adequate Stock,${analytics.stockLevels.adequateStock}`,
      '',
      // Top products
      '## Top Products by Quantity',
      'Product,Quantity,Unit',
      ...analytics.topProducts.map(item => `${item.name},${item.stocks_qty},${item.unit}`),
      '',
      // Inventory trends
      '## Inventory Trends',
      'Month,Total Quantity,Total Value',
      ...analytics.inventoryTrends.map(item => `${item.month},${item.totalQuantity},${item.totalValue}`),
      '',

      // Advanced Analytics
      '# ADVANCED INVENTORY ANALYTICS',
      '',

      // Profit Margins
      '## Profit Margins & Cost Analysis',
      'Product,Unit,Avg Purchase Price,Selling Price,Profit Per Unit,Margin Percentage',
      ...(analytics.profitMargins?.map(item =>
        `${item.name},${item.unit},${item.avgPurchasePrice},${item.sellingPrice},${item.profitPerUnit},${item.marginPercentage}%`
      ) || []),
      '',

      // Expiry Insights
      '## Expiry Insights',
      'Product,Quantity,Unit,Expiry Date,Days Until Expiry',
      ...(analytics.expiryInsights?.map(item =>
        `${item.name},${item.quantity},${item.unit},${new Date(item.expiry_date).toLocaleDateString()},${item.daysUntilExpiry}`
      ) || []),
      '',

      // Supplier Reliability
      '## Supplier Reliability',
      'Supplier,Total Orders,Total Quantity,Avg Unit Price',
      ...(analytics.supplierReliability?.map(item =>
        `${item.supplierName},${item.totalOrders},${item.totalQuantity},${item.avgUnitPrice}`
      ) || []),
      '',

      // Purchase Frequency
      '## Purchase Frequency',
      'Product,Purchase Count,Total Quantity,Unit',
      ...(analytics.purchaseFrequency?.map(item =>
        `${item.name},${item.purchaseCount},${item.totalQuantity},${item.unit}`
      ) || []),
      '',

      // Co-Purchase Analysis
      '## Co-Purchase Analysis',
      'Product 1,Product 2,Purchased Together',
      ...(analytics.coPurchaseAnalysis?.map(item =>
        `${item.product1},${item.product2},${item.purchasedTogether}`
      ) || [])
    ].join('\n');

    // Create a blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Inventory Dashboard</h2>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="h-80">
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 rounded-md text-red-800">
        <h2 className="text-lg font-semibold mb-2">Error Loading Dashboard</h2>
        <p>{error}</p>
        <Button onClick={fetchAnalytics} variant="outline" className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" /> Try Again
        </Button>
      </div>
    );
  }

  if (!analytics) {
    return <div>No data available</div>;
  }

  // Prepare data for pie charts
  const categoryData = analytics.categoryDistribution;
  const stockLevelsData = [
    { name: 'Low Stock', value: analytics.stockLevels.lowStock },
    { name: 'Adequate Stock', value: analytics.stockLevels.adequateStock }
  ];

  // Prepare data for bar chart
  const topProductsData = analytics.topProducts;

  // Prepare data for line chart
  const trendsData = analytics.inventoryTrends;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Inventory Dashboard</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export Data
          </Button>
          <Button variant="outline" size="sm" onClick={fetchAnalytics}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{analytics.metrics.totalValue.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.metrics.lowStockCount}</div>
            <p className="text-xs text-muted-foreground">Products with stock ≤ 10</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Most Stocked Product</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.metrics.mostStocked ? (
              <>
                <div className="text-lg font-bold truncate">{analytics.metrics.mostStocked.name}</div>
                <div className="text-sm">{analytics.metrics.mostStocked.stocks_qty} {analytics.metrics.mostStocked.unit}</div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Least Stocked Product</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.metrics.leastStocked ? (
              <>
                <div className="text-lg font-bold truncate">{analytics.metrics.leastStocked.name}</div>
                <div className="text-sm">{analytics.metrics.leastStocked.stocks_qty} {analytics.metrics.leastStocked.unit}</div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="distribution" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-9">
          <TabsTrigger value="distribution">Category Distribution</TabsTrigger>
          <TabsTrigger value="stock">Stock Levels</TabsTrigger>
          <TabsTrigger value="top">Top Products</TabsTrigger>
          <TabsTrigger value="trends">Inventory Trends</TabsTrigger>
          <TabsTrigger value="profit">Profit Margins</TabsTrigger>
          <TabsTrigger value="expiry">Expiry Insights</TabsTrigger>
          <TabsTrigger value="supplier">Supplier Reliability</TabsTrigger>
          <TabsTrigger value="frequency">Purchase Frequency</TabsTrigger>
          <TabsTrigger value="copurchase">Co-Purchase Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="distribution" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Product Distribution by Category</CardTitle>
              <CardDescription>Number of products in each category</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="category"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name, props) => [`${value} products`, props.payload.category]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Levels</CardTitle>
              <CardDescription>Low stock vs adequate stock products</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stockLevelsData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#FF8042" />
                    <Cell fill="#00C49F" />
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} products`]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="top" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Products by Quantity</CardTitle>
              <CardDescription>Products with highest stock levels</CardDescription>
            </CardHeader>
            <CardContent className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topProductsData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value, name, props) => [`${value} ${props.payload.unit}`, props.payload.name]} />
                  <Legend />
                  <Bar dataKey="stocks_qty" fill="#8884d8" name="Quantity" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Trends (Last 6 Months)</CardTitle>
              <CardDescription>Quantity and value over time</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trendsData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="totalQuantity" stroke="#8884d8" name="Total Quantity" />
                  <Line yAxisId="right" type="monotone" dataKey="totalValue" stroke="#82ca9d" name="Total Value (₹)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profit" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Profit Margins & Cost Analysis</CardTitle>
              <CardDescription>Comparison of purchase cost vs. selling price</CardDescription>
            </CardHeader>
            <CardContent className="h-96">
              {analytics?.profitMargins && analytics.profitMargins.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.profitMargins}
                    margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={70}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis yAxisId="left" label={{ value: 'Price (₹)', angle: -90, position: 'insideLeft' }} />
                    <YAxis yAxisId="right" orientation="right" label={{ value: 'Margin (%)', angle: 90, position: 'insideRight' }} />
                    <Tooltip content={<ProfitMarginTooltip />} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="avgPurchasePrice" name="Purchase Price (₹)" fill="#8884d8" />
                    <Bar yAxisId="left" dataKey="sellingPrice" name="Selling Price (₹)" fill="#82ca9d" />
                    <Line yAxisId="right" type="monotone" dataKey="marginPercentage" name="Margin (%)" stroke="#ff7300" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground">No profit margin data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expiry" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Expiry & Storage Insights</CardTitle>
              <CardDescription>Products expiring within the next 90 days</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics?.expiryInsights && analytics.expiryInsights.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-muted">
                        <th className="p-2 text-left">Product</th>
                        <th className="p-2 text-left">Quantity</th>
                        <th className="p-2 text-left">Expiry Date</th>
                        <th className="p-2 text-left">Days Until Expiry</th>
                        <th className="p-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.expiryInsights.map((item, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                          <td className="p-2">{item.name}</td>
                          <td className="p-2">{Number(item.quantity).toFixed(2)} {item.unit}</td>
                          <td className="p-2">{new Date(item.expiry_date).toLocaleDateString()}</td>
                          <td className="p-2">{item.daysUntilExpiry}</td>
                          <td className="p-2">
                            {item.daysUntilExpiry <= 30 ? (
                              <Badge variant="destructive">Critical</Badge>
                            ) : item.daysUntilExpiry <= 60 ? (
                              <Badge variant="warning" className="bg-yellow-500">Warning</Badge>
                            ) : (
                              <Badge variant="outline">Normal</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center">
                  <p className="text-muted-foreground">No expiry data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="supplier" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Reliability Metrics</CardTitle>
              <CardDescription>Performance metrics for top suppliers</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {analytics?.supplierReliability && analytics.supplierReliability.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.supplierReliability}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="supplierName" />
                    <YAxis yAxisId="left" label={{ value: 'Orders', angle: -90, position: 'insideLeft' }} />
                    <YAxis yAxisId="right" orientation="right" label={{ value: 'Avg. Price (₹)', angle: 90, position: 'insideRight' }} />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="totalOrders" name="Total Orders" fill="#8884d8" />
                    <Bar yAxisId="left" dataKey="totalQuantity" name="Total Quantity" fill="#82ca9d" />
                    <Line yAxisId="right" type="monotone" dataKey="avgUnitPrice" name="Avg. Unit Price (₹)" stroke="#ff7300" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground">No supplier reliability data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="frequency" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Frequency</CardTitle>
              <CardDescription>Most frequently purchased products</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {analytics?.purchaseFrequency && analytics.purchaseFrequency.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.purchaseFrequency}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={150} />
                    <Tooltip formatter={(value, name) => [value, name === 'purchaseCount' ? 'Purchase Count' : 'Total Quantity']} />
                    <Legend />
                    <Bar dataKey="purchaseCount" name="Purchase Count" fill="#8884d8" />
                    <Bar dataKey="totalQuantity" name="Total Quantity" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground">No purchase frequency data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="copurchase" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Co-Purchase Analysis</CardTitle>
              <CardDescription>Products frequently purchased together</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics?.coPurchaseAnalysis && analytics.coPurchaseAnalysis.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-muted">
                        <th className="p-2 text-left">Product Pair</th>
                        <th className="p-2 text-left">Purchased Together</th>
                        <th className="p-2 text-left">Recommendation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.coPurchaseAnalysis.map((item, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                          <td className="p-2">
                            <div className="font-medium">{item.product1}</div>
                            <div className="text-muted-foreground">+</div>
                            <div className="font-medium">{item.product2}</div>
                          </td>
                          <td className="p-2">{item.purchasedTogether} times</td>
                          <td className="p-2">
                            {item.purchasedTogether >= 5 ? (
                              <Badge className="bg-green-500">Strong Bundle</Badge>
                            ) : item.purchasedTogether >= 3 ? (
                              <Badge variant="outline" className="border-green-500 text-green-700">Potential Bundle</Badge>
                            ) : (
                              <Badge variant="outline">Weak Association</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center">
                  <p className="text-muted-foreground">No co-purchase data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
