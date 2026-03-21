import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, FileText, Settings, ShieldCheck, Activity, CreditCard, Wallet, Bell, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Disputes (e-OSCAR)", href: "/disputes", icon: FileText },
  { name: "Credit Reports", href: "/reports", icon: Activity },
  { name: "Tradelines", href: "/tradelines", icon: CreditCard },
  { name: "Revolving Credit", href: "/credit-lines", icon: Wallet },
  { name: "Billing & Revenue", href: "/billing", icon: DollarSign },
  { name: "Inbox", href: "/notifications", icon: Bell, badge: "2" },
  { name: "Compliance", href: "/compliance", icon: ShieldCheck },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar className="border-r border-border/50 bg-sidebar">
      <SidebarHeader className="h-16 flex items-center px-4 border-b border-border/50">
        <div className="flex items-center gap-2 font-heading font-bold text-xl text-primary">
          <ShieldCheck className="w-6 h-6 text-primary" />
          <span>CreditRepair Pro</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="py-4">
        <SidebarMenu>
          {navigation.map((item) => (
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
                  {item.badge && (
                    <Badge variant="default" className="bg-primary hover:bg-primary/90 rounded-full h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                      {item.badge}
                    </Badge>
                  )}
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background/95">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-16 flex items-center justify-between px-6 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div className="hidden md:flex items-center text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success"></span>
                  System Status: Operational
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/notifications">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive border border-background"></span>
                </Button>
              </Link>
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium text-sm">
                JD
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