import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState, useRef } from "react";
import {
  FileText, CheckCircle2, Clock, AlertTriangle, Download,
  RefreshCw, Send, Trash2, Eye, Filter, Building2,
  FilePlus2, TrendingUp, Calendar, Upload, ArrowRightLeft, Shield, Copy
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const BUREAUS = [
  { id: "all", name: "All Bureaus" },
  { id: "equifax", name: "Equifax", color: "text-red-500", badge: "border-red-500 text-red-600" },
  { id: "experian", name: "Experian", color: "text-blue-500", badge: "border-blue-500 text-blue-600" },
  { id: "transunion", name: "TransUnion", color: "text-emerald-500", badge: "border-emerald-500 text-emerald-600" },
];

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  draft:      { label: "Draft",      color: "border-muted text-muted-foreground",   icon: FileText },
  generated:  { label: "Generated",  color: "border-blue-500 text-blue-600",         icon: Download },
  submitted:  { label: "Submitted",  color: "border-emerald-500 text-emerald-600",   icon: CheckCircle2 },
  acknowledged: { label: "ACK'd",   color: "border-indigo-500 text-indigo-600",     icon: CheckCircle2 },
  rejected:   { label: "Rejected",  color: "border-red-500 text-red-600",           icon: AlertTriangle },
  pending:    { label: "Pending",   color: "border-amber-500 text-amber-600",        icon: Clock },
};

function bureauBadge(bureau: string) {
  const b = BUREAUS.find(x => x.id === bureau);
  return b?.badge ?? "border-muted text-muted-foreground";
}

function dollars(cents: number | null | undefined) {
  if (!cents) return "$0";
  return `$${(cents / 100).toLocaleString()}`;
}

