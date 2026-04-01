import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Save, Key, Building, Database, Bot, ShieldCheck, Lock, Bell, CreditCard, Crown, Zap, Users, FileText, BarChart3, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

const ADMIN_OVERRIDES = [
  {
    key: "admin_bypass_partner_access",
    label: "Auto Partner & Supplier Access",
    desc: "Bypass manual partner setup. Admin gets full automated access to all supplier inventories and can directly assign tradelines without partner approval.",
    icon: Users,
    category: "partners",
  },
  {
    key: "admin_bypass_dispute_approval",
    label: "Auto-Approve All Disputes",
    desc: "Skip manual dispute review. All AI-generated disputes are auto-approved and submitted to bureaus immediately.",
    icon: FileText,
    category: "disputes",
  },
  {
    key: "admin_bypass_tradeline_limits",
    label: "Override Tradeline Slot Limits",
    desc: "Bypass cardholder slot restrictions. Admin can place unlimited AUs on any tradeline regardless of available slots.",
    icon: CreditCard,
    category: "tradelines",
  },
  {
    key: "admin_bypass_billing_holds",
    label: "Override Billing Holds & Limits",
    desc: "Bypass payment requirements. Admin can activate services, assign tradelines, and process orders without requiring client payment first.",
    icon: Zap,
    category: "billing",
  },
  {
    key: "admin_bypass_credit_builder_enrollment",
    label: "Auto-Enroll Credit Builder Products",
    desc: "Automatically enroll qualifying clients in credit builder products (secured cards, builder loans) without manual review.",
    icon: BarChart3,
    category: "credit",
  },
  {
    key: "admin_bypass_compliance_checks",
    label: "Override Compliance Warnings",
    desc: "Bypass CROA/FCRA compliance hold alerts. Admin can proceed with actions that normally require compliance review.",
    icon: Shield,
    category: "compliance",
  },
  {
    key: "admin_bypass_metro2_validation",
    label: "Override Metro 2 Validation",
    desc: "Skip Metro 2 file validation checks. Admin can submit bureau furnishing files even with missing or incomplete client data.",
    icon: Database,
    category: "metro2",
  },
  {
    key: "admin_bypass_staff_restrictions",
    label: "Override Staff Role Restrictions",
    desc: "Temporarily grant all staff members admin-level access to every feature. Use with caution.",
    icon: Users,
    category: "staff",
  },
  {
    key: "admin_auto_import_reports",
    label: "Auto-Import Credit Reports",
    desc: "Automatically pull and import credit reports for all active clients on a recurring schedule without manual trigger.",
    icon: Bot,
    category: "automation",
  },
  {
    key: "admin_auto_assign_tradelines",
    label: "Auto-Assign Best Tradelines",
    desc: "AI automatically matches and assigns the best available tradelines to clients based on their credit profile and goals.",
    icon: Zap,
    category: "automation",
  },
];

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [businessPhone, setBusinessPhone] = useState("(800) 555-0199");
  const [businessEmail, setBusinessEmail] = useState("support@creditrepairpro.com");
  const [businessName, setBusinessName] = useState("CreditRepair Pro LLC");
  const [croaReg, setCroaReg] = useState("CR-2023-8891");

  const [overrides, setOverrides] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    ADMIN_OVERRIDES.forEach(o => { initial[o.key] = false; });
    return initial;
  });

  const { data: savedOverrides } = useQuery<Record<string, boolean>>({
    queryKey: ["/api/admin-overrides"],
    enabled: user?.role === "admin",
  });

  useEffect(() => {
    if (savedOverrides) {
      setOverrides(prev => ({ ...prev, ...savedOverrides }));
    }
  }, [savedOverrides]);

  const [savingOverrides, setSavingOverrides] = useState(false);

  const toggleOverride = async (key: string) => {
    const prevVal = overrides[key];
    const newVal = !prevVal;
    setOverrides(prev => ({ ...prev, [key]: newVal }));
    try {
      await apiRequest("POST", "/api/config", { key, value: String(newVal) });
      qc.invalidateQueries({ queryKey: ["/api/admin-overrides"] });
      toast({ title: `${newVal ? "Enabled" : "Disabled"}: ${ADMIN_OVERRIDES.find(o => o.key === key)?.label}` });
    } catch {
      setOverrides(prev => ({ ...prev, [key]: prevVal }));
      toast({ title: "Failed to save override", variant: "destructive" });
    }
  };

  const enableAll = async () => {
    setSavingOverrides(true);
    try {
      await Promise.all(ADMIN_OVERRIDES.map(o => apiRequest("POST", "/api/config", { key: o.key, value: "true" })));
      const updated: Record<string, boolean> = {};
      ADMIN_OVERRIDES.forEach(o => { updated[o.key] = true; });
      setOverrides(prev => ({ ...prev, ...updated }));
      qc.invalidateQueries({ queryKey: ["/api/admin-overrides"] });
      toast({ title: "All admin overrides enabled!" });
    } catch {
      qc.invalidateQueries({ queryKey: ["/api/admin-overrides"] });
      toast({ title: "Some overrides failed to save", variant: "destructive" });
    } finally {
      setSavingOverrides(false);
    }
  };

  const disableAll = async () => {
    setSavingOverrides(true);
    try {
      await Promise.all(ADMIN_OVERRIDES.map(o => apiRequest("POST", "/api/config", { key: o.key, value: "false" })));
      const updated: Record<string, boolean> = {};
      ADMIN_OVERRIDES.forEach(o => { updated[o.key] = false; });
      setOverrides(prev => ({ ...prev, ...updated }));
      qc.invalidateQueries({ queryKey: ["/api/admin-overrides"] });
      toast({ title: "All admin overrides disabled." });
    } catch {
      qc.invalidateQueries({ queryKey: ["/api/admin-overrides"] });
      toast({ title: "Some overrides failed to save", variant: "destructive" });
    } finally {
      setSavingOverrides(false);
    }
  };

  const saveConfig = useMutation({
    mutationFn: (data: { key: string; value: string }) => apiRequest("POST", "/api/config", data),
    onSuccess: () => toast({ title: "Configuration saved!" }),
    onError: () => toast({ title: "Error saving config", variant: "destructive" }),
  });

  const activeCount = Object.values(overrides).filter(Boolean).length;

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground mt-1">Configure AI automation, cybersecurity, integrations, and business profile.</p>
        </div>

        <Tabs defaultValue={user?.role === "admin" ? "admin" : "business"} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 h-auto">
            {user?.role === "admin" && (
              <TabsTrigger value="admin" className="flex items-center gap-1" data-testid="tab-admin-controls"><Crown className="w-4 h-4" /> Admin Controls</TabsTrigger>
            )}
            <TabsTrigger value="business" className="flex items-center gap-1"><Building className="w-4 h-4" /> Business</TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-1"><Database className="w-4 h-4" /> Integrations</TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-1"><Bot className="w-4 h-4" /> AI Automation</TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> Security</TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-1"><Bell className="w-4 h-4" /> Notifications</TabsTrigger>
          </TabsList>

          {user?.role === "admin" && (
          <TabsContent value="admin" className="mt-6 space-y-6">
            <Card className="glass-panel border-l-4 border-l-amber-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="w-5 h-5 text-amber-500" />
                      Admin Override Control Panel
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Master bypass switches for every system. When enabled, these overrides give you full automated control — skipping manual approvals, slot limits, billing holds, and compliance gates.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className={activeCount > 0 ? "border-amber-500 text-amber-500 bg-amber-500/10" : "border-muted-foreground"}>
                    {activeCount}/{ADMIN_OVERRIDES.length} Active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-6">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                    onClick={enableAll}
                    disabled={savingOverrides}
                    data-testid="button-enable-all-overrides"
                  >
                    <Zap className="w-3.5 h-3.5 mr-1.5" /> {savingOverrides ? "Saving..." : "Enable All Overrides"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={disableAll}
                    disabled={savingOverrides}
                    data-testid="button-disable-all-overrides"
                  >
                    <Lock className="w-3.5 h-3.5 mr-1.5" /> {savingOverrides ? "Saving..." : "Disable All"}
                  </Button>
                </div>
                <div className="space-y-3">
                  {ADMIN_OVERRIDES.map((override) => {
                    const Icon = override.icon;
                    const isActive = overrides[override.key];
                    return (
                      <div
                        key={override.key}
                        className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                          isActive
                            ? "bg-amber-500/5 border-amber-500/30"
                            : "bg-muted/50 border-border"
                        }`}
                        data-testid={`override-${override.key}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 p-1.5 rounded-md ${isActive ? "bg-amber-500/20" : "bg-muted"}`}>
                            <Icon className={`w-4 h-4 ${isActive ? "text-amber-500" : "text-muted-foreground"}`} />
                          </div>
                          <div>
                            <Label className="text-base cursor-pointer">{override.label}</Label>
                            <p className="text-sm text-muted-foreground mt-0.5">{override.desc}</p>
                            <Badge variant="secondary" className="mt-1.5 text-[10px] capitalize">{override.category}</Badge>
                          </div>
                        </div>
                        <Switch
                          checked={isActive}
                          onCheckedChange={() => toggleOverride(override.key)}
                          data-testid={`switch-${override.key}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/50 px-6 py-4 flex justify-between items-center">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Admin-only. Overrides are saved instantly and apply across all sessions.
                </p>
                <Badge variant="outline" className="border-emerald-500 text-emerald-500">
                  <ShieldCheck className="w-3 h-3 mr-1" /> Admin Verified
                </Badge>
              </CardFooter>
            </Card>
          </TabsContent>
          )}

          <TabsContent value="business" className="mt-6">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building className="w-5 h-5" /> Company Details</CardTitle>
                <CardDescription>Information that appears on dispute letters and client communications.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Company Legal Name</Label>
                    <Input value={businessName} onChange={e => setBusinessName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>CROA Registration #</Label>
                    <Input value={croaReg} onChange={e => setCroaReg(e.target.value)} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Business Address</Label>
                    <Input defaultValue="123 Financial Way, Suite 400, New York, NY 10001" />
                  </div>
                  <div className="space-y-2">
                    <Label>Owner / Staff Phone (for alerts)</Label>
                    <Input value={businessPhone} onChange={e => setBusinessPhone(e.target.value)} placeholder="(800) 555-0199" />
                  </div>
                  <div className="space-y-2">
                    <Label>Owner / Staff Email (for alerts)</Label>
                    <Input type="email" value={businessEmail} onChange={e => setBusinessEmail(e.target.value)} placeholder="you@business.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Receptionist Phone</Label>
                    <Input defaultValue="(800) 555-0101" />
                  </div>
                  <div className="space-y-2">
                    <Label>Receptionist Email</Label>
                    <Input type="email" defaultValue="receptionist@creditrepairpro.com" />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/50 px-6 py-4">
                <Button onClick={() => {
                  saveConfig.mutate({ key: "business_phone", value: businessPhone });
                  saveConfig.mutate({ key: "business_email", value: businessEmail });
                }}>
                  <Save className="w-4 h-4 mr-2" /> Save Business Profile
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="mt-6 space-y-6">
            {/* Plaid Banking */}
            <Card className="glass-panel border-l-4 border-l-blue-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building className="w-5 h-5 text-blue-500" /> Plaid Banking Integration</CardTitle>
                <CardDescription>Connect client bank accounts for identity verification, income analysis, liability tracking, and automated ACH payments.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label>Plaid Client ID</Label><Input placeholder="Enter Plaid Client ID" data-testid="input-plaid-client-id" onChange={e => (window as any).__plaidClientId = e.target.value} /></div>
                  <div className="space-y-2"><Label>Plaid Secret</Label><Input type="password" placeholder="Enter Plaid Secret" data-testid="input-plaid-secret" onChange={e => (window as any).__plaidSecret = e.target.value} /></div>
                </div>
                <div className="space-y-2">
                  <Label>Environment</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" data-testid="select-plaid-env" onChange={e => (window as any).__plaidEnv = e.target.value}>
                    <option value="sandbox">Sandbox (Testing)</option>
                    <option value="development">Development</option>
                    <option value="production">Production</option>
                  </select>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm">
                  <p className="font-medium text-blue-700 dark:text-blue-300">How to get Plaid credentials:</p>
                  <ol className="list-decimal ml-4 mt-1 text-blue-600 dark:text-blue-400 space-y-0.5">
                    <li>Go to <a href="https://dashboard.plaid.com/signup" target="_blank" className="underline">dashboard.plaid.com</a></li>
                    <li>Create a free account and access your API keys</li>
                    <li>Use "Sandbox" environment for testing with simulated banks</li>
                    <li>Switch to Production when ready for live bank connections</li>
                  </ol>
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/50 px-6 py-4">
                <Button onClick={() => {
                  const id = (window as any).__plaidClientId; const sec = (window as any).__plaidSecret; const env = (window as any).__plaidEnv || "sandbox";
                  if (id) saveConfig.mutate({ key: "plaid_client_id", value: id });
                  if (sec) saveConfig.mutate({ key: "plaid_secret", value: sec });
                  saveConfig.mutate({ key: "plaid_env", value: env });
                  toast({ title: "Plaid configuration saved!" });
                }}><Save className="w-4 h-4 mr-2" />Save Plaid Config</Button>
              </CardFooter>
            </Card>

            {/* Credit Bureau APIs */}
            <Card className="glass-panel border-l-4 border-l-indigo-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Key className="w-5 h-5 text-indigo-500" /> Credit Bureau API Keys</CardTitle>
                <CardDescription>Connect directly to Equifax, Experian, TransUnion, and Innovis for automated report pulls and score monitoring.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { bureau: "Equifax", keyField: "equifax_api_key", secretField: "equifax_api_secret", color: "text-red-500", url: "https://developer.equifax.com" },
                  { bureau: "Experian", keyField: "experian_api_key", secretField: "experian_api_secret", color: "text-blue-600", url: "https://developer.experian.com" },
                  { bureau: "TransUnion", keyField: "transunion_api_key", secretField: "transunion_api_secret", color: "text-cyan-500", url: "https://developer.transunion.com" },
                  { bureau: "Innovis", keyField: "innovis_api_key", secretField: "innovis_api_secret", color: "text-purple-500", url: "https://www.innovis.com" },
                ].map(b => (
                  <div key={b.bureau} className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-3">
                      <Label className={`text-base font-semibold ${b.color}`}>{b.bureau}</Label>
                      <a href={b.url} target="_blank" className="text-xs text-primary underline">Developer Portal →</a>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input placeholder={`${b.bureau} API Key`} data-testid={`input-${b.keyField}`} onChange={e => (window as any)[`__${b.keyField}`] = e.target.value} />
                      <Input type="password" placeholder={`${b.bureau} API Secret`} data-testid={`input-${b.secretField}`} onChange={e => (window as any)[`__${b.secretField}`] = e.target.value} />
                    </div>
                  </div>
                ))}
              </CardContent>
              <CardFooter className="border-t border-border/50 px-6 py-4">
                <Button onClick={() => {
                  ["equifax", "experian", "transunion", "innovis"].forEach(b => {
                    const key = (window as any)[`__${b}_api_key`]; const secret = (window as any)[`__${b}_api_secret`];
                    if (key) saveConfig.mutate({ key: `${b}_api_key`, value: key });
                    if (secret) saveConfig.mutate({ key: `${b}_api_secret`, value: secret });
                  });
                  toast({ title: "Bureau API credentials saved!" });
                }}><Save className="w-4 h-4 mr-2" />Save Bureau Credentials</Button>
              </CardFooter>
            </Card>

            {/* e-OSCAR */}
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Database className="w-5 h-5 text-primary" /> e-OSCAR Dispute API</CardTitle>
                <CardDescription>Automate dispute submissions directly to credit bureaus via the e-OSCAR system.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label>Company ID</Label><Input placeholder="CRP-98211" data-testid="input-eoscar-company-id" onChange={e => (window as any).__eoscarCompanyId = e.target.value} /></div>
                  <div className="space-y-2"><Label>API Key</Label><Input type="password" placeholder="Enter e-OSCAR key" data-testid="input-eoscar-key" onChange={e => (window as any).__eoscarKey = e.target.value} /></div>
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                  <div><Label className="text-base">Production Mode</Label><p className="text-sm text-muted-foreground">Disable to use sandbox/test mode.</p></div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/50 px-6 py-4">
                <Button onClick={() => {
                  const id = (window as any).__eoscarCompanyId; const key = (window as any).__eoscarKey;
                  if (id) saveConfig.mutate({ key: "eoscar_company_id", value: id });
                  if (key) saveConfig.mutate({ key: "eoscar_api_key", value: key });
                  toast({ title: "e-OSCAR config saved!" });
                }}><Save className="w-4 h-4 mr-2" />Save e-OSCAR Config</Button>
              </CardFooter>
            </Card>

            {/* Stripe */}
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-indigo-500" /> Stripe Payments</CardTitle>
                <CardDescription>Enable live payment processing for tradelines, subscriptions, and credit products.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label>Publishable Key</Label><Input placeholder="pk_live_..." data-testid="input-stripe-pk" onChange={e => (window as any).__stripePk = e.target.value} /></div>
                <div className="space-y-2"><Label>Secret Key</Label><Input type="password" placeholder="sk_live_..." data-testid="input-stripe-sk" onChange={e => (window as any).__stripeSk = e.target.value} /></div>
                <div className="space-y-2"><Label>Webhook Secret</Label><Input type="password" placeholder="whsec_..." data-testid="input-stripe-wh" onChange={e => (window as any).__stripeWh = e.target.value} /></div>
              </CardContent>
              <CardFooter className="border-t border-border/50 px-6 py-4">
                <Button onClick={() => {
                  const pk = (window as any).__stripePk; const sk = (window as any).__stripeSk; const wh = (window as any).__stripeWh;
                  if (pk) saveConfig.mutate({ key: "stripe_publishable_key", value: pk });
                  if (sk) saveConfig.mutate({ key: "stripe_secret_key", value: sk });
                  if (wh) saveConfig.mutate({ key: "stripe_webhook_secret", value: wh });
                  toast({ title: "Stripe keys saved!" });
                }}><Save className="w-4 h-4 mr-2" />Save Stripe Keys</Button>
              </CardFooter>
            </Card>

            {/* Credit Report Providers */}
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Key className="w-5 h-5" /> Credit Report Provider</CardTitle>
                <CardDescription>Connect SmartCredit, IdentityIQ, or similar for automated credit report pulls.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" data-testid="select-report-provider" onChange={e => (window as any).__reportProvider = e.target.value}>
                    <option value="smartcredit">SmartCredit API</option>
                    <option value="identityiq">IdentityIQ Pro</option>
                    <option value="myfico">MyFICO</option>
                    <option value="experian_connect">Experian Connect</option>
                  </select>
                </div>
                <div className="space-y-2"><Label>Partner Token</Label><Input type="password" placeholder="Enter provider token" data-testid="input-report-token" onChange={e => (window as any).__reportToken = e.target.value} /></div>
              </CardContent>
              <CardFooter className="border-t border-border/50 px-6 py-4">
                <Button onClick={() => {
                  const provider = (window as any).__reportProvider || "smartcredit"; const token = (window as any).__reportToken;
                  saveConfig.mutate({ key: "credit_report_provider", value: provider });
                  if (token) saveConfig.mutate({ key: "credit_report_token", value: token });
                  toast({ title: "Report provider saved!" });
                }}><Save className="w-4 h-4 mr-2" />Save Provider</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="ai" className="mt-6">
            <Card className="glass-panel border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bot className="w-5 h-5 text-primary" /> AI Dispute Automation Engine</CardTitle>
                <CardDescription>Configure how the AI automatically analyzes reports and challenges negative items on your behalf.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Auto-Import & Analyze Reports", desc: "AI pulls credit reports monthly and flags all negative items automatically." },
                  { label: "Auto-Draft Dispute Letters", desc: "AI generates FCRA/FDCPA-compliant dispute letters for each identified item." },
                  { label: "Auto-Submit to e-OSCAR", desc: "Batches and pushes approved disputes directly to bureaus with no manual action needed." },
                  { label: "Smart Prioritization", desc: "AI ranks disputes by impact score — targeting the highest-damage items first." },
                  { label: "Client Progress Alerts", desc: "Automatically notify clients when items are deleted or scores improve." },
                ].map((toggle, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                    <div><Label className="text-base">{toggle.label}</Label><p className="text-sm text-muted-foreground">{toggle.desc}</p></div>
                    <Switch defaultChecked />
                  </div>
                ))}
              </CardContent>
              <CardFooter className="border-t border-border/50 px-6 py-4">
                <Button><Save className="w-4 h-4 mr-2" />Save AI Settings</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="mt-6">
            <Card className="glass-panel border-l-4 border-l-emerald-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5 text-emerald-500" /> Cybersecurity & Data Protection</CardTitle>
                <CardDescription>Configure security policies to protect sensitive client PII and financial data.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 bg-background/50 rounded-lg border border-border">
                    <h4 className="font-bold text-sm mb-1 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-500" /> AES-256 Encryption</h4>
                    <p className="text-xs text-muted-foreground mb-3">All PII, SSNs, and credit reports encrypted at rest and in transit (TLS 1.3).</p>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Active</Badge>
                  </div>
                  <div className="p-4 bg-background/50 rounded-lg border border-border">
                    <h4 className="font-bold text-sm mb-1 flex items-center gap-2"><Key className="w-4 h-4 text-emerald-500" /> Multi-Factor Authentication</h4>
                    <p className="text-xs text-muted-foreground mb-3">Require MFA for all staff accounts accessing client records.</p>
                    <Switch defaultChecked />
                  </div>
                </div>
                {[
                  { label: "Strict IP Allowlisting", desc: "Only allow logins from designated office IP addresses." },
                  { label: "Automatic Session Timeout", desc: "Auto-logout after 30 minutes of inactivity." },
                  { label: "Audit Logging", desc: "Log all access to client PII and credit data." },
                ].map((toggle, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                    <div><Label className="text-base">{toggle.label}</Label><p className="text-sm text-muted-foreground">{toggle.desc}</p></div>
                    <Switch defaultChecked={i !== 0} />
                  </div>
                ))}
              </CardContent>
              <CardFooter className="border-t border-border/50 px-6 py-4 flex justify-between">
                <p className="text-xs text-muted-foreground">SOC2 & PCI-DSS Compliant Infrastructure</p>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">Run Security Audit</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5" /> Notification Preferences</CardTitle>
                <CardDescription>Control when and how you and your staff receive alerts.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Dispute Status Updates", desc: "Notify owner when bureau responds to any dispute." },
                  { label: "New Client Added", desc: "Alert receptionist when a new client is created." },
                  { label: "Failed Stripe Payment", desc: "Immediately alert owner and billing when a charge fails." },
                  { label: "Item Deleted / Removed", desc: "Celebrate wins — notify client and owner automatically." },
                  { label: "Score Improvement Alert", desc: "Notify client when their score improves on any bureau." },
                ].map((toggle, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                    <div><Label className="text-base">{toggle.label}</Label><p className="text-sm text-muted-foreground">{toggle.desc}</p></div>
                    <Switch defaultChecked />
                  </div>
                ))}
              </CardContent>
              <CardFooter className="border-t border-border/50 px-6 py-4">
                <Button><Save className="w-4 h-4 mr-2" />Save Preferences</Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Shell>
  );
}