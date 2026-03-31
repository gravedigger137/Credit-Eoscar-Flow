import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import {
  Landmark, DollarSign, ArrowUpRight, ArrowDownRight, ShieldCheck,
  AlertTriangle, BookOpen, RefreshCw, Plus, CheckCircle2, Receipt,
  TrendingUp, BarChart3, FileText, Calculator, Printer, Download,
  PieChart, CreditCard, Users, Building, Clock, Wallet, Scale,
  Crown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { AdminBypassBanner } from "@/components/admin-bypass-banner";

export default function TrustAccounting() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [withdrawCategory, setWithdrawCategory] = useState("trust_withdrawal");
  const [invoiceItems, setInvoiceItems] = useState([{ description: "Credit Repair Monthly Service", amount: "99.99", quantity: "1" }]);
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [generatedInvoice, setGeneratedInvoice] = useState<any>(null);

  const { data: accounts = [] } = useQuery<any[]>({ queryKey: ["/api/trust-accounts"] });
  const { data: summary } = useQuery<any>({ queryKey: ["/api/trust-accounts/summary"] });
  const { data: ledger = [] } = useQuery<any[]>({ queryKey: ["/api/ledger"] });
  const { data: clients = [] } = useQuery<any[]>({ queryKey: ["/api/clients"] });
  const { data: reconciliation } = useQuery<any>({ queryKey: ["/api/trust-accounts/reconcile"] });
  const { data: chartOfAccounts } = useQuery<any>({ queryKey: ["/api/trust-accounts/chart-of-accounts"] });
  const { data: profitLoss } = useQuery<any>({ queryKey: ["/api/trust-accounts/profit-loss"], enabled: false });

  const depositMutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", `/api/trust-accounts/${selectedClient}/deposit`, {
        amount: Math.round(parseFloat(amount) * 100),
        description: description || "Client trust deposit",
      });
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/trust-accounts"] });
      qc.invalidateQueries({ queryKey: ["/api/trust-accounts/summary"] });
      qc.invalidateQueries({ queryKey: ["/api/ledger"] });
      qc.invalidateQueries({ queryKey: ["/api/trust-accounts/reconcile"] });
      setDepositOpen(false);
      setAmount("");
      setDescription("");
      toast({ title: "Deposit Recorded", description: `$${parseFloat(amount).toFixed(2)} deposited to trust account` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", `/api/trust-accounts/${selectedClient}/withdraw`, {
        amount: Math.round(parseFloat(amount) * 100),
        description: description || "Trust withdrawal",
        category: withdrawCategory,
      });
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/trust-accounts"] });
      qc.invalidateQueries({ queryKey: ["/api/trust-accounts/summary"] });
      qc.invalidateQueries({ queryKey: ["/api/ledger"] });
      qc.invalidateQueries({ queryKey: ["/api/trust-accounts/reconcile"] });
      setWithdrawOpen(false);
      setAmount("");
      setDescription("");
      toast({ title: "Withdrawal Recorded" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const invoiceMutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/trust-accounts/invoice", {
        clientId: selectedClient,
        items: invoiceItems.map(i => ({
          description: i.description,
          amount: parseFloat(i.amount) || 0,
          quantity: parseInt(i.quantity) || 1,
        })),
        notes: invoiceNotes,
      });
      return r.json();
    },
    onSuccess: (data) => {
      setGeneratedInvoice(data);
      toast({ title: "Invoice Generated", description: `Invoice ${data.invoiceNumber} created` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const plMutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/trust-accounts/profit-loss");
      return r.json();
    },
    onSuccess: (data) => {
      qc.setQueryData(["/api/trust-accounts/profit-loss"], data);
      toast({ title: "P&L Report Generated" });
    },
  });

  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const fmtK = (cents: number) => {
    const d = cents / 100;
    return d >= 1000 ? `$${(d / 1000).toFixed(1)}k` : `$${d.toFixed(2)}`;
  };

  const totalDeposits = ledger.filter((e: any) => e.type === "credit").reduce((s: number, e: any) => s + e.amount, 0);
  const totalWithdrawals = ledger.filter((e: any) => e.type === "debit").reduce((s: number, e: any) => s + e.amount, 0);

  return (
    <Shell title="Trust Accounting" subtitle="QuickBooks-style trust fund management, invoicing, chart of accounts, P&L, and reconciliation">
      <div className="space-y-4">
        <AdminBypassBanner configKey="admin_bypass_billing_holds" label="Billing holds bypassed — all transactions processed without balance checks" />

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid grid-cols-6 w-full max-w-3xl">
            <TabsTrigger value="dashboard" data-testid="tab-trust-dashboard"><BarChart3 className="w-4 h-4 mr-1" /> Dashboard</TabsTrigger>
            <TabsTrigger value="accounts" data-testid="tab-trust-accounts"><Landmark className="w-4 h-4 mr-1" /> Accounts</TabsTrigger>
            <TabsTrigger value="ledger" data-testid="tab-ledger"><BookOpen className="w-4 h-4 mr-1" /> Ledger</TabsTrigger>
            <TabsTrigger value="invoicing" data-testid="tab-invoicing"><Receipt className="w-4 h-4 mr-1" /> Invoicing</TabsTrigger>
            <TabsTrigger value="chart" data-testid="tab-chart-of-accounts"><PieChart className="w-4 h-4 mr-1" /> Chart</TabsTrigger>
            <TabsTrigger value="reconcile" data-testid="tab-reconcile"><ShieldCheck className="w-4 h-4 mr-1" /> Reconcile</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                { label: "Trust Funds", value: summary ? fmt(summary.totalTrustFunds) : "$0.00", icon: Landmark, color: "text-blue-500", bg: "bg-blue-500/10" },
                { label: "Revenue", value: summary ? fmt(summary.totalRevenue) : "$0.00", icon: TrendingUp, color: "text-green-500", bg: "bg-green-500/10" },
                { label: "Expenses", value: summary ? fmt(summary.totalExpenses) : "$0.00", icon: ArrowDownRight, color: "text-red-500", bg: "bg-red-500/10" },
                { label: "Net Income", value: summary ? fmt(summary.netIncome) : "$0.00", icon: ArrowUpRight, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                { label: "Active Accounts", value: accounts.length.toString(), icon: Users, color: "text-indigo-500", bg: "bg-indigo-500/10" },
                { label: "Transactions", value: ledger.length.toString(), icon: BookOpen, color: "text-purple-500", bg: "bg-purple-500/10" },
              ].map((s) => (
                <Card key={s.label}>
                  <CardContent className="pt-5 pb-4">
                    <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
                      <s.icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                    <div className="text-2xl font-bold" data-testid={`text-${s.label.toLowerCase().replace(/\s/g, "-")}`}>{s.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Scale className="w-5 h-5" /> Profit & Loss Statement</CardTitle>
                  <CardDescription>Financial performance overview</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button onClick={() => plMutation.mutate()} disabled={plMutation.isPending} variant="outline" className="w-full" data-testid="btn-generate-pl">
                    <Calculator className="w-4 h-4 mr-2" />
                    {plMutation.isPending ? "Generating..." : "Generate P&L Report"}
                  </Button>
                  {profitLoss && (
                    <div className="space-y-3 pt-4 border-t">
                      <div className="space-y-2">
                        <div className="text-sm font-semibold text-green-500">REVENUE</div>
                        <div className="flex justify-between text-sm"><span>Service Fees</span><span className="font-medium">{fmt(profitLoss.revenue.serviceFees)}</span></div>
                        <div className="flex justify-between text-sm"><span>Partner Payouts</span><span className="font-medium">{fmt(profitLoss.revenue.partnerPayouts)}</span></div>
                        <div className="flex justify-between text-sm font-bold border-t pt-2"><span>Total Revenue</span><span className="text-green-500">{fmt(profitLoss.revenue.totalRevenue)}</span></div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm font-semibold text-red-500">EXPENSES</div>
                        <div className="flex justify-between text-sm"><span>Bureau Fees</span><span className="font-medium">{fmt(profitLoss.expenses.bureauFees)}</span></div>
                        <div className="flex justify-between text-sm"><span>Refunds</span><span className="font-medium">{fmt(profitLoss.expenses.refunds)}</span></div>
                        <div className="flex justify-between text-sm font-bold border-t pt-2"><span>Total Expenses</span><span className="text-red-500">{fmt(profitLoss.expenses.totalExpenses)}</span></div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-4 text-center">
                        <div className="text-sm text-muted-foreground">Net Income</div>
                        <div className={`text-3xl font-bold ${profitLoss.netIncome >= 0 ? "text-green-500" : "text-red-500"}`}>{fmt(profitLoss.netIncome)}</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" /> Recent Activity</CardTitle>
                  <CardDescription>Last 10 transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  {ledger.length > 0 ? (
                    <div className="space-y-2">
                      {ledger.slice(0, 10).map((entry: any) => (
                        <div key={entry.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${entry.type === "credit" ? "bg-green-500/10" : "bg-red-500/10"}`}>
                              {entry.type === "credit" ? <ArrowUpRight className="w-4 h-4 text-green-500" /> : <ArrowDownRight className="w-4 h-4 text-red-500" />}
                            </div>
                            <div>
                              <div className="text-sm font-medium">{entry.description}</div>
                              <div className="text-xs text-muted-foreground">{entry.category.replace(/_/g, " ")}</div>
                            </div>
                          </div>
                          <div className={`font-semibold ${entry.type === "credit" ? "text-green-500" : "text-red-500"}`}>
                            {entry.type === "credit" ? "+" : "-"}{fmt(entry.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">No transactions yet</div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-3">
              <Button onClick={() => setDepositOpen(true)} data-testid="btn-deposit"><Plus className="w-4 h-4 mr-1" /> Record Deposit</Button>
              <Button variant="outline" onClick={() => setWithdrawOpen(true)} data-testid="btn-withdraw"><ArrowDownRight className="w-4 h-4 mr-1" /> Record Withdrawal</Button>
              <Button variant="outline" onClick={() => setInvoiceOpen(true)} data-testid="btn-create-invoice"><Receipt className="w-4 h-4 mr-1" /> Create Invoice</Button>
            </div>
          </TabsContent>

          <TabsContent value="accounts" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Landmark className="w-4 h-4" /> Total Trust Funds</div>
                  <div className="text-2xl font-bold" data-testid="text-total-trust">{summary ? fmt(summary.totalTrustFunds) : "$0.00"}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><DollarSign className="w-4 h-4" /> Total Revenue</div>
                  <div className="text-2xl font-bold text-green-500">{summary ? fmt(summary.totalRevenue) : "$0.00"}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><ArrowDownRight className="w-4 h-4" /> Total Expenses</div>
                  <div className="text-2xl font-bold text-red-500">{summary ? fmt(summary.totalExpenses) : "$0.00"}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><ArrowUpRight className="w-4 h-4" /> Net Income</div>
                  <div className="text-2xl font-bold">{summary ? fmt(summary.netIncome) : "$0.00"}</div>
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setDepositOpen(true)} data-testid="btn-deposit-accts"><Plus className="w-4 h-4 mr-1" /> Record Deposit</Button>
              <Button variant="outline" onClick={() => setWithdrawOpen(true)} data-testid="btn-withdraw-accts"><ArrowDownRight className="w-4 h-4 mr-1" /> Record Withdrawal</Button>
            </div>

            {accounts.length > 0 ? (
              <Card>
                <CardHeader><CardTitle>Client Trust Accounts</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Trust Balance</TableHead>
                        <TableHead>Total Deposits</TableHead>
                        <TableHead>Total Fees</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Activity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accounts.map((acct: any) => (
                        <TableRow key={acct.clientId} data-testid={`row-trust-${acct.clientId}`}>
                          <TableCell className="font-medium">{acct.clientName}</TableCell>
                          <TableCell className={acct.trustBalance < 0 ? "text-red-500 font-bold" : "font-bold"}>{fmt(acct.trustBalance)}</TableCell>
                          <TableCell className="text-green-500">{fmt(acct.totalDeposits)}</TableCell>
                          <TableCell className="text-muted-foreground">{fmt(acct.totalFees)}</TableCell>
                          <TableCell>
                            <Badge variant={acct.status === "active" ? "default" : acct.status === "frozen" ? "destructive" : "secondary"}>
                              {acct.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {acct.lastActivity ? new Date(acct.lastActivity).toLocaleDateString() : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Landmark className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No trust accounts yet. Record a deposit to create a client trust account.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="ledger" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5" /> General Ledger</CardTitle>
                <CardDescription>Double-entry transaction log — all trust account activity with debit/credit tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-500/10 rounded-lg p-4 text-center">
                    <div className="text-sm text-muted-foreground">Total Credits</div>
                    <div className="text-xl font-bold text-green-500">{fmt(totalDeposits)}</div>
                  </div>
                  <div className="bg-red-500/10 rounded-lg p-4 text-center">
                    <div className="text-sm text-muted-foreground">Total Debits</div>
                    <div className="text-xl font-bold text-red-500">{fmt(totalWithdrawals)}</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <div className="text-sm text-muted-foreground">Running Balance</div>
                    <div className="text-xl font-bold">{fmt(totalDeposits - totalWithdrawals)}</div>
                  </div>
                </div>
                {ledger.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Debit</TableHead>
                        <TableHead>Credit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledger.map((entry: any) => (
                        <TableRow key={entry.id}>
                          <TableCell className="text-sm text-muted-foreground">
                            {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={entry.type === "credit" ? "default" : "outline"} className="text-xs">
                              {entry.type === "credit" ? "CR" : "DR"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm capitalize">{entry.category.replace(/_/g, " ")}</TableCell>
                          <TableCell className="text-sm">{entry.description}</TableCell>
                          <TableCell className="text-red-500 font-medium">{entry.type === "debit" ? fmt(entry.amount) : ""}</TableCell>
                          <TableCell className="text-green-500 font-medium">{entry.type === "credit" ? fmt(entry.amount) : ""}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">No ledger entries yet</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoicing" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Receipt className="w-5 h-5" /> Create Invoice</CardTitle>
                  <CardDescription>Generate professional invoices for credit repair services</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Client</Label>
                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                      <SelectTrigger data-testid="select-invoice-client"><SelectValue placeholder="Select client" /></SelectTrigger>
                      <SelectContent>
                        {clients.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label>Line Items</Label>
                    {invoiceItems.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-5">
                          <Input
                            placeholder="Description"
                            value={item.description}
                            onChange={e => {
                              const items = [...invoiceItems];
                              items[idx].description = e.target.value;
                              setInvoiceItems(items);
                            }}
                          />
                        </div>
                        <div className="col-span-3">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Amount"
                            value={item.amount}
                            onChange={e => {
                              const items = [...invoiceItems];
                              items[idx].amount = e.target.value;
                              setInvoiceItems(items);
                            }}
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={e => {
                              const items = [...invoiceItems];
                              items[idx].quantity = e.target.value;
                              setInvoiceItems(items);
                            }}
                          />
                        </div>
                        <div className="col-span-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500"
                            onClick={() => setInvoiceItems(invoiceItems.filter((_, i) => i !== idx))}
                            disabled={invoiceItems.length === 1}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => setInvoiceItems([...invoiceItems, { description: "", amount: "", quantity: "1" }])}>
                      <Plus className="w-3 h-3 mr-1" /> Add Line Item
                    </Button>
                  </div>

                  <div>
                    <Label>Notes</Label>
                    <Textarea value={invoiceNotes} onChange={e => setInvoiceNotes(e.target.value)} placeholder="Payment terms, notes..." rows={2} />
                  </div>

                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>${invoiceItems.reduce((s, i) => s + (parseFloat(i.amount) || 0) * (parseInt(i.quantity) || 1), 0).toFixed(2)}</span>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => invoiceMutation.mutate()}
                    disabled={!selectedClient || invoiceMutation.isPending}
                    data-testid="btn-generate-invoice"
                  >
                    <Receipt className="w-4 h-4 mr-2" />
                    {invoiceMutation.isPending ? "Generating..." : "Generate Invoice"}
                  </Button>
                </CardContent>
              </Card>

              {generatedInvoice ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> Invoice {generatedInvoice.invoiceNumber}</CardTitle>
                    <CardDescription>Generated {new Date(generatedInvoice.createdAt).toLocaleDateString()}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-muted/30 rounded-lg p-4 space-y-3 border">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-lg">{generatedInvoice.companyName}</div>
                          <div className="text-sm text-muted-foreground">{generatedInvoice.companyAddress}</div>
                          <div className="text-sm text-muted-foreground">{generatedInvoice.companyPhone}</div>
                          <div className="text-sm text-muted-foreground">{generatedInvoice.companyEmail}</div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-lg px-3 py-1">{generatedInvoice.invoiceNumber}</Badge>
                          <div className="text-sm text-muted-foreground mt-2">Due: {new Date(generatedInvoice.dueDate).toLocaleDateString()}</div>
                        </div>
                      </div>

                      <div className="border-t pt-3">
                        <div className="text-sm text-muted-foreground">Bill To:</div>
                        <div className="font-medium">{generatedInvoice.clientName}</div>
                        {generatedInvoice.clientEmail && <div className="text-sm">{generatedInvoice.clientEmail}</div>}
                      </div>

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {generatedInvoice.items.map((item: any, i: number) => (
                            <TableRow key={i}>
                              <TableCell>{item.description}</TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right">${(item.unitPrice / 100).toFixed(2)}</TableCell>
                              <TableCell className="text-right font-medium">${(item.total / 100).toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      <div className="border-t pt-3 text-right space-y-1">
                        <div className="flex justify-end gap-8"><span className="text-muted-foreground">Subtotal:</span><span>${(generatedInvoice.subtotal / 100).toFixed(2)}</span></div>
                        <div className="flex justify-end gap-8"><span className="text-muted-foreground">Tax:</span><span>$0.00</span></div>
                        <div className="flex justify-end gap-8 text-lg font-bold"><span>Total:</span><span>${(generatedInvoice.total / 100).toFixed(2)}</span></div>
                      </div>

                      {generatedInvoice.notes && (
                        <div className="border-t pt-3">
                          <div className="text-sm text-muted-foreground">Notes:</div>
                          <div className="text-sm">{generatedInvoice.notes}</div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => window.print()} data-testid="btn-print-invoice">
                        <Printer className="w-4 h-4 mr-1" /> Print
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="flex items-center justify-center min-h-[300px]">
                  <div className="text-center text-muted-foreground">
                    <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No Invoice Generated</p>
                    <p className="text-sm">Select a client and add items to create an invoice</p>
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="chart" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><PieChart className="w-5 h-5" /> Chart of Accounts</CardTitle>
                <CardDescription>Standard chart of accounts for credit repair trust accounting — modeled after QuickBooks/Quicken categories</CardDescription>
              </CardHeader>
              <CardContent>
                {chartOfAccounts ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {Object.entries(chartOfAccounts).filter(([, v]) => Array.isArray(v)).map(([section, accts]: [string, any]) => (
                      <div key={section}>
                        <div className="flex items-center gap-2 mb-3">
                          {section === "assets" && <Wallet className="w-4 h-4 text-blue-500" />}
                          {section === "liabilities" && <CreditCard className="w-4 h-4 text-red-500" />}
                          {section === "revenue" && <TrendingUp className="w-4 h-4 text-green-500" />}
                          {section === "expenses" && <ArrowDownRight className="w-4 h-4 text-orange-500" />}
                          <span className="font-semibold capitalize text-sm">{section}</span>
                        </div>
                        <div className="space-y-2">
                          {(accts || []).map((acct: any) => (
                            <div key={acct.code} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                              <Badge variant="outline" className="font-mono text-xs mt-0.5">{acct.code}</Badge>
                              <div>
                                <div className="text-sm font-medium">{acct.name}</div>
                                <div className="text-xs text-muted-foreground">{acct.description}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">Loading chart of accounts...</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reconcile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> Trust Account Reconciliation</CardTitle>
                <CardDescription>Verify trust fund integrity, identify discrepancies, and ensure compliance with state trust accounting rules</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {reconciliation ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted/50 rounded-lg p-4 text-center">
                        <div className="text-sm text-muted-foreground mb-1">Total Trust Held</div>
                        <div className="text-3xl font-bold" data-testid="text-reconcile-total">{fmt(reconciliation.totalTrust)}</div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-4 text-center">
                        <div className="text-sm text-muted-foreground mb-1">Active Accounts</div>
                        <div className="text-3xl font-bold">{reconciliation.accountCount}</div>
                      </div>
                    </div>
                    {reconciliation.discrepancies.length === 0 ? (
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-center gap-3">
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                        <div>
                          <div className="font-medium text-green-500">All Clear</div>
                          <div className="text-sm text-muted-foreground">No discrepancies found. All trust accounts balance correctly.</div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-red-500 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" /> {reconciliation.discrepancies.length} Discrepancy(ies) Found
                        </div>
                        {reconciliation.discrepancies.map((d: string, i: number) => (
                          <div key={i} className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm">{d}</div>
                        ))}
                      </div>
                    )}
                    <Button variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ["/api/trust-accounts/reconcile"] })} data-testid="btn-re-reconcile">
                      <RefreshCw className="w-4 h-4 mr-1" /> Re-Reconcile
                    </Button>
                  </>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">Loading reconciliation data...</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Trust Deposit</DialogTitle>
            <DialogDescription>Record a client payment into their trust account</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Client</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger data-testid="select-deposit-client"><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Amount ($)</Label><Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} data-testid="input-deposit-amount" /></div>
            <div><Label>Description</Label><Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Client trust deposit" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepositOpen(false)}>Cancel</Button>
            <Button onClick={() => depositMutation.mutate()} disabled={!selectedClient || !amount || depositMutation.isPending} data-testid="btn-confirm-deposit">
              {depositMutation.isPending ? "Recording..." : "Record Deposit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Trust Withdrawal</DialogTitle>
            <DialogDescription>Withdraw from a client trust account (service fees, bureau fees, refunds)</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Client</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger data-testid="select-withdraw-client"><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Amount ($)</Label><Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} data-testid="input-withdraw-amount" /></div>
            <div>
              <Label>Category</Label>
              <Select value={withdrawCategory} onValueChange={setWithdrawCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="trust_withdrawal">Trust Withdrawal</SelectItem>
                  <SelectItem value="service_fee">Service Fee</SelectItem>
                  <SelectItem value="bureau_fee">Bureau Fee</SelectItem>
                  <SelectItem value="partner_payout">Partner Payout</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawOpen(false)}>Cancel</Button>
            <Button onClick={() => withdrawMutation.mutate()} disabled={!selectedClient || !amount || withdrawMutation.isPending} data-testid="btn-confirm-withdraw">
              {withdrawMutation.isPending ? "Recording..." : "Record Withdrawal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
