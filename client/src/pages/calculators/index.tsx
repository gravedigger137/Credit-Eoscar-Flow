import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import {
  Calculator, TrendingUp, DollarSign, PieChart, ShieldCheck,
  ArrowUpRight, Minus, Receipt, Target, Building2, CreditCard
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Calculators() {
  const { toast } = useToast();

  const [loanInput, setLoanInput] = useState({ principal: 250000, annualRate: 7.5, termMonths: 360 });
  const [loanResult, setLoanResult] = useState<any>(null);

  const [debtInput, setDebtInput] = useState({
    debts: [
      { name: "Credit Card 1", balance: 5000, rate: 22, minPayment: 150 },
      { name: "Credit Card 2", balance: 3200, rate: 18, minPayment: 96 },
      { name: "Auto Loan", balance: 12000, rate: 6.5, minPayment: 350 },
    ],
    extraPayment: 200,
    method: "avalanche" as "avalanche" | "snowball",
  });
  const [debtResult, setDebtResult] = useState<any>(null);

  const [roiInput, setRoiInput] = useState({ currentScore: 580, projectedScore: 720, totalDebt: 300000, repairCost: 2500 });
  const [roiResult, setRoiResult] = useState<any>(null);

  const [dtiInput, setDtiInput] = useState({ monthlyDebtPayments: 1800, monthlyGrossIncome: 6500 });
  const [dtiResult, setDtiResult] = useState<any>(null);

  const loanMutation = useMutation({
    mutationFn: async () => { const r = await apiRequest("POST", "/api/calculator/loan", loanInput); return r.json(); },
    onSuccess: (data) => { setLoanResult(data); toast({ title: "Loan Calculated", description: `Monthly payment: $${data.monthlyPayment.toLocaleString()}` }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const debtMutation = useMutation({
    mutationFn: async () => { const r = await apiRequest("POST", "/api/calculator/debt-payoff", debtInput); return r.json(); },
    onSuccess: (data) => { setDebtResult(data); toast({ title: "Payoff Plan Ready", description: `${data.totalMonths} months to debt freedom using ${data.method}` }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const roiMutation = useMutation({
    mutationFn: async () => { const r = await apiRequest("POST", "/api/calculator/repair-roi", roiInput); return r.json(); },
    onSuccess: (data) => { setRoiResult(data); toast({ title: "ROI Calculated", description: `${data.roi}% return on credit repair investment` }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const dtiMutation = useMutation({
    mutationFn: async () => { const r = await apiRequest("POST", "/api/calculator/dti", dtiInput); return r.json(); },
    onSuccess: (data) => { setDtiResult(data); toast({ title: "DTI Calculated", description: `Debt-to-income ratio: ${data.ratio}% (${data.status})` }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Shell title="Financial Calculators" subtitle="Loan amortization, debt payoff strategies, credit repair ROI, and DTI analysis">
      <Tabs defaultValue="loan" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="loan" data-testid="tab-loan"><Building2 className="w-4 h-4 mr-1" /> Loan</TabsTrigger>
          <TabsTrigger value="debt" data-testid="tab-debt"><CreditCard className="w-4 h-4 mr-1" /> Debt Payoff</TabsTrigger>
          <TabsTrigger value="roi" data-testid="tab-roi"><Target className="w-4 h-4 mr-1" /> Repair ROI</TabsTrigger>
          <TabsTrigger value="dti" data-testid="tab-dti"><PieChart className="w-4 h-4 mr-1" /> DTI</TabsTrigger>
        </TabsList>

        {/* ─── LOAN CALCULATOR ────────────────────────────────────────────── */}
        <TabsContent value="loan" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" /> Loan Calculator</CardTitle>
                <CardDescription>Calculate monthly payments and full amortization schedule</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div><Label>Loan Amount ($)</Label><Input type="number" value={loanInput.principal} onChange={e => setLoanInput(p => ({ ...p, principal: parseFloat(e.target.value) || 0 }))} data-testid="input-loan-principal" /></div>
                <div><Label>Annual Interest Rate (%)</Label><Input type="number" step="0.1" value={loanInput.annualRate} onChange={e => setLoanInput(p => ({ ...p, annualRate: parseFloat(e.target.value) || 0 }))} data-testid="input-loan-rate" /></div>
                <div><Label>Term (months)</Label><Input type="number" value={loanInput.termMonths} onChange={e => setLoanInput(p => ({ ...p, termMonths: parseInt(e.target.value) || 0 }))} /></div>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" size="sm" onClick={() => setLoanInput(p => ({ ...p, termMonths: 180 }))}>15yr</Button>
                  <Button variant="outline" size="sm" onClick={() => setLoanInput(p => ({ ...p, termMonths: 360 }))}>30yr</Button>
                  <Button variant="outline" size="sm" onClick={() => setLoanInput(p => ({ ...p, termMonths: 60 }))}>5yr Auto</Button>
                </div>
                <Button onClick={() => loanMutation.mutate()} disabled={loanMutation.isPending} className="w-full" data-testid="btn-calc-loan">
                  {loanMutation.isPending ? "Calculating..." : "Calculate Payment"}
                </Button>
              </CardContent>
            </Card>

            {loanResult && (
              <Card>
                <CardHeader><CardTitle>Loan Summary</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-primary" data-testid="text-monthly-payment">${loanResult.monthlyPayment.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Monthly Payment</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">${loanResult.totalPayment.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Total Paid</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-500">${loanResult.totalInterest.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Total Interest</div>
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Year</TableHead><TableHead>Principal</TableHead><TableHead>Interest</TableHead><TableHead>Balance</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {loanResult.amortization.filter((_: any, i: number) => i % 12 === 11).map((row: any) => (
                          <TableRow key={row.month}>
                            <TableCell>{Math.ceil(row.month / 12)}</TableCell>
                            <TableCell>${row.principal.toLocaleString()}</TableCell>
                            <TableCell>${row.interest.toLocaleString()}</TableCell>
                            <TableCell>${row.balance.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ─── DEBT PAYOFF ────────────────────────────────────────────────── */}
        <TabsContent value="debt" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" /> Debt Payoff Planner</CardTitle>
                <CardDescription>Compare avalanche vs snowball strategies</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {debtInput.debts.map((debt, i) => (
                  <div key={i} className="border rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <Input value={debt.name} onChange={e => { const d = [...debtInput.debts]; d[i] = { ...d[i], name: e.target.value }; setDebtInput(p => ({ ...p, debts: d })); }} className="font-medium w-40" />
                      <Button variant="ghost" size="sm" onClick={() => setDebtInput(p => ({ ...p, debts: p.debts.filter((_, j) => j !== i) }))}>Remove</Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div><Label className="text-xs">Balance</Label><Input type="number" value={debt.balance} onChange={e => { const d = [...debtInput.debts]; d[i] = { ...d[i], balance: parseFloat(e.target.value) || 0 }; setDebtInput(p => ({ ...p, debts: d })); }} /></div>
                      <div><Label className="text-xs">Rate %</Label><Input type="number" step="0.1" value={debt.rate} onChange={e => { const d = [...debtInput.debts]; d[i] = { ...d[i], rate: parseFloat(e.target.value) || 0 }; setDebtInput(p => ({ ...p, debts: d })); }} /></div>
                      <div><Label className="text-xs">Min Payment</Label><Input type="number" value={debt.minPayment} onChange={e => { const d = [...debtInput.debts]; d[i] = { ...d[i], minPayment: parseFloat(e.target.value) || 0 }; setDebtInput(p => ({ ...p, debts: d })); }} /></div>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setDebtInput(p => ({ ...p, debts: [...p.debts, { name: `Debt ${p.debts.length + 1}`, balance: 0, rate: 0, minPayment: 0 }] }))} data-testid="btn-add-debt">+ Add Debt</Button>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Extra Monthly Payment</Label><Input type="number" value={debtInput.extraPayment} onChange={e => setDebtInput(p => ({ ...p, extraPayment: parseFloat(e.target.value) || 0 }))} /></div>
                  <div>
                    <Label className="text-xs">Strategy</Label>
                    <Select value={debtInput.method} onValueChange={v => setDebtInput(p => ({ ...p, method: v as any }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="avalanche">Avalanche (highest rate first)</SelectItem>
                        <SelectItem value="snowball">Snowball (lowest balance first)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={() => debtMutation.mutate()} disabled={debtMutation.isPending} className="w-full" data-testid="btn-calc-debt">
                  {debtMutation.isPending ? "Planning..." : "Calculate Payoff Plan"}
                </Button>
              </CardContent>
            </Card>

            {debtResult && (
              <Card>
                <CardHeader><CardTitle>Payoff Plan ({debtResult.method})</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-primary" data-testid="text-payoff-months">{debtResult.totalMonths}</div>
                      <div className="text-xs text-muted-foreground">Months to Freedom</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">${debtResult.totalPaid.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Total Paid</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-500">${debtResult.totalInterestPaid.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Interest Paid</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {debtResult.debts.map((d: any, i: number) => (
                      <div key={i} className="flex justify-between items-center bg-muted/50 rounded p-2">
                        <div>
                          <div className="text-sm font-medium">{d.name}</div>
                          <div className="text-xs text-muted-foreground">${d.balance.toLocaleString()} at {d.rate}%</div>
                        </div>
                        <div className="text-right">
                          <Badge variant={d.payoffMonth <= 12 ? "default" : d.payoffMonth <= 24 ? "secondary" : "outline"}>
                            Month {d.payoffMonth}
                          </Badge>
                          <div className="text-xs text-red-400">${d.interestPaid.toLocaleString()} interest</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ─── CREDIT REPAIR ROI ──────────────────────────────────────────── */}
        <TabsContent value="roi" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Target className="w-5 h-5" /> Credit Repair ROI Calculator</CardTitle>
                <CardDescription>Show clients the financial return of credit repair</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Current Score</Label><Input type="number" value={roiInput.currentScore} onChange={e => setRoiInput(p => ({ ...p, currentScore: parseInt(e.target.value) || 0 }))} data-testid="input-roi-current" /></div>
                  <div><Label>Projected Score</Label><Input type="number" value={roiInput.projectedScore} onChange={e => setRoiInput(p => ({ ...p, projectedScore: parseInt(e.target.value) || 0 }))} data-testid="input-roi-projected" /></div>
                </div>
                <div><Label>Total Outstanding Debt ($)</Label><Input type="number" value={roiInput.totalDebt} onChange={e => setRoiInput(p => ({ ...p, totalDebt: parseFloat(e.target.value) || 0 }))} /></div>
                <div><Label>Credit Repair Service Cost ($)</Label><Input type="number" value={roiInput.repairCost} onChange={e => setRoiInput(p => ({ ...p, repairCost: parseFloat(e.target.value) || 0 }))} /></div>
                <Button onClick={() => roiMutation.mutate()} disabled={roiMutation.isPending} className="w-full" data-testid="btn-calc-roi">
                  {roiMutation.isPending ? "Calculating..." : "Calculate ROI"}
                </Button>
              </CardContent>
            </Card>

            {roiResult && (
              <Card>
                <CardHeader><CardTitle>Credit Repair Investment Return</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-3xl font-bold text-green-500" data-testid="text-roi-percent">{roiResult.roi}%</div>
                      <div className="text-xs text-muted-foreground">ROI</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary">${roiResult.lifetimeSavings.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Lifetime Savings</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{roiResult.breakEvenMonths}</div>
                      <div className="text-xs text-muted-foreground">Break-Even (months)</div>
                    </div>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                    <div className="text-sm text-muted-foreground">Monthly Payment Savings</div>
                    <div className="text-2xl font-bold text-green-500">${roiResult.monthlyPaymentSavings.toLocaleString()}/mo</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Rate Improvements by Product</div>
                    {roiResult.rateImprovements.map((r: any, i: number) => (
                      <div key={i} className="flex justify-between items-center bg-muted/50 rounded p-2">
                        <div>
                          <div className="text-sm font-medium">{r.product}</div>
                          <div className="text-xs text-muted-foreground">{r.currentRate}% → {r.projectedRate}%</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-green-500">${r.savings.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">saved</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ─── DTI CALCULATOR ─────────────────────────────────────────────── */}
        <TabsContent value="dti" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><PieChart className="w-5 h-5" /> Debt-to-Income Ratio</CardTitle>
                <CardDescription>Assess mortgage qualification and lending capacity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div><Label>Monthly Debt Payments ($)</Label><Input type="number" value={dtiInput.monthlyDebtPayments} onChange={e => setDtiInput(p => ({ ...p, monthlyDebtPayments: parseFloat(e.target.value) || 0 }))} data-testid="input-dti-debt" /></div>
                <div><Label>Monthly Gross Income ($)</Label><Input type="number" value={dtiInput.monthlyGrossIncome} onChange={e => setDtiInput(p => ({ ...p, monthlyGrossIncome: parseFloat(e.target.value) || 0 }))} data-testid="input-dti-income" /></div>
                <Button onClick={() => dtiMutation.mutate()} disabled={dtiMutation.isPending} className="w-full" data-testid="btn-calc-dti">
                  {dtiMutation.isPending ? "Calculating..." : "Calculate DTI"}
                </Button>
              </CardContent>
            </Card>

            {dtiResult && (
              <Card>
                <CardHeader><CardTitle>DTI Analysis</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center space-y-2">
                    <div className={`text-5xl font-bold ${
                      dtiResult.status === "excellent" ? "text-green-500" :
                      dtiResult.status === "good" ? "text-blue-500" :
                      dtiResult.status === "fair" ? "text-yellow-500" : "text-red-500"
                    }`} data-testid="text-dti-ratio">
                      {dtiResult.ratio}%
                    </div>
                    <Badge variant={dtiResult.status === "excellent" || dtiResult.status === "good" ? "default" : dtiResult.status === "fair" ? "secondary" : "destructive"} data-testid="badge-dti-status">
                      {dtiResult.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm"><span>DTI Ratio</span><span>{dtiResult.ratio}%</span></div>
                    <Progress value={Math.min(dtiResult.ratio, 100)} className="h-3" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0% (ideal)</span><span>20% (excellent)</span><span>36% (good)</span><span>43% (max)</span>
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-sm font-medium mb-1">Max Additional Mortgage Payment</div>
                    <div className="text-2xl font-bold text-primary">${dtiResult.maxMortgage.toLocaleString()}/mo</div>
                    <div className="text-xs text-muted-foreground">Based on 43% max DTI threshold</div>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm" data-testid="text-dti-recommendation">
                    {dtiResult.recommendation}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </Shell>
  );
}
