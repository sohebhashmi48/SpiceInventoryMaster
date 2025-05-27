import { useState } from "react";
import Layout from "@/components/layout/layout";
import PageHeader from "@/components/common/page-header";
import VendorTable from "@/components/vendors/vendor-table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, CreditCard, CheckSquare, UserPlus, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Vendor } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import AddVendorForm from "@/components/vendors/add-vendor-form";
import SupplierPaymentReminders from "@/components/dashboard/supplier-payment-reminders";

export default function VendorsPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const { data: vendors } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const vendorsWithBalances = vendors?.filter(vendor => Number(vendor.moneyOwed) > 0);
  const topVendors = vendors?.filter(vendor => (vendor.rating || 0) >= 4);

  return (
    <Layout>
      <PageHeader
        title="Vendor Management"
        description="Manage your suppliers and track payments"
      >
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-secondary hover:bg-secondary-dark text-white">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Add New Vendor</DialogTitle>
              <DialogDescription>
                Add a new supplier to your vendor list. Fill in the contact information and payment terms.
              </DialogDescription>
            </DialogHeader>
            <AddVendorForm
              onSuccess={() => setIsAddDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Supplier Payment Reminders */}
      <div className="mb-6">
        <Card className="overflow-hidden">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-base flex items-center">
              <AlertCircle className="h-4 w-4 mr-2 text-orange-500" />
              Supplier Payment Reminders
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[200px] overflow-y-auto">
              <SupplierPaymentReminders className="h-full" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="all" className="flex items-center">
            <Store className="h-4 w-4 mr-2" />
            All Vendors
          </TabsTrigger>
          <TabsTrigger value="outstanding" className="flex items-center">
            <CreditCard className="h-4 w-4 mr-2" />
            Outstanding Balances
            {vendorsWithBalances && vendorsWithBalances.length > 0 && (
              <span className="ml-2 bg-red-100 text-red-800 text-xs rounded-full px-2 py-0.5">
                {vendorsWithBalances.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="top" className="flex items-center">
            <CheckSquare className="h-4 w-4 mr-2" />
            Top Rated
            {topVendors && topVendors.length > 0 && (
              <span className="ml-2 bg-green-100 text-green-800 text-xs rounded-full px-2 py-0.5">
                {topVendors.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <VendorTable />
        </TabsContent>

        <TabsContent value="outstanding" className="mt-6">
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <CreditCard className="h-5 w-5 text-amber-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">Outstanding Balances</h3>
                <div className="mt-2 text-sm text-amber-700">
                  <p>These vendors have outstanding balances that need to be paid.</p>
                </div>
              </div>
            </div>
          </div>
          <VendorTable />
        </TabsContent>

        <TabsContent value="top" className="mt-6">
          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-r-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <CheckSquare className="h-5 w-5 text-green-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Top Rated Vendors</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>These are your highest rated vendors with consistent quality and service.</p>
                </div>
              </div>
            </div>
          </div>
          <VendorTable />
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
