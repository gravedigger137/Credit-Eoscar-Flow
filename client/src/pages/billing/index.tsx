import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { CreditCard, Download, Plus, Filter, Search, TrendingUp, DollarSign, ArrowUpRight, CheckCircle2, AlertTriangle, Wallet, Save, Activity, BarChart3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const emptyTxn = { clientId: "", type: "tradeline", description: "", amount: "", status: "completed" };

export default function Billing() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyTxn);
  const [stripeMode, setStripeMode] = useState(true);

  const [usagePeriod, setUsagePeriod] = useState("monthly");
  const { data: transactions = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/transactions"] });
  const { data: clients = [] } = useQuery<any[]>({ queryKey: ["/api/clients"] });
  const { data: usageReport } = useQuery<any>({ queryKey: ["/api/usage/report", usagePeriod], queryFn: async () => { const r = await fetch(`/api/usage/report?period=${usagePeriod}`, { credentials: "include" }); return r.json(); } });

  const clientMap = Object.fromEntries(clients.map((c: any) => [c.id, `${c.firstName} ${c.lastName}`]));

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/transactions", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/transactions"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setOpen(false);
      setForm(emptyTxn);
      toast({ title: "Transaction recorded!" });
    },
    onError: () => toast({ title: "Error recording transaction", variant: "destructive" }),
  });

  const filtered = transactions.filter((t: any) =>
    `${clientMap[t.clientId] ?? ""} ${t.description}`.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = transactions.filter((t: any) => t.status === "completed").reduce((s: number, t: any) => s + t.amount, 0);
  const tradelineRevenue = transactions.filter((t: any) => t.type === "tradeline" && t.status === "completed").reduce((s: number, t: any) => s + t.amount, 0);
  const creditLineRevenue = transactions.filter((t: any) => t.type === "credit_line" && t.status === "completed").reduce((s: number, t: any) => s + t.amount, 0);
  const failedCount = transactions.filter((t: any) => t.status === "failed").length;

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Billing & Revenue</h1>
            <p className="text-muted-foreground mt-1">Track Stripe payments, tradeline sales, and monthly revenue.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-400">
              <Wallet className="w-4 h-4 mr-2" /> Stripe Dashboard ↗
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground">
                  <Plus className="w-4 h-4 mr-2" /> Record Transaction
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Record Transaction</DialogTitle>
                  <DialogDescription>Manually log a payment or offline transaction.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Client</Label>
                    <Select value={form.clientId} onValueChange={v => setForm(f => ({ ...f, clientId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select client..." /></SelectTrigger>
                      <SelectContent>
                        {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Service Type *</Label>
                    <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tradeline">Tradeline Placement</SelectItem>
                        <SelectItem value="credit_line">Credit Builder / Revolving Line</SelectItem>
                        <SelectItem value="retainer">Monthly Retainer / Credit Repair</SelectItem>
                        <SelectItem value="report">Credit Report Pull</SelectItem>
                        <SelectItem value="consultation">Consultation Fee</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Description *</Label>
                    <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Chase Sapphire tradeline placement" />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (in cents) *</Label>
                    <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="85000 = $850.00" />
                    {form.amount && <p className="text-xs text-muted-foreground">= ${(parseInt(form.amount) / 100).toFixed(2)}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button
                    onClick={() => createMutation.mutate({ ...form, amount: parseInt(form.amount), paidAt: form.status === "completed" ? new Date().toISOString() : undefined })}
                    disabled={createMutation.isPending || !form.description || !form.amount}
                  >
                    {createMutation.isPending ? "Saving..." : "Record Transaction"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="glass-panel border-l-4 border-l-success">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><DollarSign className="w-4 h-4 text-success" />Total Revenue</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">${(totalRevenue / 100).toFixed(2)}</div><p className="text-xs text-muted-foreground mt-1">All completed transactions</p></CardContent>
          </Card>
          <Card className="glass-panel border-l-4 border-l-indigo-500">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><CreditCard className="w-4 h-4 text-indigo-500" />Tradeline Sales</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">${(tradelineRevenue / 100).toFixed(2)}</div></CardContent>
          </Card>
          <Card className="glass-panel border-l-4 border-l-emerald-500">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" />Credit Line Revenue</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">${(creditLineRevenue / 100).toFixed(2)}</div></CardContent>
          </Card>
          <Card className="glass-panel border-l-4 border-l-destructive">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-destructive" />Failed Payments</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{failedCount}</div><p className="text-xs text-destructive mt-1">Requires follow-up</p></CardContent>
          </Card>
        </div>

        <Tabs defaultValue="transactions" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="usage" data-testid="tab-usage"><Activity className="w-3 h-3 mr-1" /> Usage</TabsTrigger>
            <TabsTrigger value="stripe">Stripe</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
          </TabsList>
          
          <TabsContent value="transactions" className="mt-6">
            <Card className="glass-panel">
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div><CardTitle>Transaction Ledger</CardTitle><CardDescription>All recorded and Stripe-synced payments.</CardDescription></div>
                  <div className="relative sm:w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search..." className="pl-8 bg-background" value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-10 text-muted-foreground">Loading transactions...</div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No transactions yet. Record your first payment above.</p>
                  </div>
                ) : (
                  <div className="rounded-md border bg-background/50">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((t: any) => (
                          <TableRow key={t.id}>
                            <TableCell className="text-xs">{t.createdAt ? format(new Date(t.createdAt), "MMM d, yyyy") : "—"}</TableCell>
                            <TableCell className="font-medium">{clientMap[t.clientId] ?? "General"}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{t.description}</TableCell>
                            <TableCell><Badge variant="outline" className="capitalize text-xs">{t.type?.replace("_", " ")}</Badge></TableCell>
                            <TableCell className="font-bold">${(t.amount / 100).toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge variant={t.status === "completed" ? "default" : t.status === "failed" ? "destructive" : "secondary"}
                                className={t.status === "completed" ? "bg-success hover:bg-success/90" : ""}>
                                {t.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="usage" className="mt-6">
            <Card className="glass-panel">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Usage Metering</CardTitle><CardDescription>Track billable events across all services</CardDescription></div>
                  <Select value={usagePeriod} onValueChange={setUsagePeriod}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Today</SelectItem>
                      <SelectItem value="weekly">This Week</SelectItem>
                      <SelectItem value="monthly">This Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {usageReport ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="bg-muted/50 rounded-lg p-4 text-center">
                        <div className="text-sm text-muted-foreground">Total Events</div>
                        <div className="text-2xl font-bold" data-testid="text-total-events">{usageReport.totalEvents}</div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-4 text-center">
                        <div className="text-sm text-muted-foreground">Estimated Cost</div>
                        <div className="text-2xl font-bold text-primary">${(usageReport.estimatedCost / 100).toFixed(2)}</div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-4 text-center">
                        <div className="text-sm text-muted-foreground">Event Types</div>
                        <div className="text-2xl font-bold">{usageReport.events.length}</div>
                      </div>
                    </div>
                    {usageReport.breakdown.length > 0 ? (
                      <Table>
                        <TableHeader><TableRow>
                          <TableHead>Event Type</TableHead>
                          <TableHead>Count</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                          {usageReport.breakdown.map((b: any) => (
                            <TableRow key={b.eventType}>
                              <TableCell className="font-medium">{b.eventType.replace(/_/g, " ")}</TableCell>
                              <TableCell>{b.count}</TableCell>
                              <TableCell>${(b.unitPrice / 100).toFixed(2)}</TableCell>
                              <TableCell className="font-bold">${(b.total / 100).toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="py-8 text-center text-muted-foreground">No usage events recorded for this period</div>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">Loading usage data...</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stripe" className="mt-6">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-indigo-500" />Stripe API Configuration</CardTitle>
                <CardDescription>Enter your Stripe keys to enable live payment processing and webhooks.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Publishable Key</Label>
                  <Input placeholder="pk_live_..." />
                </div>
                <div className="space-y-2">
                  <Label>Secret Key</Label>
                  <Input type="password" placeholder="sk_live_..." />
                </div>
                <div className="space-y-2">
                  <Label>Webhook Secret</Label>
                  <Input type="password" placeholder="whsec_..." />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                  <div><Label className="text-base">Live Mode</Label><p className="text-sm text-muted-foreground">Toggle off to use test mode.</p></div>
                  <Switch checked={stripeMode} onCheckedChange={setStripeMode} />
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/50 px-6 py-4">
                <Button><Save className="w-4 h-4 mr-2" />Save Stripe Config</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="payouts" className="mt-6">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Cardholder Payouts</CardTitle>
                <CardDescription>Track payments made to authorized-user cardholders for tradeline services.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-10 text-muted-foreground">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>Payout records will appear here once tradelines are marked active.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Shell>
  );
}