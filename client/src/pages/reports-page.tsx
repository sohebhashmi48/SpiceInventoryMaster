import { useState } from "react";
import Layout from "@/components/layout/layout";
import PageHeader from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart2,
  TrendingUp,
  PieChart,
  Package,
  Store,
  FileText,
  Download,
  Calendar
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
  PieChart as RePieChart,
  Pie,
  Cell
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { Inventory, Spice, Vendor } from "@shared/schema";

// Sample data (this would be fetched from the API in a real implementation)
const inventoryTrendData = [
  { month: "Jan", value: 15000 },
  { month: "Feb", value: 16200 },
  { month: "Mar", value: 17800 },
  { month: "Apr", value: 19500 },
  { month: "May", value: 21000 },
  { month: "Jun", value: 22600 },
  { month: "Jul", value: 24000 },
  { month: "Aug", value: 23200 },
  { month: "Sep", value: 24800 },
  { month: "Oct", value: 26500 },
  { month: "Nov", value: 28000 },
  { month: "Dec", value: 29500 },
];

const spiceCategoryData = [
  { name: "Seeds", value: 35 },
  { name: "Ground Spices", value: 25 },
  { name: "Leaves & Herbs", value: 20 },
  { name: "Spice Blends", value: 15 },
  { name: "Other", value: 5 },
];

