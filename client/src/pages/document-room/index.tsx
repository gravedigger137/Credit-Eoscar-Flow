import { Shell } from "@/components/layout/Shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Archive,
  Bot,
  CheckCircle2,
  FileCheck,
  FileText,
  Gauge,
  Landmark,
  Loader2,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";

const statusClass: Record<string, string> = {
  draft: "bg-slate-500/15 text-slate-500 border-slate-500/30",
  active: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  attorney_review_required: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  accountant_review_required: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  approved: "bg-green-500/15 text-green-600 border-green-500/30",
  superseded: "bg-muted text-muted-foreground border-border",
  missing: "bg-red-500/15 text-red-500 border-red-500/30",
  pending_review: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  complete: "bg-green-500/15 text-green-600 border-green-500/30",
};

function formatStatus(status?: string) {
  return (status || "draft").replace(/_/g, " ");
}

function StatusBadge({ status }: { status?: string }) {
  return <Badge variant="outline" className={`capitalize ${statusClass[status || "draft"] || statusClass.draft}`}>{formatStatus(status)}</Badge>;
}

function MetricCard({ title, value, icon: Icon, tone }: { title: string; value: number | string; icon: any; tone: string }) {
  return (
    <Card className="glass-panel">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Icon className={`w-4 h-4 ${tone}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

export default function DocumentRoomPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [newItem, setNewItem] = useState({
    category: "Organizational",
    title: "",
    documentType: "policy",
    description: "",
    status: "draft",
    confidentialityLevel: "internal",
  });

  const { data: summary, isLoading: summaryLoading } = useQuery<any>({ queryKey: ["/api/document-room/summary"] });
  const { data: items = [], isLoading: itemsLoading } = useQuery<any[]>({ queryKey: ["/api/document-room/items"] });
  const { data: assets = [] } = useQuery<any[]>({ queryKey: ["/api/document-room/collateral-assets"] });
  const { data: receivables = [] } = useQuery<any[]>({ queryKey: ["/api/document-room/receivables"] });
  const { data: checklist = [] } = useQuery<any[]>({ queryKey: ["/api/document-room/facility-checklist"] });
  const { data: equityBonusRecords = [] } = useQuery<any[]>({ queryKey: ["/api/document-room/equity-bonus"] });
  const { data: audits = [] } = useQuery<any[]>({ queryKey: ["/api/document-room/audit-events"] });
  const { data: agents } = useQuery<any>({ queryKey: ["/api/v1/status/agents"] });

  const createItem = useMutation({
    mutationFn: (payload: any) => apiRequest("POST", "/api/document-room/items", payload).then((res) => res.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/document-room/summary"] });
      qc.invalidateQueries({ queryKey: ["/api/document-room/items"] });
      qc.invalidateQueries({ queryKey: ["/api/document-room/audit-events"] });
      setNewItem({ category: "Organizational", title: "", documentType: "policy", description: "", status: "draft", confidentialityLevel: "internal" });
      toast({ title: "Document room item created" });
    },
    onError: (error: Error) => toast({ title: "Could not create item", description: error.message, variant: "destructive" }),
  });

  const groupedItems = useMemo(() => {
    return items.reduce((acc: Record<string, any[]>, item) => {
      const key = item.category || "Uncategorized";
      acc[key] = acc[key] || [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [items]);

  return (
    <Shell title="Document Room" subtitle="Due diligence binder, asset register, and facility-readiness controls">
      <div className="space-y-6">
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium">Professional review required</p>
              <p className="text-sm text-muted-foreground">
                This module organizes records, workflows, and evidence only. It does not approve credit facilities, provide legal advice, prove asset values, or represent live bureau/e-OSCAR authorization.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard title="Total Documents" value={summaryLoading ? "..." : summary?.totalDocuments ?? 0} icon={FileText} tone="text-primary" />
          <MetricCard title="Ready Documents" value={summary?.documentsReady ?? 0} icon={CheckCircle2} tone="text-green-500" />
          <MetricCard title="Review Required" value={(summary?.attorneyReviewRequired ?? 0) + (summary?.accountantReviewRequired ?? 0)} icon={ShieldCheck} tone="text-amber-500" />
          <MetricCard title="Facility Readiness" value={`${summary?.facilityReadinessPercentage ?? 0}%`} icon={Gauge} tone="text-blue-500" />
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="receivables">Receivables</TabsTrigger>
            <TabsTrigger value="equity">Equity</TabsTrigger>
            <TabsTrigger value="agents">AI Teams</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle>Binder Categories</CardTitle>
                  <CardDescription>Grouped due-diligence records and review status</CardDescription>
                </CardHeader>
                <CardContent>
                  {itemsLoading ? (
                    <div className="py-12 flex items-center justify-center text-muted-foreground"><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading binder...</div>
                  ) : Object.keys(groupedItems).length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <Archive className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">No document-room items yet</p>
                      <p className="text-sm">Create a draft record to begin the due-diligence binder.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(groupedItems).map(([category, records]) => (
                        <div key={category} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold">{category}</h3>
                            <Badge variant="secondary">{records.length}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {records.slice(0, 8).map((item) => <StatusBadge key={item.id} status={item.status} />)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Add Draft Record</CardTitle>
                  <CardDescription>Create metadata only. Upload evidence through the existing upload flow.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input value={newItem.title} onChange={(event) => setNewItem((prev) => ({ ...prev, title: event.target.value }))} placeholder="e.g., Corporate bylaws draft" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={newItem.category} onValueChange={(value) => setNewItem((prev) => ({ ...prev, category: value }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["Organizational", "Trust", "Corporate", "IP Assets", "Customer Contracts", "Receivables", "Credit Facility", "Technology", "Compliance", "Finance", "Lender Package"].map((category) => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={newItem.status} onValueChange={(value) => setNewItem((prev) => ({ ...prev, status: value }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="attorney_review_required">Attorney Review</SelectItem>
                          <SelectItem value="accountant_review_required">Accountant Review</SelectItem>
                          <SelectItem value="active">Ready</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Document Type</Label>
                    <Input value={newItem.documentType} onChange={(event) => setNewItem((prev) => ({ ...prev, documentType: event.target.value }))} placeholder="resolution, msa, policy, evidence" />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={newItem.description} onChange={(event) => setNewItem((prev) => ({ ...prev, description: event.target.value }))} placeholder="Purpose, owner, review notes, and supporting evidence needed." />
                  </div>
                  <Button className="w-full" onClick={() => createItem.mutate(newItem)} disabled={!newItem.title || createItem.isPending}>
                    {createItem.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : "Create Draft Record"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="mt-6">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Due Diligence Binder</CardTitle>
                <CardDescription>Document metadata with attorney/accountant and lender visibility flags</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Review</TableHead>
                      <TableHead>Lender Visible</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.title}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell><StatusBadge status={item.status} /></TableCell>
                        <TableCell>{item.version}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {item.attorneyReviewRequired && <Badge variant="outline">Attorney</Badge>}
                            {item.accountantReviewRequired && <Badge variant="outline">Accountant</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>{item.lenderVisible ? <Badge>Lender Visible</Badge> : <span className="text-muted-foreground">No</span>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assets" className="mt-6">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Asset Register</CardTitle>
                <CardDescription>No ownership, lien, or valuation conclusion is implied without supporting documents and professional review.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Valuation</TableHead>
                      <TableHead>Lender Visible</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell className="font-medium">{asset.assetName}</TableCell>
                        <TableCell>{formatStatus(asset.assetType)}</TableCell>
                        <TableCell>{asset.ownerEntity || "Review required"}</TableCell>
                        <TableCell>{asset.assignedToEntity || "Not assigned"}</TableCell>
                        <TableCell><StatusBadge status={asset.valuationStatus} /></TableCell>
                        <TableCell>{asset.lenderVisible ? <Badge>Lender Visible</Badge> : <span className="text-muted-foreground">No</span>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="receivables" className="mt-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle>Receivable Readiness</CardTitle>
                  <CardDescription>Eligibility requires agreement, invoice, service evidence, clear terms, no dispute, and manual admin review.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Eligible</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receivables.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>{record.invoiceId || "Not linked"}</TableCell>
                          <TableCell><StatusBadge status={record.status} /></TableCell>
                          <TableCell>{record.serviceStatus}</TableCell>
                          <TableCell>{record.lenderEligible && record.manualReviewCompleted ? <Badge>Eligible</Badge> : <span className="text-muted-foreground">Review required</span>}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle>Facility Checklist</CardTitle>
                  <CardDescription>Readiness checklist for real lender review. This is not an approved facility.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {checklist.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="font-medium">{item.checklistItem}</p>
                          <p className="text-xs text-muted-foreground">{item.category}</p>
                        </div>
                        <StatusBadge status={item.status} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="equity" className="mt-6">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Equity / Shareholder Bonus</CardTitle>
                <CardDescription>Optional, compliance-gated workflow only. Signup does not issue shares or create shareholder status.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 mb-4 text-sm text-muted-foreground">
                  Securities attorney review, board/officer approval, signed agreements, updated cap table, stock ledger entry, tax review, disclosure acceptance, and transfer restriction review are required before any issuance.
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Eligibility</TableHead>
                      <TableHead>Agreement</TableHead>
                      <TableHead>Attorney</TableHead>
                      <TableHead>Board</TableHead>
                      <TableHead>Shares</TableHead>
                      <TableHead>Certificate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {equityBonusRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.customerName || record.customerId || "Unassigned"}</TableCell>
                        <TableCell><StatusBadge status={record.eligibilityStatus} /></TableCell>
                        <TableCell>{record.agreementStatus}</TableCell>
                        <TableCell>{record.attorneyReviewStatus}</TableCell>
                        <TableCell>{record.boardApprovalStatus}</TableCell>
                        <TableCell>{record.sharesApproved ?? record.sharesProposed ?? "Not approved"}</TableCell>
                        <TableCell>{record.certificateStatus}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agents" className="mt-6">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bot className="w-5 h-5" /> AI Operations Teams</CardTitle>
                <CardDescription>Agents support workflow only. Professional decisions require human review.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {(agents?.agents || []).map((agent: any) => (
                    <div key={agent.agentName} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{agent.agentName}</p>
                          <p className="text-xs text-muted-foreground">{agent.department}</p>
                        </div>
                        <Badge variant="outline">Team {agent.team}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-3">{agent.purpose}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="mt-6">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileCheck className="w-5 h-5" /> Audit History</CardTitle>
                <CardDescription>Newest 100 document-room, asset, collateral, receivable, and lender-visibility events</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Risk</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {audits.map((audit) => (
                      <TableRow key={audit.id}>
                        <TableCell>{audit.createdAt ? new Date(audit.createdAt).toLocaleString() : ""}</TableCell>
                        <TableCell>{audit.action}</TableCell>
                        <TableCell>{audit.entityType}</TableCell>
                        <TableCell>{audit.highRisk ? <Badge variant="destructive">High</Badge> : <Badge variant="outline">Standard</Badge>}</TableCell>
                        <TableCell>{audit.reason || <span className="text-muted-foreground">None</span>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4 flex items-center gap-3">
            <Landmark className="w-5 h-5 text-primary" />
            <p className="text-sm text-muted-foreground">
              High-risk updates require the confirmation phrase: <span className="font-medium text-foreground">{summary?.requiredConfirmationText || "I understand this requires professional review"}</span>.
            </p>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
