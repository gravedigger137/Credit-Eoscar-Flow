import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState, useRef } from "react";
import {
  FileUp, Shield, Zap, TrendingUp, AlertTriangle, CheckCircle2, XCircle,
  Upload, BarChart3, Target, ArrowUpRight, ArrowDownRight, Minus, Info,
  CreditCard, Building2, FileText, Calculator, Settings2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ParsedReport {
  bureau: string;
  reportDate: string | null;
  scores: { equifax: number | null; experian: number | null; transunion: number | null };
  accounts: any[];
  negativeItems: any[];
  inquiries: any[];
  publicRecords: any[];
  summary: {
    totalAccounts: number; openAccounts: number; closedAccounts: number;
    negativeAccounts: number; totalBalance: number; totalCreditLimit: number;
    utilizationPercent: number; inquiryCount: number; publicRecordCount: number;
  };
}

interface SimulationResult {
  currentScore: number;
  projectedScore: number;
  scoreChange: number;
  breakdown: { action: string; impact: number; explanation: string; timeframe: string; difficulty: string }[];
  scoreRange: { low: number; high: number };
  utilizationBefore: number;
  utilizationAfter: number;
}

const defaultFactors = {
  currentScore: 580, totalAccounts: 8, negativeAccounts: 3,
  totalBalance: 12000, totalCreditLimit: 20000, inquiryCount: 4,
  oldestAccountYears: 5, latePayments30: 2, latePayments60: 1,
  latePayments90: 0, collections: 2, chargeOffs: 1,
  publicRecords: 0, hasOpenMortgage: false, hasOpenAutoLoan: false, hasOpenCreditCard: true,
};

const actionTypes = [
  { value: "remove_collection", label: "Remove Collection Account", icon: XCircle },
  { value: "remove_chargeoff", label: "Remove Charge-Off", icon: XCircle },
  { value: "remove_late_payment", label: "Remove Late Payment", icon: AlertTriangle },
  { value: "remove_public_record", label: "Remove Public Record", icon: Shield },
  { value: "pay_down_balance", label: "Pay Down Balances", icon: CreditCard },
  { value: "add_authorized_user", label: "Add Authorized User (AU)", icon: Building2 },
  { value: "open_secured_card", label: "Open Secured Credit Card", icon: CreditCard },
  { value: "remove_inquiry", label: "Remove Hard Inquiry", icon: FileText },
  { value: "settle_debt", label: "Settle Debt", icon: Calculator },
  { value: "pay_collection", label: "Pay Collection in Full", icon: CheckCircle2 },
  { value: "goodwill_removal", label: "Goodwill Deletion Letter", icon: FileText },
  { value: "dispute_inaccuracy", label: "Dispute Inaccurate Item", icon: Shield },
];

function ScoreGauge({ score, label, size = "lg" }: { score: number; label: string; size?: "sm" | "lg" }) {
  const color = score >= 740 ? "text-green-500" : score >= 670 ? "text-yellow-500" : score >= 580 ? "text-orange-500" : "text-red-500";
  const bg = score >= 740 ? "bg-green-500/10" : score >= 670 ? "bg-yellow-500/10" : score >= 580 ? "bg-orange-500/10" : "bg-red-500/10";
  const rating = score >= 800 ? "Exceptional" : score >= 740 ? "Very Good" : score >= 670 ? "Good" : score >= 580 ? "Fair" : "Poor";
  return (
    <div className={`flex flex-col items-center ${size === "lg" ? "p-6" : "p-3"} rounded-xl ${bg}`}>
      <span className={`${size === "lg" ? "text-5xl" : "text-3xl"} font-bold ${color}`} data-testid={`score-${label.toLowerCase()}`}>{score}</span>
      <span className="text-sm text-muted-foreground mt-1">{label}</span>
      <Badge variant="outline" className={`mt-1 ${color}`}>{rating}</Badge>
    </div>
  );
}

export default function Bureau() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsedReport, setParsedReport] = useState<ParsedReport | null>(null);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [factors, setFactors] = useState(defaultFactors);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [configOpen, setConfigOpen] = useState(false);
  const [configBureau, setConfigBureau] = useState("equifax");
  const [configForm, setConfigForm] = useState({ apiKey: "", apiSecret: "", clientId: "", memberId: "", environment: "sandbox" });

  const { data: bureauStatus } = useQuery<Record<string, { configured: boolean; environment: string }>>({
    queryKey: ["/api/bureau/status-all"],
  });

  const parseMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/credit-report/parse", { method: "POST", body: fd, credentials: "include" });
      if (!r.ok) throw new Error((await r.json()).message || "Parse failed");
      return r.json();
    },
    onSuccess: (data: ParsedReport) => {
      setParsedReport(data);
      if (data.summary) {
        setFactors(prev => ({
          ...prev,
          totalAccounts: data.summary.totalAccounts,
          negativeAccounts: data.summary.negativeAccounts,
          totalBalance: data.summary.totalBalance,
          totalCreditLimit: data.summary.totalCreditLimit,
          inquiryCount: data.summary.inquiryCount,
          ...(data.scores.equifax ? { currentScore: data.scores.equifax } :
              data.scores.experian ? { currentScore: data.scores.experian } :
              data.scores.transunion ? { currentScore: data.scores.transunion } : {}),
        }));
      }
      toast({ title: "Report Parsed", description: `Found ${data.accounts.length} accounts, ${data.negativeItems.length} negative items` });
    },
    onError: (e: any) => toast({ title: "Parse Error", description: e.message, variant: "destructive" }),
  });

  const simulateMutation = useMutation({
    mutationFn: async () => {
      const actions = selectedActions.map(type => ({ type }));
      const r = await apiRequest("POST", "/api/score-simulator/simulate", { factors, actions });
      return r.json();
    },
    onSuccess: (data: SimulationResult) => setSimResult(data),
    onError: (e: any) => toast({ title: "Simulation Error", description: e.message, variant: "destructive" }),
  });

  const recommendMutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/score-simulator/recommend", factors);
      return r.json();
    },
    onSuccess: (data: any) => {
      setSimResult(data.simulation);
      setSelectedActions(data.recommendations.map((a: any) => a.type));
      toast({ title: "Recommendations Ready", description: `${data.recommendations.length} actions recommended` });
    },
  });

  const configureMutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/bureau/configure", { bureau: configBureau, ...configForm });
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "Saved", description: `${configBureau} credentials configured` });
      setConfigOpen(false);
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseMutation.mutate(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const toggleAction = (type: string) => {
    setSelectedActions(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  return (
    <Shell title="Bureau & Score Simulator" subtitle="Credit report parsing, bureau API integrations, and score simulation">
      <Tabs defaultValue="parser" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-xl">
          <TabsTrigger value="parser" data-testid="tab-parser"><FileUp className="w-4 h-4 mr-2" /> Report Parser</TabsTrigger>
          <TabsTrigger value="simulator" data-testid="tab-simulator"><TrendingUp className="w-4 h-4 mr-2" /> Score Simulator</TabsTrigger>
          <TabsTrigger value="bureaus" data-testid="tab-bureaus"><Building2 className="w-4 h-4 mr-2" /> Bureau APIs</TabsTrigger>
        </TabsList>

        {/* ─── REPORT PARSER TAB ──────────────────────────────────────────────── */}
        <TabsContent value="parser" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Upload className="w-5 h-5" /> Upload Credit Report</CardTitle>
                <CardDescription>Upload a PDF credit report from any bureau to auto-extract accounts, scores, and negative items</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <input ref={fileRef} type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
                <Button onClick={() => fileRef.current?.click()} disabled={parseMutation.isPending} className="w-full" size="lg" data-testid="button-upload-report">
                  <FileUp className="w-5 h-5 mr-2" />
                  {parseMutation.isPending ? "Parsing..." : "Upload PDF Report"}
                </Button>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Supported formats: Equifax, Experian, TransUnion PDF reports</p>
                  <p>Also works with SmartCredit, IdentityIQ, Credit.net, and Annual Credit Report PDFs</p>
                </div>
                {parsedReport && (
                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium">Report Parsed Successfully</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Bureau:</span><Badge>{parsedReport.bureau}</Badge></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Accounts:</span><span className="font-medium">{parsedReport.summary.totalAccounts}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Negative:</span><span className="font-medium text-red-500">{parsedReport.summary.negativeAccounts}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Inquiries:</span><span className="font-medium">{parsedReport.summary.inquiryCount}</span></div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {parsedReport ? (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Report Summary</CardTitle>
                  <CardDescription>Auto-extracted from {parsedReport.bureau} credit report</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    {parsedReport.scores.equifax && <ScoreGauge score={parsedReport.scores.equifax} label="Equifax" size="sm" />}
                    {parsedReport.scores.experian && <ScoreGauge score={parsedReport.scores.experian} label="Experian" size="sm" />}
                    {parsedReport.scores.transunion && <ScoreGauge score={parsedReport.scores.transunion} label="TransUnion" size="sm" />}
                    {!parsedReport.scores.equifax && !parsedReport.scores.experian && !parsedReport.scores.transunion && (
                      <div className="col-span-3 text-sm text-muted-foreground text-center py-4">No scores detected in report</div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "Total Balance", value: `$${parsedReport.summary.totalBalance.toLocaleString()}`, color: "" },
                      { label: "Credit Limit", value: `$${parsedReport.summary.totalCreditLimit.toLocaleString()}`, color: "" },
                      { label: "Utilization", value: `${parsedReport.summary.utilizationPercent}%`,
                        color: parsedReport.summary.utilizationPercent > 30 ? "text-red-500" : "text-green-500" },
                      { label: "Public Records", value: parsedReport.summary.publicRecordCount.toString(),
                        color: parsedReport.summary.publicRecordCount > 0 ? "text-red-500" : "text-green-500" },
                    ].map(s => (
                      <div key={s.label} className="bg-muted/50 rounded-lg p-3 text-center">
                        <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                        <div className="text-xs text-muted-foreground">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="lg:col-span-2 flex items-center justify-center min-h-[300px]">
                <div className="text-center text-muted-foreground space-y-3">
                  <FileText className="w-12 h-12 mx-auto opacity-50" />
                  <p className="text-lg font-medium">No Report Loaded</p>
                  <p className="text-sm">Upload a credit report PDF to auto-extract all account data</p>
                </div>
              </Card>
            )}
          </div>

          {parsedReport && parsedReport.negativeItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-500"><AlertTriangle className="w-5 h-5" /> Negative Items ({parsedReport.negativeItems.length})</CardTitle>
                <CardDescription>These items are hurting the credit score — dispute or resolve them to improve</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Creditor</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedReport.negativeItems.map((item: any, i: number) => (
                      <TableRow key={i} data-testid={`row-negative-${i}`}>
                        <TableCell className="font-medium">{item.creditorName}</TableCell>
                        <TableCell><Badge variant="outline">{item.accountType}</Badge></TableCell>
                        <TableCell><Badge variant="destructive">{item.negativeReason || "Derogatory"}</Badge></TableCell>
                        <TableCell>{item.currentBalance ? `$${item.currentBalance.toLocaleString()}` : "—"}</TableCell>
                        <TableCell>{item.paymentStatus}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {parsedReport && parsedReport.accounts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" /> All Accounts ({parsedReport.accounts.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Creditor</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Limit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Opened</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedReport.accounts.map((acct: any, i: number) => (
                      <TableRow key={i} data-testid={`row-account-${i}`}>
                        <TableCell className="font-medium">{acct.creditorName}</TableCell>
                        <TableCell><Badge variant="outline">{acct.accountType}</Badge></TableCell>
                        <TableCell>{acct.currentBalance ? `$${acct.currentBalance.toLocaleString()}` : "—"}</TableCell>
                        <TableCell>{acct.creditLimit ? `$${acct.creditLimit.toLocaleString()}` : "—"}</TableCell>
                        <TableCell>
                          <Badge variant={acct.isNegative ? "destructive" : "default"}>
                            {acct.accountStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{acct.dateOpened || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── SCORE SIMULATOR TAB ────────────────────────────────────────────── */}
        <TabsContent value="simulator" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calculator className="w-5 h-5" /> Client Profile</CardTitle>
                <CardDescription>Enter current credit profile or auto-fill from a parsed report</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Current Score</Label>
                  <Input type="number" value={factors.currentScore} onChange={e => setFactors(f => ({ ...f, currentScore: parseInt(e.target.value) || 300 }))} data-testid="input-current-score" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Total Accounts</Label><Input type="number" value={factors.totalAccounts} onChange={e => setFactors(f => ({ ...f, totalAccounts: parseInt(e.target.value) || 0 }))} /></div>
                  <div><Label>Negative Accounts</Label><Input type="number" value={factors.negativeAccounts} onChange={e => setFactors(f => ({ ...f, negativeAccounts: parseInt(e.target.value) || 0 }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Total Balance</Label><Input type="number" value={factors.totalBalance} onChange={e => setFactors(f => ({ ...f, totalBalance: parseInt(e.target.value) || 0 }))} /></div>
                  <div><Label>Credit Limit</Label><Input type="number" value={factors.totalCreditLimit} onChange={e => setFactors(f => ({ ...f, totalCreditLimit: parseInt(e.target.value) || 0 }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Collections</Label><Input type="number" value={factors.collections} onChange={e => setFactors(f => ({ ...f, collections: parseInt(e.target.value) || 0 }))} /></div>
                  <div><Label>Charge-Offs</Label><Input type="number" value={factors.chargeOffs} onChange={e => setFactors(f => ({ ...f, chargeOffs: parseInt(e.target.value) || 0 }))} /></div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label className="text-xs">30-Day Lates</Label><Input type="number" value={factors.latePayments30} onChange={e => setFactors(f => ({ ...f, latePayments30: parseInt(e.target.value) || 0 }))} /></div>
                  <div><Label className="text-xs">60-Day Lates</Label><Input type="number" value={factors.latePayments60} onChange={e => setFactors(f => ({ ...f, latePayments60: parseInt(e.target.value) || 0 }))} /></div>
                  <div><Label className="text-xs">90-Day Lates</Label><Input type="number" value={factors.latePayments90} onChange={e => setFactors(f => ({ ...f, latePayments90: parseInt(e.target.value) || 0 }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Inquiries</Label><Input type="number" value={factors.inquiryCount} onChange={e => setFactors(f => ({ ...f, inquiryCount: parseInt(e.target.value) || 0 }))} /></div>
                  <div><Label>Public Records</Label><Input type="number" value={factors.publicRecords} onChange={e => setFactors(f => ({ ...f, publicRecords: parseInt(e.target.value) || 0 }))} /></div>
                </div>
                <div><Label>Oldest Account (years)</Label><Input type="number" value={factors.oldestAccountYears} onChange={e => setFactors(f => ({ ...f, oldestAccountYears: parseInt(e.target.value) || 0 }))} /></div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Target className="w-5 h-5" /> Repair Actions</CardTitle>
                <CardDescription>Select credit repair actions to simulate their score impact</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {actionTypes.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => toggleAction(value)}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                        selectedActions.includes(value)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                      data-testid={`action-${value}`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">{label}</span>
                    </button>
                  ))}
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={() => simulateMutation.mutate()}
                    disabled={selectedActions.length === 0 || simulateMutation.isPending}
                    className="flex-1"
                    data-testid="button-simulate"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    {simulateMutation.isPending ? "Simulating..." : "Simulate Score Change"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => recommendMutation.mutate()}
                    disabled={recommendMutation.isPending}
                    data-testid="button-recommend"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Auto-Recommend
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {simResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Simulation Results</CardTitle>
                <CardDescription>Projected score impact from selected repair actions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <ScoreGauge score={simResult.currentScore} label="Current Score" />
                  <div className="flex flex-col items-center justify-center">
                    <div className={`text-4xl font-bold ${simResult.scoreChange > 0 ? "text-green-500" : simResult.scoreChange < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                      {simResult.scoreChange > 0 ? <ArrowUpRight className="w-8 h-8 inline" /> : simResult.scoreChange < 0 ? <ArrowDownRight className="w-8 h-8 inline" /> : <Minus className="w-8 h-8 inline" />}
                      {simResult.scoreChange > 0 ? "+" : ""}{simResult.scoreChange} pts
                    </div>
                    <span className="text-sm text-muted-foreground mt-1">Projected Change</span>
                    <span className="text-xs text-muted-foreground mt-1">Range: {simResult.scoreRange.low}–{simResult.scoreRange.high}</span>
                  </div>
                  <ScoreGauge score={simResult.projectedScore} label="Projected Score" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-1">Utilization Before</div>
                    <div className="flex items-center gap-3">
                      <Progress value={simResult.utilizationBefore} className="flex-1" />
                      <span className={`font-bold ${simResult.utilizationBefore > 30 ? "text-red-500" : "text-green-500"}`}>{simResult.utilizationBefore}%</span>
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-1">Utilization After</div>
                    <div className="flex items-center gap-3">
                      <Progress value={simResult.utilizationAfter} className="flex-1" />
                      <span className={`font-bold ${simResult.utilizationAfter > 30 ? "text-red-500" : "text-green-500"}`}>{simResult.utilizationAfter}%</span>
                    </div>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Impact</TableHead>
                      <TableHead>Timeframe</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {simResult.breakdown.map((item, i) => (
                      <TableRow key={i} data-testid={`row-result-${i}`}>
                        <TableCell className="font-medium">{item.action}</TableCell>
                        <TableCell>
                          <Badge variant={item.impact > 0 ? "default" : "destructive"}>
                            {item.impact > 0 ? "+" : ""}{item.impact} pts
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{item.timeframe}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            item.difficulty === "Easy" ? "text-green-500 border-green-500" :
                            item.difficulty === "Moderate" ? "text-yellow-500 border-yellow-500" :
                            item.difficulty === "Hard" ? "text-orange-500 border-orange-500" :
                            "text-red-500 border-red-500"
                          }>
                            {item.difficulty}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm max-w-xs truncate">{item.explanation}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── BUREAU APIS TAB ────────────────────────────────────────────────── */}
        <TabsContent value="bureaus" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {(["equifax", "experian", "transunion", "innovis"] as const).map(bureau => {
              const status = bureauStatus?.[bureau];
              const names: Record<string, string> = { equifax: "Equifax", experian: "Experian", transunion: "TransUnion", innovis: "CBC/Innovis" };
              const colors: Record<string, string> = { equifax: "text-red-500", experian: "text-blue-500", transunion: "text-cyan-500", innovis: "text-purple-500" };
              const descriptions: Record<string, string> = {
                equifax: "@flexbase/equifax-node-client — OAuth2 credit report pull via Equifax API Developer Portal",
                experian: "experian-node — Official Experian REST API for consumer credit profiles",
                transunion: "TransUnion TUNA XML API — Direct XML credit report pull via Net Access (shaynaostlund1985/transunion-php spec)",
                innovis: "CBC/Innovis MISMO XML API — 4th bureau merge report pull (webmaxllc/cbc-client spec)",
              };
              return (
                <Card key={bureau}>
                  <CardHeader>
                    <CardTitle className={`flex items-center gap-2 ${colors[bureau]}`}>
                      <Building2 className="w-5 h-5" />
                      {names[bureau]}
                    </CardTitle>
                    <CardDescription className="text-xs">{descriptions[bureau]}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      {status?.configured ? (
                        <><CheckCircle2 className="w-4 h-4 text-green-500" /><span className="text-sm text-green-500">Connected</span></>
                      ) : (
                        <><XCircle className="w-4 h-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Not Configured</span></>
                      )}
                      {status?.configured && (
                        <Badge variant="outline" className="ml-auto">{status.environment}</Badge>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => { setConfigBureau(bureau); setConfigForm({ apiKey: "", apiSecret: "", clientId: "", memberId: "", environment: "sandbox" }); setConfigOpen(true); }}
                      data-testid={`button-configure-${bureau}`}
                    >
                      <Settings2 className="w-4 h-4 mr-2" />
                      {status?.configured ? "Update Credentials" : "Configure API"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Info className="w-5 h-5" /> Bureau API Setup Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <h4 className="font-semibold text-red-500">Equifax</h4>
                  <ol className="list-decimal pl-4 space-y-1 text-muted-foreground">
                    <li>Register at <span className="font-mono text-xs">developer.equifax.com</span></li>
                    <li>Create an app for Consumer Credit v2</li>
                    <li>Copy Client ID and Client Secret</li>
                    <li>Start with Sandbox, switch to Production when approved</li>
                  </ol>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-blue-500">Experian</h4>
                  <ol className="list-decimal pl-4 space-y-1 text-muted-foreground">
                    <li>Apply at <span className="font-mono text-xs">developer.experian.com</span></li>
                    <li>Request Consumer Credit Profile API access</li>
                    <li>Get Client ID and API Key</li>
                    <li>Use Sandbox for testing, Production for live pulls</li>
                  </ol>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-cyan-500">TransUnion</h4>
                  <ol className="list-decimal pl-4 space-y-1 text-muted-foreground">
                    <li>Apply through a TransUnion reseller or direct</li>
                    <li>Receive Member Code and API Key</li>
                    <li>Uses XML-based TUNA API (shaynaostlund1985 spec)</li>
                    <li>Requires SSL cert auth + signed agreement</li>
                  </ol>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-purple-500">CBC / Innovis</h4>
                  <ol className="list-decimal pl-4 space-y-1 text-muted-foreground">
                    <li>Apply at <span className="font-mono text-xs">cbcinnovis.com</span></li>
                    <li>Get Subscriber ID and API Password</li>
                    <li>Uses MISMO 2.3.1 XML format (webmaxllc spec)</li>
                    <li>Supports 4-bureau merge reports</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── CONFIGURE BUREAU DIALOG ────────────────────────────────────────── */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure {configBureau.charAt(0).toUpperCase() + configBureau.slice(1)} API</DialogTitle>
            <DialogDescription>Enter your API credentials for {configBureau}. These are stored securely and used only for credit report pulls.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>API Key / Client Secret</Label><Input type="password" value={configForm.apiKey} onChange={e => setConfigForm(f => ({ ...f, apiKey: e.target.value }))} data-testid="input-api-key" /></div>
            {configBureau === "equifax" && (
              <div><Label>API Secret</Label><Input type="password" value={configForm.apiSecret} onChange={e => setConfigForm(f => ({ ...f, apiSecret: e.target.value }))} /></div>
            )}
            {(configBureau === "experian" || configBureau === "equifax") && (
              <div><Label>Client ID</Label><Input value={configForm.clientId} onChange={e => setConfigForm(f => ({ ...f, clientId: e.target.value }))} /></div>
            )}
            {(configBureau === "transunion" || configBureau === "innovis") && (
              <div><Label>{configBureau === "innovis" ? "Subscriber ID" : "Member Code"}</Label><Input value={configForm.memberId} onChange={e => setConfigForm(f => ({ ...f, memberId: e.target.value }))} /></div>
            )}
            <div>
              <Label>Environment</Label>
              <Select value={configForm.environment} onValueChange={v => setConfigForm(f => ({ ...f, environment: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                  <SelectItem value="production">Production (Live)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>Cancel</Button>
            <Button onClick={() => configureMutation.mutate()} disabled={!configForm.apiKey || configureMutation.isPending} data-testid="button-save-config">
              {configureMutation.isPending ? "Saving..." : "Save Credentials"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