const topSellingSpicesData = [
  { name: "Turmeric", value: 25 },
  { name: "Cinnamon", value: 18 },
  { name: "Paprika", value: 15 },
  { name: "Cumin", value: 12 },
  { name: "Black Pepper", value: 10 },
  { name: "Others", value: 20 },
];

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--accent))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--muted))"
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [timeRange, setTimeRange] = useState("year");

  const { data: inventory } = useQuery<Inventory[]>({
    queryKey: ["/api/inventory"],
  });

  const { data: spices } = useQuery<Spice[]>({
    queryKey: ["/api/products"],
  });

  const { data: vendors } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const getSpiceName = (spiceId: number) => {
    const spice = spices?.find((s) => s.id === spiceId);
    return spice ? spice.name : "Unknown";
  };

  const getVendorName = (vendorId: number) => {
    const vendor = vendors?.find((v) => v.id === vendorId);
    return vendor ? vendor.name : "Unknown";
  };

  // Get expiring items for inventory health report
  const getExpiringItems = () => {
    if (!inventory) return [];

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    return inventory.filter(item => {
      const expiryDate = new Date(item.expiryDate);
      return expiryDate <= thirtyDaysFromNow && expiryDate >= now;
    });
  };

  return (
    <Layout>
      <PageHeader
        title="Reports & Analytics"
        description="Track performance and gain insights into your inventory and sales"
      >
        <Button variant="outline">
          <Calendar className="h-4 w-4 mr-2" />
          {timeRange === "year" ? "2023" : timeRange === "quarter" ? "Q4 2023" : "December 2023"}
        </Button>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </PageHeader>

      <div className="mb-6">
        <Select
          value={timeRange}
          onValueChange={setTimeRange}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="year">Year</SelectItem>
            <SelectItem value="quarter">Quarter</SelectItem>
            <SelectItem value="month">Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid grid-cols-4 md:w-[600px]">
          <TabsTrigger value="overview" className="flex items-center">
            <BarChart2 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center">
            <Package className="h-4 w-4 mr-2" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="vendors" className="flex items-center">
            <Store className="h-4 w-4 mr-2" />
            Vendors
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Financial
          </TabsTrigger>
        </TabsList>

        {/* Overview Report */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Value Trend</CardTitle>
                <CardDescription>Total inventory value over time</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={inventoryTrendData}>
                    <XAxis dataKey="month" />
                    <YAxis
                      tickFormatter={(value) => `$${value / 1000}k`}
                    />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <Tooltip
                      formatter={(value) => [`$${value}`, 'Value']}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Spice Categories</CardTitle>
                <CardDescription>Distribution by category</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={spiceCategoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {spiceCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
                  </RePieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Selling Spices</CardTitle>
                <CardDescription>Best performing products</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topSellingSpicesData} layout="vertical">
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
                    <Bar
                      dataKey="value"
                      fill="hsl(var(--secondary))"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Key Metrics</CardTitle>
                <CardDescription>Summary of important indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium">Total Inventory Value</h4>
                      <span className="text-xl font-bold">$29,500</span>
                    </div>
                    <div className="bg-secondary/10 h-2 rounded-full overflow-hidden">
                      <div className="bg-secondary h-full rounded-full" style={{ width: "85%" }}></div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">85% of target</p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium">Inventory Turnover</h4>
                      <span className="text-xl font-bold">4.2x</span>
                    </div>
                    <div className="bg-primary/10 h-2 rounded-full overflow-hidden">
                      <div className="bg-primary h-full rounded-full" style={{ width: "70%" }}></div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">70% of target</p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium">Active Vendors</h4>
                      <span className="text-xl font-bold">{vendors?.length || 0}</span>
                    </div>
                    <div className="bg-accent/20 h-2 rounded-full overflow-hidden">
                      <div className="bg-accent-dark h-full rounded-full" style={{ width: "90%" }}></div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">90% of target</p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium">Profit Margin</h4>
                      <span className="text-xl font-bold">32%</span>
                    </div>
                    <div className="bg-green-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-green-600 h-full rounded-full" style={{ width: "75%" }}></div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">75% of target</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Inventory Report */}
        <TabsContent value="inventory" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Health</CardTitle>
                <CardDescription>Expiring items and stock levels</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Expiring in 30 Days</h4>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Spice</TableHead>
                          <TableHead>Batch</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Expiry Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getExpiringItems().length > 0 ? (
                          getExpiringItems().slice(0, 5).map(item => (
                            <TableRow key={item.id}>
                              <TableCell>{getSpiceName(item.spiceId)}</TableCell>
                              <TableCell>{item.batchNumber}</TableCell>
                              <TableCell>{item.quantity} kg</TableCell>
                              <TableCell>{new Date(item.expiryDate).toLocaleDateString()}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                              No items expiring in the next 30 days
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inventory Value by Category</CardTitle>
                <CardDescription>Distribution of value across categories</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={spiceCategoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      fill="#8884d8"
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {spiceCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
                    <Legend />
                  </RePieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Inventory Movement</CardTitle>
              <CardDescription>Stock additions and depletions over time</CardDescription>
            </CardHeader>
            <CardContent className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={inventoryTrendData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar name="Additions" dataKey="value" fill="hsl(var(--chart-4))" />
                  <Bar name="Depletions" dataKey="value" fill="hsl(var(--chart-5))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vendors Report */}
        <TabsContent value="vendors" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Vendor Performance</CardTitle>
                <CardDescription>Rating and order fulfillment</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {vendors?.slice(0, 5).map(vendor => (
                    <div key={vendor.id} className="flex justify-between items-center p-3 bg-neutral-50 rounded-md">
                      <div>
                        <h4 className="font-medium">{vendor.name}</h4>
                        <p className="text-sm text-muted-foreground">{vendor.contactName}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">Rating: {vendor.rating || "N/A"}/5</div>
                        <div className="text-sm text-green-600">On-time: 98%</div>
                      </div>
                    </div>
                  ))}
                  {!vendors?.length && (
                    <div className="text-center p-6 text-muted-foreground">
                      No vendor data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Status</CardTitle>
                <CardDescription>Outstanding balances and payments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {vendors?.slice(0, 5).map(vendor => (
                    <div key={vendor.id} className="flex justify-between items-center p-3 bg-neutral-50 rounded-md">
                      <div>
                        <h4 className="font-medium">{vendor.name}</h4>
                        <p className="text-sm text-muted-foreground">Terms: {vendor.paymentTerms}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-red-600">Owed: ${Number(vendor.moneyOwed).toFixed(2)}</div>
                        <div className="text-sm text-green-600">Paid: ${Number(vendor.moneyPaid).toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                  {!vendors?.length && (
                    <div className="text-center p-6 text-muted-foreground">
                      No payment data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Vendor Order Distribution</CardTitle>
              <CardDescription>Purchase volume by vendor</CardDescription>
            </CardHeader>
            <CardContent className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={vendors?.slice(0, 10).map(vendor => ({
                    name: vendor.name,
                    value: Number(vendor.moneyPaid) + Number(vendor.moneyOwed)
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value}`, 'Order Volume']} />
                  <Bar
                    dataKey="value"
                    fill="hsl(var(--primary))"
                    name="Order Volume"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Report */}
        <TabsContent value="financial" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs. Expenses</CardTitle>
                <CardDescription>Financial performance over time</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={inventoryTrendData}>
                    <XAxis dataKey="month" />
                    <YAxis
                      tickFormatter={(value) => `$${value / 1000}k`}
                    />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <Tooltip
                      formatter={(value) => [`$${value}`, 'Value']}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      name="Revenue"
                      dataKey="value"
                      stroke="hsl(var(--chart-4))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--chart-4))" }}
                    />
                    <Line
                      type="monotone"
                      name="Expenses"
                      dataKey="value"
                      stroke="hsl(var(--chart-5))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--chart-5))" }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Status</CardTitle>
                <CardDescription>Overview of invoice payments</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={[
                        { name: "Paid", value: 65 },
                        { name: "Unpaid", value: 20 },
                        { name: "Pending", value: 15 }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      fill="#8884d8"
                      paddingAngle={2}
                      dataKey="value"
                    >
                      <Cell fill="hsl(var(--chart-4))" />
                      <Cell fill="hsl(var(--chart-5))" />
                      <Cell fill="hsl(var(--accent))" />
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
                    <Legend />
                  </RePieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Profit Margin Analysis</CardTitle>
              <CardDescription>Margin by product category</CardDescription>
            </CardHeader>
            <CardContent className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={spiceCategoryData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value}%`, 'Profit Margin']} />
                  <Bar
                    dataKey="value"
                    fill="hsl(var(--secondary))"
                    name="Profit Margin"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
