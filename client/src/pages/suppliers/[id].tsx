import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Vendor } from "@shared/schema";
import Layout from "@/components/layout/layout";
import PageHeader from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Calendar,
  Edit,
  ShoppingCart,
  Star,
  CreditCard
} from "lucide-react";
import SupplierPurchaseHistory from "@/components/suppliers/supplier-purchase-history";
import SupplierPurchaseHistoryNew from "@/components/suppliers/supplier-purchase-history-new";
import SupplierPurchaseHistoryBillView from "@/components/suppliers/supplier-purchase-history-bill-view";
import SupplierPaymentHistory from "@/components/suppliers/supplier-payment-history";
import SupplierPaymentForm from "@/components/suppliers/supplier-payment-form";
import { formatCurrency } from "@/lib/utils";

export default function SupplierDetailsPage() {
  const [location, setLocation] = useLocation();
  const [, params] = useRoute("/suppliers/:supplierId");
  const supplierId = params?.supplierId ? parseInt(params.supplierId) : 0;

  // Check if there's a tab parameter in the URL
  const urlParams = new URLSearchParams(location.split('?')[1]);
  const tabParam = urlParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam === 'purchases' ? 'purchases' : 'details');

  // Payment form state for bill payments
  const [paymentFormData, setPaymentFormData] = useState<{
    amount: string;
    reference: string;
  } | null>(null);

  // Fetch supplier details
  const { data: supplier, isLoading } = useQuery<Vendor>({
    queryKey: [`/api/suppliers/${supplierId}`],
    enabled: !!supplierId,
  });

  // Handle payment click from bill
  const handlePaymentFromBill = (billAmount: number, billNo: string) => {
    setPaymentFormData({
      amount: billAmount.toString(),
      reference: `Payment for ${billNo}`
    });
    setActiveTab("payments");

    // Scroll to payment form after tab change
    setTimeout(() => {
      const paymentForm = document.querySelector('[data-payment-form]');
      if (paymentForm) {
        paymentForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  return (
    <Layout>
      <PageHeader
        title={isLoading ? "Loading..." : (supplier?.name || "Supplier Details")}
        description="View and manage supplier information"
      >
        {isLoading && <Skeleton className="h-8 w-64 absolute top-6" />}
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setLocation("/suppliers")}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Suppliers
          </Button>
          {supplier && (
            <Button
              variant="outline"
              onClick={() => setLocation(`/supplier-purchase/${supplierId}`)}
              className="flex items-center text-green-600 hover:text-green-800 hover:bg-green-50 border-green-200"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Buy from Supplier
            </Button>
          )}
        </div>
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="details" className="flex items-center">
            <User className="h-4 w-4 mr-2" />
            Details
          </TabsTrigger>
          <TabsTrigger value="purchases" className="flex items-center">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Purchase History
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center">
            <CreditCard className="h-4 w-4 mr-2" />
            Payments & Due
            {supplier && parseFloat(supplier.balanceDue?.toString() || '0') > 0 && (
              <span className="ml-2 bg-red-100 text-red-800 text-xs rounded-full px-2 py-0.5">
                ₹{parseFloat(supplier.balanceDue?.toString() || '0').toFixed(0)}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6">
          {isLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </CardContent>
            </Card>
          ) : supplier ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm text-gray-500">Company Name</Label>
                    <p className="font-medium">{supplier.name}</p>
                  </div>

                  {supplier.contactName && (
                    <div>
                      <Label className="text-sm text-gray-500">Contact Person</Label>
                      <p className="font-medium">{supplier.contactName}</p>
                    </div>
                  )}

                  {supplier.email && (
                    <div className="flex items-start">
                      <Mail className="h-4 w-4 mt-1 mr-2 text-gray-400" />
                      <div>
                        <Label className="text-sm text-gray-500">Email</Label>
                        <p className="font-medium">{supplier.email}</p>
                      </div>
                    </div>
                  )}

                  {supplier.phone && (
                    <div className="flex items-start">
                      <Phone className="h-4 w-4 mt-1 mr-2 text-gray-400" />
                      <div>
                        <Label className="text-sm text-gray-500">Phone</Label>
                        <p className="font-medium">{supplier.phone}</p>
                      </div>
                    </div>
                  )}

                  {supplier.address && (
                    <div className="flex items-start">
                      <MapPin className="h-4 w-4 mt-1 mr-2 text-gray-400" />
                      <div>
                        <Label className="text-sm text-gray-500">Address</Label>
                        <p className="font-medium">{supplier.address}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Financial Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start">
                    <DollarSign className="h-4 w-4 mt-1 mr-2 text-gray-400" />
                    <div>
                      <Label className="text-sm text-gray-500">Balance Due</Label>
                      <p className="font-medium">
                        {supplier.balanceDue
                          ? formatCurrency(parseFloat(supplier.balanceDue.toString()))
                          : formatCurrency(0)}
                      </p>
                    </div>
                  </div>

                  {supplier.creditLimit && (
                    <div className="flex items-start">
                      <DollarSign className="h-4 w-4 mt-1 mr-2 text-gray-400" />
                      <div>
                        <Label className="text-sm text-gray-500">Credit Limit</Label>
                        <p className="font-medium">
                          {formatCurrency(parseFloat(supplier.creditLimit.toString()))}
                        </p>
                      </div>
                    </div>
                  )}

                  {supplier.paymentTerms && (
                    <div>
                      <Label className="text-sm text-gray-500">Payment Terms</Label>
                      <p className="font-medium">{supplier.paymentTerms}</p>
                    </div>
                  )}

                  {supplier.rating && (
                    <div className="flex items-start">
                      <Star className="h-4 w-4 mt-1 mr-2 text-yellow-400" />
                      <div>
                        <Label className="text-sm text-gray-500">Rating</Label>
                        <p className="font-medium">{supplier.rating} / 5</p>
                      </div>
                    </div>
                  )}

                  {supplier.createdAt && (
                    <div className="flex items-start">
                      <Calendar className="h-4 w-4 mt-1 mr-2 text-gray-400" />
                      <div>
                        <Label className="text-sm text-gray-500">Supplier Since</Label>
                        <p className="font-medium">
                          {new Date(supplier.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {supplier.notes && (
                <Card className="md:col-span-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 dark:text-gray-300">{supplier.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500">Supplier not found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="purchases" className="mt-6">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : supplier ? (
            <SupplierPurchaseHistoryBillView
              supplierId={supplierId}
              onPaymentClick={handlePaymentFromBill}
            />
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500">Supplier not found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : supplier ? (
            <div className="space-y-6">
              {/* Payment Form */}
              <div data-payment-form>
                <SupplierPaymentForm
                  supplierId={supplierId}
                  supplier={supplier}
                  initialData={paymentFormData}
                  onPaymentSuccess={() => {
                    // Clear payment form data and refresh
                    setPaymentFormData(null);
                    window.location.reload();
                  }}
                />
              </div>

              {/* Payment History */}
              <SupplierPaymentHistory supplierId={supplierId} />
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500">Supplier not found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