export default function Metro2() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [bureauFilter, setBureauFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [viewSubmission, setViewSubmission] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [convertResult, setConvertResult] = useState<any>(null);
  const [convertTarget, setConvertTarget] = useState("metro2");
  const [validateResult, setValidateResult] = useState<any>(null);
  const converterFileRef = useRef<HTMLInputElement>(null);

  const { data: submissions = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/metro2"] });
  const { data: clients = [] } = useQuery<any[]>({ queryKey: ["/api/clients"] });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PUT", `/api/metro2/${id}`, {
        status,
        submittedAt: status === "submitted" ? new Date().toISOString() : undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/metro2"] });
      toast({ title: "Submission status updated!" });
    },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const convertMutation = useMutation({
    mutationFn: async ({ file, targetFormat }: { file: File; targetFormat: string }) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("targetFormat", targetFormat);
      const r = await fetch("/api/metro2/convert", { method: "POST", body: fd, credentials: "include" });
      if (!r.ok) throw new Error("Conversion failed");
      return r.json();
    },
    onSuccess: (data) => {
      setConvertResult(data);
      toast({ title: `Converted ${data.recordCount} record(s) to ${data.format} format!` });
    },
    onError: () => toast({ title: "Conversion failed", variant: "destructive" }),
  });

  const validateMutation = useMutation({
    mutationFn: async (record: any) => {
      const r = await apiRequest("POST", "/api/metro2/validate", { record });
      return r.json();
    },
    onSuccess: (data) => {
      setValidateResult(data);
      toast({ title: data.valid ? "Record is valid!" : `Found ${data.errors.length} issue(s)`, variant: data.valid ? "default" : "destructive" });
    },
    onError: () => toast({ title: "Validation failed", variant: "destructive" }),
  });

  function downloadConvertedFile(content: string, format: string) {
    const ext = format === "json" ? "json" : "dat";
    const blob = new Blob([typeof content === "string" ? content : JSON.stringify(content, null, 2)], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `converted_${new Date().toISOString().slice(0, 10)}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadFile(s: any) {
    if (!s.fileContent) return toast({ title: "No file content saved", variant: "destructive" });
    const blob = new Blob([s.fileContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `metro2_${s.bureau}_${s.accountNumber || s.id}_${format(new Date(s.createdAt), "yyyyMMdd")}.dat`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function clientName(clientId: string) {
    const c = (clients as any[]).find((x: any) => x.id === clientId);
    return c ? `${c.firstName} ${c.lastName}` : "—";
  }

  const filtered = (submissions as any[]).filter((s: any) => {
    if (bureauFilter !== "all" && s.bureau !== bureauFilter) return false;
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (search && !`${s.accountNumber ?? ""} ${s.bureau}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const byBureau = (bureau: string) => (submissions as any[]).filter((s: any) => s.bureau === bureau);
  const byStatus = (status: string) => (submissions as any[]).filter((s: any) => s.status === status);

  const stats = [
    { label: "Total Files", value: (submissions as any[]).length, icon: FileText, color: "text-blue-500" },
    { label: "Submitted", value: byStatus("submitted").length + byStatus("acknowledged").length, icon: CheckCircle2, color: "text-emerald-500" },
    { label: "Pending", value: byStatus("generated").length + byStatus("draft").length, icon: Clock, color: "text-amber-500" },
    { label: "Rejected", value: byStatus("rejected").length, icon: AlertTriangle, color: "text-red-500" },
  ];

  return (
    <Shell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Metro 2 Submissions</h1>
            <p className="text-muted-foreground mt-1">
              Track all bureau data furnishing records — generate, download, and monitor submission status.
            </p>
          </div>
          <Button variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ["/api/metro2"] })}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {stats.map((s, i) => (
            <Card key={i} className="glass-panel">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <p className="text-2xl font-bold">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bureau Breakdown */}
        <div className="grid gap-4 md:grid-cols-3">
          {BUREAUS.filter(b => b.id !== "all").map(b => {
            const subs = byBureau(b.id);
            const submitted = subs.filter((s: any) => s.status === "submitted" || s.status === "acknowledged").length;
            return (
              <Card key={b.id} className="glass-panel">
                <CardHeader className="pb-2">
                  <CardTitle className={`text-sm flex items-center gap-2 ${b.color}`}>
                    <Building2 className="w-4 h-4" /> {b.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total files</span>
                    <span className="font-semibold">{subs.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Submitted</span>
                    <span className="font-semibold text-emerald-600">{submitted}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pending upload</span>
                    <span className="font-semibold text-amber-600">{subs.length - submitted}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-1"
                    onClick={() => setBureauFilter(b.id)}
                  >
                    <Filter className="w-3 h-3 mr-1" /> Filter to {b.name}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Document Converter & Validator */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="glass-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-blue-500" /> Format Converter
              </CardTitle>
              <CardDescription className="text-xs">
                Convert files between Metro 2 (.DAT), JSON, and CSV formats
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">Upload file (CSV, JSON, or Metro 2)</Label>
                <input
                  ref={converterFileRef}
                  type="file"
                  accept=".csv,.json,.dat,.txt,.metro2"
                  className="block w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                  data-testid="input-converter-file"
                />
              </div>
              <div className="flex items-center gap-2">
                <Select value={convertTarget} onValueChange={setConvertTarget}>
                  <SelectTrigger className="w-[140px] h-8 text-xs" data-testid="select-convert-target">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="metro2">→ Metro 2</SelectItem>
                    <SelectItem value="json">→ JSON</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={() => {
                    const file = converterFileRef.current?.files?.[0];
                    if (!file) return toast({ title: "Select a file first", variant: "destructive" });
                    convertMutation.mutate({ file, targetFormat: convertTarget });
                  }}
                  disabled={convertMutation.isPending}
                  data-testid="button-convert"
                >
                  {convertMutation.isPending ? "Converting..." : <><ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" /> Convert</>}
                </Button>
              </div>
              {convertResult && (
                <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-emerald-600">
                      <CheckCircle2 className="w-3 h-3 inline mr-1" />
                      {convertResult.recordCount} record(s) converted to {convertResult.format}
                    </p>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => {
                        const text = convertResult.content || JSON.stringify(convertResult.records, null, 2);
                        navigator.clipboard.writeText(text);
                        toast({ title: "Copied to clipboard!" });
                      }}>
                        <Copy className="w-3 h-3 mr-1" /> Copy
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => {
                        downloadConvertedFile(convertResult.content || JSON.stringify(convertResult.records, null, 2), convertResult.format);
                      }}>
                        <Download className="w-3 h-3 mr-1" /> Save
                      </Button>
                    </div>
                  </div>
                  {convertResult.errors?.length > 0 && (
                    <div className="text-[10px] text-amber-600">
                      {convertResult.errors.map((e: string, i: number) => <p key={i}>⚠ {e}</p>)}
                    </div>
                  )}
                  <pre className="text-[10px] font-mono text-muted-foreground max-h-32 overflow-auto whitespace-pre-wrap break-all bg-background/50 rounded p-2">
                    {(convertResult.content || JSON.stringify(convertResult.records, null, 2)).substring(0, 2000)}
                    {(convertResult.content || JSON.stringify(convertResult.records, null, 2)).length > 2000 && "\n... (truncated)"}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-500" /> CDIA Validator
              </CardTitle>
              <CardDescription className="text-xs">
                Validate Metro 2 records against CDIA compliance rules before submission
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px]">Account #</Label>
                  <Input id="val-acct" className="h-7 text-xs" placeholder="AU-00001" data-testid="input-val-acct" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Status Code</Label>
                  <Input id="val-status" className="h-7 text-xs" placeholder="11" data-testid="input-val-status" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">ECOA Code</Label>
                  <Input id="val-ecoa" className="h-7 text-xs" placeholder="3" data-testid="input-val-ecoa" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Account Type</Label>
                  <Input id="val-type" className="h-7 text-xs" placeholder="18" data-testid="input-val-type" />
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => {
                  const record = {
                    accountNumber: (document.getElementById("val-acct") as HTMLInputElement)?.value || "TEST-001",
                    accountStatus: (document.getElementById("val-status") as HTMLInputElement)?.value || "11",
                    ecoaCode: (document.getElementById("val-ecoa") as HTMLInputElement)?.value || "1",
                    accountType: (document.getElementById("val-type") as HTMLInputElement)?.value || "18",
                  };
                  validateMutation.mutate(record);
                }}
                disabled={validateMutation.isPending}
                data-testid="button-validate"
              >
                {validateMutation.isPending ? "Validating..." : <><Shield className="w-3.5 h-3.5 mr-1.5" /> Validate Record</>}
              </Button>
              {validateResult && (
                <div className={`border rounded-lg p-3 space-y-1 ${validateResult.valid ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                  <p className={`text-xs font-medium ${validateResult.valid ? "text-emerald-600" : "text-red-600"}`}>
                    {validateResult.valid ? (
                      <><CheckCircle2 className="w-3 h-3 inline mr-1" /> Record passes CDIA validation</>
                    ) : (
                      <><AlertTriangle className="w-3 h-3 inline mr-1" /> {validateResult.errors.length} issue(s) found</>
                    )}
                  </p>
                  {validateResult.errors?.map((e: any, i: number) => (
                    <p key={i} className={`text-[10px] ${e.severity === "error" ? "text-red-500" : "text-amber-500"}`}>
                      {e.severity === "error" ? "✗" : "⚠"} <span className="font-medium">{e.field}:</span> {e.message}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Search account # or bureau..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={bureauFilter} onValueChange={setBureauFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Bureau" />
            </SelectTrigger>
            <SelectContent>
              {BUREAUS.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(STATUS_MAP).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(bureauFilter !== "all" || statusFilter !== "all" || search) && (
            <Button variant="ghost" size="sm" onClick={() => { setBureauFilter("all"); setStatusFilter("all"); setSearch(""); }}>
              Clear filters
            </Button>
          )}
        </div>

        {/* Submissions Table */}
        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Loading submissions...</div>
        ) : filtered.length === 0 ? (
          <Card className="glass-panel">
            <CardContent className="py-16 text-center">
              <FilePlus2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="font-medium text-muted-foreground mb-2">No Metro 2 submissions yet</p>
              <p className="text-sm text-muted-foreground">
                Generate Metro 2 files from the Bureau Uploads page, then track them here.
              </p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => window.location.href = "/uploads"}>
                Go to Bureau Uploads
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((s: any) => {
              const st = STATUS_MAP[s.status] ?? STATUS_MAP["draft"];
              const StatusIcon = st.icon;
              return (
                <Card key={s.id} data-testid={`card-submission-${s.id}`} className="glass-panel">
                  <CardContent className="py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm truncate">{s.accountNumber || "Batch Upload"}</p>
                            <Badge variant="outline" className={`text-[10px] capitalize ${bureauBadge(s.bureau)}`}>
                              {s.bureau}
                            </Badge>
                            <Badge variant="outline" className={`text-[10px] ${st.color}`}>
                              <StatusIcon className="w-2.5 h-2.5 mr-1" />{st.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                            {s.clientId && <span>Client: {clientName(s.clientId)}</span>}
                            {s.portfolioType && <span>Portfolio: {s.portfolioType}</span>}
                            {s.ecoaCode && <span>ECOA: {s.ecoaCode === "3" ? "3 (AU)" : s.ecoaCode}</span>}
                            {s.creditLimit ? <span>Limit: {dollars(s.creditLimit)}</span> : null}
                            {s.reportType && <span>Report: {s.reportType}</span>}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                            <Calendar className="w-3 h-3" />
                            Created: {s.createdAt ? format(new Date(s.createdAt), "MMM d, yyyy h:mm a") : "—"}
                            {s.submittedAt && (
                              <span className="text-emerald-600 ml-2">
                                · Submitted: {format(new Date(s.submittedAt), "MMM d, yyyy")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {s.fileContent && (
                          <Button size="sm" variant="outline" onClick={() => downloadFile(s)}>
                            <Download className="w-3.5 h-3.5 mr-1.5" /> Download
                          </Button>
                        )}
                        {s.fileContent && (
                          <Button size="sm" variant="ghost" onClick={() => setViewSubmission(s)}>
                            <Eye className="w-3.5 h-3.5 mr-1.5" /> View
                          </Button>
                        )}
                        {s.status !== "submitted" && s.status !== "acknowledged" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                            onClick={() => updateMutation.mutate({ id: s.id, status: "submitted" })}
                            disabled={updateMutation.isPending}
                          >
                            <Send className="w-3.5 h-3.5 mr-1.5" /> Mark Submitted
                          </Button>
                        )}
                        <Select
                          value={s.status}
                          onValueChange={val => updateMutation.mutate({ id: s.id, status: val })}
                        >
                          <SelectTrigger className="w-[130px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_MAP).map(([k, v]) => (
                              <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* View File Dialog */}
      <Dialog open={!!viewSubmission} onOpenChange={o => !o && setViewSubmission(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Metro 2 File — {viewSubmission?.accountNumber}</DialogTitle>
            <DialogDescription>
              {viewSubmission?.bureau} · {viewSubmission?.reportType} · {viewSubmission?.createdAt ? format(new Date(viewSubmission.createdAt), "MMM d, yyyy") : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto max-h-[50vh] rounded-lg bg-muted/50 border border-border/50 p-4">
            <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap break-all leading-relaxed">
              {viewSubmission?.fileContent ?? "No content"}
            </pre>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewSubmission(null)}>Close</Button>
            <Button onClick={() => viewSubmission && downloadFile(viewSubmission)}>
              <Download className="w-4 h-4 mr-2" /> Download .DAT
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
