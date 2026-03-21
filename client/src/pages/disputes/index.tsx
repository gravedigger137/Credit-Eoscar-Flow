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
import { Search, Plus, Filter, AlertCircle, FileText, Send, Calendar, CheckCircle2 } from "lucide-react";
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

const emptyForm = { clientId: "", bureau: "", accountName: "", accountNumber: "", reason: "", notes: "" };

export default function Disputes() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [bureau, setBureau] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: disputes = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/disputes"] });
  const { data: clients = [] } = useQuery<any[]>({ queryKey: ["/api/clients"] });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/disputes", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/disputes"] });
      qc.invalidateQueries({ queryKey: ["/api/notifications"] });
      setOpen(false);
      setForm(emptyForm);
      toast({ title: "Dispute created successfully!" });
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

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">e-OSCAR Disputes</h1>
            <p className="text-muted-foreground mt-1">Manage disputes sent to credit bureaus via e-OSCAR.</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="w-4 h-4 mr-2" /> New Dispute
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Dispute</DialogTitle>
                  <DialogDescription>File a dispute for a client with the appropriate bureau.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Client *</Label>
                    <Select value={form.clientId} onValueChange={v => setForm(f => ({ ...f, clientId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select a client..." /></SelectTrigger>
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
                      <SelectTrigger><SelectValue placeholder="Select bureau..." /></SelectTrigger>
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
                    <Label>Account Name *</Label>
                    <Input value={form.accountName} onChange={e => setForm(f => ({ ...f, accountName: e.target.value }))} placeholder="e.g. Bank of America" />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Number (last 4)</Label>
                    <Input value={form.accountNumber} onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))} placeholder="XXXX1234" />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Dispute Reason *</Label>
                    <Select value={form.reason} onValueChange={v => setForm(f => ({ ...f, reason: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select a reason..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Not my account">Not my account</SelectItem>
                        <SelectItem value="Late payment incorrect">Late payment is incorrect</SelectItem>
                        <SelectItem value="Account closed/paid">Account is closed / paid in full</SelectItem>
                        <SelectItem value="Incorrect balance">Incorrect balance reported</SelectItem>
                        <SelectItem value="Outdated information">Information is outdated (7-year rule)</SelectItem>
                        <SelectItem value="Identity theft">Identity theft / fraudulent account</SelectItem>
                        <SelectItem value="Paid collection">Collection is paid — should be removed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Notes</Label>
                    <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional context or strategy notes..." rows={3} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button
                    onClick={() => createMutation.mutate(form)}
                    disabled={createMutation.isPending || !form.clientId || !form.bureau || !form.accountName || !form.reason}
                  >
                    {createMutation.isPending ? "Creating..." : "Create Dispute"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="glass-panel border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" /> Total Disputes
              </CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{disputes.length}</div></CardContent>
          </Card>
          <Card className="glass-panel border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" /> Submitted to Bureau
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
        </div>

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
                <Input placeholder="Search account..." className="pl-8 bg-background" value={search} onChange={e => setSearch(e.target.value)} />
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
                      <TableHead>Bureau Contact</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Update</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((d: any) => (
                      <TableRow key={d.id}>
                        <TableCell>
                          <div>
                            <Badge variant="outline" className="mb-1 capitalize">{d.bureau}</Badge>
                            <p className="font-medium">{d.accountName}</p>
                            {d.accountNumber && <p className="text-xs text-muted-foreground">#{d.accountNumber}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-muted-foreground">
                            <p>{BUREAU_INFO[d.bureau]?.address}</p>
                            <p className="mt-0.5">{BUREAU_INFO[d.bureau]?.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[180px]">
                          <p className="text-sm">{d.reason}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-xs">{d.sentAt ? format(new Date(d.sentAt), "MMM d, yyyy") : "Not sent yet"}</p>
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
                              <SelectItem value="sent">Sent to e-OSCAR</SelectItem>
                              <SelectItem value="validated">Validated</SelectItem>
                              <SelectItem value="deleted">Deleted ✓</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
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