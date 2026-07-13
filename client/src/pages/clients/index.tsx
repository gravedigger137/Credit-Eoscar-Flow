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
import { apiRequest, csrfFetch } from "@/lib/queryClient";
import { useState } from "react";
import { Search, Plus, Mail, Phone, AlertTriangle, UserCheck, FileText, ShieldAlert, ClipboardList, Eye, Pencil, Upload, Download, Trash2, File, RefreshCw, ShieldCheck } from "lucide-react";
import { useRef } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

const emptyForm = {
  firstName: "", lastName: "", email: "", phone: "", ssn: "", dob: "",
  address: "", city: "", state: "", zip: "", status: "onboarding",
};

const emptyPullForm = {
  equifaxScore: "", experianScore: "", transunionScore: "",
  negativeItems: "", negativeItemsList: "",
  runAnalysis: true,
};

const emptyDwollaForm = {
  dateOfBirth: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  postalCode: "",
  last4SSN: "",
  fullSSN: "",
};

function apiErrorMessage(error: unknown, fallback = "Request failed") {
  const raw = error instanceof Error ? error.message : fallback;
  const json = raw.replace(/^\d+:\s*/, "");
  try {
    const parsed = JSON.parse(json);
    return parsed.message || parsed.error || raw;
  } catch {
    return raw;
  }
}

function dwollaStatusClass(status: string | undefined) {
  switch (status) {
    case "verified":
      return "border-emerald-500 text-emerald-600";
    case "retry":
    case "kba":
    case "document":
      return "border-amber-500 text-amber-600";
    case "suspended":
    case "failed":
      return "border-destructive text-destructive";
    default:
      return "border-muted-foreground text-muted-foreground";
  }
}

