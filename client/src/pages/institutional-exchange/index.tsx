import { Shell } from "@/components/layout/Shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Archive, Building2, GitBranch, KeyRound, Landmark, RefreshCw, Route, ShieldCheck } from "lucide-react";
import { useState } from "react";

const emptyInstitution = {
  name: "",
  legalName: "",
  institutionType: "financial_institution",
  jurisdiction: "US",
  contactEmail: "",
  riskRating: "standard",
};

const emptyCredential = {
  institutionId: "",
  credentialType: "api_secret",
  keyName: "",
  value: "",
  environment: "sandbox",
};

function statusBadge(status: string | undefined) {
  const normalized = status || "unknown";
  const variant = ["active", "configured", "submitted", "passed"].includes(normalized) ? "default" : "secondary";
  return <Badge variant={variant} className="capitalize">{normalized.replace(/_/g, " ")}</Badge>;
}

export default function InstitutionalExchange() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [institutionForm, setInstitutionForm] = useState(emptyInstitution);
  const [credentialForm, setCredentialForm] = useState(emptyCredential);

  const dashboard = useQuery<any>({ queryKey: ["/api/institutional-exchange/dashboard"] });
  const networks = useQuery<any[]>({ queryKey: ["/api/institutional-exchange/networks"] });
  const rails = useQuery<any[]>({ queryKey: ["/api/institutional-exchange/payment-rails"] });
  const instrumentTypes = useQuery<any[]>({ queryKey: ["/api/institutional-exchange/instrument-types"] });
  const institutions = useQuery<any[]>({ queryKey: ["/api/institutional-exchange/institutions"] });
  const exchanges = useQuery<any[]>({ queryKey: ["/api/institutional-exchange/exchange-requests"] });
  const settlements = useQuery<any[]>({ queryKey: ["/api/institutional-exchange/settlement-events"] });
  const health = useQuery<any>({ queryKey: ["/api/institutional-exchange/connector-health"] });
  const retryQueue = useQuery<any[]>({ queryKey: ["/api/institutional-exchange/retry-queue"] });
  const audit = useQuery<any[]>({ queryKey: ["/api/institutional-exchange/audit-timeline"] });

  const createInstitution = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/institutional-exchange/institutions", institutionForm);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/institutional-exchange/institutions"] });
      setInstitutionForm(emptyInstitution);
      toast({ title: "Institution registered" });
    },
    onError: (error: Error) => toast({ title: "Institution save failed", description: error.message, variant: "destructive" }),
  });

  const saveCredential = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/institutional-exchange/credentials", credentialForm);
      return response.json();
    },
    onSuccess: () => {
      setCredentialForm(emptyCredential);
      toast({ title: "Credential encrypted and saved" });
    },
    onError: (error: Error) => toast({ title: "Credential save failed", description: error.message, variant: "destructive" }),
  });

  const refreshHealth = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/institutional-exchange/connector-health/refresh");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/institutional-exchange/connector-health"] });
      toast({ title: "Connector health refreshed" });
    },
    onError: (error: Error) => toast({ title: "Health refresh failed", description: error.message, variant: "destructive" }),
  });

  const stats = dashboard.data || {};
  const connectorRows = health.data?.connectors || [];

  return (
    <Shell title="Institutional Exchange" subtitle="Financial network routing, credentials, settlement, and connector health">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Networks", value: stats.networks || 0, icon: Landmark },
            { label: "Institutions", value: stats.institutions || 0, icon: Building2 },
            { label: "Open Requests", value: stats.openRequests || 0, icon: Route },
            { label: "Retry Queue", value: stats.retryQueue || 0, icon: RefreshCw },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className="text-2xl font-bold">{item.value}</p>
                  </div>
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="monitor" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
            <TabsTrigger value="monitor">Monitor</TabsTrigger>
            <TabsTrigger value="registries">Registries</TabsTrigger>
            <TabsTrigger value="credentials">Credentials</TabsTrigger>
            <TabsTrigger value="queues">Queues</TabsTrigger>
            <TabsTrigger value="settlement">Settlement</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
          </TabsList>

          <TabsContent value="monitor" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Connector Health</h2>
                <p className="text-sm text-muted-foreground">Adapters remain blocked until credentials, endpoints, enrollment, and allowlists are configured.</p>
              </div>
              <Button onClick={() => refreshHealth.mutate()} disabled={refreshHealth.isPending}>
                <RefreshCw className="mr-2 h-4 w-4" /> Refresh
              </Button>
            </div>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Connector</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Configured</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {connectorRows.map((row: any) => (
                    <TableRow key={row.connectorCode}>
                      <TableCell className="font-medium">{row.connectorCode}</TableCell>
                      <TableCell>{statusBadge(row.status)}</TableCell>
                      <TableCell>{row.configured ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="registries" className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Landmark className="h-4 w-4" /> Financial Networks</CardTitle>
                  <CardDescription>Supported network registry.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(networks.data || []).map((network) => (
                    <div key={network.id} className="flex items-center justify-between rounded border p-2">
                      <span className="text-sm font-medium">{network.name}</span>
                      {statusBadge(network.status)}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><GitBranch className="h-4 w-4" /> Payment Rails</CardTitle>
                  <CardDescription>Rail manager and adapter map.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(rails.data || []).map((rail) => (
                    <div key={rail.id} className="flex items-center justify-between rounded border p-2">
                      <span className="text-sm font-medium">{rail.name}</span>
                      {rail.requiresEnrollment ? <Badge variant="secondary">Enrollment</Badge> : <Badge>Configured path</Badge>}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Archive className="h-4 w-4" /> Instrument Types</CardTitle>
                  <CardDescription>Instrument registry.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(instrumentTypes.data || []).slice(0, 12).map((instrument) => (
                    <div key={instrument.id} className="flex items-center justify-between rounded border p-2">
                      <span className="text-sm font-medium">{instrument.name}</span>
                      <span className="text-xs text-muted-foreground">{instrument.complianceProfile}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Institution Registry</CardTitle>
                <CardDescription>Register approved institutions and partners before configuring credentials.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-6">
                <div className="md:col-span-2">
                  <Label>Name</Label>
                  <Input value={institutionForm.name} onChange={(e) => setInstitutionForm((form) => ({ ...form, name: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <Label>Legal Name</Label>
                  <Input value={institutionForm.legalName} onChange={(e) => setInstitutionForm((form) => ({ ...form, legalName: e.target.value }))} />
                </div>
                <div>
                  <Label>Jurisdiction</Label>
                  <Input value={institutionForm.jurisdiction} onChange={(e) => setInstitutionForm((form) => ({ ...form, jurisdiction: e.target.value }))} />
                </div>
                <div className="flex items-end">
                  <Button className="w-full" onClick={() => createInstitution.mutate()} disabled={!institutionForm.name || createInstitution.isPending}>
                    Register
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="credentials">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> Institution Credential Vault</CardTitle>
                <CardDescription>Values are encrypted server-side and never returned in full.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-6">
                <div className="md:col-span-2">
                  <Label>Institution</Label>
                  <Select value={credentialForm.institutionId} onValueChange={(value) => setCredentialForm((form) => ({ ...form, institutionId: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select institution" /></SelectTrigger>
                    <SelectContent>
                      {(institutions.data || []).map((institution) => (
                        <SelectItem key={institution.id} value={institution.id}>{institution.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Type</Label>
                  <Input value={credentialForm.credentialType} onChange={(e) => setCredentialForm((form) => ({ ...form, credentialType: e.target.value }))} />
                </div>
                <div>
                  <Label>Key Name</Label>
                  <Input value={credentialForm.keyName} onChange={(e) => setCredentialForm((form) => ({ ...form, keyName: e.target.value }))} />
                </div>
                <div>
                  <Label>Secret Value</Label>
                  <Input type="password" value={credentialForm.value} onChange={(e) => setCredentialForm((form) => ({ ...form, value: e.target.value }))} />
                </div>
                <div className="flex items-end">
                  <Button className="w-full" onClick={() => saveCredential.mutate()} disabled={!credentialForm.institutionId || !credentialForm.keyName || !credentialForm.value || saveCredential.isPending}>
                    Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="queues" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Exchange Monitor</CardTitle>
                <CardDescription>Approved requests and retry queue state.</CardDescription>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Compliance</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Idempotency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(exchanges.data || []).map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{request.requestType}</TableCell>
                      <TableCell>{statusBadge(request.status)}</TableCell>
                      <TableCell>{statusBadge(request.complianceStatus)}</TableCell>
                      <TableCell>{request.amount ? `$${(request.amount / 100).toLocaleString()}` : "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{request.idempotencyKey?.slice(0, 16)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Retry Queue</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(retryQueue.data || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No retry items are currently queued.</p>
                ) : (retryQueue.data || []).map((attempt) => (
                  <div key={attempt.id} className="rounded border p-3 text-sm">
                    {attempt.connectorCode} retry scheduled for {attempt.nextRetryAt || "unscheduled"}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settlement">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Activity className="h-4 w-4" /> Settlement Queue</CardTitle>
                <CardDescription>Settlement events created by submitted exchange requests.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {(settlements.data || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No settlement events have been recorded.</p>
                ) : (settlements.data || []).map((event) => (
                  <div key={event.id} className="flex items-center justify-between rounded border p-3">
                    <span className="text-sm">{event.eventType}</span>
                    {statusBadge(event.status)}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Audit Timeline</CardTitle>
                <CardDescription>Institutional exchange actions written to immutable audit history.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {(audit.data || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No institutional exchange audit events yet.</p>
                ) : (audit.data || []).map((event) => (
                  <div key={event.id} className="rounded border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{event.action}</span>
                      <span className="text-xs text-muted-foreground">{event.createdAt}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{event.entityType} {event.entityId || ""}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Shell>
  );
}
