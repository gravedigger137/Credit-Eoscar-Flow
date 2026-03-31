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
import { Search, Plus, Filter, CreditCard, CheckCircle2, Clock } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { AdminBypassMulti } from "@/components/admin-bypass-banner";

const emptyForm = {
  clientId: "", institution: "", cardHolder: "", creditLimit: "", historyYears: "",
  reportingDay: "", price: "", status: "pending", notes: "",
};

export default function Tradelines() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: tradelines = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/tradelines"] });
  const { data: clients = [] } = useQuery<any[]>({ queryKey: ["/api/clients"] });

  const clientMap = Object.fromEntries(clients.map((c: any) => [c.id, `${c.firstName} ${c.lastName}`]));

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/tradelines", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/tradelines"] });
      qc.invalidateQueries({ queryKey: ["/api/notifications"] });
      setOpen(false);
      setForm(emptyForm);
      toast({ title: "Tradeline created!" });
    },
    onError: () => toast({ title: "Error creating tradeline", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/tradelines/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/tradelines"] });
      toast({ title: "Tradeline updated!" });
    },
  });

  const filtered = tradelines.filter((t: any) =>
    `${t.institution} ${clientMap[t.clientId] ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor: Record<string, string> = {
    pending: "border-amber-500 text-amber-600",
    active: "border-emerald-500 text-emerald-600",
    removed: "border-muted-foreground text-muted-foreground",
    expired: "border-destructive text-destructive",
  };

  return (
    <Shell>
      <div className="space-y-6">
        <AdminBypassMulti bypasses={[
          { key: "admin_bypass_tradeline_limits", label: "Tradeline slot limits bypassed" },
          { key: "admin_auto_assign_tradelines", label: "Auto-assign tradelines enabled" },
        ]} />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tradeline Management</h1>
            <p className="text-muted-foreground mt-1">Manage authorized user tradelines and account assignments.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <Plus className="w-4 h-4 mr-2" /> New Tradeline Order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Create Tradeline Order</DialogTitle>
                <DialogDescription>Assign an authorized user tradeline to a client.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2 col-span-2">
                  <Label>Client *</Label>
                  <Select value={form.clientId} onValueChange={v => setForm(f => ({ ...f, clientId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select client..." /></SelectTrigger>
                    <SelectContent>
                      {clients.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Financial Institution *</Label>
                  <Input value={form.institution} onChange={e => setForm(f => ({ ...f, institution: e.target.value }))} placeholder="e.g. Chase Sapphire Reserve" />
                </div>
                <div className="space-y-2">
                  <Label>Card Holder Name</Label>
                  <Input value={form.cardHolder} onChange={e => setForm(f => ({ ...f, cardHolder: e.target.value }))} placeholder="John D." />
                </div>
                <div className="space-y-2">
                  <Label>Credit Limit ($)</Label>
                  <Input type="number" value={form.creditLimit} onChange={e => setForm(f => ({ ...f, creditLimit: e.target.value }))} placeholder="35000" />
                </div>
                <div className="space-y-2">
                  <Label>Account Age (years)</Label>
                  <Input type="number" value={form.historyYears} onChange={e => setForm(f => ({ ...f, historyYears: e.target.value }))} placeholder="8" />
                </div>
                <div className="space-y-2">
                  <Label>Reporting Day (of month)</Label>
                  <Input type="number" value={form.reportingDay} onChange={e => setForm(f => ({ ...f, reportingDay: e.target.value }))} placeholder="12" />
                </div>
                <div className="space-y-2">
                  <Label>Price ($)</Label>
                  <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="850" />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Any notes..." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => createMutation.mutate({
                    ...form,
                    creditLimit: form.creditLimit ? parseInt(form.creditLimit) : undefined,
                    historyYears: form.historyYears ? parseInt(form.historyYears) : undefined,
                    reportingDay: form.reportingDay ? parseInt(form.reportingDay) : undefined,
                    price: form.price ? parseInt(form.price) : undefined,
                  })}
                  disabled={createMutation.isPending || !form.clientId || !form.institution}
                >
                  {createMutation.isPending ? "Saving..." : "Create Order"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="glass-panel border-t-4 border-t-indigo-500">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><CreditCard className="w-4 h-4 text-indigo-500" />Active Placements</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{tradelines.filter((t: any) => t.status === "active").length}</div></CardContent>
          </Card>
          <Card className="glass-panel border-t-4 border-t-amber-500">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4 text-amber-500" />Pending</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{tradelines.filter((t: any) => t.status === "pending").length}</div></CardContent>
          </Card>
          <Card className="glass-panel border-t-4 border-t-emerald-500">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" />Total Orders</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{tradelines.length}</div></CardContent>
          </Card>
        </div>

        <Card className="glass-panel">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div><CardTitle>Tradeline Orders</CardTitle><CardDescription>All active and pending tradeline assignments.</CardDescription></div>
              <div className="relative sm:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search..." className="pl-8 bg-background" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-10 text-muted-foreground">Loading tradelines...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No tradelines yet. Create your first order.</p>
              </div>
            ) : (
              <div className="rounded-md border bg-background/50">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Institution</TableHead>
                      <TableHead>Limit / Age</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Update</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{clientMap[t.clientId] ?? "Unknown"}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{t.institution}</p>
                            {t.cardHolder && <p className="text-xs text-muted-foreground">Holder: {t.cardHolder}</p>}
                            {t.reportingDay && <p className="text-xs text-muted-foreground">Reports: {t.reportingDay}th</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            {t.creditLimit && <p className="font-bold">${t.creditLimit.toLocaleString()}</p>}
                            {t.historyYears && <p className="text-xs text-muted-foreground">{t.historyYears} yrs history</p>}
                          </div>
                        </TableCell>
                        <TableCell className="font-bold">{t.price ? `$${t.price}` : "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColor[t.status] || ""}>{t.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Select value={t.status} onValueChange={val => updateMutation.mutate({ id: t.id, data: { status: val } })}>
                            <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="removed">Removed</SelectItem>
                              <SelectItem value="expired">Expired</SelectItem>
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