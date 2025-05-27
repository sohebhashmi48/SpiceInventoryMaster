import { useState } from "react";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Grid, List, Store, History, Search, Filter, Star } from "lucide-react";
import SupplierTable from "@/components/suppliers/supplier-table";
import SupplierGrid from "@/components/suppliers/supplier-grid";
import Layout from "@/components/layout/layout";
import PageHeader from "@/components/common/page-header";

export default function SuppliersPage() {
  const [view, setView] = useState<"grid" | "table">("grid");
  const [, setLocation] = useLocation();

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  const navigateToPurchaseHistory = () => {
    setLocation("/purchase-history");
  };

  // Pass filter values to child components
  const filterValues = {
    searchTerm,
    ratingFilter: ratingFilter === "all" ? null : parseInt(ratingFilter),
    statusFilter: statusFilter === "all" ? null : statusFilter === "active"
  };



  return (
    <Layout>
      <PageHeader
        title="Supplier Management"
        description="Manage your suppliers and track payments"
      >
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={navigateToPurchaseHistory}
            className="mr-2 flex items-center"
          >
            <History className="h-4 w-4 mr-2" />
            Purchase History
          </Button>

          <Button
            variant={view === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setView("grid")}
            className="h-8 w-8"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "table" ? "default" : "outline"}
            size="icon"
            onClick={() => setView("table")}
            className="h-8 w-8"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </PageHeader>

      <Tabs defaultValue="all" className="mb-6">
        <TabsList>
          <TabsTrigger value="all" className="flex items-center">
            <Store className="h-4 w-4 mr-2" />
            All Suppliers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
            {/* Search and Filter UI */}
            <div className="mb-6">
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search suppliers by name, contact, or products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setIsFilterVisible(!isFilterVisible)}
                  className="md:w-auto w-full flex items-center"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {isFilterVisible ? "Hide Filters" : "Show Filters"}
                </Button>
              </div>

              {isFilterVisible && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-md">
                  <div>
                    <Label htmlFor="rating-filter" className="block mb-2 text-sm">Filter by Rating</Label>
                    <Select value={ratingFilter} onValueChange={setRatingFilter}>
                      <SelectTrigger id="rating-filter" className="w-full">
                        <SelectValue placeholder="Select rating" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Ratings</SelectItem>
                        <SelectItem value="5">
                          <div className="flex items-center">
                            <span className="mr-2">5</span>
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star key={star} className="h-3 w-3 text-yellow-500 fill-current" />
                              ))}
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="4">
                          <div className="flex items-center">
                            <span className="mr-2">4+</span>
                            <div className="flex">
                              {[1, 2, 3, 4].map((star) => (
                                <Star key={star} className="h-3 w-3 text-yellow-500 fill-current" />
                              ))}
                              <Star className="h-3 w-3 text-gray-300" />
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="3">
                          <div className="flex items-center">
                            <span className="mr-2">3+</span>
                            <div className="flex">
                              {[1, 2, 3].map((star) => (
                                <Star key={star} className="h-3 w-3 text-yellow-500 fill-current" />
                              ))}
                              {[1, 2].map((star) => (
                                <Star key={star} className="h-3 w-3 text-gray-300" />
                              ))}
                            </div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="status-filter" className="block mb-2 text-sm">Filter by Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger id="status-filter" className="w-full">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Suppliers</SelectItem>
                        <SelectItem value="active">Active Suppliers</SelectItem>
                        <SelectItem value="inactive">Inactive Suppliers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-1 md:col-span-2 mt-4 flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm("");
                        setRatingFilter("all");
                        setStatusFilter("all");
                      }}
                      className="text-sm"
                    >
                      Clear All Filters
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {view === "grid" ? <SupplierGrid filterValues={filterValues} /> : <SupplierTable filterValues={filterValues} />}
          </div>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
