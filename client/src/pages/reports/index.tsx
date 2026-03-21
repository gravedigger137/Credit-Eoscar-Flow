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
import { Search, Plus, Activity, TrendingUp, AlertTriangle, Download, RefreshCw } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const emptyForm = {
  clientId: "", equifaxScore: "", experianScore: "", transunionScore: "",
  equifaxChange: "", experianChange: "", transunionChange: "",
  negativeItems: "", status: "pending",
};

export default function Reports() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: reports = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/reports"] });
  const { data: clients = [] } = useQuery<any[]>({ queryKey: ["/api/clients"] });

  const clientMap = Object.fromEntries(clients.map((c: any) => [c.id, `${c.firstName} ${c.lastName}`]));

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/reports", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/reports"] });
      setOpen(false);
      setForm(emptyForm);
      toast({ title: "Credit report imported!" });
    },
    onError: () => toast({ title: "Error importing report", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/reports/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/reports"] });
      toast({ title: "Report updated!" });
    },
  });

  const filtered = reports.filter((r: any) =>
    `${clientMap[r.clientId] ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  const avgImprovement = reports.length > 0
    ? Math.round(reports.reduce((s: number, r: any) => s + (r.equifaxChange ?? 0), 0) / reports.length)
    : 0;

  const parseNum = (v: string) => v !== "" ? parseInt(v) : undefined;

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Credit Reports</h1>
            <p className="text-muted-foreground mt-1">Import, analyze, and track credit report history for all clients.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" /> Import Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Import Credit Report</DialogTitle>
                <DialogDescription>Enter scores from all three bureaus for the client.</DialogDescription>
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
                <div className="space-y-2"><Label>Equifax Score</Label><Input type="number" value={form.equifaxScore} onChange={e => setForm(f => ({ ...f, equifaxScore: e.target.value }))} placeholder="650" /></div>
                <div className="space-y-2"><Label>Equifax Change (+/-)</Label><Input type="number" value={form.equifaxChange} onChange={e => setForm(f => ({ ...f, equifaxChange: e.target.value }))} placeholder="+12" /></div>
                <div className="space-y-2"><Label>Experian Score</Label><Input type="number" value={form.experianScore} onChange={e => setForm(f => ({ ...f, experianScore: e.target.value }))} placeholder="645" /></div>
                <div className="space-y-2"><Label>Experian Change (+/-)</Label><Input type="number" value={form.experianChange} onChange={e => setForm(f => ({ ...f, experianChange: e.target.value }))} placeholder="+15" /></div>
                <div className="space-y-2"><Label>TransUnion Score</Label><Input type="number" value={form.transunionScore} onChange={e => setForm(f => ({ ...f, transunionScore: e.target.value }))} placeholder="655" /></div>
                <div className="space-y-2"><Label>TransUnion Change (+/-)</Label><Input type="number" value={form.transunionChange} onChange={e => setForm(f => ({ ...f, transunionChange: e.target.value }))} placeholder="+8" /></div>
                <div className="space-y-2"><Label>Negative Items</Label><Input type="number" value={form.negativeItems} onChange={e => setForm(f => ({ ...f, negativeItems: e.target.value }))} placeholder="4" /></div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Needs Review</SelectItem>
                      <SelectItem value="analyzed">Analyzed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => createMutation.mutate({
                    clientId: form.clientId,
                    equifaxScore: parseNum(form.equifaxScore),
                    experianScore: parseNum(form.experianScore),
                    transunionScore: parseNum(form.transunionScore),
                    equifaxChange: parseNum(form.equifaxChange),
                    experianChange: parseNum(form.experianChange),
                    transunionChange: parseNum(form.transunionChange),
                    negativeItems: parseNum(form.negativeItems),
                    status: form.status,
                  })}
                  disabled={createMutation.isPending || !form.clientId}
                >
                  {createMutation.isPending ? "Importing..." : "Import Report"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="glass-panel border-l-4 border-l-primary">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Activity className="w-4 h-4 text-primary" />Total Reports</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{reports.length}</div></CardContent>
          </Card>
          <Card className="glass-panel border-l-4 border-l-success">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><TrendingUp className="w-4 h-4 text-success" />Avg Score Improvement</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{avgImprovement >= 0 ? "+" : ""}{avgImprovement} pts</div></CardContent>
          </Card>
          <Card className="glass-panel border-l-4 border-l-amber-500">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" />Needs Review</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{reports.filter((r: any) => r.status === "pending").length}</div></CardContent>
          </Card>
        </div>

        <Card className="glass-panel">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div><CardTitle>Credit Report History</CardTitle><CardDescription>All imported report pulls and score summaries.</CardDescription></div>
              <div className="relative sm:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search client..." className="pl-8 bg-background" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-10 text-muted-foreground">Loading reports...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No reports imported yet. Import a credit report above.</p>
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
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div><p className="font-medium">{clientMap[r.clientId] ?? "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{r.pullDate ? format(new Date(r.pullDate), "MMM d, yyyy") : "—"}</p></div>
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
                            className={r.status === "analyzed" ? "bg-success hover:bg-success/90" : "bg-amber-100 text-amber-700"}>
                            {r.status === "analyzed" ? "Analyzed" : "Needs Review"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => updateMutation.mutate({ id: r.id, data: { status: r.status === "analyzed" ? "pending" : "analyzed" } })}>
                            {r.status === "analyzed" ? "Reopen" : "Mark Analyzed"}
                          </Button>
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