import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Search, Plus, FileText, Send, CheckCircle2, AlertCircle, Scale, Copy, Download, Zap, ScrollText, Printer } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const BUREAU_INFO: Record<string, { address: string; phone: string }> = {
  equifax: { address: "P.O. Box 740256, Atlanta, GA 30374", phone: "1-800-685-1111" },
  experian: { address: "P.O. Box 4500, Allen, TX 75013", phone: "1-888-397-3742" },
  transunion: { address: "P.O. Box 2000, Chester, PA 19016", phone: "1-800-916-8800" },
};

const DISPUTE_TYPES = [
  { value: "collection", label: "Collection Account", icon: "💰" },
  { value: "inquiry", label: "Hard Inquiry", icon: "🔍" },
  { value: "late_payment", label: "Late Payment", icon: "📅" },
  { value: "charge_off", label: "Charge-Off", icon: "⚠️" },
  { value: "identity_theft", label: "Identity Theft / Fraud", icon: "🚨" },
  { value: "outdated", label: "Outdated / Time-Barred", icon: "⏰" },
  { value: "general", label: "General Inaccuracy", icon: "📝" },
];

const DISPUTE_REASONS_MAP: Record<string, { label: string }[]> = {
  collection: [
    { label: "Not my debt — no signed contract exists" },
    { label: "Debt was paid in full — still reporting" },
    { label: "Debt was settled — balance inaccurate" },
    { label: "Original creditor charged off and claimed tax deduction" },
    { label: "Debt collector cannot produce original agreement" },
    { label: "No chain of title documentation" },
    { label: "1099-C issued — debt cancelled" },
    { label: "Statute of limitations expired" },
    { label: "FDCPA validation never provided" },
    { label: "Balance incorrect — includes unauthorized fees" },
  ],
  inquiry: [
    { label: "I did not authorize this inquiry" },
    { label: "No permissible purpose — never applied for credit" },
    { label: "Company cannot produce signed authorization" },
    { label: "Inquiry resulted from identity theft" },
    { label: "Promotional inquiry incorrectly listed as hard pull" },
    { label: "Duplicate inquiry from same creditor" },
  ],
  late_payment: [
    { label: "Payment was made on time — bank records confirm" },
    { label: "Incorrect late payment date reported" },
    { label: "Payment applied to wrong account" },
    { label: "Account was in forbearance/deferment during reported period" },
    { label: "Natural disaster/CARES Act protections apply" },
    { label: "Creditor agreed to goodwill adjustment" },
  ],
  charge_off: [
    { label: "Account was paid before charge-off" },
    { label: "Charge-off balance is inaccurate" },
    { label: "Creditor claimed tax deduction — double recovery" },
    { label: "Account sold to collector — original creditor should show $0" },
    { label: "Date of first delinquency is incorrect" },
  ],
  identity_theft: [
    { label: "Account opened without my knowledge or consent" },
    { label: "Unauthorized charges on existing account" },
    { label: "Personal information used fraudulently" },
    { label: "FTC Identity Theft Report filed" },
  ],
  outdated: [
    { label: "Item exceeds 7-year reporting period" },
    { label: "Date of first delinquency has been re-aged" },
    { label: "Bankruptcy exceeds 10-year reporting period" },
    { label: "Paid tax lien exceeds 7-year period" },
  ],
  general: [
    { label: "Not my account" },
    { label: "Incorrect balance reported" },
    { label: "Account status is wrong" },
    { label: "Account closed/paid — still showing open" },
    { label: "Information is outdated" },
  ],
};

const emptyForm = { clientId: "", bureau: "", accountName: "", accountNumber: "", reason: "", notes: "", disputeType: "general" };

