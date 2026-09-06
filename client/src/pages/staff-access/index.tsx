import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Loader2, RefreshCw, UserCheck, UserX } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

type StaffUser = {
  id: string;
  username: string;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  role: string;
  createdAt?: string | null;
  approvalStatus: "pending" | "approved" | "rejected";
  isActive: boolean;
  approvedAt?: string | null;
  lastLoginAt?: string | null;
};

async function readJson(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

export default function StaffAccessPage() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pendingCount = useMemo(
    () => staff.filter((person) => person.approvalStatus === "pending").length,
    [staff],
  );

  async function loadStaff() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/admin/users`, { credentials: "include" });
      const data = await readJson(res);
      if (!res.ok) throw new Error(typeof data === "string" ? data : data?.message || "Unable to load staff accounts");
      setStaff(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load staff accounts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadStaff(); }, []);

  async function decide(person: StaffUser, decision: "approve" | "reject") {
    setActionId(person.id);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/admin/users/${person.id}/${decision}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(typeof data === "string" ? data : data?.message || `Unable to ${decision} account`);
      await loadStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Unable to ${decision} account`);
    } finally {
      setActionId(null);
    }
  }

  return (
    <Shell title="Staff Access" subtitle="Approve staff accounts before they can sign in">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Staff Access</h1>
            <p className="mt-1 text-muted-foreground">Every non-admin account stays blocked until you approve it here.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={pendingCount > 0 ? "default" : "secondary"}>{pendingCount} pending</Badge>
            <Button variant="outline" onClick={() => void loadStaff()} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <Card className="border-destructive/50">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Registered Staff</CardTitle>
            <CardDescription>Name, email, role, account status, and last successful login.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && staff.length === 0 ? (
              <div className="flex min-h-40 items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading staff…
              </div>
            ) : staff.length === 0 ? (
              <div className="flex min-h-40 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                No staff accounts found.
              </div>
            ) : (
              <div className="space-y-3">
                {staff.map((person) => {
                  const working = actionId === person.id;
                  const isAdmin = ["admin", "administrator", "owner"].includes(person.role.toLowerCase());
                  return (
                    <div key={person.id} className="rounded-lg border p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">{person.fullName || person.username}</span>
                            <Badge variant={person.isActive ? "default" : "outline"}>
                              {person.isActive ? "Active" : person.approvalStatus === "rejected" ? "Rejected" : "Pending Approval"}
                            </Badge>
                            <Badge variant="secondary">{person.role}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground/80">Email:</span> {person.email || "No email provided"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Username: {person.username} · Registered: {formatDate(person.createdAt)} · Last login: {formatDate(person.lastLoginAt)}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
                          {person.approvalStatus !== "approved" && !isAdmin && (
                            <Button onClick={() => void decide(person, "approve")} disabled={working}>
                              {working ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}
                              Approve
                            </Button>
                          )}
                          {person.approvalStatus === "pending" && !isAdmin && (
                            <Button variant="outline" onClick={() => void decide(person, "reject")} disabled={working}>
                              <UserX className="mr-2 h-4 w-4" /> Reject
                            </Button>
                          )}
                          {(person.isActive || isAdmin) && (
                            <div className="flex items-center px-2 text-sm text-muted-foreground">
                              <Check className="mr-1 h-4 w-4" /> Access enabled
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">Signed in as {user?.email || user?.username}. Administrator accounts remain exempt from the approval gate.</p>
      </div>
    </Shell>
  );
}