export default function Clients() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [pullOpen, setPullOpen] = useState(false);
  const [pullClient, setPullClient] = useState<any>(null);
  const [pullForm, setPullForm] = useState(emptyPullForm);
  const [viewClient, setViewClient] = useState<any>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadClient, setUploadClient] = useState<any>(null);
  const [uploadCategory, setUploadCategory] = useState("credit_report");
  const [uploadNotes, setUploadNotes] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dwollaDocumentInputRef = useRef<HTMLInputElement>(null);
  const [dwollaForm, setDwollaForm] = useState(emptyDwollaForm);

  const { data: clients = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/clients"] });
  const { data: reports = [] } = useQuery<any[]>({ queryKey: ["/api/reports"] });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/clients", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/clients"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      qc.invalidateQueries({ queryKey: ["/api/notifications"] });
      setOpen(false);
      setForm(emptyForm);
      toast({ title: "Client added successfully!" });
    },
    onError: () => toast({ title: "Error adding client", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/clients/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Client removed." });
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/clients/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/clients"] });
      setEditOpen(false);
      setEditForm({});
      toast({ title: "Client updated!" });
    },
    onError: () => toast({ title: "Error updating client", variant: "destructive" }),
  });

  const docsQuery = useQuery<any[]>({
    queryKey: ["/api/clients", uploadClient?.id || viewClient?.id, "documents"],
    queryFn: async () => {
      const cid = uploadClient?.id || viewClient?.id;
      if (!cid) return [];
      const r = await fetch(`/api/clients/${cid}/documents`, { credentials: "include" });
      return r.json();
    },
    enabled: !!(uploadClient?.id || viewClient?.id),
  });

  const dwollaVerificationQuery = useQuery<any>({
    queryKey: ["/api/dwolla/customers", viewClient?.id, "verification"],
    queryFn: async () => {
      if (!viewClient?.id) return null;
      const r = await fetch(`/api/dwolla/customers/${viewClient.id}/verification`, { credentials: "include" });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    enabled: !!(viewOpen && viewClient?.id),
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ clientId, file, category, notes }: { clientId: string; file: File; category: string; notes: string }) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", category);
      fd.append("notes", notes);
      const r = await csrfFetch(`/api/clients/${clientId}/documents`, { method: "POST", body: fd });
      if (!r.ok) throw new Error("Upload failed");
      return r.json();
    },
    onSuccess: () => {
      docsQuery.refetch();
      qc.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "Document uploaded!" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      setUploadNotes("");
    },
    onError: () => toast({ title: "Upload failed", variant: "destructive" }),
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (id: string) => { const r = await apiRequest("DELETE", `/api/documents/${id}`); return r; },
    onSuccess: () => { docsQuery.refetch(); toast({ title: "Document deleted" }); },
  });

  const createDwollaCustomerMutation = useMutation({
    mutationFn: async () => {
      if (!viewClient?.id) throw new Error("Client is required");
      const res = await apiRequest("POST", "/api/dwolla/customers/verified", {
        clientId: viewClient.id,
        dateOfBirth: dwollaForm.dateOfBirth,
        address1: dwollaForm.address1,
        address2: dwollaForm.address2 || undefined,
        city: dwollaForm.city,
        state: dwollaForm.state,
        postalCode: dwollaForm.postalCode,
        last4SSN: dwollaForm.last4SSN,
        fullSSN: dwollaForm.fullSSN || undefined,
      });
      return res.json();
    },
    onSuccess: async () => {
      setDwollaForm((current) => ({ ...current, fullSSN: "" }));
      await Promise.all([
        dwollaVerificationQuery.refetch(),
        qc.invalidateQueries({ queryKey: ["/api/clients"] }),
      ]);
      toast({ title: "Dwolla verification submitted", description: "Sensitive fields were not returned to the browser." });
    },
    onError: (error) => toast({ title: "Dwolla verification failed", description: apiErrorMessage(error), variant: "destructive" }),
  });

  const retryDwollaMutation = useMutation({
    mutationFn: async () => {
      if (!viewClient?.id) throw new Error("Client is required");
      const res = await apiRequest("POST", `/api/dwolla/customers/${viewClient.id}/retry`, {
        dateOfBirth: dwollaForm.dateOfBirth || undefined,
        address1: dwollaForm.address1 || undefined,
        address2: dwollaForm.address2 || undefined,
        city: dwollaForm.city || undefined,
        state: dwollaForm.state || undefined,
        postalCode: dwollaForm.postalCode || undefined,
        last4SSN: dwollaForm.last4SSN || undefined,
        fullSSN: dwollaForm.fullSSN || undefined,
      });
      return res.json();
    },
    onSuccess: async () => {
      setDwollaForm((current) => ({ ...current, fullSSN: "" }));
      await dwollaVerificationQuery.refetch();
      toast({ title: "Dwolla verification retry submitted" });
    },
    onError: (error) => toast({ title: "Retry failed", description: apiErrorMessage(error), variant: "destructive" }),
  });

  const uploadDwollaDocumentMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!viewClient?.id) throw new Error("Client is required");
      const fd = new FormData();
      fd.append("file", file);
      fd.append("documentType", "identity_verification");
      const r = await csrfFetch(`/api/dwolla/customers/${viewClient.id}/documents`, { method: "POST", body: fd });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: async (result: any) => {
      if (dwollaDocumentInputRef.current) dwollaDocumentInputRef.current.value = "";
      await dwollaVerificationQuery.refetch();
      toast({
        title: "Dwolla document received",
        description: result?.productionStorageConfigured ? "Document was submitted through the configured private storage path." : "Private production storage must be configured before live Dwolla document submission.",
      });
    },
    onError: (error) => toast({ title: "Document upload failed", description: apiErrorMessage(error), variant: "destructive" }),
  });

  const pullMutation = useMutation({
    mutationFn: async (data: any) => { const r = await apiRequest("POST", "/api/reports/pull", data); return r.json(); },
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["/api/clients"] });
      qc.invalidateQueries({ queryKey: ["/api/reports"] });
      qc.invalidateQueries({ queryKey: ["/api/notifications"] });
      qc.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      setPullOpen(false);
      setPullForm(emptyPullForm);
      setPullClient(null);
      toast({ title: res.analysis ? "Report pulled & AI analysis complete!" : "Report pulled successfully!" });
    },
    onError: () => toast({ title: "Error pulling report", variant: "destructive" }),
  });

  const filtered = clients.filter((c: any) =>
    `${c.firstName} ${c.lastName} ${c.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const active = clients.filter((c: any) => c.status === "active").length;
  const onboarding = clients.filter((c: any) => c.status === "onboarding").length;

  const handlePullReport = (client: any) => {
    setPullClient(client);
    setPullForm({
      ...emptyPullForm,
      equifaxScore: client.equifaxScore?.toString() || "",
      experianScore: client.experianScore?.toString() || "",
      transunionScore: client.transunionScore?.toString() || "",
    });
    setPullOpen(true);
  };

  const handleViewClient = (client: any) => {
    setViewClient(client);
    setDwollaForm({
      dateOfBirth: client.dateOfBirth || client.dob || "",
      address1: client.address || "",
      address2: client.address2 || "",
      city: client.city || "",
      state: client.state || "",
      postalCode: client.zip || "",
      last4SSN: client.last4SSN?.replace(/\D/g, "").slice(-4) || (client.ssn ? client.ssn.replace(/\D/g, "").slice(-4) : ""),
      fullSSN: "",
    });
    setViewOpen(true);
  };

  const handleEditClient = (client: any) => {
    setEditForm({
      id: client.id,
      firstName: client.firstName || "",
      lastName: client.lastName || "",
      email: client.email || "",
      phone: client.phone || "",
      ssn: client.ssn || "",
      dob: client.dob || "",
      address: client.address || "",
      city: client.city || "",
      state: client.state || "",
      zip: client.zip || "",
      status: client.status || "onboarding",
      equifaxScore: client.equifaxScore?.toString() || "",
      experianScore: client.experianScore?.toString() || "",
      transunionScore: client.transunionScore?.toString() || "",
    });
    setEditOpen(true);
  };

  const clientReports = (clientId: string) => reports.filter((r: any) => r.clientId === clientId);

  const parseNum = (v: string) => v !== "" ? parseInt(v) : undefined;

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Client Management</h1>
            <p className="text-muted-foreground mt-1">Manage all credit repair clients and their files.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground" data-testid="button-add-client">
                <Plus className="w-4 h-4 mr-2" /> Add New Client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
                <DialogDescription>Enter the client's personal and contact information.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label>First Name *</Label>
                  <Input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Jane" data-testid="input-first-name" />
                </div>
                <div className="space-y-2">
                  <Label>Last Name *</Label>
                  <Input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Doe" data-testid="input-last-name" />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@email.com" type="email" data-testid="input-email" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 000-0000" data-testid="input-phone" />
                </div>
                <div className="space-y-2">
                  <Label>SSN (encrypted at rest)</Label>
                  <Input value={form.ssn} onChange={e => setForm(f => ({ ...f, ssn: e.target.value }))} placeholder="XXX-XX-XXXX" data-testid="input-ssn" />
                </div>
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Input value={form.dob} onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} placeholder="MM/DD/YYYY" data-testid="input-dob" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Address</Label>
                  <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Main St" data-testid="input-address" />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Atlanta" data-testid="input-city" />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} placeholder="GA" maxLength={2} data-testid="input-state" />
                </div>
                <div className="space-y-2">
                  <Label>ZIP</Label>
                  <Input value={form.zip} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} placeholder="30301" data-testid="input-zip" />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger data-testid="select-status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="onboarding">Onboarding</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => createMutation.mutate(form)}
                  disabled={createMutation.isPending || !form.firstName || !form.lastName || !form.email}
                  data-testid="button-submit-client"
                >
                  {createMutation.isPending ? "Saving..." : "Add Client"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="glass-panel border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-primary" /> Active Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-active-count">{active}</div>
            </CardContent>
          </Card>
          <Card className="glass-panel border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Onboarding
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-onboarding-count">{onboarding}</div>
            </CardContent>
          </Card>
          <Card className="glass-panel border-l-4 border-l-success">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-success" /> Total Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-count">{clients.length}</div>
            </CardContent>
          </Card>
          <Card className="glass-panel border-l-4 border-l-destructive">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-destructive" /> Paused
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-paused-count">{clients.filter((c: any) => c.status === "paused").length}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-panel">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Client Roster</CardTitle>
                <CardDescription>All clients and their credit repair progress.</CardDescription>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search clients..." className="pl-8 bg-background" value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-clients" />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-10 text-muted-foreground">Loading clients...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <UserCheck className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>{search ? "No clients found." : "No clients yet. Add your first client above."}</p>
              </div>
            ) : (
              <div className="rounded-md border bg-background/50">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Credit Scores</TableHead>
                      <TableHead>Reports</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((client: any) => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                              {client.firstName[0]}{client.lastName[0]}
                            </div>
                            <div>
                              <span className="font-medium" data-testid={`text-client-name-${client.id}`}>{client.firstName} {client.lastName}</span>
                              <p className="text-xs text-muted-foreground">{client.address ? `${client.city}, ${client.state}` : "No address"}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {client.email}</span>
                            {client.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {client.phone}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs space-y-0.5">
                            <div>EQ: <span className="font-bold">{client.equifaxScore ?? "—"}</span></div>
                            <div>EX: <span className="font-bold">{client.experianScore ?? "—"}</span></div>
                            <div>TU: <span className="font-bold">{client.transunionScore ?? "—"}</span></div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {clientReports(client.id).length} pulls
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            client.status === 'active' ? 'border-emerald-500 text-emerald-600' :
                            client.status === 'onboarding' ? 'border-amber-500 text-amber-600' :
                            'border-muted-foreground text-muted-foreground'
                          }>
                            {client.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-primary border-primary/30 hover:bg-primary/10"
                              onClick={() => handlePullReport(client)}
                              data-testid={`button-pull-report-${client.id}`}
                            >
                              <ClipboardList className="w-3.5 h-3.5 mr-1" /> Pull Report
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setUploadClient(client); setUploadOpen(true); }}
                              data-testid={`button-upload-doc-${client.id}`}
                              title="Upload Documents"
                            >
                              <Upload className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClient(client)}
                              data-testid={`button-edit-client-${client.id}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewClient(client)}
                              data-testid={`button-view-client-${client.id}`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => deleteMutation.mutate(client.id)}
                              data-testid={`button-remove-client-${client.id}`}
                            >
                              Remove
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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
            <DialogDescription>
              {pullClient ? `Enter credit report data for ${pullClient.firstName} ${pullClient.lastName}` : "Enter report data"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Equifax Score</Label>
              <Input type="number" value={pullForm.equifaxScore} onChange={e => setPullForm(f => ({ ...f, equifaxScore: e.target.value }))} placeholder="650" data-testid="input-pull-eq" />
            </div>
            <div className="space-y-2">
              <Label>Experian Score</Label>
              <Input type="number" value={pullForm.experianScore} onChange={e => setPullForm(f => ({ ...f, experianScore: e.target.value }))} placeholder="645" data-testid="input-pull-ex" />
            </div>
            <div className="space-y-2">
              <Label>TransUnion Score</Label>
              <Input type="number" value={pullForm.transunionScore} onChange={e => setPullForm(f => ({ ...f, transunionScore: e.target.value }))} placeholder="655" data-testid="input-pull-tu" />
            </div>
            <div className="space-y-2">
              <Label>Negative Items Count</Label>
              <Input type="number" value={pullForm.negativeItems} onChange={e => setPullForm(f => ({ ...f, negativeItems: e.target.value }))} placeholder="4" data-testid="input-pull-neg" />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Negative Items (one per line for AI analysis)</Label>
              <Textarea
                value={pullForm.negativeItemsList}
                onChange={e => setPullForm(f => ({ ...f, negativeItemsList: e.target.value }))}
                placeholder={"Capital One - Collection $2,450\nEnhanced Recovery - Medical $890\nLate payment - Chase Sapphire 06/2023"}
                rows={4}
                data-testid="input-pull-items"
              />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Checkbox
                id="runAnalysis"
                checked={pullForm.runAnalysis}
                onCheckedChange={(v) => setPullForm(f => ({ ...f, runAnalysis: !!v }))}
                data-testid="checkbox-run-analysis"
              />
              <Label htmlFor="runAnalysis" className="cursor-pointer">
                Run AI Credit Analysis (GPT-4o strategy report)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPullOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!pullClient) return;
                pullMutation.mutate({
                  clientId: pullClient.id,
                  equifaxScore: parseNum(pullForm.equifaxScore),
                  experianScore: parseNum(pullForm.experianScore),
                  transunionScore: parseNum(pullForm.transunionScore),
                  negativeItems: parseNum(pullForm.negativeItems),
                  negativeItemsList: pullForm.negativeItemsList.split("\n").filter(Boolean),
                  runAnalysis: pullForm.runAnalysis,
                });
              }}
              disabled={pullMutation.isPending || (!pullForm.equifaxScore && !pullForm.experianScore && !pullForm.transunionScore)}
              data-testid="button-submit-pull"
            >
              {pullMutation.isPending ? (pullForm.runAnalysis ? "Pulling & Analyzing..." : "Pulling...") : "Pull Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={(open) => {
        setViewOpen(open);
        if (!open) {
          setViewClient(null);
          setDwollaForm(emptyDwollaForm);
          if (dwollaDocumentInputRef.current) dwollaDocumentInputRef.current.value = "";
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewClient?.firstName} {viewClient?.lastName}</DialogTitle>
            <DialogDescription>Client profile details</DialogDescription>
          </DialogHeader>
          {viewClient && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{viewClient.email}</span></div>
                <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{viewClient.phone || "—"}</span></div>
                <div><span className="text-muted-foreground">DOB:</span> <span className="font-medium">{viewClient.dob || "—"}</span></div>
                <div><span className="text-muted-foreground">SSN:</span> <span className="font-medium">{viewClient.ssn ? "***-**-" + viewClient.ssn.slice(-4) : "—"}</span></div>
                <div className="col-span-2"><span className="text-muted-foreground">Address:</span> <span className="font-medium">{viewClient.address ? `${viewClient.address}, ${viewClient.city}, ${viewClient.state} ${viewClient.zip}` : "—"}</span></div>
              </div>
              <div className="border-t pt-3">
                <p className="text-sm font-medium mb-2">Credit Scores</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Equifax</p>
                    <p className="text-2xl font-bold" data-testid="text-view-eq">{viewClient.equifaxScore ?? "—"}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Experian</p>
                    <p className="text-2xl font-bold" data-testid="text-view-ex">{viewClient.experianScore ?? "—"}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">TransUnion</p>
                    <p className="text-2xl font-bold" data-testid="text-view-tu">{viewClient.transunionScore ?? "—"}</p>
                  </div>
                </div>
              </div>
              <div className="border-t pt-3">
                <p className="text-sm text-muted-foreground">Report History: <span className="font-bold text-foreground">{clientReports(viewClient.id).length} pulls</span></p>
                <p className="text-sm text-muted-foreground">Status: <Badge variant="outline" className={
                  viewClient.status === 'active' ? 'border-emerald-500 text-emerald-600' :
                  viewClient.status === 'onboarding' ? 'border-amber-500 text-amber-600' :
                  'border-muted-foreground text-muted-foreground'
                }>{viewClient.status}</Badge></p>
              </div>
              <div className="border-t pt-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Dwolla Verification</p>
                    <p className="text-xs text-muted-foreground">Verified customer onboarding for Dwolla transfers.</p>
                  </div>
                  <Badge variant="outline" className={dwollaStatusClass(dwollaVerificationQuery.data?.customer?.dwollaVerificationStatus)}>
                    {dwollaVerificationQuery.data?.customer?.dwollaVerificationStatus || "not started"}
                  </Badge>
                </div>

                {dwollaVerificationQuery.isError ? (
                  <p className="text-sm text-destructive">Unable to load Dwolla verification status.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Dwolla ID:</span> <span className="font-medium">{dwollaVerificationQuery.data?.customer?.dwollaCustomerId || "—"}</span></div>
                    <div><span className="text-muted-foreground">Updated:</span> <span className="font-medium">{dwollaVerificationQuery.data?.customer?.dwollaVerificationUpdatedAt ? new Date(dwollaVerificationQuery.data.customer.dwollaVerificationUpdatedAt).toLocaleString() : "—"}</span></div>
                    <div><span className="text-muted-foreground">SSN:</span> <span className="font-medium">{dwollaVerificationQuery.data?.customer?.last4SSN || "—"}</span></div>
                    <div><span className="text-muted-foreground">Action:</span> <span className="font-medium">{dwollaVerificationQuery.data?.customer?.dwollaVerificationFailureReason || (dwollaVerificationQuery.data?.documentRequired ? "Document required" : "—")}</span></div>
                  </div>
                )}

                {!dwollaVerificationQuery.data?.customer?.dwollaCustomerId && (
                  <div className="rounded-md border p-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Date of Birth *</Label>
                        <Input type="date" value={dwollaForm.dateOfBirth} onChange={e => setDwollaForm(f => ({ ...f, dateOfBirth: e.target.value }))} data-testid="input-dwolla-dob" />
                      </div>
                      <div className="space-y-1">
                        <Label>Last 4 SSN *</Label>
                        <Input maxLength={4} value={dwollaForm.last4SSN} onChange={e => setDwollaForm(f => ({ ...f, last4SSN: e.target.value.replace(/\D/g, "").slice(0, 4) }))} data-testid="input-dwolla-last4" />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <Label>Full SSN (optional, encrypted)</Label>
                        <Input type="password" autoComplete="off" value={dwollaForm.fullSSN} onChange={e => setDwollaForm(f => ({ ...f, fullSSN: e.target.value }))} data-testid="input-dwolla-full-ssn" />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <Label>Address 1 *</Label>
                        <Input value={dwollaForm.address1} onChange={e => setDwollaForm(f => ({ ...f, address1: e.target.value }))} data-testid="input-dwolla-address1" />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <Label>Address 2</Label>
                        <Input value={dwollaForm.address2} onChange={e => setDwollaForm(f => ({ ...f, address2: e.target.value }))} data-testid="input-dwolla-address2" />
                      </div>
                      <div className="space-y-1">
                        <Label>City *</Label>
                        <Input value={dwollaForm.city} onChange={e => setDwollaForm(f => ({ ...f, city: e.target.value }))} data-testid="input-dwolla-city" />
                      </div>
                      <div className="space-y-1">
                        <Label>State *</Label>
                        <Input maxLength={2} value={dwollaForm.state} onChange={e => setDwollaForm(f => ({ ...f, state: e.target.value.toUpperCase() }))} data-testid="input-dwolla-state" />
                      </div>
                      <div className="space-y-1">
                        <Label>Postal Code *</Label>
                        <Input value={dwollaForm.postalCode} onChange={e => setDwollaForm(f => ({ ...f, postalCode: e.target.value }))} data-testid="input-dwolla-postal" />
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={() => createDwollaCustomerMutation.mutate()}
                      disabled={createDwollaCustomerMutation.isPending || !dwollaForm.dateOfBirth || !dwollaForm.address1 || !dwollaForm.city || !dwollaForm.state || !dwollaForm.postalCode || dwollaForm.last4SSN.length !== 4}
                      data-testid="button-create-dwolla-customer"
                    >
                      {createDwollaCustomerMutation.isPending ? "Submitting..." : "Submit Dwolla Verification"}
                    </Button>
                  </div>
                )}

                {dwollaVerificationQuery.data?.customer?.dwollaCustomerId && (
                  <div className="rounded-md border p-3 space-y-3">
                    {dwollaVerificationQuery.data?.canRetry && (
                      <div className="space-y-2">
                        <Label>Retry SSN Information</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Input placeholder="Last 4 SSN" maxLength={4} value={dwollaForm.last4SSN} onChange={e => setDwollaForm(f => ({ ...f, last4SSN: e.target.value.replace(/\D/g, "").slice(0, 4) }))} />
                          <Input type="password" autoComplete="off" placeholder="Full SSN if required" value={dwollaForm.fullSSN} onChange={e => setDwollaForm(f => ({ ...f, fullSSN: e.target.value }))} />
                        </div>
                        <Button type="button" variant="outline" onClick={() => retryDwollaMutation.mutate()} disabled={retryDwollaMutation.isPending}>
                          <RefreshCw className="w-4 h-4 mr-2" /> {retryDwollaMutation.isPending ? "Retrying..." : "Retry Verification"}
                        </Button>
                      </div>
                    )}
                    {dwollaVerificationQuery.data?.documentRequired && (
                      <div className="space-y-2">
                        <Label>Verification Document</Label>
                        <div className="flex items-center gap-2">
                          <Input ref={dwollaDocumentInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" data-testid="input-dwolla-document" />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              const file = dwollaDocumentInputRef.current?.files?.[0];
                              if (!file) return toast({ title: "Select a document first", variant: "destructive" });
                              uploadDwollaDocumentMutation.mutate(file);
                            }}
                            disabled={uploadDwollaDocumentMutation.isPending}
                            data-testid="button-upload-dwolla-document"
                          >
                            <Upload className="w-4 h-4 mr-2" /> {uploadDwollaDocumentMutation.isPending ? "Uploading..." : "Upload"}
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Timeline</p>
                      {(dwollaVerificationQuery.data?.timeline?.length ?? 0) === 0 ? (
                        <p className="text-xs text-muted-foreground">No Dwolla verification events recorded yet.</p>
                      ) : (
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {dwollaVerificationQuery.data.timeline.map((event: any) => (
                            <div key={event.id || event.eventId} className="rounded-md bg-muted/50 p-2 text-xs">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium">{event.internalTopic?.replace(/_/g, " ") || event.topic}</span>
                                <Badge variant="outline" className={dwollaStatusClass(event.normalizedStatus)}>{event.normalizedStatus || "pending"}</Badge>
                              </div>
                              <p className="text-muted-foreground">{event.occurredAt ? new Date(event.occurredAt).toLocaleString() : "—"}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
            <Button onClick={() => { setViewOpen(false); if (viewClient) handlePullReport(viewClient); }} data-testid="button-view-pull">
              <ClipboardList className="w-4 h-4 mr-2" /> Pull Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>Update client info and credit scores.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>First Name *</Label>
              <Input value={editForm.firstName || ""} onChange={e => setEditForm((f: any) => ({ ...f, firstName: e.target.value }))} data-testid="input-edit-first-name" />
            </div>
            <div className="space-y-2">
              <Label>Last Name *</Label>
              <Input value={editForm.lastName || ""} onChange={e => setEditForm((f: any) => ({ ...f, lastName: e.target.value }))} data-testid="input-edit-last-name" />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input value={editForm.email || ""} onChange={e => setEditForm((f: any) => ({ ...f, email: e.target.value }))} type="email" data-testid="input-edit-email" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={editForm.phone || ""} onChange={e => setEditForm((f: any) => ({ ...f, phone: e.target.value }))} data-testid="input-edit-phone" />
            </div>
            <div className="space-y-2">
              <Label>SSN</Label>
              <Input value={editForm.ssn || ""} onChange={e => setEditForm((f: any) => ({ ...f, ssn: e.target.value }))} data-testid="input-edit-ssn" />
            </div>
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Input value={editForm.dob || ""} onChange={e => setEditForm((f: any) => ({ ...f, dob: e.target.value }))} data-testid="input-edit-dob" />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Address</Label>
              <Input value={editForm.address || ""} onChange={e => setEditForm((f: any) => ({ ...f, address: e.target.value }))} data-testid="input-edit-address" />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={editForm.city || ""} onChange={e => setEditForm((f: any) => ({ ...f, city: e.target.value }))} data-testid="input-edit-city" />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input value={editForm.state || ""} onChange={e => setEditForm((f: any) => ({ ...f, state: e.target.value }))} maxLength={2} data-testid="input-edit-state" />
            </div>
            <div className="space-y-2">
              <Label>ZIP</Label>
              <Input value={editForm.zip || ""} onChange={e => setEditForm((f: any) => ({ ...f, zip: e.target.value }))} data-testid="input-edit-zip" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editForm.status || "onboarding"} onValueChange={v => setEditForm((f: any) => ({ ...f, status: v }))}>
                <SelectTrigger data-testid="select-edit-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="onboarding">Onboarding</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 border-t pt-4">
              <p className="text-sm font-medium mb-3">Credit Scores</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Equifax</Label>
                  <Input type="number" value={editForm.equifaxScore || ""} onChange={e => setEditForm((f: any) => ({ ...f, equifaxScore: e.target.value }))} placeholder="650" data-testid="input-edit-eq" />
                </div>
                <div className="space-y-2">
                  <Label>Experian</Label>
                  <Input type="number" value={editForm.experianScore || ""} onChange={e => setEditForm((f: any) => ({ ...f, experianScore: e.target.value }))} placeholder="645" data-testid="input-edit-ex" />
                </div>
                <div className="space-y-2">
                  <Label>TransUnion</Label>
                  <Input type="number" value={editForm.transunionScore || ""} onChange={e => setEditForm((f: any) => ({ ...f, transunionScore: e.target.value }))} placeholder="655" data-testid="input-edit-tu" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                const { id, equifaxScore, experianScore, transunionScore, ...rest } = editForm;
                const data = {
                  ...rest,
                  equifaxScore: equifaxScore ? parseInt(equifaxScore) : null,
                  experianScore: experianScore ? parseInt(experianScore) : null,
                  transunionScore: transunionScore ? parseInt(transunionScore) : null,
                };
                editMutation.mutate({ id, data });
              }}
              disabled={editMutation.isPending || !editForm.firstName || !editForm.lastName || !editForm.email}
              data-testid="button-save-edit"
            >
              {editMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadOpen} onOpenChange={(o) => { setUploadOpen(o); if (!o) { setUploadClient(null); setUploadNotes(""); setUploadCategory("credit_report"); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Documents — {uploadClient?.firstName} {uploadClient?.lastName}</DialogTitle>
            <DialogDescription>Upload credit reports, ID documents, letters, or other files (max 20 MB each).</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={uploadCategory} onValueChange={setUploadCategory}>
                  <SelectTrigger data-testid="select-upload-category"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit_report">Credit Report</SelectItem>
                    <SelectItem value="id_document">ID Document</SelectItem>
                    <SelectItem value="proof_of_address">Proof of Address</SelectItem>
                    <SelectItem value="dispute_letter">Dispute Letter</SelectItem>
                    <SelectItem value="bureau_response">Bureau Response</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Input value={uploadNotes} onChange={e => setUploadNotes(e.target.value)} placeholder="e.g. Equifax report March 2026" data-testid="input-upload-notes" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.txt"
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                data-testid="input-upload-file"
              />
              <Button
                onClick={() => {
                  const file = fileInputRef.current?.files?.[0];
                  if (!file || !uploadClient) return;
                  uploadMutation.mutate({ clientId: uploadClient.id, file, category: uploadCategory, notes: uploadNotes });
                }}
                disabled={uploadMutation.isPending}
                data-testid="button-upload-submit"
              >
                {uploadMutation.isPending ? "Uploading..." : <><Upload className="w-4 h-4 mr-2" /> Upload</>}
              </Button>
            </div>
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Uploaded Documents</p>
              {(docsQuery.data?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">No documents yet.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {docsQuery.data?.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm" data-testid={`doc-row-${doc.id}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{doc.originalName}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.category.replace(/_/g, " ")} · {(doc.fileSize / 1024).toFixed(0)} KB · {new Date(doc.uploadedAt).toLocaleDateString()}
                          </p>
                          {doc.notes && <p className="text-xs text-muted-foreground italic">{doc.notes}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button variant="ghost" size="sm" asChild data-testid={`button-download-${doc.id}`}>
                          <a href={`/api/documents/${doc.id}/download`} download><Download className="w-3.5 h-3.5" /></a>
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteDocMutation.mutate(doc.id)} data-testid={`button-delete-doc-${doc.id}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
