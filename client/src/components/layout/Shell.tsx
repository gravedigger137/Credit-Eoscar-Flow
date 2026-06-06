import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, FileText, Settings, ShieldCheck, Activity, CreditCard, Wallet, Bell, DollarSign, Upload, UserCheck, Database, Sparkles, LogOut, Building2, BarChart3, Calculator, Landmark, Zap, Wrench, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Disputes (e-OSCAR)", href: "/disputes", icon: FileText },
  { name: "Credit Reports", href: "/reports", icon: Activity },
  { name: "Tradelines", href: "/tradelines", icon: CreditCard },
  { name: "AU Partners", href: "/partners", icon: UserCheck },
  { name: "Revolving Credit", href: "/credit-lines", icon: Wallet },
  { name: "Metro 2 Filings", href: "/metro2", icon: Database },
  { name: "Bureau Uploads", href: "/uploads", icon: Upload },
  { name: "Bureau & Simulator", href: "/bureau", icon: Building2 },
  { name: "Financial Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Calculators", href: "/calculators", icon: Calculator },
  { name: "Trust Accounting", href: "/trust-accounting", icon: Landmark },
  { name: "Automation", href: "/automation", icon: Zap },
  { name: "Tools", href: "/tools", icon: Wrench },
  { name: "Banking & Lending", href: "/banking", icon: Building2 },
  { name: "Crypto & DeFi", href: "/crypto", icon: Coins },
  { name: "AI Command Center", href: "/ai", icon: Sparkles },
  { name: "Billing & Revenue", href: "/billing", icon: DollarSign },
  { name: "Inbox", href: "/notifications", icon: Bell },
  { name: "Compliance", href: "/compliance", icon: ShieldCheck },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { data } = useQuery<{ count: number }>({ queryKey: ["/api/notifications/unread-count"], refetchInterval: 30000 });
  const unreadCount = data?.count ?? 0;

  return (
    <Sidebar className="border-r border-border/50 bg-sidebar">
      <SidebarHeader className="h-16 flex items-center px-4 border-b border-border/50">
        <div className="flex items-center gap-2 font-heading font-bold text-xl text-primary">
          <ShieldCheck className="w-6 h-6 text-primary" />
          <span>Credit-Eoscar</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="py-4">
        <SidebarMenu>
          {navigation.map((item) => {
            const isInbox = item.name === "Inbox";
            return (
              <SidebarMenuItem key={item.name}>
                <Link href={item.href}>
                  <SidebarMenuButton 
                    isActive={location === item.href}
                    className={cn(
                      "w-full justify-between px-4 py-2.5 transition-all duration-200",
                      location === item.href 
                        ? "bg-primary/10 text-primary font-medium border-r-2 border-primary" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                    tooltip={item.name}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </div>
                    {isInbox && unreadCount > 0 && (
                      <Badge variant="default" className="bg-primary hover:bg-primary/90 rounded-full h-5 min-w-5 px-1 flex items-center justify-center text-[10px]">
                        {unreadCount}
                      </Badge>
                    )}
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}

export function Shell({ children, title, subtitle }: { children: React.ReactNode; title?: string; subtitle?: string }) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  const initials = user?.fullName
    ? user.fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.username?.slice(0, 2).toUpperCase() || "??";

  async function handleLogout() {
    await logout();
    setLocation("/login");
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background/95">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-16 flex items-center justify-between px-6 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              {title ? (
                <div className="hidden md:flex flex-col">
                  <span className="font-semibold text-sm">{title}</span>
                  {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
                </div>
              ) : (
                <div className="hidden md:flex items-center text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-success"></span>
                    System Status: Operational
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <Link href="/notifications">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive border border-background"></span>
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium text-sm" data-testid="text-user-avatar">
                  {initials}
                </div>
                <span className="hidden md:inline text-sm text-muted-foreground" data-testid="text-username">
                  {user?.fullName || user?.username}
                </span>
                <Button variant="ghost" size="icon" onClick={handleLogout} title="Sign out" data-testid="button-logout">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </header>
          <div className="flex-1 overflow-auto p-6 md:p-8 animate-in fade-in duration-300">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
