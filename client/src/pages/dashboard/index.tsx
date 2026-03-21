import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Users, FileText, TrendingUp, Clock, CreditCard, Wallet, AlertTriangle, CheckCircle2, DollarSign } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: stats } = useQuery<any>({ queryKey: ["/api/dashboard/stats"] });
  const { data: clients = [] } = useQuery<any[]>({ queryKey: ["/api/clients"] });
  const { data: disputes = [] } = useQuery<any[]>({ queryKey: ["/api/disputes"] });
  const { data: transactions = [] } = useQuery<any[]>({ queryKey: ["/api/transactions"] });

  const recentClients = clients.slice(0, 5);

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Live overview of all credit repair operations.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="glass-panel border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Clients</CardTitle>
              <Users className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeClients ?? clients.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Total in system: {clients.length}</p>
            </CardContent>
          </Card>

          <Card className="glass-panel border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Disputes</CardTitle>
              <FileText className="w-4 h-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingDisputes ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.deletedItems ?? 0} items deleted
              </p>
            </CardContent>
          </Card>

          <Card className="glass-panel border-l-4 border-l-indigo-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Tradelines</CardTitle>
              <CreditCard className="w-4 h-4 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeTradelines ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">{stats?.activeCreditLines ?? 0} credit builder accounts</p>
            </CardContent>
          </Card>

          <Card className="glass-panel border-l-4 border-l-emerald-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats?.totalRevenue ? (stats.totalRevenue / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Lifetime completed transactions</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <Card className="lg:col-span-4 glass-panel">
            <CardHeader>
              <CardTitle>Service Pipeline</CardTitle>
              <CardDescription>Active services across your operation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    Dispute Submissions
                  </span>
                  <span className="text-muted-foreground">{disputes.filter((d: any) => d.status === "sent").length} active</span>
                </div>
                <Progress value={disputes.length ? (disputes.filter((d: any) => d.status === "sent").length / disputes.length) * 100 : 0} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-indigo-500" />
                    Tradeline Placements
                  </span>
                  <span className="text-muted-foreground">{stats?.activeTradelines ?? 0} active</span>
                </div>
                <Progress value={45} className="h-2 [&>div]:bg-indigo-500" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-emerald-500" />
                    Credit Builder Accounts
                  </span>
                  <span className="text-muted-foreground">{stats?.activeCreditLines ?? 0} enrolled</span>
                </div>
                <Progress value={30} className="h-2 [&>div]:bg-emerald-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3 glass-panel">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Clients</CardTitle>
                <Link href="/clients">
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </div>
              <CardDescription>Last added to the system</CardDescription>
            </CardHeader>
            <CardContent>
              {recentClients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No clients yet. Add your first client.</p>
                  <Link href="/clients">
                    <Button className="mt-4" size="sm">Add Client</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentClients.map((client: any) => (
                    <div key={client.id} className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                          {client.firstName[0]}{client.lastName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{client.firstName} {client.lastName}</p>
                          <p className="text-xs text-muted-foreground">{client.email}</p>
                        </div>
                      </div>
                      <Badge 
                        variant="outline"
                        className={
                          client.status === 'active' ? 'border-emerald-500 text-emerald-600' : 
                          client.status === 'onboarding' ? 'border-amber-500 text-amber-600' : ''
                        }
                      >
                        {client.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Shell>
  );
}