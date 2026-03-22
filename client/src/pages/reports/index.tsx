import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Search, Plus, Activity, TrendingUp, AlertTriangle, Brain, ClipboardList, FileText, Sparkles } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const emptyPullForm = {
  clientId: "", equifaxScore: "", experianScore: "", transunionScore: "",
  negativeItems: "", negativeItemsList: "", runAnalysis: true,
};

export default function Reports() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [pullOpen, setPullOpen] = useState(false);
  const [pullForm, setPullForm] = useState(emptyPullForm);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisContent, setAnalysisContent] = useState("");
  const [analyzeItems, setAnalyzeItems] = useState("");
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const { data: reports = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/reports"] });
  const { data: clients = [] } = useQuery<any[]>({ queryKey: ["/api/clients"] });

  const clientMap = Object.fromEntries(clients.map((c: any) => [c.id, c]));

  const pullMutation = useMutation({
    mutationFn: async (data: any) => { const r = await apiRequest("POST", "/api/reports/pull", data); return r.json(); },
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["/api/reports"] });
      qc.invalidateQueries({ queryKey: ["/api/clients"] });
      qc.invalidateQueries({ queryKey: ["/api/notifications"] });
      qc.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      setPullOpen(false);
      setPullForm(emptyPullForm);
      if (res.analysis) {
        setAnalysisContent(res.analysis);
        setAnalysisOpen(true);
      }
      toast({ title: res.analysis ? "Report pulled & analyzed!" : "Report pulled!" });
    },
    onError: () => toast({ title: "Error pulling report", variant: "destructive" }),
  });

  const analyzeMutation = useMutation({
    mutationFn: async ({ id, negativeItems }: { id: string; negativeItems: string[] }) => {
      const r = await apiRequest("POST", `/api/reports/${id}/analyze`, { negativeItems }); return r.json();
    },
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["/api/reports"] });
      setAnalyzingId(null);
      setAnalyzeItems("");
      setAnalysisContent(res.analysis);
      setAnalysisOpen(true);
      toast({ title: "AI analysis complete!" });
    },
    onError: () => {
      setAnalyzingId(null);
      toast({ title: "AI analysis failed", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/reports/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/reports"] });
      toast({ title: "Report updated!" });
    },
  });

  const filtered = reports.filter((r: any) => {
    const c = clientMap[r.clientId];
    const name = c ? `${c.firstName} ${c.lastName}` : "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const avgImprovement = reports.length > 0
    ? Math.round(reports.reduce((s: number, r: any) => s + (r.equifaxChange ?? 0), 0) / reports.length)
    : 0;

  const parseNum = (v: string) => v !== "" ? parseInt(v) : undefined;

  const handleClientSelect = (clientId: string) => {
    const c = clientMap[clientId];
    setPullForm(f => ({
      ...f,
      clientId,
      equifaxScore: c?.equifaxScore?.toString() || "",
      experianScore: c?.experianScore?.toString() || "",
      transunionScore: c?.transunionScore?.toString() || "",
    }));
  };

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-reports-title">Credit Reports</h1>
            <p className="text-muted-foreground mt-1">Pull, analyze, and track credit report history for all clients.</p>
          </div>
          <Button className="bg-primary text-primary-foreground" onClick={() => setPullOpen(true)} data-testid="button-pull-report">
            <ClipboardList className="w-4 h-4 mr-2" /> Pull Report
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="glass-panel border-l-4 border-l-primary">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Activity className="w-4 h-4 text-primary" />Total Reports</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold" data-testid="text-total-reports">{reports.length}</div></CardContent>
          </Card>
          <Card className="glass-panel border-l-4 border-l-success">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><TrendingUp className="w-4 h-4 text-success" />Avg Score Change</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{avgImprovement >= 0 ? "+" : ""}{avgImprovement} pts</div></CardContent>
          </Card>
          <Card className="glass-panel border-l-4 border-l-amber-500">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" />Needs Review</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{reports.filter((r: any) => r.status === "pending").length}</div></CardContent>
          </Card>
          <Card className="glass-panel border-l-4 border-l-violet-500">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Brain className="w-4 h-4 text-violet-500" />AI Analyzed</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{reports.filter((r: any) => r.status === "analyzed").length}</div></CardContent>
          </Card>
        </div>

        <Card className="glass-panel">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div><CardTitle>Credit Report History</CardTitle><CardDescription>All report pulls, scores, and AI analysis results.</CardDescription></div>
              <div className="relative sm:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search client..." className="pl-8 bg-background" value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-reports" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-10 text-muted-foreground">Loading reports...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No reports yet. Pull a credit report above.</p>
              </div>
            ) : (
              <div className="rounded-md border bg-background/50">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client & Date</TableHead>
                      <TableHead>Equifax</TableHead>
                      <TableHead>Experian</TableHead>
                      <TableHead>TransUnion</TableHead>
                      <TableHead>Neg. Items</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r: any) => {
                      const c = clientMap[r.clientId];
                      const clientName = c ? `${c.firstName} ${c.lastName}` : "Unknown";
                      return (
                        <TableRow key={r.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium" data-testid={`text-report-client-${r.id}`}>{clientName}</p>
                              <p className="text-xs text-muted-foreground">{r.pullDate ? format(new Date(r.pullDate), "MMM d, yyyy h:mm a") : "—"}</p>
                            </div>
                          </TableCell>
                          {[
                            { score: r.equifaxScore, change: r.equifaxChange },
                            { score: r.experianScore, change: r.experianChange },
                            { score: r.transunionScore, change: r.transunionChange },
                          ].map((b, i) => (
                            <TableCell key={i}>
                              <div>
                                <p className="font-bold">{b.score ?? "—"}</p>
                                {b.change != null && (
                                  <p className={`text-xs ${b.change > 0 ? 'text-success' : b.change < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                    {b.change > 0 ? "+" : ""}{b.change} pts
                                  </p>
                                )}
                              </div>
                            </TableCell>
                          ))}
                          <TableCell><Badge variant="outline">{r.negativeItems ?? 0}</Badge></TableCell>
                          <TableCell>
                            <Badge variant={r.status === "analyzed" ? "default" : "secondary"}
                              className={r.status === "analyzed" ? "bg-violet-600 hover:bg-violet-700" : "bg-amber-100 text-amber-700"}>
                              {r.status === "analyzed" ? "AI Analyzed" : "Needs Review"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {r.status === "analyzed" && r.rawData ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-violet-600 border-violet-300"
                                  onClick={() => { setAnalysisContent(r.rawData); setAnalysisOpen(true); }}
                                  data-testid={`button-view-analysis-${r.id}`}
                                >
                                  <FileText className="w-3.5 h-3.5 mr-1" /> View Analysis
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-violet-600 border-violet-300"
                                  onClick={() => {
                                    setAnalyzingId(r.id);
                                  }}
                                  disabled={analyzeMutation.isPending}
                                  data-testid={`button-analyze-${r.id}`}
                                >
                                  <Sparkles className="w-3.5 h-3.5 mr-1" /> {analyzeMutation.isPending ? "Analyzing..." : "AI Analyze"}
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" onClick={() => updateMutation.mutate({ id: r.id, data: { status: r.status === "analyzed" ? "pending" : "analyzed" } })}>
                                {r.status === "analyzed" ? "Reopen" : "Mark Done"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={pullOpen} onOpenChange={setPullOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Pull Credit Report</DialogTitle>
            <DialogDescription>Select a client and enter their bureau scores. Optionally run AI analysis.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2 col-span-2">
              <Label>Client *</Label>
              <Select value={pullForm.clientId} onValueChange={handleClientSelect}>
                <SelectTrigger data-testid="select-pull-client"><SelectValue placeholder="Select client..." /></SelectTrigger>
                <SelectContent>
                  {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Equifax Score</Label>
              <Input type="number" value={pullForm.equifaxScore} onChange={e => setPullForm(f => ({ ...f, equifaxScore: e.target.value }))} placeholder="650" data-testid="input-report-eq" />
            </div>
            <div className="space-y-2">
              <Label>Experian Score</Label>
              <Input type="number" value={pullForm.experianScore} onChange={e => setPullForm(f => ({ ...f, experianScore: e.target.value }))} placeholder="645" data-testid="input-report-ex" />
            </div>
            <div className="space-y-2">
              <Label>TransUnion Score</Label>
              <Input type="number" value={pullForm.transunionScore} onChange={e => setPullForm(f => ({ ...f, transunionScore: e.target.value }))} placeholder="655" data-testid="input-report-tu" />
            </div>
            <div className="space-y-2">
              <Label>Negative Items Count</Label>
              <Input type="number" value={pullForm.negativeItems} onChange={e => setPullForm(f => ({ ...f, negativeItems: e.target.value }))} placeholder="4" data-testid="input-report-neg" />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Negative Items (one per line for AI)</Label>
              <Textarea
                value={pullForm.negativeItemsList}
                onChange={e => setPullForm(f => ({ ...f, negativeItemsList: e.target.value }))}
                placeholder={"Capital One - Collection $2,450\nEnhanced Recovery - Medical $890\nLate payment - Chase 06/2023"}
                rows={4}
                data-testid="input-report-items"
              />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Checkbox
                id="reportRunAnalysis"
                checked={pullForm.runAnalysis}
                onCheckedChange={(v) => setPullForm(f => ({ ...f, runAnalysis: !!v }))}
                data-testid="checkbox-report-analysis"
              />
              <Label htmlFor="reportRunAnalysis" className="cursor-pointer">
                Run AI Credit Analysis (GPT-4o strategy report)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPullOpen(false)}>Cancel</Button>
            <Button
              onClick={() => pullMutation.mutate({
                clientId: pullForm.clientId,
                equifaxScore: parseNum(pullForm.equifaxScore),
                experianScore: parseNum(pullForm.experianScore),
                transunionScore: parseNum(pullForm.transunionScore),
                negativeItems: parseNum(pullForm.negativeItems),
                negativeItemsList: pullForm.negativeItemsList.split("\n").filter(Boolean),
                runAnalysis: pullForm.runAnalysis,
              })}
              disabled={pullMutation.isPending || !pullForm.clientId || (!pullForm.equifaxScore && !pullForm.experianScore && !pullForm.transunionScore)}
              data-testid="button-submit-report-pull"
            >
              {pullMutation.isPending ? (pullForm.runAnalysis ? "Pulling & Analyzing..." : "Pulling Report...") : "Pull Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={analyzingId !== null} onOpenChange={(v) => { if (!v) setAnalyzingId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>AI Credit Analysis</DialogTitle>
            <DialogDescription>Add negative items for a more accurate analysis (optional).</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Negative Items (one per line)</Label>
            <Textarea
              value={analyzeItems}
              onChange={e => setAnalyzeItems(e.target.value)}
              placeholder={"Capital One - Collection $2,450\nLate payment - Chase 06/2023"}
              rows={4}
              data-testid="input-analyze-items"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnalyzingId(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!analyzingId) return;
                analyzeMutation.mutate({ id: analyzingId, negativeItems: analyzeItems.split("\n").filter(Boolean) });
              }}
              disabled={analyzeMutation.isPending}
              data-testid="button-run-analyze"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {analyzeMutation.isPending ? "Analyzing..." : "Run AI Analysis"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={analysisOpen} onOpenChange={setAnalysisOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-violet-500" /> AI Credit Analysis Report
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh] pr-2">
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed" data-testid="text-analysis-content">
              {analysisContent}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              navigator.clipboard.writeText(analysisContent);
              toast({ title: "Analysis copied to clipboard!" });
            }}>
              Copy
            </Button>
            <Button variant="outline" onClick={() => {
              const w = window.open("", "_blank");
              if (w) {
                const pre = w.document.createElement("pre");
                pre.style.cssText = "font-family:system-ui;font-size:13px;padding:40px;max-width:800px;margin:auto;line-height:1.6;white-space:pre-wrap";
                pre.textContent = analysisContent;
                w.document.body.appendChild(pre);
                w.print();
              }
            }}>
              Print
            </Button>
            <Button onClick={() => setAnalysisOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}