import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useRef, useState } from "react";
import {
  Upload, Download, FileText, CheckCircle2, AlertTriangle,
  Clock, Building2, Zap, Info, ExternalLink, RefreshCw, FilePlus2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const BUREAUS = [
  {
    id: "equifax",
    name: "Equifax",
    color: "text-red-400",
    border: "border-red-800/40",
    bg: "bg-red-900/20",
    badge: "bg-red-900/40 text-red-300 border-red-800/40",
    address: "P.O. Box 740256, Atlanta, GA 30374-0256",
    phone: "1-800-685-1111",
    efxEndpoint: "https://efxportal.equifax.com",
    eoscarUrl: "https://www.e-oscar-web.net",
    metro2Portal: "https://efxportal.equifax.com/metro2",
    acceptedFormats: ["Metro 2 (.DAT)", "ASCII Fixed-width", "CSV (EFX format)"],
    notes: "Equifax processes Metro 2 files on the 15th and last day of each month. Submit by the 12th for mid-month cycle.",
  },
  {
    id: "experian",
    name: "Experian",
    color: "text-blue-400",
    border: "border-blue-800/40",
    bg: "bg-blue-900/20",
    badge: "bg-blue-900/40 text-blue-300 border-blue-800/40",
    address: "P.O. Box 4500, Allen, TX 75013",
    phone: "1-888-397-3742",
    efxEndpoint: "https://www.experian.com/datafurnishers",
    eoscarUrl: "https://www.e-oscar-web.net",
    metro2Portal: "https://www.experian.com/datafurnishers/uploadportal",
    acceptedFormats: ["Metro 2 (.DAT)", "ASCII Fixed-width", "Experian Data Connect"],
    notes: "Experian has a dedicated Data Connect portal for furnishers. First-time submitters need a furnisher agreement (EA#) — call 1-800-831-5614.",
  },
  {
    id: "transunion",
    name: "TransUnion",
    color: "text-emerald-400",
    border: "border-emerald-800/40",
    bg: "bg-emerald-900/20",
    badge: "bg-emerald-900/40 text-emerald-300 border-emerald-800/40",
    address: "P.O. Box 2000, Chester, PA 19016",
    phone: "1-800-916-8800",
    efxEndpoint: "https://www.transunion.com/datafurnishers",
    eoscarUrl: "https://www.e-oscar-web.net",
    metro2Portal: "https://www.transunion.com/account",
    acceptedFormats: ["Metro 2 (.DAT)", "ASCII Fixed-width", "TU Connect"],
    notes: "TransUnion requires pre-registration as a data furnisher. Contact their Data Furnisher team at 1-800-916-8800 ext. 4.",
  },
];

const PORTFOLIO_TYPES = [
  { value: "R", label: "R — Revolving (Credit Cards)" },
  { value: "I", label: "I — Installment (Loans)" },
  { value: "O", label: "O — Open (30-day)" },
  { value: "M", label: "M — Mortgage" },
];

const ACCOUNT_STATUSES = [
  { value: "11", label: "11 — Current / In Good Standing" },
  { value: "13", label: "13 — Paid / Closed Satisfactorily" },
  { value: "71", label: "71 — 30 Days Past Due" },
  { value: "78", label: "78 — 60 Days Past Due" },
  { value: "80", label: "80 — 90 Days Past Due" },
  { value: "97", label: "97 — Unpaid Balance / Loss" },
];

const ECOA_CODES = [
  { value: "1", label: "1 — Individual" },
  { value: "2", label: "2 — Joint" },
  { value: "3", label: "3 — Authorized User (AU)" },
];

export default function Uploads() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeBureau, setActiveBureau] = useState("equifax");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [genForm, setGenForm] = useState({
    clientId: "",
    bureau: "equifax",
    portfolioType: "R",
    accountType: "18",
    accountStatus: "11",
    ecoaCode: "3",
    creditLimit: "",
    currentBalance: "",
    accountNumber: "",
    companyId: "CRP001",
    companyName: "CreditRepair Pro LLC",
    dateOpened: "",
    reportType: "M",
  });

  const { data: clients = [] } = useQuery<any[]>({ queryKey: ["/api/clients"] });
  const { data: submissions = [] } = useQuery<any[]>({ queryKey: ["/api/metro2"] });

  const generateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/metro2/generate", data);
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/metro2"] });
      downloadFile(data.fileContent, `metro2_${genForm.bureau}_${Date.now()}.dat`);
      toast({ title: "Metro 2 file generated and downloaded!" });
    },
    onError: () => toast({ title: "Error generating Metro 2 file", variant: "destructive" }),
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ bureau, file }: { bureau: string; file: File }) => {
      const text = await file.text();
      const res = await apiRequest("POST", "/api/metro2/upload", { bureau, fileName: file.name, fileContent: text });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/metro2"] });
      setUploadedFile(null);
      toast({ title: "File uploaded and logged successfully!" });
    },
    onError: () => toast({ title: "Upload failed", variant: "destructive" }),
  });

  function downloadFile(content: string, filename: string) {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setUploadedFile(file);
  }

  const bureauSubmissions = (bureau: string) =>
    (submissions as any[]).filter((s: any) => s.bureau === bureau);

  const bureau = BUREAUS.find(b => b.id === activeBureau)!;

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Bureau Data Uploads</h1>
            <p className="text-muted-foreground mt-1">
              Generate Metro 2 files and upload data submissions to Equifax, Experian, and TransUnion.
            </p>
          </div>
          <Badge variant="outline" className="border-amber-500 text-amber-600 text-xs px-3 py-1.5">
            Requires Data Furnisher Agreement with each bureau
          </Badge>
        </div>

        {/* Furnisher Agreement Alert */}
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Data Furnisher Accreditation Required</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  To submit Metro 2 files directly to bureaus, you must be an accredited data furnisher. This app generates the Metro 2 files — you upload them through each bureau's portal. Contact each bureau's data furnisher department to get credentialed (typically requires a business license, CROA registration, and an average of 100+ accounts).
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <a href="https://www.e-oscar-web.net" target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline" className="h-7 text-xs border-blue-400 text-blue-500">
                      <ExternalLink className="w-3 h-3 mr-1" /> e-OSCAR Portal
                    </Button>
                  </a>
                  <a href="https://efxportal.equifax.com" target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      <ExternalLink className="w-3 h-3 mr-1" /> Equifax Portal
                    </Button>
                  </a>
                  <a href="https://www.experian.com/datafurnishers" target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      <ExternalLink className="w-3 h-3 mr-1" /> Experian Data Connect
                    </Button>
                  </a>
                  <a href="https://www.transunion.com/datafurnishers" target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      <ExternalLink className="w-3 h-3 mr-1" /> TransUnion Furnisher
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeBureau} onValueChange={setActiveBureau}>
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="equifax">Equifax</TabsTrigger>
            <TabsTrigger value="experian">Experian</TabsTrigger>
            <TabsTrigger value="transunion">TransUnion</TabsTrigger>
          </TabsList>

          {BUREAUS.map((b) => (
            <TabsContent key={b.id} value={b.id} className="mt-6 space-y-6">

              {/* Bureau Header */}
              <div className={`rounded-xl border ${b.border} ${b.bg} p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4`}>
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl ${b.bg} border ${b.border} flex items-center justify-center flex-shrink-0`}>
                    <Building2 className={`w-6 h-6 ${b.color}`} />
                  </div>
                  <div>
                    <h2 className={`text-lg font-bold ${b.color}`}>{b.name}</h2>
                    <p className="text-xs text-muted-foreground">{b.address}</p>
                    <p className="text-xs text-muted-foreground">{b.phone}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {b.acceptedFormats.map((f, i) => (
                    <Badge key={i} variant="outline" className={`text-xs ${b.badge}`}>{f}</Badge>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="flex gap-2 p-3 rounded-lg bg-muted/40 border border-border/50 text-xs text-muted-foreground">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p>{b.notes}</p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">

                {/* ── GENERATE METRO 2 ── */}
                <Card className="glass-panel">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className={`w-5 h-5 ${b.color}`} /> Generate Metro 2 File
                    </CardTitle>
                    <CardDescription>Build a valid Metro 2 record from a client's data and download the .DAT file for upload.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Client *</Label>
                      <Select value={genForm.clientId} onValueChange={v => setGenForm(f => ({ ...f, clientId: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select client..." /></SelectTrigger>
                        <SelectContent>
                          {(clients as any[]).map((c: any) => (
                            <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Account Number</Label>
                        <Input value={genForm.accountNumber} onChange={e => setGenForm(f => ({ ...f, accountNumber: e.target.value }))} placeholder="AU-001234" />
                      </div>
                      <div className="space-y-2">
                        <Label>Report Type</Label>
                        <Select value={genForm.reportType} onValueChange={v => setGenForm(f => ({ ...f, reportType: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="M">M — Monthly</SelectItem>
                            <SelectItem value="C">C — Corrected</SelectItem>
                            <SelectItem value="D">D — Delete</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Portfolio Type</Label>
                        <Select value={genForm.portfolioType} onValueChange={v => setGenForm(f => ({ ...f, portfolioType: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PORTFOLIO_TYPES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>ECOA Code</Label>
                        <Select value={genForm.ecoaCode} onValueChange={v => setGenForm(f => ({ ...f, ecoaCode: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ECOA_CODES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Account Status</Label>
                        <Select value={genForm.accountStatus} onValueChange={v => setGenForm(f => ({ ...f, accountStatus: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ACCOUNT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Date Opened</Label>
                        <Input type="date" value={genForm.dateOpened} onChange={e => setGenForm(f => ({ ...f, dateOpened: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Credit Limit ($)</Label>
                        <Input type="number" value={genForm.creditLimit} onChange={e => setGenForm(f => ({ ...f, creditLimit: e.target.value }))} placeholder="10000" />
                      </div>
                      <div className="space-y-2">
                        <Label>Current Balance ($)</Label>
                        <Input type="number" value={genForm.currentBalance} onChange={e => setGenForm(f => ({ ...f, currentBalance: e.target.value }))} placeholder="0" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Your Company / Furnisher ID</Label>
                        <Input value={genForm.companyId} onChange={e => setGenForm(f => ({ ...f, companyId: e.target.value }))} placeholder="CRP001" />
                      </div>
                      <div className="space-y-2">
                        <Label>Company Name</Label>
                        <Input value={genForm.companyName} onChange={e => setGenForm(f => ({ ...f, companyName: e.target.value }))} />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-border/50 pt-4">
                    <Button
                      className="w-full"
                      onClick={() => generateMutation.mutate({ ...genForm, bureau: b.id, creditLimit: parseInt(genForm.creditLimit || "0"), currentBalance: parseInt(genForm.currentBalance || "0") })}
                      disabled={generateMutation.isPending || !genForm.clientId}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {generateMutation.isPending ? "Generating..." : `Generate & Download ${b.name} Metro 2`}
                    </Button>
                  </CardFooter>
                </Card>

                {/* ── FILE UPLOAD ── */}
                <div className="space-y-6">
                  <Card className="glass-panel">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Upload className={`w-5 h-5 ${b.color}`} /> Upload to {b.name}
                      </CardTitle>
                      <CardDescription>Drag and drop your Metro 2 .DAT file, or click to browse.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div
                        className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"}`}
                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className={`w-10 h-10 mx-auto mb-3 ${uploadedFile ? "text-primary" : "text-muted-foreground/40"}`} />
                        {uploadedFile ? (
                          <>
                            <p className="font-semibold text-primary">{uploadedFile.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">{(uploadedFile.size / 1024).toFixed(1)} KB — Ready to upload</p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium text-muted-foreground">Drop your Metro 2 file here</p>
                            <p className="text-xs text-muted-foreground mt-1">.DAT, .TXT, .CSV accepted</p>
                          </>
                        )}
                      </div>
                      <input ref={fileInputRef} type="file" accept=".dat,.txt,.csv" className="hidden" onChange={e => setUploadedFile(e.target.files?.[0] ?? null)} />
                    </CardContent>
                    <CardFooter className="border-t border-border/50 pt-4 flex gap-2">
                      <Button
                        className="flex-1"
                        disabled={!uploadedFile || uploadMutation.isPending}
                        onClick={() => uploadedFile && uploadMutation.mutate({ bureau: b.id, file: uploadedFile })}
                      >
                        {uploadMutation.isPending ? "Uploading..." : `Log Upload to ${b.name}`}
                      </Button>
                      <a href={b.metro2Portal} target="_blank" rel="noreferrer">
                        <Button variant="outline">
                          <ExternalLink className="w-4 h-4 mr-2" /> Open Portal
                        </Button>
                      </a>
                    </CardFooter>
                  </Card>

                  {/* Submission History */}
                  <Card className="glass-panel">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="w-4 h-4" /> {b.name} Submission Log
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {bureauSubmissions(b.id).length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground">
                          <FilePlus2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                          <p className="text-sm">No submissions yet for {b.name}.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {bureauSubmissions(b.id).slice(0, 6).map((s: any) => (
                            <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50 text-sm">
                              <div className="flex items-center gap-2">
                                {s.status === "submitted" ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Clock className="w-4 h-4 text-amber-500" />}
                                <div>
                                  <p className="font-medium">{s.accountNumber || "Batch file"}</p>
                                  <p className="text-xs text-muted-foreground">{s.createdAt ? format(new Date(s.createdAt), "MMM d, yyyy h:mm a") : "—"}</p>
                                </div>
                              </div>
                              <Badge variant="outline" className={s.status === "submitted" ? "border-emerald-500 text-emerald-600" : "border-amber-500 text-amber-600"}>
                                {s.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Shell>
  );
}
