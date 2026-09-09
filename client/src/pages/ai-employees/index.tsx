import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/layout/Shell";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Check, Code2, DollarSign, Headphones, Loader2, Play, RefreshCw, X } from "lucide-react";

const AI_API_BASE = "/api/v1/ai-employees";

type Worker = {
  id: string;
  name: string;
  department: string;
  permissions: string[];
  active: boolean;
};

type Approval = {
  request_id: string;
  requesting_worker: string;
  worker_role: string;
  requested_action: string;
  target_system: string;
  proposed_parameters: Record<string, unknown>;
  summary: string;
  risk_level: string;
  timestamp: string;
  expires_at: string;
  status: "pending" | "approved" | "rejected" | "executed" | "failed" | "expired";
  approver_identity?: string | null;
};

type TaskResult = {
  agent?: string;
  source?: string;
  result?: unknown;
  response?: unknown;
  detail?: unknown;
  [key: string]: unknown;
};

const workerMeta: Record<string, { icon: typeof Bot; description: string }> = {
  "arcadia-dev": { icon: Code2, description: "Software, GitHub, infrastructure, and approved code changes." },
  "arcadia-finance": { icon: DollarSign, description: "ERPNext finance, accounting analysis, and financial operations." },
  "arcadia-ops": { icon: Headphones, description: "Operations, CRM, customer service, scheduling, and communications." },
};

const workerEndpoints: Record<string, string> = {
  "arcadia-dev": "/agents/dev",
  "arcadia-finance": "/agents/finance",
  "arcadia-ops": "/agents/ops",
};

