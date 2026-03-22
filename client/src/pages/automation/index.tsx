import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import {
  Zap, Play, Pause, RotateCcw, Plus, Clock, CheckCircle2, XCircle,
  Activity, Bot, ShieldCheck, FileText, Users, TrendingUp, AlertTriangle,
  Loader2, ChevronDown, ChevronRight, Settings2, Trash2, BarChart3
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const WORKFLOW_ICONS: Record<string, any> = {
  auto_dispute: FileText,
  client_onboarding: Users,
  score_monitoring: Activity,
  follow_up: Clock,
  letter_generation: FileText,
  compliance_check: ShieldCheck,
  report_pull: BarChart3,
  tradeline_review: TrendingUp,
  collection_response: AlertTriangle,
  goodwill_campaign: FileText,
  bureau_escalation: AlertTriangle,
  client_graduation: CheckCircle2,
  stale_dispute_check: Clock,
  payment_reminder: Clock,
  ai_analysis: Bot,
};

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-green-500/15 text-green-400 border-green-500/30",
  running: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  failed: "bg-red-500/15 text-red-400 border-red-500/30",
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  skipped: "bg-gray-500/15 text-gray-400 border-gray-500/30",
};

export default function AutomationPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [newRule, setNewRule] = useState({
    name: "", description: "", workflowType: "score_monitoring", triggerType: "scheduled",
    triggerConfig: { frequency: "daily" }, enabled: true
  });

  const { data: rules = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/automation/rules"] });
  const { data: runs = [] } = useQuery<any[]>({ queryKey: ["/api/automation/runs"] });
  const { data: stats } = useQuery<any>({ queryKey: ["/api/automation/stats"] });
  const { data: workflowTypes = [] } = useQuery<any[]>({ queryKey: ["/api/automation/workflow-types"] });

  const toggleMut = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      apiRequest("PATCH", `/api/automation/rules/${id}/toggle`, { enabled }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/automation/rules"] }); toast({ title: "Rule updated" }); },
  });

  const executeMut = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/automation/rules/${id}/execute`).then(r => r.json()),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["/api/automation/runs"] });
      qc.invalidateQueries({ queryKey: ["/api/automation/rules"] });
      qc.invalidateQueries({ queryKey: ["/api/automation/stats"] });
      toast({
        title: data.status === "completed" ? "Workflow completed" : "Workflow failed",
        description: `Processed ${data.itemsProcessed} items, ${data.itemsSucceeded} succeeded`,
        variant: data.status === "failed" ? "destructive" : "default",
      });
    },
    onError: () => toast({ title: "Execution failed", variant: "destructive" }),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/automation/rules", data).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/automation/rules"] });
      setCreateOpen(false);
      setNewRule({ name: "", description: "", workflowType: "score_monitoring", triggerType: "scheduled", triggerConfig: { frequency: "daily" }, enabled: true });
      toast({ title: "Automation rule created" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/automation/rules/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/automation/rules"] });
      qc.invalidateQueries({ queryKey: ["/api/automation/stats"] });
      toast({ title: "Rule deleted" });
    },
  });

  const seedMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/automation/seed").then(r => r.json()),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["/api/automation/rules"] });
      toast({ title: `Seeded ${data.seeded} automation rules` });
    },
  });

  const activeRules = rules.filter((r: any) => r.enabled).length;
  const recentRuns = runs.slice(0, 20);

  return (
    <Shell title="Automation Engine" subtitle="AI-powered workflow automation for your entire credit repair pipeline">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-panel">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> Active Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-active-rules">{activeRules}</div>
              <p className="text-xs text-muted-foreground mt-1">of {rules.length} total rules</p>
            </CardContent>
          </Card>
          <Card className="glass-panel">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Activity className="w-4 h-4 text-green-400" /> Runs (30d)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-runs">{stats?.last30Days?.totalRuns || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">{stats?.last30Days?.completed || 0} completed</p>
            </CardContent>
          </Card>
          <Card className="glass-panel">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-400" /> Items Processed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.last30Days?.itemsProcessed || 0}</div>
              <p className="text-xs text-green-400 mt-1">{stats?.last30Days?.itemsSucceeded || 0} succeeded</p>
            </CardContent>
          </Card>
          <Card className="glass-panel">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><XCircle className="w-4 h-4 text-destructive" /> Failed (30d)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.last30Days?.failed || 0}</div>
              <p className="text-xs text-destructive mt-1">Require attention</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="rules" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="rules"><Zap className="w-3 h-3 mr-1" /> Rules</TabsTrigger>
            <TabsTrigger value="runs"><Activity className="w-3 h-3 mr-1" /> Run History</TabsTrigger>
            <TabsTrigger value="workflows"><Bot className="w-3 h-3 mr-1" /> Workflows</TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="mt-6">
            <Card className="glass-panel">
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle>Automation Rules</CardTitle>
                    <CardDescription>Configure and manage automated workflows</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {rules.length === 0 && (
                      <Button variant="outline" size="sm" onClick={() => seedMut.mutate()} disabled={seedMut.isPending} data-testid="button-seed-rules">
                        <RotateCcw className="w-4 h-4 mr-1" /> Load Defaults
                      </Button>
                    )}
                    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" data-testid="button-create-rule"><Plus className="w-4 h-4 mr-1" /> New Rule</Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Create Automation Rule</DialogTitle>
                          <DialogDescription>Set up a new automated workflow</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Name</Label>
                            <Input placeholder="e.g., Daily Score Check" value={newRule.name} onChange={e => setNewRule(p => ({ ...p, name: e.target.value }))} data-testid="input-rule-name" />
                          </div>
                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Input placeholder="What this rule does..." value={newRule.description} onChange={e => setNewRule(p => ({ ...p, description: e.target.value }))} data-testid="input-rule-description" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Workflow Type</Label>
                              <Select value={newRule.workflowType} onValueChange={v => setNewRule(p => ({ ...p, workflowType: v }))}>
                                <SelectTrigger data-testid="select-workflow-type"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {workflowTypes.map((wt: any) => (
                                    <SelectItem key={wt.type} value={wt.type}>{wt.type.replace(/_/g, " ")}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Trigger</Label>
                              <Select value={newRule.triggerType} onValueChange={v => setNewRule(p => ({ ...p, triggerType: v }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="scheduled">Scheduled</SelectItem>
                                  <SelectItem value="event">Event-Driven</SelectItem>
                                  <SelectItem value="manual">Manual Only</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          {newRule.triggerType === "scheduled" && (
                            <div className="space-y-2">
                              <Label>Frequency</Label>
                              <Select value={newRule.triggerConfig.frequency || "daily"} onValueChange={v => setNewRule(p => ({ ...p, triggerConfig: { ...p.triggerConfig, frequency: v } }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="hourly">Hourly</SelectItem>
                                  <SelectItem value="daily">Daily</SelectItem>
                                  <SelectItem value="weekly">Weekly</SelectItem>
                                  <SelectItem value="monthly">Monthly</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                          <Button onClick={() => createMut.mutate({ ...newRule, actions: [] })} disabled={!newRule.name || createMut.isPending} data-testid="button-save-rule">Create Rule</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="py-12 text-center text-muted-foreground">Loading automation rules...</div>
                ) : rules.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Bot className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">No automation rules configured</p>
                    <p className="text-sm mt-1">Click "Load Defaults" to set up recommended automations</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rules.map((rule: any) => {
                      const Icon = WORKFLOW_ICONS[rule.workflowType] || Zap;
                      const isExpanded = expandedRule === rule.id;
                      return (
                        <div key={rule.id} className="border rounded-lg overflow-hidden">
                          <div className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setExpandedRule(isExpanded ? null : rule.id)}>
                            <div className={`p-2 rounded-lg ${rule.enabled ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{rule.name}</span>
                                <Badge variant="outline" className="text-xs">{rule.triggerType}</Badge>
                                {rule.triggerConfig?.frequency && <Badge variant="secondary" className="text-xs">{rule.triggerConfig.frequency}</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{rule.description}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {rule.lastRunAt && <span className="text-xs text-muted-foreground hidden sm:inline">Last: {formatDistanceToNow(new Date(rule.lastRunAt), { addSuffix: true })}</span>}
                              <span className="text-xs text-muted-foreground">{rule.runCount} runs</span>
                              <Switch checked={rule.enabled} onCheckedChange={enabled => toggleMut.mutate({ id: rule.id, enabled })} onClick={e => e.stopPropagation()} data-testid={`switch-rule-${rule.id}`} />
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); executeMut.mutate(rule.id); }} disabled={executeMut.isPending} data-testid={`button-run-${rule.id}`}>
                                {executeMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                              </Button>
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="border-t bg-muted/20 p-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Workflow</span>
                                  <p className="font-medium">{rule.workflowType.replace(/_/g, " ")}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Trigger</span>
                                  <p className="font-medium">{rule.triggerType}{rule.triggerConfig?.frequency ? ` (${rule.triggerConfig.frequency})` : ""}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Total Runs</span>
                                  <p className="font-medium">{rule.runCount}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Created</span>
                                  <p className="font-medium">{rule.createdAt ? formatDistanceToNow(new Date(rule.createdAt), { addSuffix: true }) : "—"}</p>
                                </div>
                              </div>
                              {rule.actions?.length > 0 && (
                                <div className="mt-3">
                                  <span className="text-xs text-muted-foreground">Actions:</span>
                                  <div className="flex gap-2 mt-1">{rule.actions.map((a: any, i: number) => <Badge key={i} variant="outline" className="text-xs">{a.type.replace(/_/g, " ")}</Badge>)}</div>
                                </div>
                              )}
                              <div className="mt-3 flex gap-2">
                                <Button variant="default" size="sm" onClick={() => executeMut.mutate(rule.id)} disabled={executeMut.isPending} data-testid={`button-execute-${rule.id}`}>
                                  {executeMut.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Play className="w-4 h-4 mr-1" />} Run Now
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => { if (confirm("Delete this automation rule?")) deleteMut.mutate(rule.id); }} data-testid={`button-delete-${rule.id}`}>
                                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="runs" className="mt-6">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Run History</CardTitle>
                <CardDescription>Recent automation execution results</CardDescription>
              </CardHeader>
              <CardContent>
                {recentRuns.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>No automation runs yet. Execute a rule to see results here.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rule</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Processed</TableHead>
                        <TableHead>Succeeded</TableHead>
                        <TableHead>Failed</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentRuns.map((run: any) => (
                        <TableRow key={run.id}>
                          <TableCell className="font-medium">{run.ruleName}</TableCell>
                          <TableCell>
                            <Badge className={STATUS_COLORS[run.status] || ""}>{run.status}</Badge>
                          </TableCell>
                          <TableCell>{run.itemsProcessed}</TableCell>
                          <TableCell className="text-green-400">{run.itemsSucceeded}</TableCell>
                          <TableCell className={run.itemsFailed > 0 ? "text-destructive" : ""}>{run.itemsFailed}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{run.startedAt ? formatDistanceToNow(new Date(run.startedAt), { addSuffix: true }) : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workflows" className="mt-6">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Available Workflow Types</CardTitle>
                <CardDescription>All automation workflows that can be configured</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {workflowTypes.map((wt: any) => {
                    const Icon = WORKFLOW_ICONS[wt.type] || Zap;
                    const existingRule = rules.find((r: any) => r.workflowType === wt.type);
                    return (
                      <div key={wt.type} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="p-2 rounded-lg bg-primary/15 text-primary shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{wt.type.replace(/_/g, " ")}</span>
                            {existingRule && <Badge variant={existingRule.enabled ? "default" : "secondary"} className="text-xs">{existingRule.enabled ? "Active" : "Disabled"}</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{wt.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Shell>
  );
}
