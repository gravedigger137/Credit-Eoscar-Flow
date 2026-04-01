import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AdminBypassBanner } from "@/components/admin-bypass-banner";
import { Landmark, CreditCard, Building2, TrendingUp, DollarSign, RefreshCw, Plus, CheckCircle2, XCircle, ArrowRight, Wallet, PiggyBank, FileText, Shield } from "lucide-react";

export default function Banking() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: bankAccounts = [] } = useQuery<any[]>({ queryKey: ["/api/bank-accounts"] });
  const { data: loans = [] } = useQuery<any[]>({ queryKey: ["/api/loans"] });
  const { data: lenders = [] } = useQuery<any[]>({ queryKey: ["/api/lenders"] });
  const { data: clients = [] } = useQuery<any[]>({ queryKey: ["/api/clients"] });
  const { data: plaidStatus } = useQuery<any>({ queryKey: ["/api/plaid/status"] });

  const [loanForm, setLoanForm] = useState({ clientId: "", loanType: "personal", amount: "", termMonths: "", lender: "" });

  const createLoan = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/loans", { ...data, amount: Math.round(parseFloat(data.amount) * 100) });
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/loans"] });
      toast({ title: "Loan Application Created", description: data.prequalified ? "Client pre-qualified!" : "Client may need more credit work first." });
      setLoanForm({ clientId: "", loanType: "personal", amount: "", termMonths: "", lender: "" });
    },
  });

  const totalBankBalance = bankAccounts.reduce((sum: number, a: any) => sum + (a.balanceCurrent || 0), 0);
  const activeLoans = loans.filter((l: any) => l.status === "approved" || l.status === "active");

  return (
    <Shell title="Banking & Lending" subtitle="Plaid integration, loan applications, lender directory">
      <AdminBypassBanner configKey="admin_bypass_billing_holds" label="Banking & Lending Bypass" />

      <Tabs defaultValue="accounts" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="accounts" data-testid="tab-bank-accounts">Bank Accounts</TabsTrigger>
          <TabsTrigger value="loans" data-testid="tab-loans">Loan Applications</TabsTrigger>
          <TabsTrigger value="lenders" data-testid="tab-lenders">Lender Directory</TabsTrigger>
          <TabsTrigger value="overview" data-testid="tab-banking-overview">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardContent className="pt-6 text-center"><Landmark className="w-8 h-8 mx-auto mb-2 text-blue-500" /><p className="text-2xl font-bold">{bankAccounts.length}</p><p className="text-sm text-muted-foreground">Linked Accounts</p></CardContent></Card>
            <Card><CardContent className="pt-6 text-center"><DollarSign className="w-8 h-8 mx-auto mb-2 text-green-500" /><p className="text-2xl font-bold">${(totalBankBalance / 100).toLocaleString()}</p><p className="text-sm text-muted-foreground">Total Balance</p></CardContent></Card>
            <Card><CardContent className="pt-6 text-center"><Shield className="w-8 h-8 mx-auto mb-2 text-purple-500" /><p className="text-2xl font-bold">{plaidStatus?.configured ? "Connected" : "Not Set Up"}</p><p className="text-sm text-muted-foreground">Plaid Status</p></CardContent></Card>
          </div>

          {bankAccounts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Bank Accounts Linked</h3>
                <p className="text-muted-foreground mb-4">Connect client bank accounts via Plaid for identity verification, income analysis, and automated payments.</p>
                <p className="text-xs text-muted-foreground">{plaidStatus?.configured ? "Plaid is configured and ready." : "Add PLAID_CLIENT_ID and PLAID_SECRET in Settings to enable."}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {bankAccounts.map((acct: any) => (
                <Card key={acct.id} data-testid={`card-bank-${acct.id}`}>
                  <CardContent className="pt-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><Landmark className="w-5 h-5 text-blue-600" /></div>
                      <div>
                        <p className="font-semibold">{acct.accountName}</p>
                        <p className="text-sm text-muted-foreground">{acct.institutionName} · {acct.accountType} {acct.mask ? `····${acct.mask}` : ""}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">${((acct.balanceCurrent || 0) / 100).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Available: ${((acct.balanceAvailable || 0) / 100).toLocaleString()}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="loans" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> New Loan Application</CardTitle>
              <CardDescription>AI pre-qualification based on client credit scores</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Select value={loanForm.clientId} onValueChange={v => setLoanForm(f => ({ ...f, clientId: v }))}>
                <SelectTrigger data-testid="select-loan-client"><SelectValue placeholder="Select Client" /></SelectTrigger>
                <SelectContent>{clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={loanForm.loanType} onValueChange={v => setLoanForm(f => ({ ...f, loanType: v }))}>
                <SelectTrigger data-testid="select-loan-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal Loan</SelectItem>
                  <SelectItem value="auto">Auto Loan</SelectItem>
                  <SelectItem value="mortgage">Mortgage</SelectItem>
                  <SelectItem value="debt_consolidation">Debt Consolidation</SelectItem>
                  <SelectItem value="credit_builder">Credit Builder</SelectItem>
                  <SelectItem value="business">Business Loan</SelectItem>
                </SelectContent>
              </Select>
              <Input type="number" placeholder="Amount ($)" value={loanForm.amount} onChange={e => setLoanForm(f => ({ ...f, amount: e.target.value }))} data-testid="input-loan-amount" />
              <Input type="number" placeholder="Term (months)" value={loanForm.termMonths} onChange={e => setLoanForm(f => ({ ...f, termMonths: e.target.value }))} data-testid="input-loan-term" />
              <Button onClick={() => createLoan.mutate(loanForm)} disabled={!loanForm.clientId || !loanForm.amount || createLoan.isPending} data-testid="button-create-loan">
                {createLoan.isPending ? "Creating..." : "Apply"}
              </Button>
            </CardContent>
          </Card>

          {loans.length > 0 && (
            <div className="grid gap-4">
              {loans.map((loan: any) => {
                const rec = loan.aiRecommendation ? JSON.parse(loan.aiRecommendation) : null;
                return (
                  <Card key={loan.id} data-testid={`card-loan-${loan.id}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-blue-500" />
                          <div>
                            <p className="font-semibold capitalize">{loan.loanType?.replace("_", " ")} Loan</p>
                            <p className="text-sm text-muted-foreground">${(loan.amount / 100).toLocaleString()} {loan.termMonths ? `· ${loan.termMonths}mo` : ""}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {loan.prequalified ? <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3 mr-1" />Pre-Qualified</Badge> : <Badge variant="outline" className="text-amber-600"><XCircle className="w-3 h-3 mr-1" />Not Qualified</Badge>}
                          <Badge variant="outline" className="capitalize">{loan.status}</Badge>
                        </div>
                      </div>
                      {rec && (
                        <div className={`rounded-lg p-3 text-sm ${rec.qualified ? "bg-green-50 border border-green-200 text-green-800" : "bg-amber-50 border border-amber-200 text-amber-800"}`}>
                          <p className="font-medium mb-1">AI Recommendation</p>
                          <p>{rec.recommendation}</p>
                          {rec.rateEstimate && <p className="mt-1 text-xs">Estimated APR: {rec.rateEstimate}</p>}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="lenders" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lenders.map((lender: any) => (
              <Card key={lender.id} data-testid={`card-lender-${lender.id}`} className="flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{lender.name}</CardTitle>
                  <CardDescription className="flex flex-wrap gap-1">
                    {lender.types.map((t: string) => <Badge key={t} variant="outline" className="text-xs capitalize">{t.replace("_", " ")}</Badge>)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Min Score:</span><span className="font-medium">{lender.minScore || "None"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Max Amount:</span><span className="font-medium">${lender.maxAmount?.toLocaleString() || "N/A"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">APR:</span><span className="font-medium">{lender.apr}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Term:</span><span className="font-medium">{lender.term}</span></div>
                  <div className="mt-3 space-y-1">
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

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-6 text-center"><Landmark className="w-8 h-8 mx-auto mb-2 text-blue-500" /><p className="text-2xl font-bold">{bankAccounts.length}</p><p className="text-sm text-muted-foreground">Bank Accounts</p></CardContent></Card>
            <Card><CardContent className="pt-6 text-center"><FileText className="w-8 h-8 mx-auto mb-2 text-indigo-500" /><p className="text-2xl font-bold">{loans.length}</p><p className="text-sm text-muted-foreground">Loan Applications</p></CardContent></Card>
            <Card><CardContent className="pt-6 text-center"><CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" /><p className="text-2xl font-bold">{loans.filter((l: any) => l.prequalified).length}</p><p className="text-sm text-muted-foreground">Pre-Qualified</p></CardContent></Card>
            <Card><CardContent className="pt-6 text-center"><PiggyBank className="w-8 h-8 mx-auto mb-2 text-amber-500" /><p className="text-2xl font-bold">{lenders.length}</p><p className="text-sm text-muted-foreground">Partner Lenders</p></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle>Integrated Banking Features</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {[
                { icon: Building2, title: "Plaid Bank Linking", desc: "Connect client bank accounts for identity verification, income analysis, and automated ACH payments." },
                { icon: CreditCard, title: "Liability Tracking", desc: "Pull credit card balances, student loans, and mortgage data directly from financial institutions." },
                { icon: TrendingUp, title: "AI Pre-Qualification", desc: "Instant loan pre-qualification using client credit scores with rate estimates and recommendations." },
                { icon: Shield, title: "12+ Partner Lenders", desc: "Directory of MIT-licensed open banking partners including LendingClub, SoFi, Upstart, and more." },
              ].map((f, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-lg border">
                  <f.icon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div><p className="font-medium">{f.title}</p><p className="text-muted-foreground text-xs">{f.desc}</p></div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Shell>
  );
}
