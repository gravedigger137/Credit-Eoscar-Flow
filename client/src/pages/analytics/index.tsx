import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import {
  TrendingUp, TrendingDown, DollarSign, BarChart3, Target, CreditCard,
  ShieldCheck, Clock, AlertTriangle, CheckCircle2, ArrowUpRight, Minus,
  Receipt, PieChart, Activity, Brain, Building2, Users
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const predictorDefaults = {
  creditCardUtilization: 45,
  onTimePayments: 42,
  totalPayments: 48,
  derogatoryMarks: 2,
  creditAgeMonths: 36,
  totalAccounts: 7,
  hardInquiries: 3,
  totalBalance: 8500,
  totalCreditLimit: 19000,
  collectionsCount: 1,
  publicRecords: 0,
  currentScore: 580,
};

function GradeCircle({ grade, size = "md" }: { grade: string; size?: "sm" | "md" | "lg" }) {
  const colors: Record<string, string> = {
    A: "bg-green-500/20 text-green-500 border-green-500",
    B: "bg-blue-500/20 text-blue-500 border-blue-500",
    C: "bg-yellow-500/20 text-yellow-500 border-yellow-500",
    D: "bg-orange-500/20 text-orange-500 border-orange-500",
    F: "bg-red-500/20 text-red-500 border-red-500",
  };
  const sizes = { sm: "w-8 h-8 text-sm", md: "w-12 h-12 text-xl", lg: "w-20 h-20 text-4xl" };
  return (
    <div className={`${sizes[size]} rounded-full border-2 flex items-center justify-center font-bold ${colors[grade] || colors.C}`}>
      {grade}
    </div>
  );
}

export default function Analytics() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [predictorInput, setPredictorInput] = useState(predictorDefaults);
  const [analysis, setAnalysis] = useState<any>(null);
  const [salesPeriod, setSalesPeriod] = useState("monthly");
  const [creditSaleOpen, setCreditSaleOpen] = useState(false);
  const [saleForm, setSaleForm] = useState({ clientId: "", description: "", amount: "", creditTerms: "", dueDate: "", notes: "" });
  const [defaultInput, setDefaultInput] = useState({ creditLimit: 15000, balance: 8000, paymentHistory: [0, 0, -1, 0, 0, -2], billAmounts: [1200, 1400, 1100, 1500, 1300, 1600], payAmounts: [1200, 1400, 800, 1500, 1300, 1000] });
  const [defaultResult, setDefaultResult] = useState<any>(null);

  const defaultMutation = useMutation({
    mutationFn: async () => { const r = await apiRequest("POST", "/api/credit-predictor/default-risk", defaultInput); return r.json(); },
    onSuccess: (data) => { setDefaultResult(data); toast({ title: "Default Analysis Complete", description: `Risk: ${data.riskSegment} (${data.defaultProbability}% default probability)` }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const { data: salesReport } = useQuery<any>({ queryKey: ["/api/financial-reports/sales", salesPeriod], queryFn: async () => { const r = await fetch(`/api/financial-reports/sales?period=${salesPeriod}`, { credentials: "include" }); return r.json(); } });
  const { data: forecast } = useQuery<any>({ queryKey: ["/api/financial-reports/forecast"] });
  const { data: creditSales = [] } = useQuery<any[]>({ queryKey: ["/api/credit-sales"] });
  const { data: clients = [] } = useQuery<any[]>({ queryKey: ["/api/clients"] });

  const analyzeMutation = useMutation({
    mutationFn: async () => { const r = await apiRequest("POST", "/api/credit-predictor/analyze", predictorInput); return r.json(); },
    onSuccess: (data) => { setAnalysis(data); toast({ title: "Analysis Complete", description: `Predicted score: ${data.predictedScore} (${data.overallGrade})` }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createSaleMutation = useMutation({
    mutationFn: async () => { const r = await apiRequest("POST", "/api/credit-sales", { ...saleForm, amount: Math.round(parseFloat(saleForm.amount) * 100) }); return r.json(); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/credit-sales"] }); setCreditSaleOpen(false); setSaleForm({ clientId: "", description: "", amount: "", creditTerms: "", dueDate: "", notes: "" }); toast({ title: "Credit Sale Created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const paymentMutation = useMutation({
    mutationFn: async ({ saleId, amount }: { saleId: string; amount: number }) => { const r = await apiRequest("POST", `/api/credit-sales/${saleId}/payment`, { amount }); return r.json(); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/credit-sales"] }); toast({ title: "Payment Recorded" }); },
  });

  return (
    <Shell title="Financial Analytics" subtitle="Credit predictor, sales reports, revenue forecasting, and credit sales">
      <Tabs defaultValue="predictor" className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          <TabsTrigger value="predictor" data-testid="tab-predictor"><Brain className="w-4 h-4 mr-1" /> Predictor</TabsTrigger>
          <TabsTrigger value="default-risk" data-testid="tab-default-risk"><AlertTriangle className="w-4 h-4 mr-1" /> Default Risk</TabsTrigger>
          <TabsTrigger value="sales" data-testid="tab-sales"><BarChart3 className="w-4 h-4 mr-1" /> Sales</TabsTrigger>
          <TabsTrigger value="forecast" data-testid="tab-forecast"><TrendingUp className="w-4 h-4 mr-1" /> Forecast</TabsTrigger>
          <TabsTrigger value="credit-sales" data-testid="tab-credit-sales"><Receipt className="w-4 h-4 mr-1" /> Credit Sales</TabsTrigger>
        </TabsList>

        {/* ─── CREDIT PREDICTOR TAB ─────────────────────────────────────────── */}
        <TabsContent value="predictor" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Target className="w-5 h-5" /> Credit Profile Input</CardTitle>
                <CardDescription>Enter credit factors to predict score and approval odds without pulling credit</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Current Score</Label><Input type="number" value={predictorInput.currentScore} onChange={e => setPredictorInput(p => ({ ...p, currentScore: parseInt(e.target.value) || 0 }))} data-testid="input-pred-score" /></div>
                  <div><Label className="text-xs">Total Accounts</Label><Input type="number" value={predictorInput.totalAccounts} onChange={e => setPredictorInput(p => ({ ...p, totalAccounts: parseInt(e.target.value) || 0 }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Total Balance</Label><Input type="number" value={predictorInput.totalBalance} onChange={e => setPredictorInput(p => ({ ...p, totalBalance: parseInt(e.target.value) || 0 }))} /></div>
                  <div><Label className="text-xs">Credit Limit</Label><Input type="number" value={predictorInput.totalCreditLimit} onChange={e => setPredictorInput(p => ({ ...p, totalCreditLimit: parseInt(e.target.value) || 0 }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">On-Time Payments</Label><Input type="number" value={predictorInput.onTimePayments} onChange={e => setPredictorInput(p => ({ ...p, onTimePayments: parseInt(e.target.value) || 0 }))} /></div>
                  <div><Label className="text-xs">Total Payments</Label><Input type="number" value={predictorInput.totalPayments} onChange={e => setPredictorInput(p => ({ ...p, totalPayments: parseInt(e.target.value) || 0 }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Derogatory Marks</Label><Input type="number" value={predictorInput.derogatoryMarks} onChange={e => setPredictorInput(p => ({ ...p, derogatoryMarks: parseInt(e.target.value) || 0 }))} /></div>
                  <div><Label className="text-xs">Collections</Label><Input type="number" value={predictorInput.collectionsCount} onChange={e => setPredictorInput(p => ({ ...p, collectionsCount: parseInt(e.target.value) || 0 }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Hard Inquiries</Label><Input type="number" value={predictorInput.hardInquiries} onChange={e => setPredictorInput(p => ({ ...p, hardInquiries: parseInt(e.target.value) || 0 }))} /></div>
                  <div><Label className="text-xs">Credit Age (months)</Label><Input type="number" value={predictorInput.creditAgeMonths} onChange={e => setPredictorInput(p => ({ ...p, creditAgeMonths: parseInt(e.target.value) || 0 }))} /></div>
                </div>
                <div><Label className="text-xs">Public Records</Label><Input type="number" value={predictorInput.publicRecords} onChange={e => setPredictorInput(p => ({ ...p, publicRecords: parseInt(e.target.value) || 0 }))} /></div>
                <Button onClick={() => analyzeMutation.mutate()} disabled={analyzeMutation.isPending} className="w-full" data-testid="button-analyze">
                  <Brain className="w-4 h-4 mr-2" /> {analyzeMutation.isPending ? "Analyzing..." : "Predict Creditworthiness"}
                </Button>
              </CardContent>
            </Card>

            {analysis ? (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5" /> Creditworthiness Analysis</CardTitle>
                  <CardDescription>Internal Credit-Eoscar readiness model for workflow prioritization only</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col items-center p-4 bg-muted/50 rounded-xl">
                      <GradeCircle grade={analysis.overallGrade} size="lg" />
                      <span className="text-sm text-muted-foreground mt-2">Overall Grade</span>
                    </div>
                    <div className="flex flex-col items-center p-4 bg-muted/50 rounded-xl">
                      <span className="text-4xl font-bold" data-testid="text-predicted-score">{analysis.predictedScore}</span>
                      <span className="text-xs text-muted-foreground">{analysis.predictedRange.low}–{analysis.predictedRange.high}</span>
                      <span className="text-sm text-muted-foreground mt-1">Predicted Score</span>
                    </div>
                    <div className="flex flex-col items-center p-4 bg-muted/50 rounded-xl">
                      <Badge variant={analysis.riskLevel === "Low" ? "default" : analysis.riskLevel === "Moderate" ? "secondary" : "destructive"} className="text-lg px-3 py-1">
                        {analysis.riskLevel}
                      </Badge>
                      <span className="text-sm text-muted-foreground mt-2">Risk Level</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">6 Credit Factors</h4>
                    {analysis.factors.map((f: any, i: number) => (
                      <div key={i} className="space-y-1" data-testid={`factor-${i}`}>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <GradeCircle grade={f.grade} size="sm" />
                            <span className="font-medium">{f.name}</span>
                            <Badge variant="outline" className="text-xs">{f.weight}%</Badge>
                          </div>
                          <span className={f.impact === "positive" ? "text-green-500" : f.impact === "negative" ? "text-red-500" : "text-muted-foreground"}>
                            {f.score}/100
                          </span>
                        </div>
                        <Progress value={f.score} className="h-2" />
                        <p className="text-xs text-muted-foreground">{f.recommendation}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <h4 className="font-semibold text-sm mb-3">Score Predictions</h4>
                      <div className="space-y-2">
                        {[
                          { label: "30 Days", score: analysis.predictions.days30 },
                          { label: "90 Days", score: analysis.predictions.days90 },
                          { label: "180 Days", score: analysis.predictions.days180 },
                        ].map(p => (
                          <div key={p.label} className="flex items-center justify-between text-sm bg-muted/30 rounded p-2">
                            <span className="text-muted-foreground">{p.label}</span>
                            <span className="font-bold flex items-center gap-1">
                              {p.score > analysis.predictedScore ? <ArrowUpRight className="w-3 h-3 text-green-500" /> : <Minus className="w-3 h-3" />}
                              {p.score}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-3">Approval Likelihood</h4>
                      <div className="space-y-2">
                        {[
                          { label: "Credit Card", pct: analysis.approvalLikelihood.creditCard },
                          { label: "Auto Loan", pct: analysis.approvalLikelihood.autoLoan },
                          { label: "Personal Loan", pct: analysis.approvalLikelihood.personalLoan },
                          { label: "Mortgage", pct: analysis.approvalLikelihood.mortgage },
                        ].map(a => (
                          <div key={a.label} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>{a.label}</span>
                              <span className={a.pct >= 70 ? "text-green-500" : a.pct >= 40 ? "text-yellow-500" : "text-red-500"}>{a.pct}%</span>
                            </div>
                            <Progress value={a.pct} className="h-1.5" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="lg:col-span-2 flex items-center justify-center min-h-[400px]">
                <div className="text-center text-muted-foreground space-y-3">
                  <Brain className="w-12 h-12 mx-auto opacity-50" />
                  <p className="text-lg font-medium">Credit Predictor</p>
                  <p className="text-sm">Enter credit factors to predict score, approval odds, and get recommendations — no credit pull needed</p>
                </div>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ─── DEFAULT RISK TAB ────────────────────────────────────────────── */}
        <TabsContent value="default-risk" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Default Risk Input</CardTitle>
                <CardDescription>Analyze client payment behavior to predict default probability</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Credit Limit ($)</Label><Input type="number" value={defaultInput.creditLimit} onChange={e => setDefaultInput(p => ({ ...p, creditLimit: parseInt(e.target.value) || 0 }))} data-testid="input-def-limit" /></div>
                  <div><Label className="text-xs">Current Balance ($)</Label><Input type="number" value={defaultInput.balance} onChange={e => setDefaultInput(p => ({ ...p, balance: parseInt(e.target.value) || 0 }))} data-testid="input-def-balance" /></div>
                </div>
                <div>
                  <Label className="text-xs">Payment History (comma-sep: 0=on-time, -1=late, -2=missed)</Label>
                  <Input value={defaultInput.paymentHistory.join(",")} onChange={e => setDefaultInput(p => ({ ...p, paymentHistory: e.target.value.split(",").map(Number).filter(n => !isNaN(n)) }))} data-testid="input-def-history" />
                </div>
                <div>
                  <Label className="text-xs">Monthly Bill Amounts (comma-sep)</Label>
                  <Input value={defaultInput.billAmounts.join(",")} onChange={e => setDefaultInput(p => ({ ...p, billAmounts: e.target.value.split(",").map(Number).filter(n => !isNaN(n)) }))} />
                </div>
                <div>
                  <Label className="text-xs">Monthly Payment Amounts (comma-sep)</Label>
                  <Input value={defaultInput.payAmounts.join(",")} onChange={e => setDefaultInput(p => ({ ...p, payAmounts: e.target.value.split(",").map(Number).filter(n => !isNaN(n)) }))} />
                </div>
                <Button onClick={() => defaultMutation.mutate()} disabled={defaultMutation.isPending} className="w-full" data-testid="btn-default-analyze">
                  {defaultMutation.isPending ? "Analyzing..." : "Predict Default Risk"}
                </Button>
              </CardContent>
            </Card>

            {defaultResult && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5" /> Risk Assessment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center space-y-2">
                      <div className={`text-5xl font-bold ${
                        defaultResult.riskSegment === "low" ? "text-green-500" :
                        defaultResult.riskSegment === "medium" ? "text-yellow-500" :
                        defaultResult.riskSegment === "high" ? "text-orange-500" : "text-red-500"
                      }`} data-testid="text-default-probability">
                        {defaultResult.defaultProbability}%
                      </div>
                      <div className="text-sm text-muted-foreground">Default Probability</div>
                      <Badge variant={
                        defaultResult.riskSegment === "low" ? "default" :
                        defaultResult.riskSegment === "medium" ? "secondary" :
                        defaultResult.riskSegment === "high" ? "outline" : "destructive"
                      } className="text-sm" data-testid="badge-risk-segment">
                        {defaultResult.riskSegment.toUpperCase()} RISK
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm"><span>Risk Score</span><span className="font-medium">{defaultResult.riskScore} / 1000</span></div>
                      <Progress value={defaultResult.riskScore / 10} className="h-2" />
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {defaultResult.monthlyTrend === "improving" ? <TrendingUp className="w-4 h-4 text-green-500" /> :
                       defaultResult.monthlyTrend === "declining" ? <TrendingDown className="w-4 h-4 text-red-500" /> :
                       <Minus className="w-4 h-4 text-yellow-500" />}
                      <span>Spending trend: <strong>{defaultResult.monthlyTrend}</strong></span>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-sm" data-testid="text-segment-desc">
                      {defaultResult.segmentDescription}
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm" data-testid="text-recommendation">
                      <div className="font-medium text-blue-500 mb-1">Recommendation</div>
                      {defaultResult.recommendation}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5" /> Risk Factors</CardTitle>
                    <CardDescription>Weighted factor analysis driving default prediction</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {defaultResult.factors.map((f: any, i: number) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{f.name}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant={f.impact === "positive" ? "default" : f.impact === "neutral" ? "secondary" : "destructive"} className="text-xs">
                              {f.impact}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{f.weight}%</span>
                          </div>
                        </div>
                        <Progress value={f.impact === "positive" ? 85 : f.impact === "neutral" ? 50 : 20} className="h-1.5" />
                        <p className="text-xs text-muted-foreground">{f.detail}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </TabsContent>

        {/* ─── SALES REPORTS TAB ───────────────────────────────────────────── */}
        <TabsContent value="sales" className="space-y-6">
          <div className="flex items-center gap-4 mb-4">
            <Select value={salesPeriod} onValueChange={setSalesPeriod}>
              <SelectTrigger className="w-40" data-testid="select-period"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Today</SelectItem>
                <SelectItem value="weekly">This Week</SelectItem>
                <SelectItem value="monthly">This Month</SelectItem>
                <SelectItem value="yearly">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {salesReport && salesReport.totalRevenue !== undefined && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Revenue", value: `$${((salesReport.totalRevenue || 0) / 100).toLocaleString()}`, icon: DollarSign, color: "text-green-500" },
                  { label: "Total Sales", value: salesReport.totalSales || 0, icon: Receipt, color: "text-blue-500" },
                  { label: "Average Ticket", value: `$${((salesReport.averageTicket || 0) / 100).toLocaleString()}`, icon: CreditCard, color: "text-purple-500" },
                  { label: "Unpaid", value: `$${((salesReport.unpaidAmount || 0) / 100).toLocaleString()}`, icon: AlertTriangle, color: (salesReport.unpaidAmount || 0) > 0 ? "text-red-500" : "text-green-500" },
                ].map(stat => (
                  <Card key={stat.label}>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <stat.icon className={`w-8 h-8 ${stat.color}`} />
                        <div>
                          <div className="text-2xl font-bold">{stat.value}</div>
                          <div className="text-xs text-muted-foreground">{stat.label}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-base">Revenue by Type</CardTitle></CardHeader>
                  <CardContent>
                    {(salesReport.topServices || []).length > 0 ? (
                      <div className="space-y-3">
                        {salesReport.topServices.map((s: any, i: number) => (
                          <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{s.type}</Badge>
                              <span className="text-sm text-muted-foreground">{s.count} sales</span>
                            </div>
                            <span className="font-bold">${(s.revenue / 100).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-6">No sales data for this period</p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Sales Breakdown</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Cash/Card Sales</span>
                        <Badge>{salesReport.cashSales || 0}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Credit Sales (Deferred)</span>
                        <Badge variant="secondary">{salesReport.creditSales || 0}</Badge>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t">
                        <span className="text-sm font-medium">Paid Amount</span>
                        <span className="font-bold text-green-500">${((salesReport.paidAmount || 0) / 100).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Outstanding</span>
                        <span className="font-bold text-red-500">${((salesReport.unpaidAmount || 0) / 100).toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* ─── FORECAST TAB ────────────────────────────────────────────────── */}
        <TabsContent value="forecast" className="space-y-6">
          {forecast && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "This Month (Projected)", value: `$${(forecast.currentMonthProjected / 100).toLocaleString()}` },
                  { label: "Next Month", value: `$${(forecast.nextMonthProjected / 100).toLocaleString()}` },
                  { label: "This Quarter", value: `$${(forecast.quarterProjected / 100).toLocaleString()}` },
                  { label: "This Year", value: `$${(forecast.yearProjected / 100).toLocaleString()}` },
                ].map(f => (
                  <Card key={f.label}>
                    <CardContent className="pt-4 text-center">
                      <div className="text-2xl font-bold">{f.value}</div>
                      <div className="text-xs text-muted-foreground">{f.label}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Growth Rate</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <span className={`text-5xl font-bold ${forecast.growthRate >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {forecast.growthRate >= 0 ? "+" : ""}{forecast.growthRate}%
                      </span>
                      <p className="text-sm text-muted-foreground mt-2">Month-over-month</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><PieChart className="w-4 h-4" /> Recurring Revenue</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <span className="text-3xl font-bold text-blue-500">${(forecast.recurringRevenue / 100).toLocaleString()}</span>
                      <p className="text-sm text-muted-foreground mt-2">Estimated monthly recurring</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> At-Risk Revenue</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <span className={`text-3xl font-bold ${forecast.atRiskRevenue > 0 ? "text-red-500" : "text-green-500"}`}>
                        ${(forecast.atRiskRevenue / 100).toLocaleString()}
                      </span>
                      <p className="text-sm text-muted-foreground mt-2">Overdue credit sales</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* ─── CREDIT SALES TAB ────────────────────────────────────────────── */}
        <TabsContent value="credit-sales" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Credit Sales (Deferred Payment)</h3>
              <p className="text-sm text-muted-foreground">Track services provided on credit with payment tracking</p>
            </div>
            <Button onClick={() => setCreditSaleOpen(true)} data-testid="button-new-credit-sale">
              <Receipt className="w-4 h-4 mr-2" /> New Credit Sale
            </Button>
          </div>

          <Card>
            <CardContent className="pt-4">
              {creditSales.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creditSales.map((sale: any) => (
                      <TableRow key={sale.id} data-testid={`row-sale-${sale.id}`}>
                        <TableCell className="font-medium">{sale.first_name} {sale.last_name}</TableCell>
                        <TableCell>{sale.description}</TableCell>
                        <TableCell>${(sale.amount / 100).toLocaleString()}</TableCell>
                        <TableCell className="text-green-500">${((sale.paid_amount || 0) / 100).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={sale.payment_status === "paid" ? "default" : sale.payment_status === "partial" ? "secondary" : "destructive"}>
                            {sale.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{sale.due_date ? new Date(sale.due_date).toLocaleDateString() : "—"}</TableCell>
                        <TableCell>
                          {sale.payment_status !== "paid" && (
                            <Button size="sm" variant="outline" onClick={() => {
                              const amt = prompt("Payment amount ($):");
                              if (amt) paymentMutation.mutate({ saleId: sale.id, amount: Math.round(parseFloat(amt) * 100) });
                            }} data-testid={`button-pay-${sale.id}`}>
                              <DollarSign className="w-3 h-3 mr-1" /> Record Payment
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Receipt className="w-10 h-10 mx-auto opacity-50 mb-3" />
                  <p>No credit sales yet. Create one to track deferred payments.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── NEW CREDIT SALE DIALOG ─────────────────────────────────────────── */}
      <Dialog open={creditSaleOpen} onOpenChange={setCreditSaleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Credit Sale</DialogTitle>
            <DialogDescription>Create a deferred payment sale for a client</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Client</Label>
              <Select value={saleForm.clientId} onValueChange={v => setSaleForm(f => ({ ...f, clientId: v }))}>
                <SelectTrigger data-testid="select-sale-client"><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Input value={saleForm.description} onChange={e => setSaleForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g., Tradeline placement, Dispute package" data-testid="input-sale-desc" /></div>
            <div><Label>Amount ($)</Label><Input type="number" step="0.01" value={saleForm.amount} onChange={e => setSaleForm(f => ({ ...f, amount: e.target.value }))} data-testid="input-sale-amount" /></div>
            <div><Label>Credit Terms</Label><Input value={saleForm.creditTerms} onChange={e => setSaleForm(f => ({ ...f, creditTerms: e.target.value }))} placeholder="e.g., Net 30, 3 installments" /></div>
            <div><Label>Due Date</Label><Input type="date" value={saleForm.dueDate} onChange={e => setSaleForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
            <div><Label>Notes</Label><Input value={saleForm.notes} onChange={e => setSaleForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditSaleOpen(false)}>Cancel</Button>
            <Button onClick={() => createSaleMutation.mutate()} disabled={!saleForm.clientId || !saleForm.description || !saleForm.amount || createSaleMutation.isPending} data-testid="button-create-sale">
              {createSaleMutation.isPending ? "Creating..." : "Create Credit Sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
