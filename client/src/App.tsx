import React from 'react';
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import NotFound from "./pages/not-found";
import AuthPage from "./pages/auth-page";
import DashboardPage from "./pages/dashboard-page";
import InventoryPage from "./pages/inventory-page";
import InventoryHistoryPage from "./pages/inventory-history";
import SuppliersPage from "./pages/suppliers";
import BillingPage from "./pages/billing-page";
import ReportsPage from "./pages/reports-page";
import SpicesPage from "./pages/spices-page";
import SettingsPage from "./pages/settings-page";
import UsersPage from "./pages/users-page";
import PurchaseEntryPage from "./pages/purchase-entry-page";
import SupplierPurchasePage from "./pages/supplier-purchase-page";
import SupplierDetailsPage from "./pages/suppliers/[id]";
import PurchaseHistoryPage from "./pages/purchase-history";
import PurchaseHistoryNewPage from "./pages/purchase-history-new";
import PurchaseHistoryBillView from "./pages/purchase-history-bill-view-fixed";
import TestPurchaseHistoryPage from "./pages/test-purchase-history";
import CaterersPage from "./pages/caterers";
import NewCatererPage from "./pages/caterers/new";
import CatererDetailsPage from "./pages/caterers/[id]";
import DistributionsPage from "./pages/distributions";
import NewDistributionPage from "./pages/distributions/new";
import DistributionDetailsPage from "./pages/distributions/[id]";
import CatererBillingPage from "./pages/caterer-billing-page";
import CatererPaymentsPage from "./pages/caterer-payments";
import NewCatererPaymentPage from "./pages/caterer-payments/new";
import CatererPaymentFormRedirect from "./pages/caterer-payment-form";
import CatererReportsPage from "./pages/caterer-reports-page";
import PaymentRemindersPage from "./pages/caterers/payment-reminders";
import NotificationsPage from "./pages/notifications";
import CustomerBillingPage from "./pages/customer-billing";
import CustomerTransactionHistoryPage from "./pages/customer-transaction-history";
import ProductShowcasePage from "./pages/showcase";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";
import { store } from "./store";
import { Provider } from "react-redux";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      {/* Public showcase routes - no authentication required */}
      <Route path="/showcase" component={ProductShowcasePage} />
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/inventory" component={InventoryPage} />
      <ProtectedRoute path="/inventory-history" component={InventoryHistoryPage} />
      <ProtectedRoute path="/spices" component={SpicesPage} />
      <ProtectedRoute path="/suppliers" component={SuppliersPage} />
      <ProtectedRoute path="/suppliers/:supplierId" component={SupplierDetailsPage} />
      <ProtectedRoute path="/supplier-purchase/:supplierId" component={SupplierPurchasePage} />
      <ProtectedRoute path="/purchase-history-old" component={PurchaseHistoryPage} />
      <ProtectedRoute path="/purchase-history-group" component={PurchaseHistoryNewPage} />
      <ProtectedRoute path="/purchase-history" component={PurchaseHistoryBillView} />
      <ProtectedRoute path="/test-purchase-history" component={TestPurchaseHistoryPage} />
      <Route path="/vendors">
        {() => {
          window.location.replace("/suppliers");
          return null;
        }}
      </Route>
      <ProtectedRoute path="/caterers" component={CaterersPage} />
      <ProtectedRoute path="/caterers/new" component={NewCatererPage} />
      <ProtectedRoute path="/caterers/payment-reminders" component={PaymentRemindersPage} />
      <ProtectedRoute path="/caterers/:id" component={CatererDetailsPage} />
      <ProtectedRoute path="/notifications" component={NotificationsPage} />
      <ProtectedRoute path="/distributions" component={DistributionsPage} />
      <ProtectedRoute path="/distributions/new" component={NewDistributionPage} />
      <ProtectedRoute path="/distributions/:id" component={DistributionDetailsPage} />
      <ProtectedRoute path="/caterer-billing" component={CatererBillingPage} />
      <ProtectedRoute path="/caterer-payments" component={CatererPaymentsPage} />
      <ProtectedRoute path="/caterer-payments/new" component={NewCatererPaymentPage} />
      <ProtectedRoute path="/caterer-payment-form" component={CatererPaymentFormRedirect} />
      <ProtectedRoute path="/caterer-reports" component={CatererReportsPage} />
      <ProtectedRoute path="/customer-billing" component={CustomerBillingPage} />
      <ProtectedRoute path="/customer-transaction-history" component={CustomerTransactionHistoryPage} />
      <ProtectedRoute path="/billing" component={BillingPage} />
      <ProtectedRoute path="/purchases" component={PurchaseEntryPage} />
      <ProtectedRoute path="/reports" component={ReportsPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute path="/users" component={UsersPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </Provider>
    </QueryClientProvider>
  );
}

export default App;
