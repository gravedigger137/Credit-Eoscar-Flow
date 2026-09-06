import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Code2, DollarSign, Headphones, Loader2, Play, RefreshCw } from "lucide-react";

const AI_API_BASE = (import.meta.env.VITE_AI_EMPLOYEES_API_URL || "http://127.0.0.1:8100").replace(/\/$/, "");

type Worker = {
  id: string;
  name: string;
  department: string;
  permissions: string[];
  active: boolean;
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
  const [selectedWorker, setSelectedWorker] = useState<string>("arcadia-dev");
  const [task, setTask] = useState("");
  const [result, setResult] = useState<TaskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingWorkers, setLoadingWorkers] = useState(true);
  const [running, setRunning] = useState(false);

  const selected = useMemo(
    () => workers.find((worker) => worker.id === selectedWorker) || workers[0],
    [workers, selectedWorker],
  );

  async function loadWorkers() {
    setLoadingWorkers(true);
    setError(null);
    try {
      const res = await fetch(`${AI_API_BASE}/workers`);
      const data = await readJson(res);
      if (!res.ok) throw new Error(typeof data === "string" ? data : data?.detail || "Unable to load workers");
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

  useEffect(() => {
    void loadWorkers();
  }, []);

  async function runTask() {
    if (!selected || !task.trim()) return;
    setRunning(true);
    setResult(null);
    setError(null);

    const endpoint = workerEndpoints[selected.id] || "/task";

    try {
      const res = await fetch(`${AI_API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: task.trim() }),
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(typeof data === "string" ? data : data?.detail || "Task failed");
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
            <p className="text-muted-foreground mt-1">Choose an employee, assign a task, and review the result.</p>
          </div>
          <Button variant="outline" onClick={() => void loadWorkers()} disabled={loadingWorkers}>
            {loadingWorkers ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh Workers
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