export default function Disputes() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [bureau, setBureau] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [letterPreview, setLetterPreview] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [letterDialog, setLetterDialog] = useState<{ disputeId: string; letter: string } | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const { data: disputes = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/disputes"] });
  const { data: clients = [] } = useQuery<any[]>({ queryKey: ["/api/clients"] });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/disputes", data);
      return res.json();
    },
    onSuccess: async (dispute: any) => {
      qc.invalidateQueries({ queryKey: ["/api/disputes"] });
      qc.invalidateQueries({ queryKey: ["/api/notifications"] });

      setGeneratingId(dispute.id);
      try {
        const res = await apiRequest("POST", `/api/disputes/${dispute.id}/generate-letter`, { disputeType: form.disputeType || "general" });
        const data = await res.json();
        setLetterDialog({ disputeId: dispute.id, letter: data.letter });
        qc.invalidateQueries({ queryKey: ["/api/disputes"] });
      } catch {
        toast({ title: "Dispute created but letter generation failed", variant: "destructive" });
      }
      setGeneratingId(null);

      setOpen(false);
      setForm(emptyForm);
      setLetterPreview(null);
      toast({ title: "Dispute created with FCRA removal letter!" });
    },
    onError: () => toast({ title: "Error creating dispute", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/disputes/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/disputes"] });
      qc.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "Dispute updated!" });
    },
  });

  const generateLetterForExisting = async (disputeId: string, disputeType?: string) => {
    setGeneratingId(disputeId);
    try {
      const res = await apiRequest("POST", `/api/disputes/${disputeId}/generate-letter`, { disputeType });
      const data = await res.json();
      setLetterDialog({ disputeId, letter: data.letter });
      qc.invalidateQueries({ queryKey: ["/api/disputes"] });
      toast({ title: "FCRA letter generated!" });
    } catch {
      toast({ title: "Failed to generate letter", variant: "destructive" });
    }
    setGeneratingId(null);
  };

  const previewLetter = async () => {
    if (!form.clientId || !form.bureau || !form.accountName || !form.reason) return;
    setPreviewLoading(true);
    try {
      const res = await apiRequest("POST", "/api/disputes/generate-letter-preview", {
        clientId: form.clientId,
        bureau: form.bureau,
        accountName: form.accountName,
        accountNumber: form.accountNumber,
        reason: form.reason,
        disputeType: form.disputeType,
      });
      const data = await res.json();
      setLetterPreview(data.letter);
    } catch {
      toast({ title: "Failed to preview letter", variant: "destructive" });
    }
    setPreviewLoading(false);
  };

  const copyLetter = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Letter copied to clipboard!" });
  };

  const printLetter = (text: string) => {
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(`<html><head><title>FCRA Dispute Letter</title><style>body{font-family:'Times New Roman',serif;font-size:12pt;line-height:1.6;margin:1in;}</style></head><body><pre style="white-space:pre-wrap;font-family:inherit;font-size:inherit;line-height:inherit;"></pre></body></html>`);
      const pre = win.document.querySelector("pre");
      if (pre) pre.textContent = text;
      win.document.close();
      win.print();
    }
  };

  const filtered = disputes.filter((d: any) => {
    const matchSearch = `${d.accountName} ${d.clientId}`.toLowerCase().includes(search.toLowerCase());
    const matchBureau = bureau === "all" || d.bureau === bureau;
    return matchSearch && matchBureau;
  });

  const statusColor: Record<string, string> = {
    preparing: "border-muted-foreground text-muted-foreground",
    sent: "border-blue-500 text-blue-600",
    validated: "border-amber-500 text-amber-600",
    deleted: "border-emerald-500 text-emerald-600",
    rejected: "border-destructive text-destructive",
  };

  const availableReasons = DISPUTE_REASONS_MAP[form.disputeType] || DISPUTE_REASONS_MAP.general;

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">e-OSCAR Disputes</h1>
            <p className="text-muted-foreground mt-1">
              Automated FCRA/FDCPA dispute letters with trust law, CFPB & FTC violation codes.
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setLetterPreview(null); setForm(emptyForm); } }}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="button-new-dispute">
                  <Plus className="w-4 h-4 mr-2" /> New Dispute
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-blue-500" />
                    Create FCRA Dispute
                  </DialogTitle>
                  <DialogDescription>
                    Select a dispute type to auto-generate a legally aggressive removal letter citing FCRA, FDCPA, UCC trust law, CFPB & FTC violation codes.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Dispute Type *</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {DISPUTE_TYPES.map(dt => (
                        <button
                          key={dt.value}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, disputeType: dt.value, reason: "" }))}
                          className={`p-3 rounded-lg border text-left text-sm transition-colors ${
                            form.disputeType === dt.value
                              ? "bg-blue-500/10 border-blue-500 text-blue-600"
                              : "border-border hover:border-blue-500/50"
                          }`}
                          data-testid={`button-type-${dt.value}`}
                        >
                          <span className="text-lg">{dt.icon}</span>
                          <p className="font-medium mt-1">{dt.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label>Client *</Label>
                    <Select value={form.clientId} onValueChange={v => setForm(f => ({ ...f, clientId: v }))}>
                      <SelectTrigger data-testid="select-client"><SelectValue placeholder="Select a client..." /></SelectTrigger>
                      <SelectContent>
                        {clients.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Bureau *</Label>
                    <Select value={form.bureau} onValueChange={v => setForm(f => ({ ...f, bureau: v }))}>
                      <SelectTrigger data-testid="select-bureau"><SelectValue placeholder="Select bureau..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equifax">Equifax</SelectItem>
                        <SelectItem value="experian">Experian</SelectItem>
                        <SelectItem value="transunion">TransUnion</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.bureau && (
                      <p className="text-xs text-muted-foreground">
                        {BUREAU_INFO[form.bureau]?.address} · {BUREAU_INFO[form.bureau]?.phone}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>{form.disputeType === "inquiry" ? "Inquiring Entity *" : "Account Name *"}</Label>
                    <Input
                      value={form.accountName}
                      onChange={e => setForm(f => ({ ...f, accountName: e.target.value }))}
                      placeholder={form.disputeType === "inquiry" ? "e.g. Capital One, Synchrony" : "e.g. Midland Credit, Portfolio Recovery"}
                      data-testid="input-account-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{form.disputeType === "inquiry" ? "Inquiry Date" : "Account Number (last 4)"}</Label>
                    <Input
                      value={form.accountNumber}
                      onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))}
                      placeholder={form.disputeType === "inquiry" ? "MM/DD/YYYY" : "XXXX1234"}
                      data-testid="input-account-number"
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label>Legal Dispute Reason *</Label>
                    <Select value={form.reason} onValueChange={v => setForm(f => ({ ...f, reason: v }))}>
                      <SelectTrigger data-testid="select-reason"><SelectValue placeholder="Select a legal basis..." /></SelectTrigger>
                      <SelectContent>
                        {availableReasons.map((r: any) => (
                          <SelectItem key={r.label} value={r.label}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2 space-y-2">
                    <Label>Additional Notes</Label>
                    <Textarea
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Any extra context..."
                      rows={2}
                    />
                  </div>

                  {form.clientId && form.bureau && form.accountName && form.reason && (
                    <div className="col-span-2">
                      <Button
                        variant="outline"
                        className="w-full border-blue-500/50 text-blue-600 hover:bg-blue-500/10"
                        onClick={previewLetter}
                        disabled={previewLoading}
                        data-testid="button-preview-letter"
                      >
                        <ScrollText className="w-4 h-4 mr-2" />
                        {previewLoading ? "Generating Preview..." : "Preview FCRA Letter"}
                      </Button>
                    </div>
                  )}

                  {letterPreview && (
                    <div className="col-span-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <Scale className="w-4 h-4 text-blue-500" />
                          Generated FCRA Removal Letter
                        </Label>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => copyLetter(letterPreview)}>
                            <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => printLetter(letterPreview)}>
                            <Printer className="w-3.5 h-3.5 mr-1" /> Print
                          </Button>
                        </div>
                      </div>
                      <div className="bg-muted/30 border border-border rounded-lg p-4 max-h-[300px] overflow-y-auto">
                        <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">{letterPreview}</pre>
                      </div>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-[10px]">FCRA §§ 611, 623</Badge>
                        <Badge variant="secondary" className="text-[10px]">FDCPA § 809</Badge>
                        <Badge variant="secondary" className="text-[10px]">UCC Art. 3</Badge>
                        <Badge variant="secondary" className="text-[10px]">CFPB</Badge>
                        <Badge variant="secondary" className="text-[10px]">FTC Act § 5</Badge>
                      </div>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => { setOpen(false); setLetterPreview(null); }}>Cancel</Button>
                  <Button
                    onClick={() => createMutation.mutate(form)}
                    disabled={createMutation.isPending || !form.clientId || !form.bureau || !form.accountName || !form.reason}
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="button-create-dispute"
                  >
                    {createMutation.isPending ? "Creating & Generating Letter..." : "Create Dispute & Generate Letter"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="glass-panel border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" /> Total Disputes
              </CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold" data-testid="text-total-disputes">{disputes.length}</div></CardContent>
          </Card>
          <Card className="glass-panel border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Send className="w-4 h-4 text-amber-500" /> Sent to Bureau
              </CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{disputes.filter((d: any) => d.status === "sent").length}</div></CardContent>
          </Card>
          <Card className="glass-panel border-l-4 border-l-emerald-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Items Deleted
              </CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{disputes.filter((d: any) => d.status === "deleted").length}</div></CardContent>
          </Card>
          <Card className="glass-panel border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Scale className="w-4 h-4 text-purple-500" /> Letters Generated
              </CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{disputes.filter((d: any) => !!d.letterContent).length}</div></CardContent>
          </Card>
        </div>

        <Card className="glass-panel border-l-4 border-l-blue-500/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Automated FCRA Dispute Engine</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Every dispute auto-generates a legally aggressive removal letter citing FCRA §§ 611/623, FDCPA § 809, UCC Article 3 trust law,
                  CFPB supervisory bulletins, FTC Act § 5, IRS revenue rulings, and Regulation V. Letters are customized per dispute type —
                  collections, inquiries, late payments, charge-offs, identity theft, and outdated items. Ready to send 24/7.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <Tabs value={bureau} onValueChange={setBureau} className="w-[400px]">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="equifax">Equifax</TabsTrigger>
                  <TabsTrigger value="experian">Experian</TabsTrigger>
                  <TabsTrigger value="transunion">TransUnion</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search account..." className="pl-8 bg-background" value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-disputes" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-10 text-muted-foreground">Loading disputes...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No disputes yet. Create your first dispute above.</p>
              </div>
            ) : (
              <div className="rounded-md border bg-background/50">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bureau & Account</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Letter</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((d: any) => {
                      const hasLetter = !!d.letterContent;
                      return (
                        <TableRow key={d.id} data-testid={`row-dispute-${d.id}`}>
                          <TableCell>
                            <div>
                              <Badge variant="outline" className="mb-1 capitalize">{d.bureau}</Badge>
                              <p className="font-medium">{d.accountName}</p>
                              {d.accountNumber && <p className="text-xs text-muted-foreground">#{d.accountNumber}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[180px]">
                            <p className="text-sm">{d.reason}</p>
                          </TableCell>
                          <TableCell>
                            {hasLetter ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-blue-600 hover:text-blue-700"
                                onClick={() => setLetterDialog({ disputeId: d.id, letter: d.letterContent })}
                                data-testid={`button-view-letter-${d.id}`}
                              >
                                <ScrollText className="w-3.5 h-3.5 mr-1" /> View Letter
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-blue-500/50 text-blue-600"
                                onClick={() => generateLetterForExisting(d.id, d.disputeType || "general")}
                                disabled={generatingId === d.id}
                                data-testid={`button-generate-letter-${d.id}`}
                              >
                                <Zap className="w-3.5 h-3.5 mr-1" />
                                {generatingId === d.id ? "Generating..." : "Generate"}
                              </Button>
                            )}
                          </TableCell>
                          <TableCell>
                            <p className="text-xs">{d.sentAt ? format(new Date(d.sentAt), "MMM d, yyyy") : "Not sent"}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusColor[d.status] || ""}>
                              {d.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Select value={d.status} onValueChange={val => updateMutation.mutate({ id: d.id, data: { status: val, ...(val === "sent" ? { sentAt: new Date().toISOString() } : {}), ...(val === "deleted" ? { resolvedAt: new Date().toISOString() } : {}) } })}>
                              <SelectTrigger className="w-[140px] h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="preparing">Preparing</SelectItem>
                                <SelectItem value="sent">Sent to Bureau</SelectItem>
                                <SelectItem value="validated">Validated</SelectItem>
                                <SelectItem value="deleted">Deleted</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
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

      <Dialog open={!!letterDialog} onOpenChange={o => !o && setLetterDialog(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-blue-500" />
              FCRA Dispute Removal Letter
            </DialogTitle>
            <DialogDescription>
              Auto-generated with FCRA, FDCPA, UCC trust law, CFPB & FTC violation codes. Ready to print and mail.
            </DialogDescription>
          </DialogHeader>
          {letterDialog && (
            <>
              <div className="bg-white dark:bg-muted/20 border border-border rounded-lg p-6 max-h-[500px] overflow-y-auto">
                <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed text-foreground">{letterDialog.letter}</pre>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-[10px]">15 U.S.C. § 1681i</Badge>
                <Badge variant="secondary" className="text-[10px]">15 U.S.C. § 1681s-2</Badge>
                <Badge variant="secondary" className="text-[10px]">15 U.S.C. § 1692g</Badge>
                <Badge variant="secondary" className="text-[10px]">UCC § 3-302</Badge>
                <Badge variant="secondary" className="text-[10px]">12 CFR § 1022.42</Badge>
                <Badge variant="secondary" className="text-[10px]">15 U.S.C. § 45</Badge>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => copyLetter(letterDialog.letter)} data-testid="button-copy-letter">
                  <Copy className="w-4 h-4 mr-2" /> Copy to Clipboard
                </Button>
                <Button variant="outline" onClick={() => printLetter(letterDialog.letter)} data-testid="button-print-letter">
                  <Printer className="w-4 h-4 mr-2" /> Print Letter
                </Button>
                <Button onClick={() => setLetterDialog(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
