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
import { Search, Plus, Wallet, TrendingUp, Clock, CheckCircle2, Lock, Smartphone } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { AdminBypassBanner } from "@/components/admin-bypass-banner";

const PRODUCTS = [
  { value: "builder_loan", label: "Credit Builder Loan (Self / Credit Strong)", provider: "Self / Credit Strong", icon: Lock, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900" },
  { value: "revolving_store", label: "Revolving Store Card (Kikoff / Fingerhut)", provider: "Kikoff / Fingerhut", icon: Smartphone, color: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-900" },
  { value: "secured_card", label: "Secured Credit Card", provider: "OpenSky / Capital One", icon: CheckCircle2, color: "text-violet-500", bg: "bg-violet-100 dark:bg-violet-900" },
  { value: "magnum_builder", label: "Magnum Cash Advance Builder", provider: "In-house", icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
];

const emptyForm = {
  clientId: "", productType: "builder_loan", productName: "", provider: "",
  creditLimit: "", monthlyPayment: "", termMonths: "", status: "applied", notes: "",
};

const statusColor: Record<string, string> = {
  applied: "border-blue-500 text-blue-600",
  reviewing: "border-amber-500 text-amber-600",
  approved: "border-violet-500 text-violet-600",
  active: "border-emerald-500 text-emerald-600",
  rejected: "border-destructive text-destructive",
  closed: "border-muted-foreground text-muted-foreground",
};

export default function CreditLines() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: creditLines = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/credit-lines"] });
  const { data: clients = [] } = useQuery<any[]>({ queryKey: ["/api/clients"] });

  const clientMap = Object.fromEntries(clients.map((c: any) => [c.id, `${c.firstName} ${c.lastName}`]));

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/credit-lines", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/credit-lines"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setOpen(false);
      setForm(emptyForm);
      toast({ title: "Client enrolled in credit builder!" });
    },
    onError: () => toast({ title: "Error enrolling client", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/credit-lines/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/credit-lines"] }); toast({ title: "Status updated!" }); },
  });

  const filtered = creditLines.filter((c: any) =>
    `${clientMap[c.clientId] ?? ""} ${c.productName}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Shell>
      <div className="space-y-6">
        <AdminBypassBanner configKey="admin_bypass_credit_builder_enrollment" label="Auto-enrollment in credit builder products enabled" />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Revolving Credit & Builders</h1>
            <p className="text-muted-foreground mt-1">Manage enrollments in credit builder loans, secured cards, and revolving lines.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="w-4 h-4 mr-2" /> Enroll Client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Enroll in Credit Builder</DialogTitle>
                <DialogDescription>Assign a credit building product to a client's account.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2 col-span-2">
                  <Label>Client *</Label>
                  <Select value={form.clientId} onValueChange={v => setForm(f => ({ ...f, clientId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select client..." /></SelectTrigger>
                    <SelectContent>
                      {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Product Type *</Label>
                  <Select value={form.productType} onValueChange={v => {
                    const p = PRODUCTS.find(x => x.value === v);
                    setForm(f => ({ ...f, productType: v, provider: p?.provider ?? "" }));
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRODUCTS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Product Name *</Label>
                  <Input value={form.productName} onChange={e => setForm(f => ({ ...f, productName: e.target.value }))} placeholder="e.g. Self Credit Builder $25/mo" />
                </div>
                <div className="space-y-2"><Label>Provider</Label><Input value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Credit Limit ($)</Label><Input type="number" value={form.creditLimit} onChange={e => setForm(f => ({ ...f, creditLimit: e.target.value }))} placeholder="500" /></div>
                <div className="space-y-2"><Label>Monthly Payment ($)</Label><Input type="number" value={form.monthlyPayment} onChange={e => setForm(f => ({ ...f, monthlyPayment: e.target.value }))} placeholder="25" /></div>
                <div className="space-y-2"><Label>Term (months)</Label><Input type="number" value={form.termMonths} onChange={e => setForm(f => ({ ...f, termMonths: e.target.value }))} placeholder="12" /></div>
                <div className="space-y-2 col-span-2">
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Enrollment notes..." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => createMutation.mutate({
                    ...form,
                    creditLimit: form.creditLimit ? parseInt(form.creditLimit) * 100 : undefined,
                    monthlyPayment: form.monthlyPayment ? parseInt(form.monthlyPayment) * 100 : undefined,
                    termMonths: form.termMonths ? parseInt(form.termMonths) : undefined,
                  })}
                  disabled={createMutation.isPending || !form.clientId || !form.productName}
                >
                  {createMutation.isPending ? "Enrolling..." : "Enroll Client"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PRODUCTS.map((p, i) => {
            const Icon = p.icon;
            const count = creditLines.filter((c: any) => c.productType === p.value).length;
            return (
              <Card key={i} className="glass-panel">
                <CardHeader className="pb-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${p.bg}`}>
                    <Icon className={`w-5 h-5 ${p.color}`} />
                  </div>
                  <CardTitle className="text-sm">{p.label.split("(")[0].trim()}</CardTitle>
                  <CardDescription className="text-xs">{p.provider}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{count}</div>
                  <p className="text-xs text-muted-foreground">clients enrolled</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="glass-panel border-l-4 border-l-emerald-500">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" />Active</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{creditLines.filter((c: any) => c.status === "active").length}</div></CardContent>
          </Card>
          <Card className="glass-panel border-l-4 border-l-blue-500">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4 text-blue-500" />Pending Approval</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{creditLines.filter((c: any) => ["applied", "reviewing"].includes(c.status)).length}</div></CardContent>
          </Card>
          <Card className="glass-panel border-l-4 border-l-primary">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Total Enrolled</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{creditLines.length}</div></CardContent>
          </Card>
        </div>

        <Card className="glass-panel">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div><CardTitle>All Enrolled Accounts</CardTitle><CardDescription>Live credit builder and revolving line enrollments.</CardDescription></div>
              <div className="relative sm:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search..." className="pl-8 bg-background" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-10 text-muted-foreground">Loading accounts...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Wallet className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No credit builder accounts yet. Enroll a client above.</p>
              </div>
            ) : (
              <div className="rounded-md border bg-background/50">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Limit / Payment</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Update</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{clientMap[c.clientId] ?? "Unknown"}</TableCell>
                        <TableCell>
                          <div><p className="font-medium">{c.productName}</p>{c.provider && <p className="text-xs text-muted-foreground">{c.provider}</p>}</div>
                        </TableCell>
                        <TableCell>
                          <div>
                            {c.creditLimit && <p className="font-bold">${(c.creditLimit / 100).toFixed(0)}</p>}
                            {c.monthlyPayment && <p className="text-xs text-muted-foreground">${(c.monthlyPayment / 100).toFixed(0)}/mo</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="w-24">
                            <Progress value={c.progressPercent ?? 0} className="h-2 mb-1" />
                            <p className="text-xs text-muted-foreground">{c.progressPercent ?? 0}%</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColor[c.status] || ""}>{c.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Select value={c.status} onValueChange={val => updateMutation.mutate({ id: c.id, data: { status: val } })}>
                            <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="applied">Applied</SelectItem>
                              <SelectItem value="reviewing">Reviewing</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
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
    </Shell>
  );
}