import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AdminBypassBanner } from "@/components/admin-bypass-banner";
import {
  Landmark, CreditCard, Building2, TrendingUp, DollarSign, RefreshCw, Plus,
  CheckCircle2, XCircle, Wallet, PiggyBank, FileText, Shield, Trash2,
  ArrowUpRight, ArrowDownLeft, Eye
} from "lucide-react";

export default function Banking() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: bankAccounts = [] } = useQuery<any[]>({ queryKey: ["/api/bank-accounts"] });
  const { data: loans = [] } = useQuery<any[]>({ queryKey: ["/api/loans"] });
  const { data: lenders = [] } = useQuery<any[]>({ queryKey: ["/api/lenders"] });
  const { data: clients = [] } = useQuery<any[]>({ queryKey: ["/api/clients"] });
  const { data: plaidStatus } = useQuery<any>({ queryKey: ["/api/plaid/status"] });

  const [loanForm, setLoanForm] = useState({ clientId: "", loanType: "personal", amount: "", termMonths: "", lender: "" });
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [accountForm, setAccountForm] = useState({
    clientId: "", institutionName: "", accountName: "", accountType: "checking",
    accountSubtype: "", mask: "", balanceCurrent: "", balanceAvailable: "", balanceLimit: "",
  });
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [loanStatus, setLoanStatus] = useState("");

  const createAccount = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/bank-accounts", {
        ...data,
        balanceCurrent: data.balanceCurrent ? Math.round(parseFloat(data.balanceCurrent) * 100) : null,
        balanceAvailable: data.balanceAvailable ? Math.round(parseFloat(data.balanceAvailable) * 100) : null,
        balanceLimit: data.balanceLimit ? Math.round(parseFloat(data.balanceLimit) * 100) : null,
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/bank-accounts"] });
      toast({ title: "Bank Account Added", description: "Account linked successfully." });
      setShowAddAccount(false);
      setAccountForm({ clientId: "", institutionName: "", accountName: "", accountType: "checking", accountSubtype: "", mask: "", balanceCurrent: "", balanceAvailable: "", balanceLimit: "" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/bank-accounts/${id}`); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/bank-accounts"] }); toast({ title: "Account Removed" }); },
  });

  const syncAccount = useMutation({
    mutationFn: async (id: string) => { const res = await apiRequest("POST", `/api/bank-accounts/${id}/sync`); return res.json(); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/bank-accounts"] }); toast({ title: "Account Synced" }); },
    onError: () => toast({ title: "Sync Failed", description: "Plaid credentials may not be configured for this account.", variant: "destructive" }),
  });

  const createLoan = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/loans", {
        ...data,
        amount: Math.round(parseFloat(data.amount) * 100),
        termMonths: data.termMonths ? parseInt(data.termMonths) : null,
      });
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/loans"] });
      toast({ title: "Loan Application Created", description: data.prequalified ? "Client pre-qualified!" : "Client may need more credit work first." });
      setLoanForm({ clientId: "", loanType: "personal", amount: "", termMonths: "", lender: "" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateLoan = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/loans/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/loans"] });
      toast({ title: "Loan Status Updated" });
      setSelectedLoan(null);
    },
  });

  const totalBankBalance = bankAccounts.reduce((sum: number, a: any) => sum + (a.balanceCurrent || 0), 0);
  const totalAvailable = bankAccounts.reduce((sum: number, a: any) => sum + (a.balanceAvailable || 0), 0);

  const getClientName = (clientId: string) => {
    const c = clients.find((cl: any) => cl.id === clientId);
    return c ? `${c.firstName} ${c.lastName}` : clientId?.slice(0, 8);
  };

  return (
    <Shell title="Banking & Lending" subtitle="Plaid integration, loan applications, lender directory">
      <AdminBypassBanner configKey="admin_bypass_billing_holds" label="Banking & Lending Bypass" />

      <Tabs defaultValue="accounts" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="accounts" data-testid="tab-bank-accounts">
            Bank Accounts {bankAccounts.length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs">{bankAccounts.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="loans" data-testid="tab-loans">
            Loan Applications {loans.length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs">{loans.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="lenders" data-testid="tab-lenders">Lender Directory</TabsTrigger>
          <TabsTrigger value="overview" data-testid="tab-banking-overview">Overview</TabsTrigger>
        </TabsList>

        {/* ─── BANK ACCOUNTS TAB ─────────────────────────────────── */}
        <TabsContent value="accounts" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <Landmark className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                <p className="text-2xl font-bold" data-testid="text-linked-accounts">{bankAccounts.length}</p>
                <p className="text-sm text-muted-foreground">Linked Accounts</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p className="text-2xl font-bold" data-testid="text-total-balance">${(totalBankBalance / 100).toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Balance</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Wallet className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                <p className="text-2xl font-bold" data-testid="text-total-available">${(totalAvailable / 100).toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Available Funds</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Shield className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                <p className="text-2xl font-bold" data-testid="text-plaid-status">{plaidStatus?.configured ? "Active" : "Manual"}</p>
                <p className="text-sm text-muted-foreground">Plaid Status</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-3">
            <Dialog open={showAddAccount} onOpenChange={setShowAddAccount}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-bank-account"><Plus className="w-4 h-4 mr-2" /> Add Bank Account</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Link Bank Account</DialogTitle>
                  <DialogDescription>Add a client's bank account manually or connect via Plaid.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div>
                    <Label>Client</Label>
                    <Select value={accountForm.clientId} onValueChange={v => setAccountForm(f => ({ ...f, clientId: v }))}>
                      <SelectTrigger data-testid="select-account-client"><SelectValue placeholder="Select client" /></SelectTrigger>
                      <SelectContent>{clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Institution Name</Label>
                      <Input placeholder="e.g. Chase, Bank of America" value={accountForm.institutionName} onChange={e => setAccountForm(f => ({ ...f, institutionName: e.target.value }))} data-testid="input-institution-name" />
                    </div>
                    <div>
                      <Label>Account Name</Label>
                      <Input placeholder="e.g. Checking, Savings" value={accountForm.accountName} onChange={e => setAccountForm(f => ({ ...f, accountName: e.target.value }))} data-testid="input-account-name" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Account Type</Label>
                      <Select value={accountForm.accountType} onValueChange={v => setAccountForm(f => ({ ...f, accountType: v }))}>
                        <SelectTrigger data-testid="select-account-type"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="checking">Checking</SelectItem>
                          <SelectItem value="savings">Savings</SelectItem>
                          <SelectItem value="credit">Credit Card</SelectItem>
                          <SelectItem value="loan">Loan</SelectItem>
                          <SelectItem value="investment">Investment</SelectItem>
                          <SelectItem value="mortgage">Mortgage</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Last 4 Digits</Label>
                      <Input placeholder="1234" maxLength={4} value={accountForm.mask} onChange={e => setAccountForm(f => ({ ...f, mask: e.target.value }))} data-testid="input-account-mask" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Current Balance ($)</Label>
                      <Input type="number" step="0.01" placeholder="0.00" value={accountForm.balanceCurrent} onChange={e => setAccountForm(f => ({ ...f, balanceCurrent: e.target.value }))} data-testid="input-balance-current" />
                    </div>
                    <div>
                      <Label>Available ($)</Label>
                      <Input type="number" step="0.01" placeholder="0.00" value={accountForm.balanceAvailable} onChange={e => setAccountForm(f => ({ ...f, balanceAvailable: e.target.value }))} data-testid="input-balance-available" />
                    </div>
                    <div>
                      <Label>Limit ($)</Label>
                      <Input type="number" step="0.01" placeholder="0.00" value={accountForm.balanceLimit} onChange={e => setAccountForm(f => ({ ...f, balanceLimit: e.target.value }))} data-testid="input-balance-limit" />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddAccount(false)}>Cancel</Button>
                  <Button
                    onClick={() => createAccount.mutate(accountForm)}
                    disabled={!accountForm.clientId || !accountForm.institutionName || !accountForm.accountName || createAccount.isPending}
                    data-testid="button-save-account"
                  >
                    {createAccount.isPending ? "Saving..." : "Link Account"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {bankAccounts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Bank Accounts Linked</h3>
                <p className="text-muted-foreground mb-4">Click "Add Bank Account" above to manually link a client's bank account, or configure Plaid for automatic syncing.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {bankAccounts.map((acct: any) => (
                <Card key={acct.id} data-testid={`card-bank-${acct.id}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          acct.accountType === "credit" ? "bg-red-100" :
                          acct.accountType === "savings" ? "bg-green-100" :
                          acct.accountType === "investment" ? "bg-purple-100" : "bg-blue-100"
                        }`}>
                          {acct.accountType === "credit" ? <CreditCard className="w-5 h-5 text-red-600" /> :
                           acct.accountType === "savings" ? <PiggyBank className="w-5 h-5 text-green-600" /> :
                           <Landmark className="w-5 h-5 text-blue-600" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{acct.accountName}</span>
                            <Badge variant="outline" className="text-xs capitalize">{acct.accountType}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {acct.institutionName} {acct.mask ? `····${acct.mask}` : ""} · {getClientName(acct.clientId)}
                          </p>
                          {acct.lastSynced && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Last synced: {new Date(acct.lastSynced).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold">${((acct.balanceCurrent || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                          {acct.balanceAvailable != null && (
                            <p className="text-xs text-muted-foreground">Available: ${((acct.balanceAvailable || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                          )}
                          {acct.balanceLimit != null && acct.balanceLimit > 0 && (
                            <p className="text-xs text-muted-foreground">Limit: ${((acct.balanceLimit || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => syncAccount.mutate(acct.id)} title="Sync">
                            <RefreshCw className={`w-4 h-4 ${syncAccount.isPending ? "animate-spin" : ""}`} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteAccount.mutate(acct.id)} title="Remove">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── LOAN APPLICATIONS TAB ─────────────────────────────── */}
        <TabsContent value="loans" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> New Loan Application</CardTitle>
              <CardDescription>AI pre-qualification based on client credit scores. Select a client, loan type, and amount to get instant recommendations.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label>Client</Label>
                  <Select value={loanForm.clientId} onValueChange={v => setLoanForm(f => ({ ...f, clientId: v }))}>
                    <SelectTrigger data-testid="select-loan-client"><SelectValue placeholder="Select Client" /></SelectTrigger>
                    <SelectContent>{clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Loan Type</Label>
                  <Select value={loanForm.loanType} onValueChange={v => setLoanForm(f => ({ ...f, loanType: v }))}>
                    <SelectTrigger data-testid="select-loan-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">Personal Loan</SelectItem>
                      <SelectItem value="auto">Auto Loan</SelectItem>
                      <SelectItem value="mortgage">Mortgage</SelectItem>
                      <SelectItem value="debt_consolidation">Debt Consolidation</SelectItem>
                      <SelectItem value="credit_builder">Credit Builder</SelectItem>
                      <SelectItem value="business">Business Loan</SelectItem>
                      <SelectItem value="student_refi">Student Refi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Amount ($)</Label>
                  <Input type="number" placeholder="10000" value={loanForm.amount} onChange={e => setLoanForm(f => ({ ...f, amount: e.target.value }))} data-testid="input-loan-amount" />
                </div>
                <div>
                  <Label>Term (months)</Label>
                  <Input type="number" placeholder="36" value={loanForm.termMonths} onChange={e => setLoanForm(f => ({ ...f, termMonths: e.target.value }))} data-testid="input-loan-term" />
                </div>
                <div>
                  <Label>Preferred Lender (optional)</Label>
                  <Select value={loanForm.lender} onValueChange={v => setLoanForm(f => ({ ...f, lender: v }))}>
                    <SelectTrigger data-testid="select-loan-lender"><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any Lender</SelectItem>
                      {lenders.map((l: any) => <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    className="w-full"
                    onClick={() => createLoan.mutate(loanForm)}
                    disabled={!loanForm.clientId || !loanForm.amount || createLoan.isPending}
                    data-testid="button-create-loan"
                  >
                    {createLoan.isPending ? "Processing..." : "Submit Application"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {loans.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Loan Applications Yet</h3>
                <p className="text-muted-foreground">Create a loan application above. The system will automatically pre-qualify clients based on their credit scores.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {loans.map((loan: any) => {
                const rec = loan.aiRecommendation ? (() => { try { return JSON.parse(loan.aiRecommendation); } catch { return null; } })() : null;
                return (
                  <Card key={loan.id} data-testid={`card-loan-${loan.id}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${loan.prequalified ? "bg-green-100" : "bg-amber-100"}`}>
                            {loan.prequalified ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-amber-600" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold capitalize">{loan.loanType?.replace(/_/g, " ")} Loan</span>
                              {loan.lender && <span className="text-sm text-muted-foreground">via {loan.lender}</span>}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              ${(loan.amount / 100).toLocaleString()} {loan.termMonths ? `· ${loan.termMonths} months` : ""} · {getClientName(loan.clientId)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {loan.prequalified ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Pre-Qualified</Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-200"><XCircle className="w-3 h-3 mr-1" />Not Qualified</Badge>
                          )}
                          <Badge variant="outline" className="capitalize">{loan.status}</Badge>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => { setSelectedLoan(loan); setLoanStatus(loan.status); }} data-testid={`button-update-loan-${loan.id}`}>
                                <Eye className="w-4 h-4 mr-1" /> Update
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Update Loan Status</DialogTitle>
                                <DialogDescription>Change the status of this {loan.loanType?.replace(/_/g, " ")} loan application.</DialogDescription>
                              </DialogHeader>
                              <Select value={loanStatus} onValueChange={setLoanStatus}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="draft">Draft</SelectItem>
                                  <SelectItem value="submitted">Submitted</SelectItem>
                                  <SelectItem value="under_review">Under Review</SelectItem>
                                  <SelectItem value="approved">Approved</SelectItem>
                                  <SelectItem value="denied">Denied</SelectItem>
                                  <SelectItem value="funded">Funded</SelectItem>
                                  <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                              </Select>
                              <DialogFooter>
                                <Button onClick={() => updateLoan.mutate({ id: loan.id, status: loanStatus })} disabled={updateLoan.isPending}>
                                  {updateLoan.isPending ? "Saving..." : "Update Status"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                      {rec && (
                        <div className={`rounded-lg p-3 text-sm ${rec.qualified ? "bg-green-50 border border-green-200 text-green-800" : "bg-amber-50 border border-amber-200 text-amber-800"}`}>
                          <div className="flex items-center gap-2 font-medium mb-1">
                            <TrendingUp className="w-4 h-4" /> AI Recommendation
                          </div>
                          <p>{rec.recommendation}</p>
                          {rec.rateEstimate && <p className="mt-1 text-xs font-medium">Estimated APR: {rec.rateEstimate}</p>}
                          {rec.avgScore && <p className="text-xs">Average credit score: {rec.avgScore}</p>}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">Created: {new Date(loan.createdAt).toLocaleDateString()}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── LENDER DIRECTORY TAB ──────────────────────────────── */}
        <TabsContent value="lenders" className="space-y-4">
          <p className="text-sm text-muted-foreground">Browse our network of {lenders.length} partner lenders. Select a lender when creating loan applications for best rate matching.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lenders.map((lender: any) => (
              <Card key={lender.id} data-testid={`card-lender-${lender.id}`} className="flex flex-col hover:border-primary/30 transition-colors">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    {lender.name}
                  </CardTitle>
                  <CardDescription className="flex flex-wrap gap-1">
                    {lender.types.map((t: string) => <Badge key={t} variant="outline" className="text-xs capitalize">{t.replace(/_/g, " ")}</Badge>)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Min Score:</span><span className="font-medium">{lender.minScore || "None"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Max Amount:</span><span className="font-medium">{lender.maxAmount ? `$${lender.maxAmount.toLocaleString()}` : "N/A"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">APR:</span><span className="font-medium">{lender.apr}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Term:</span><span className="font-medium">{lender.term}</span></div>
                  <div className="mt-3 pt-3 border-t space-y-1">
                    {lender.features?.map((f: string, i: number) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" /> {f}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ─── OVERVIEW TAB ──────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-6 text-center"><Landmark className="w-8 h-8 mx-auto mb-2 text-blue-500" /><p className="text-2xl font-bold" data-testid="text-overview-accounts">{bankAccounts.length}</p><p className="text-sm text-muted-foreground">Bank Accounts</p></CardContent></Card>
            <Card><CardContent className="pt-6 text-center"><FileText className="w-8 h-8 mx-auto mb-2 text-indigo-500" /><p className="text-2xl font-bold" data-testid="text-overview-loans">{loans.length}</p><p className="text-sm text-muted-foreground">Loan Applications</p></CardContent></Card>
            <Card><CardContent className="pt-6 text-center"><CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" /><p className="text-2xl font-bold" data-testid="text-overview-prequalified">{loans.filter((l: any) => l.prequalified).length}</p><p className="text-sm text-muted-foreground">Pre-Qualified</p></CardContent></Card>
            <Card><CardContent className="pt-6 text-center"><PiggyBank className="w-8 h-8 mx-auto mb-2 text-amber-500" /><p className="text-2xl font-bold" data-testid="text-overview-lenders">{lenders.length}</p><p className="text-sm text-muted-foreground">Partner Lenders</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Integrated Banking Features</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {[
                { icon: Building2, title: "Manual & Plaid Bank Linking", desc: "Link client bank accounts manually or connect via Plaid for automatic identity verification, income analysis, and ACH payments." },
                { icon: CreditCard, title: "Liability & Balance Tracking", desc: "Track checking, savings, credit card, and loan balances. Sync via Plaid or enter manually for complete financial picture." },
                { icon: TrendingUp, title: "AI Pre-Qualification", desc: "Instant loan pre-qualification using client credit scores with rate estimates, score thresholds, and personalized recommendations." },
                { icon: Shield, title: `${lenders.length}+ Partner Lenders`, desc: "Directory of lending partners including LendingClub, SoFi, Upstart, Rocket Mortgage, Self Financial, and more — spanning personal, auto, mortgage, and credit builder products." },
              ].map((f, i) => (
                <div key={i} className="flex gap-3 p-4 rounded-lg border hover:border-primary/20 transition-colors">
                  <f.icon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div><p className="font-medium">{f.title}</p><p className="text-muted-foreground text-xs mt-1">{f.desc}</p></div>
                </div>
              ))}
            </CardContent>
          </Card>

          {bankAccounts.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Account Breakdown by Type</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {["checking", "savings", "credit", "loan", "investment", "mortgage"].filter(t => bankAccounts.some((a: any) => a.accountType === t)).map(type => {
                    const accts = bankAccounts.filter((a: any) => a.accountType === type);
                    const total = accts.reduce((s: number, a: any) => s + (a.balanceCurrent || 0), 0);
                    return (
                      <div key={type} className="p-3 rounded-lg border text-center">
                        <p className="text-xs text-muted-foreground capitalize">{type}</p>
                        <p className="text-lg font-bold">${(total / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        <p className="text-xs text-muted-foreground">{accts.length} account{accts.length !== 1 ? "s" : ""}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </Shell>
  );
}
