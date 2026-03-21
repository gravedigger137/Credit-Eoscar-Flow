import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Bell, CreditCard, FileText, CheckCircle2, AlertTriangle, MessageSquare, Trash2, Mail, Phone } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const ICON_MAP: Record<string, any> = {
  dispute: FileText,
  billing: CreditCard,
  client: MessageSquare,
  compliance: AlertTriangle,
  success: CheckCircle2,
  warning: AlertTriangle,
};
const BG_MAP: Record<string, string> = {
  dispute: "bg-blue-100 dark:bg-blue-900",
  billing: "bg-emerald-100 dark:bg-emerald-900",
  client: "bg-purple-100 dark:bg-purple-900",
  compliance: "bg-amber-100 dark:bg-amber-900",
  success: "bg-emerald-100 dark:bg-emerald-900",
  warning: "bg-amber-100 dark:bg-amber-900",
};
const COLOR_MAP: Record<string, string> = {
  dispute: "text-blue-500",
  billing: "text-emerald-500",
  client: "text-purple-500",
  compliance: "text-amber-500",
  success: "text-emerald-500",
  warning: "text-amber-500",
};

export default function Notifications() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: notifications = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/notifications"] });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/notifications/${id}/read`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/notifications"] }); },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/notifications/mark-all-read"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "All notifications marked as read." });
    },
  });

  const unread = notifications.filter((n: any) => !n.read).length;

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System Inbox</h1>
            <p className="text-muted-foreground mt-1">Centralized communication and alerts for you and your staff.</p>
          </div>
          <div className="flex gap-2">
            {unread > 0 && (
              <Button variant="outline" onClick={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending}>
                <CheckCircle2 className="w-4 h-4 mr-2" /> Mark All Read ({unread})
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <Card className="glass-panel">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="w-5 h-5" /> Notifications Feed
                  {unread > 0 && <Badge className="bg-primary hover:bg-primary rounded-full h-5 min-w-5 px-1 text-[10px]">{unread}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  {isLoading ? (
                    <div className="text-center py-10 text-muted-foreground">Loading...</div>
                  ) : notifications.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>No notifications yet. They'll appear here automatically.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/50">
                      {notifications.map((notif: any) => {
                        const Icon = ICON_MAP[notif.type] ?? Bell;
                        return (
                          <div key={notif.id} className={`p-4 sm:px-6 transition-colors hover:bg-muted/30 ${!notif.read ? 'bg-primary/5' : ''}`}>
                            <div className="flex gap-4">
                              <div className={`mt-1 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${BG_MAP[notif.type] ?? 'bg-muted'}`}>
                                <Icon className={`w-5 h-5 ${COLOR_MAP[notif.type] ?? 'text-foreground'}`} />
                              </div>
                              <div className="flex-1 space-y-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="text-sm font-medium">
                                      {notif.title}
                                      {!notif.read && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-primary" />}
                                    </p>
                                    <p className="text-xs text-muted-foreground font-medium capitalize">{notif.type}</p>
                                  </div>
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {notif.createdAt ? format(new Date(notif.createdAt), "MMM d, h:mm a") : ""}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground">{notif.message}</p>
                                {!notif.read && (
                                  <Button variant="ghost" size="sm" className="h-7 text-xs mt-1" onClick={() => markReadMutation.mutate(notif.id)}>
                                    Mark as read
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="text-lg">Staff Directory</CardTitle>
                <CardDescription>Quick routing for calls and notifications.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { initials: "ME", label: "Owner / You", role: "All critical alerts", color: "bg-primary/20 text-primary" },
                  { initials: "RE", label: "Receptionist", role: "New leads & inquiries", color: "bg-emerald-500/20 text-emerald-600" },
                  { initials: "BL", label: "Billing Dept.", role: "Payments & failed charges", color: "bg-indigo-500/20 text-indigo-600" },
                ].map((staff, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-background/50">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${staff.color}`}>
                      {staff.initials}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{staff.label}</p>
                      <p className="text-xs text-muted-foreground">{staff.role}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="glass-panel border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <Bell className="w-4 h-4" /> Alert Routing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-border/50 pb-1"><span>New Clients</span><span className="font-medium">Receptionist</span></div>
                  <div className="flex justify-between border-b border-border/50 pb-1"><span>Dispute Updates</span><span className="font-medium">Owner</span></div>
                  <div className="flex justify-between border-b border-border/50 pb-1"><span>Payment Alerts</span><span className="font-medium">Billing Dept.</span></div>
                  <div className="flex justify-between"><span>Compliance</span><span className="font-medium">Owner</span></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Shell>
  );
}