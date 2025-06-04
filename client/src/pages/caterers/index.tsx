import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { Caterer, useCaterers, useDeleteCaterer, RelatedRecordsError, DeleteCatererOptions } from '@/hooks/use-caterers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ChefHat, Plus, Search, Filter, Grid, List, AlertCircle
} from 'lucide-react';
import CatererDeleteDialog from '@/components/caterers/caterer-delete-dialog';
import CatererCardModal from '@/components/caterers/caterer-card-modal';
import CatererLayout from '@/components/caterers/caterer-layout';
import CatererCard from '@/components/caterers/caterer-card';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function CaterersPage() {
  const [, setLocation] = useLocation();
  const { data: caterers, isLoading } = useCaterers();
  const deleteCatererMutation = useDeleteCaterer();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [balanceFilter, setBalanceFilter] = useState<string>("all");
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [catererToDelete, setCatererToDelete] = useState<Caterer | null>(null);
  const [catererCardToView, setCatererCardToView] = useState<Caterer | null>(null);
  const [relatedRecords, setRelatedRecords] = useState<RelatedRecordsError['relatedRecords'] | undefined>(undefined);

  // Helper function to navigate
  const navigate = (path: string) => setLocation(path);

  // Debounce search term changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Memoize filter conditions
  const filterConditions = useMemo(
    () => ({
      isActive: statusFilter === "active",
      hasBalance: balanceFilter === "withBalance",
      noBalance: balanceFilter === "noBalance"
    }),
    [statusFilter, balanceFilter]
  );

  // Filter caterers based on search term and filters
  const filteredCaterers = useMemo(() => {
    if (!caterers) return [];

    return caterers.filter(caterer => {
      const matchesSearch = !debouncedSearchTerm ||
        caterer.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (caterer.contactName && caterer.contactName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));

      const matchesStatus = !filterConditions.isActive || caterer.isActive;
      const matchesBalance = (
        balanceFilter === "all" ||
        (balanceFilter === "withBalance" && Number(caterer.balanceDue) > 0) ||
        (balanceFilter === "noBalance" && Number(caterer.balanceDue) === 0)
      );

      return matchesSearch && matchesStatus && matchesBalance;
    });
  }, [caterers, debouncedSearchTerm, filterConditions, balanceFilter]);

  // Handle delete click
  const handleDeleteClick = useCallback(async (caterer: Caterer) => {
    try {
      const response = await fetch(`/api/caterers/${caterer.id}/check-related-records`);
      const data = await response.json();

      setCatererToDelete(caterer);
      if (data.hasRelatedRecords) {
        setRelatedRecords({
          bills: data.distributionsCount || 0,
          payments: data.paymentsCount || 0,
          total: data.totalCount || 0
        });
      } else {
        setRelatedRecords(undefined);
      }
    } catch (error) {
      console.error('Error checking related records:', error);
      setCatererToDelete(caterer);
      setRelatedRecords(undefined);
    }
  }, []);

  // Handle delete confirmation
  const handleDelete = useCallback((id: number, options?: DeleteCatererOptions) => {
    deleteCatererMutation.mutate({ id, options }, {
      onSuccess: () => {
        setCatererToDelete(null);
        setRelatedRecords(undefined);
      },
      onError: (error: any) => {
        if (error.relatedRecords) {
          setRelatedRecords(error.relatedRecords);
        } else {
          setCatererToDelete(null);
          setRelatedRecords(undefined);
        }
      }
    });
  }, [deleteCatererMutation]);

  const handleEdit = useCallback((caterer: Caterer) => {
    navigate(`/caterers/${caterer.id}`);
  }, [navigate]);

  const handleView = useCallback((caterer: Caterer) => {
    setCatererCardToView(caterer);
  }, []);

  return (
    <CatererLayout title="Caterer Management" description="View and manage your caterers">
      <div className="space-y-6">
        {/* Search and Filter UI */}
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search caterers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsFilterVisible(!isFilterVisible)}
                className={cn(
                  "h-10 w-10",
                  isFilterVisible && "bg-gray-100"
                )}
              >
                <Filter className="h-4 w-4" />
              </Button>
              <div className="flex items-center space-x-1 ml-4">
                <Button
                  variant={view === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setView("grid")}
                  className="h-10 w-10"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={view === "list" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setView("list")}
                  className="h-10 w-10"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Button onClick={() => navigate('/caterers/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Caterer
            </Button>
          </div>

          {/* Filter Options */}
          {isFilterVisible && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white rounded-lg border">
              <div>
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Balance</Label>
                <Select value={balanceFilter} onValueChange={setBalanceFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by balance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Balances</SelectItem>
                    <SelectItem value="withBalance">With Balance</SelectItem>
                    <SelectItem value="noBalance">No Balance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setBalanceFilter("all");
                  }}
                  className="text-sm h-10"
                >
                  Clear All Filters
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Caterer Grid/List View */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredCaterers.length > 0 ? (
            <div className={view === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
              {filteredCaterers.map((caterer) => (
                <CatererCard
                  key={caterer.id}
                  caterer={caterer}
                  onEdit={handleEdit}
                  onDelete={handleDeleteClick}
                  onView={handleView}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No caterers found</p>
              {(searchTerm || statusFilter !== "all" || balanceFilter !== "all") && (
                <p className="text-sm text-muted-foreground mt-2">
                  Try adjusting your search or filters
                </p>
              )}
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => navigate('/caterers/new')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Caterer
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Dialog */}
      <CatererDeleteDialog
        open={!!catererToDelete}
        caterer={catererToDelete}
        relatedRecords={relatedRecords}
        onOpenChange={(open) => !open && setCatererToDelete(null)}
        onDelete={handleDelete}
      />

      {/* Caterer Card Modal */}
      <CatererCardModal
        caterer={catererCardToView}
        isOpen={!!catererCardToView}
        onClose={() => setCatererCardToView(null)}
        onEdit={handleEdit}
      />
    </CatererLayout>
  );
}
