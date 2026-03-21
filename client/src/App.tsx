import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing}/>
      <Route path="/dashboard" component={Dashboard}/>
      <Route path="/clients" component={Clients}/>
      <Route path="/disputes" component={Disputes}/>
      <Route path="/reports" component={Reports}/>
      <Route path="/tradelines" component={Tradelines}/>
      <Route path="/credit-lines" component={CreditLines}/>
      <Route path="/billing" component={Billing}/>
      <Route path="/notifications" component={Notifications}/>
      <Route path="/compliance" component={Compliance}/>
      <Route path="/settings" component={Settings}/>
      <Route path="/uploads" component={Uploads}/>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
