import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Tradelines from "@/pages/tradelines";
import CreditLines from "@/pages/credit-lines";
import Clients from "@/pages/clients";
import Disputes from "@/pages/disputes";
import Reports from "@/pages/reports";
import Compliance from "@/pages/compliance";
import Settings from "@/pages/settings";
import Billing from "@/pages/billing";
import Notifications from "@/pages/notifications";
import Uploads from "@/pages/uploads";
import Partners from "@/pages/partners";
import Metro2 from "@/pages/metro2";
import AIPage from "@/pages/ai";
import { Loader2 } from "lucide-react";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Redirect to="/login" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing}/>
      <Route path="/login" component={LoginPage}/>
      <Route path="/dashboard">{() => <ProtectedRoute component={Dashboard} />}</Route>
      <Route path="/clients">{() => <ProtectedRoute component={Clients} />}</Route>
      <Route path="/disputes">{() => <ProtectedRoute component={Disputes} />}</Route>
      <Route path="/reports">{() => <ProtectedRoute component={Reports} />}</Route>
      <Route path="/tradelines">{() => <ProtectedRoute component={Tradelines} />}</Route>
      <Route path="/credit-lines">{() => <ProtectedRoute component={CreditLines} />}</Route>
      <Route path="/uploads">{() => <ProtectedRoute component={Uploads} />}</Route>
      <Route path="/partners">{() => <ProtectedRoute component={Partners} />}</Route>
      <Route path="/metro2">{() => <ProtectedRoute component={Metro2} />}</Route>
      <Route path="/ai">{() => <ProtectedRoute component={AIPage} />}</Route>
      <Route path="/billing">{() => <ProtectedRoute component={Billing} />}</Route>
      <Route path="/notifications">{() => <ProtectedRoute component={Notifications} />}</Route>
      <Route path="/compliance">{() => <ProtectedRoute component={Compliance} />}</Route>
      <Route path="/settings">{() => <ProtectedRoute component={Settings} />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
