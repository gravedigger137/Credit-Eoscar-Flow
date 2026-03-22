import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import {
  Landmark, DollarSign, ArrowUpRight, ArrowDownRight, ShieldCheck,
  AlertTriangle, BookOpen, RefreshCw, Plus, CheckCircle2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function TrustAccounting() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [withdrawCategory, setWithdrawCategory] = useState("trust_withdrawal");

  const { data: accounts = [] } = useQuery<any[]>({ queryKey: ["/api/trust-accounts"] });
  const { data: summary } = useQuery<any>({ queryKey: ["/api/trust-accounts/summary"] });
  const { data: ledger = [] } = useQuery<any[]>({ queryKey: ["/api/ledger"] });
  const { data: clients = [] } = useQuery<any[]>({ queryKey: ["/api/clients"] });
  const { data: reconciliation } = useQuery<any>({ queryKey: ["/api/trust-accounts/reconcile"] });

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

  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <Shell title="Trust Accounting" subtitle="Client trust fund management, double-entry ledger, and reconciliation">
      <Tabs defaultValue="accounts" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          <TabsTrigger value="accounts" data-testid="tab-trust-accounts"><Landmark className="w-4 h-4 mr-1" /> Accounts</TabsTrigger>
          <TabsTrigger value="ledger" data-testid="tab-ledger"><BookOpen className="w-4 h-4 mr-1" /> Ledger</TabsTrigger>
          <TabsTrigger value="reconcile" data-testid="tab-reconcile"><ShieldCheck className="w-4 h-4 mr-1" /> Reconcile</TabsTrigger>
        </TabsList>

        {/* ─── TRUST ACCOUNTS ─────────────────────────────────────────────── */}
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
            <Button onClick={() => setDepositOpen(true)} data-testid="btn-deposit"><Plus className="w-4 h-4 mr-1" /> Record Deposit</Button>
            <Button variant="outline" onClick={() => setWithdrawOpen(true)} data-testid="btn-withdraw"><ArrowDownRight className="w-4 h-4 mr-1" /> Record Withdrawal</Button>
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
                        <TableCell className={acct.trustBalance < 0 ? "text-red-500 font-bold" : "font-bold"}>
                          {fmt(acct.trustBalance)}
                        </TableCell>
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

        {/* ─── LEDGER ─────────────────────────────────────────────────────── */}
        <TabsContent value="ledger" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5" /> General Ledger</CardTitle>
              <CardDescription>Double-entry transaction log for all trust account activity</CardDescription>
            </CardHeader>
            <CardContent>
              {ledger.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
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
                        <TableCell className="text-sm">{entry.category.replace(/_/g, " ")}</TableCell>
                        <TableCell className="text-sm">{entry.description}</TableCell>
                        <TableCell className={`font-medium ${entry.type === "credit" ? "text-green-500" : "text-red-500"}`}>
                          {entry.type === "credit" ? "+" : "-"}{fmt(entry.amount)}
                        </TableCell>
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

        {/* ─── RECONCILIATION ─────────────────────────────────────────────── */}
        <TabsContent value="reconcile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> Trust Account Reconciliation</CardTitle>
              <CardDescription>Verify trust fund integrity and identify discrepancies</CardDescription>
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
                        <div key={i} className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm">
                          {d}
                        </div>
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

      {/* Deposit Dialog */}
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

      {/* Withdrawal Dialog */}
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
