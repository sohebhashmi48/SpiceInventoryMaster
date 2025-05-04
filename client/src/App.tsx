import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import InventoryPage from "@/pages/inventory-page";
import VendorsPage from "@/pages/vendors-page";
import BillingPage from "@/pages/billing-page";
import ReportsPage from "@/pages/reports-page";
import SpicesPage from "@/pages/spices-page";
import SettingsPage from "@/pages/settings-page";
import UsersPage from "@/pages/users-page";
import { ProtectedRoute } from "@/lib/protected-route";
import { AuthProvider } from "@/hooks/use-auth";
import { store } from "@/store";
import { Provider } from "react-redux";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/inventory" component={InventoryPage} />
      <ProtectedRoute path="/spices" component={SpicesPage} />
      <ProtectedRoute path="/vendors" component={VendorsPage} />
      <ProtectedRoute path="/billing" component={BillingPage} />
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