async function readJson(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export default function AIEmployeesPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [proposals, setProposals] = useState<Worker[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<string>("arcadia-dev");
  const [task, setTask] = useState("");
  const [result, setResult] = useState<TaskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingWorkers, setLoadingWorkers] = useState(true);
  const [loadingApprovals, setLoadingApprovals] = useState(true);
  const [loadingActions, setLoadingActions] = useState(true);
  const [running, setRunning] = useState(false);
  const [decisionWorker, setDecisionWorker] = useState<string | null>(null);
  const [decisionApproval, setDecisionApproval] = useState<string | null>(null);

  const selected = useMemo(
    () => workers.find((worker) => worker.id === selectedWorker) || workers[0],
    [workers, selectedWorker],
  );

  async function loadWorkers() {
    setLoadingWorkers(true);
    setError(null);
    try {
      const res = await fetch(`${AI_API_BASE}/workers`, { credentials: "include" });
      const data = await readJson(res);
      if (!res.ok) throw new Error(typeof data === "string" ? data : data?.detail || data?.message || "Unable to load workers");
      const nextWorkers = Array.isArray(data) ? data : data?.value || [];
      setWorkers(nextWorkers);
      if (nextWorkers.length && !nextWorkers.some((worker: Worker) => worker.id === selectedWorker)) {
        setSelectedWorker(nextWorkers[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to connect to AI Employees service");
    } finally {
      setLoadingWorkers(false);
    }
  }

  async function loadApprovals() {
    setLoadingApprovals(true);
    try {
      const res = await fetch(`${AI_API_BASE}/workers/proposals`, { credentials: "include" });
      const data = await readJson(res);
      if (!res.ok) throw new Error(typeof data === "string" ? data : data?.detail || data?.message || "Unable to load approvals");
      setProposals(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load approvals");
    } finally {
      setLoadingApprovals(false);
    }
  }

  async function loadActionApprovals() {
    setLoadingActions(true);
    try {
      const res = await fetch(`${AI_API_BASE}/approvals`, { credentials: "include" });
      const data = await readJson(res);
      if (!res.ok) throw new Error(typeof data === "string" ? data : data?.detail || data?.message || "Unable to load action approvals");
      setApprovals(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load action approvals");
    } finally {
      setLoadingActions(false);
    }
  }

  async function refreshAll() {
    await Promise.all([loadWorkers(), loadApprovals(), loadActionApprovals()]);
  }

  useEffect(() => {
    void refreshAll();
  }, []);

  async function decideProposal(worker: Worker, approve: boolean) {
    setDecisionWorker(worker.id);
    setError(null);
    try {
      const endpoint = approve ? "/workers/activate" : "/workers/proposals/reject";
      const body = approve
        ? { worker_id: worker.id, name: worker.name, department: worker.department }
        : { worker_id: worker.id };
      const res = await apiRequest("POST", `${AI_API_BASE}${endpoint}`, body);
      const data = await readJson(res);
      if (res.status !== 202 || !data?.request_id) {
        throw new Error("The server did not create a pending approval request.");
      }
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to request worker decision approval");
    } finally {
      setDecisionWorker(null);
    }
  }

  async function decideAction(approval: Approval, approve: boolean) {
    setDecisionApproval(approval.request_id);
    setError(null);
    try {
      await apiRequest(
        "POST",
        `${AI_API_BASE}/approvals/${approval.request_id}/${approve ? "approve" : "reject"}`,
      );
      if (approve && approval.requested_action === "worker.activate") {
        await apiRequest("POST", `${AI_API_BASE}/workers/activate`, {
          ...approval.proposed_parameters,
          approval_id: approval.request_id,
        });
      } else if (approve && approval.requested_action === "worker.reject") {
        await apiRequest("POST", `${AI_API_BASE}/workers/proposals/reject`, {
          ...approval.proposed_parameters,
          approval_id: approval.request_id,
        });
      } else if (approve && approval.requested_action === "worker.deactivate") {
        await apiRequest("POST", `${AI_API_BASE}/workers/deactivate`, {
          ...approval.proposed_parameters,
          approval_id: approval.request_id,
        });
      } else if (approve && approval.requested_action === "worker.permissions.set") {
        await apiRequest("POST", `${AI_API_BASE}/workers/permissions`, {
          ...approval.proposed_parameters,
          approval_id: approval.request_id,
        });
      }
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval decision failed");
    } finally {
      setDecisionApproval(null);
    }
  }

  async function runTask() {
    if (!selected || !task.trim()) return;
    setRunning(true);
    setResult(null);
    setError(null);

    const endpoint = workerEndpoints[selected.id] || "/task";

    try {
      const res = await apiRequest("POST", `${AI_API_BASE}${endpoint}`, { task: task.trim() });
      const data = await readJson(res);
      if (!res.ok) throw new Error(typeof data === "string" ? data : data?.detail || data?.message || "Task failed");
      setResult(data || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Task failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <Shell title="AI Employees" subtitle="Dispatch work to Infinite Arcadia employees">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI Employees</h1>
            <p className="text-muted-foreground mt-1">Choose an employee, assign work, and approve new staff from one place.</p>
          </div>
          <Button variant="outline" onClick={() => void refreshAll()} disabled={loadingWorkers || loadingApprovals || loadingActions}>
            {loadingWorkers || loadingApprovals || loadingActions ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        </div>

        {error && (
          <Card className="border-destructive/50">
            <CardContent className="pt-6 text-sm text-destructive">
              {error}
              <div className="mt-2 text-xs text-muted-foreground">AI Employees API: {AI_API_BASE}</div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Pending Action Approvals</CardTitle>
                <CardDescription>One-time, server-verified approvals for exact consequential changes.</CardDescription>
              </div>
              <Badge variant={approvals.some((item) => item.status === "pending") ? "default" : "secondary"}>
                {approvals.filter((item) => item.status === "pending").length} Pending
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loadingActions ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading action approvals...</div>
            ) : approvals.filter((item) => item.status === "pending").length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">No consequential actions are waiting for your approval.</div>
            ) : (
              <div className="space-y-3">
                {approvals.filter((item) => item.status === "pending").map((approval) => (
                  <div key={approval.request_id} className="rounded-lg border p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{approval.requesting_worker}</p>
                          <Badge variant="outline">{approval.requested_action}</Badge>
                          <Badge variant={approval.risk_level === "high" ? "destructive" : "secondary"}>{approval.risk_level}</Badge>
                        </div>
                        <p className="text-sm">{approval.summary}</p>
                        <p className="text-xs text-muted-foreground">Target: {approval.target_system} · Role: {approval.worker_role} · {new Date(approval.timestamp).toLocaleString()}</p>
                        <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">{JSON.stringify(approval.proposed_parameters, null, 2)}</pre>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button variant="outline" onClick={() => void decideAction(approval, false)} disabled={decisionApproval === approval.request_id}>
                          <X className="mr-2 h-4 w-4" />Reject
                        </Button>
                        <Button onClick={() => void decideAction(approval, true)} disabled={decisionApproval === approval.request_id}>
                          {decisionApproval === approval.request_id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}Approve
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Staff Approvals</CardTitle>
                <CardDescription>New staff stay pending until you approve them here.</CardDescription>
              </div>
              <Badge variant={proposals.length ? "default" : "secondary"}>{proposals.length} Pending</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loadingApprovals ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading approvals...</div>
            ) : proposals.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">No staff approvals are waiting right now.</div>
            ) : (
              <div className="space-y-3">
                {proposals.map((proposal) => (
                  <div key={proposal.id} className="flex flex-col gap-4 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{proposal.name}</p>
                        <Badge variant="outline">Pending Approval</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{proposal.department}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {proposal.permissions.slice(0, 5).map((permission) => (
                          <Badge key={permission} variant="secondary" className="text-[10px]">{permission}</Badge>
                        ))}
                        {proposal.permissions.length > 5 && <Badge variant="secondary" className="text-[10px]">+{proposal.permissions.length - 5}</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => void decideProposal(proposal, false)} disabled={decisionWorker === proposal.id}>
                        {decisionWorker === proposal.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                        Reject
                      </Button>
                      <Button onClick={() => void decideProposal(proposal, true)} disabled={decisionWorker === proposal.id}>
                        {decisionWorker === proposal.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                        Approve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          {workers.map((worker) => {
            const meta = workerMeta[worker.id] || { icon: Bot, description: "Infinite Arcadia department worker." };
            const Icon = meta.icon;
            const selectedCard = selected?.id === worker.id;
            return (
              <Card
                key={worker.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedWorker(worker.id)}
                onKeyDown={(event) => event.key === "Enter" && setSelectedWorker(worker.id)}
                className={`cursor-pointer transition-colors ${selectedCard ? "border-primary ring-1 ring-primary/30" : "hover:border-primary/40"}`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <Icon className="h-6 w-6 text-primary" />
                    <Badge variant={worker.active ? "default" : "outline"}>{worker.active ? "Active" : "Inactive"}</Badge>
                  </div>
                  <CardTitle className="mt-3">{worker.name}</CardTitle>
                  <CardDescription>{meta.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{worker.department}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {worker.permissions.slice(0, 4).map((permission) => (
                      <Badge key={permission} variant="secondary" className="text-[10px]">{permission}</Badge>
                    ))}
                    {worker.permissions.length > 4 && <Badge variant="secondary" className="text-[10px]">+{worker.permissions.length - 4}</Badge>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Assign Task</CardTitle>
              <CardDescription>{selected ? `Sending directly to ${selected.name}` : "Select an employee first"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={task}
                onChange={(event) => setTask(event.target.value)}
                placeholder="Example: Use live ERPNext data to summarize current companies and account balances. Read only."
                className="min-h-40"
              />
              <Button onClick={() => void runTask()} disabled={!selected?.active || !task.trim() || running} className="w-full sm:w-auto">
                {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                Run Task
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Task Result</CardTitle>
              <CardDescription>Live response from the selected AI employee.</CardDescription>
            </CardHeader>
            <CardContent>
              {result ? (
                <pre className="max-h-[420px] overflow-auto rounded-md bg-muted p-4 text-xs whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
              ) : (
                <div className="flex min-h-40 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                  Run a task to see the result here.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
