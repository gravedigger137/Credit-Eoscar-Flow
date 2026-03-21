import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, CreditCard, FileText, CheckCircle2, AlertTriangle, MessageSquare, Trash2, Mail, Phone } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const NOTIFICATIONS = [
  {
    id: "NOT-001",
    type: "Dispute Update",
    title: "Validation Received - Experian",
    message: "Experian has responded to the dispute for client Amanda Smith (Account: Capital One XXXX).",
    time: "10 mins ago",
    status: "unread",
    icon: FileText,
    color: "text-blue-500",
    bg: "bg-blue-100 dark:bg-blue-900",
  },
  {
    id: "NOT-002",
    type: "Billing",
    title: "New Payment Received",
    message: "Payment of $850.00 received from Sarah Jenkins for Tradeline Placement (Chase Sapphire).",
    time: "1 hour ago",
    status: "unread",
    icon: CreditCard,
    color: "text-success",
    bg: "bg-success/20",
  },
  {
    id: "NOT-003",
    type: "Client Action",
    title: "Client Message",
    message: "Michael Chang has sent a new message regarding his recent Equifax report.",
    time: "2 hours ago",
    status: "read",
    icon: MessageSquare,
    color: "text-purple-500",
    bg: "bg-purple-100 dark:bg-purple-900",
  },
  {
    id: "NOT-004",
    type: "Compliance",
    title: "FCRA Update Required",
    message: "System notification: Please review the updated FCRA letter templates for Q4 compliance.",
    time: "1 day ago",
    status: "read",
    icon: AlertTriangle,
    color: "text-warning",
    bg: "bg-warning/20",
  },
  {
    id: "NOT-005",
    type: "Success",
    title: "Item Deleted",
    message: "Great news! A collection account was successfully removed from David Roberts' TransUnion report.",
    time: "1 day ago",
    status: "read",
    icon: CheckCircle2,
    color: "text-success",
    bg: "bg-success/20",
  }
];

export default function Notifications() {
  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System Inbox</h1>
            <p className="text-muted-foreground mt-1">
              Centralized communication and alerts for your staff and receptionist.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Mark All Read
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Card className="glass-panel">
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Notifications Feed
                  </CardTitle>
                  <Tabs defaultValue="all" className="w-[300px]">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="unread">Unread</TabsTrigger>
                      <TabsTrigger value="alerts">Alerts</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  <div className="divide-y divide-border/50">
                    {NOTIFICATIONS.map((notif) => (
                      <div 
                        key={notif.id} 
                        className={`p-4 sm:px-6 transition-colors hover:bg-muted/50 ${notif.status === 'unread' ? 'bg-primary/5' : ''}`}
                      >
                        <div className="flex gap-4">
                          <div className={`mt-1 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${notif.bg}`}>
                            <notif.icon className={`w-5 h-5 ${notif.color}`} />
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium">
                                  {notif.title}
                                  {notif.status === 'unread' && (
                                    <span className="ml-2 inline-block w-2 h-2 rounded-full bg-primary" />
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground font-medium">{notif.type}</p>
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">{notif.time}</span>
                            </div>
                            <p className="text-sm text-muted-foreground pt-1">
                              {notif.message}
                            </p>
                            <div className="flex gap-2 pt-2">
                              <Button variant="outline" size="sm" className="h-7 text-xs">View Details</Button>
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-destructive">
                                <Trash2 className="w-3 h-3 mr-1" />
                                Dismiss
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="text-lg">Staff Directory</CardTitle>
                <CardDescription>Quick routing for calls and emails.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-background/50">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                    RE
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Receptionist (Front Desk)</p>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3"/> Ext. 101</span>
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3"/> info@...</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg border bg-background/50">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center font-bold text-indigo-500">
                    JD
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">John Doe (Owner)</p>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3"/> Ext. 100</span>
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3"/> owner@...</span>
                    </div>
                  </div>
                </div>

                 <div className="flex items-center gap-3 p-3 rounded-lg border bg-background/50">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center font-bold text-emerald-500">
                    AS
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Billing Dept.</p>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3"/> Ext. 102</span>
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3"/> billing@...</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <Bell className="w-4 h-4" />
                  Routing Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-4">
                  Current routing settings for incoming automated emails and dispute responses.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-border/50 pb-1">
                    <span>New Client Leads</span>
                    <span className="font-medium">Receptionist</span>
                  </div>
                  <div className="flex justify-between border-b border-border/50 pb-1">
                    <span>Dispute Updates</span>
                    <span className="font-medium">Owner</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Billing/Payments</span>
                    <span className="font-medium">Billing Dept.</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Shell>
  );
}