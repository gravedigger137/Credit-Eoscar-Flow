import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Users, FileText, AlertTriangle, CheckCircle2, TrendingUp, Clock, CreditCard, Wallet } from "lucide-react";

export default function Dashboard() {
  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your credit repair operations, tradelines, and credit building.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="glass-panel border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Clients</CardTitle>
              <Users className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">142</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-success" />
                <span className="text-success font-medium">+12%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card className="glass-panel border-l-4 border-l-warning">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Disputes</CardTitle>
              <FileText className="w-4 h-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">87</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>34 waiting on bureau response</span>
              </p>
            </CardContent>
          </Card>

          <Card className="glass-panel border-l-4 border-l-indigo-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Tradelines</CardTitle>
              <CreditCard className="w-4 h-4 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">56</div>
              <p className="text-xs text-muted-foreground mt-1">
                22 pending assignment
              </p>
            </CardContent>
          </Card>

          <Card className="glass-panel border-l-4 border-l-emerald-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Credit Lines Approved</CardTitle>
              <Wallet className="w-4 h-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">18</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <span className="text-emerald-500 font-medium">This Month</span>
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <Card className="lg:col-span-4 glass-panel">
            <CardHeader>
              <CardTitle>Service Pipeline</CardTitle>
              <CardDescription>
                Current status of client services across all offerings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    e-OSCAR Disputes Processing
                  </span>
                  <span className="text-muted-foreground">87 active</span>
                </div>
                <Progress value={65} className="h-2 bg-blue-100 dark:bg-blue-950" indicatorClassName="bg-blue-500" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-indigo-500" />
                    Tradeline Placements
                  </span>
                  <span className="text-muted-foreground">45 pending</span>
                </div>
                <Progress value={45} className="h-2 bg-indigo-100 dark:bg-indigo-950" indicatorClassName="bg-indigo-500" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-emerald-500" />
                    Revolving Credit Applications
                  </span>
                  <span className="text-muted-foreground">32 processing</span>
                </div>
                <Progress value={30} className="h-2 bg-emerald-100 dark:bg-emerald-950" indicatorClassName="bg-emerald-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3 glass-panel">
            <CardHeader>
              <CardTitle>Recent Client Activity</CardTitle>
              <CardDescription>Latest updates on client files</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "Sarah Jenkins", action: "Tradeline Added (Chase)", time: "2 hours ago", status: "success" },
                  { name: "Michael Chang", action: "Credit Line Approved", time: "4 hours ago", status: "success" },
                  { name: "Amanda Smith", action: "Item Deleted (TransUnion)", time: "5 hours ago", status: "success" },
                  { name: "David Roberts", action: "Tradeline Verification Failed", time: "1 day ago", status: "destructive" },
                  { name: "Jessica Alba", action: "New Client Onboarding", time: "1 day ago", status: "default" },
                ].map((activity, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-border/50 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                        {activity.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{activity.name}</p>
                        <p className="text-xs text-muted-foreground">{activity.action}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-1">{activity.time}</p>
                      <Badge variant={activity.status as any} className="text-[10px] h-4">
                        {activity.status === 'success' ? 'Resolved' : 
                         activity.status === 'warning' ? 'Pending' : 
                         activity.status === 'destructive' ? 'Action Needed' : 'New'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Shell>
  );
}