import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Save, Key, Building, Database, Bot, ShieldCheck, Lock, Bell, CreditCard, Crown, Zap, Users, FileText, BarChart3, Shield, Play, Clock, CheckCircle2, XCircle, RefreshCw, Settings2, Activity, Code, Scale, Wrench, GraduationCap, Trophy, Hammer, TrendingUp, DollarSign, Receipt, Phone, Briefcase, ScrollText, Landmark, ArrowUpCircle, ShieldAlert, Search, Target, Gauge, Eye, Handshake, FileCheck, Sparkles, Star, Heart, Link, Gem, Mail, Share2, MessageSquare, PieChart, Trash2, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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

const BOT_CONFIG = [
  { type: "bot_system_health", icon: Activity, color: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/30", category: "operations" },
  { type: "bot_banking_sync", icon: Building, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/30", category: "financial" },
  { type: "bot_document_worker", icon: FileText, color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/30", category: "operations" },
  { type: "bot_legal_compliance", icon: Scale, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/30", category: "legal" },
  { type: "bot_data_furnisher", icon: Database, color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500/30", category: "credit" },
  { type: "bot_lender_outreach", icon: Users, color: "text-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-500/30", category: "financial" },
  { type: "bot_owner_briefing", icon: BarChart3, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30", category: "operations" },
  { type: "bot_security_monitor", icon: ShieldCheck, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30", category: "operations" },
  { type: "bot_accounting", icon: CreditCard, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/30", category: "financial" },
  { type: "bot_client_comms", icon: Bell, color: "text-pink-500", bg: "bg-pink-500/10", border: "border-pink-500/30", category: "operations" },
  { type: "bot_coder", icon: Code, color: "text-violet-500", bg: "bg-violet-500/10", border: "border-violet-500/30", category: "development" },
  { type: "bot_trust_law", icon: Scale, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/30", category: "legal" },
  { type: "bot_developer", icon: Wrench, color: "text-sky-500", bg: "bg-sky-500/10", border: "border-sky-500/30", category: "development" },
  { type: "bot_trainer", icon: GraduationCap, color: "text-teal-500", bg: "bg-teal-500/10", border: "border-teal-500/30", category: "operations" },
  { type: "bot_credit_specialist", icon: Trophy, color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/30", category: "credit" },
  { type: "bot_maintenance", icon: Hammer, color: "text-stone-500", bg: "bg-stone-500/10", border: "border-stone-500/30", category: "development" },
  { type: "bot_report_generator", icon: PieChart, color: "text-blue-600", bg: "bg-blue-600/10", border: "border-blue-600/30", category: "operations" },
  { type: "bot_task_manager", icon: FileCheck, color: "text-indigo-600", bg: "bg-indigo-600/10", border: "border-indigo-600/30", category: "operations" },
  { type: "bot_quality_assurance", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-600/10", border: "border-green-600/30", category: "operations" },
  { type: "bot_workflow_optimizer", icon: Zap, color: "text-amber-600", bg: "bg-amber-600/10", border: "border-amber-600/30", category: "operations" },
  { type: "bot_revenue_analyst", icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-600/10", border: "border-emerald-600/30", category: "financial" },
  { type: "bot_expense_tracker", icon: TrendingUp, color: "text-red-600", bg: "bg-red-600/10", border: "border-red-600/30", category: "financial" },
  { type: "bot_payment_processor", icon: CreditCard, color: "text-violet-600", bg: "bg-violet-600/10", border: "border-violet-600/30", category: "financial" },
  { type: "bot_invoice_generator", icon: Receipt, color: "text-teal-600", bg: "bg-teal-600/10", border: "border-teal-600/30", category: "financial" },
  { type: "bot_collection_agent", icon: Phone, color: "text-rose-600", bg: "bg-rose-600/10", border: "border-rose-600/30", category: "financial" },
  { type: "bot_financial_planner", icon: Briefcase, color: "text-blue-700", bg: "bg-blue-700/10", border: "border-blue-700/30", category: "financial" },
  { type: "bot_contract_manager", icon: ScrollText, color: "text-amber-700", bg: "bg-amber-700/10", border: "border-amber-700/30", category: "legal" },
  { type: "bot_regulatory_monitor", icon: Landmark, color: "text-indigo-700", bg: "bg-indigo-700/10", border: "border-indigo-700/30", category: "legal" },
  { type: "bot_dispute_escalation", icon: ArrowUpCircle, color: "text-red-700", bg: "bg-red-700/10", border: "border-red-700/30", category: "legal" },
  { type: "bot_consumer_rights", icon: ShieldAlert, color: "text-emerald-700", bg: "bg-emerald-700/10", border: "border-emerald-700/30", category: "legal" },
  { type: "bot_audit_trail", icon: Search, color: "text-gray-600", bg: "bg-gray-600/10", border: "border-gray-600/30", category: "legal" },
  { type: "bot_score_optimizer", icon: Target, color: "text-orange-700", bg: "bg-orange-700/10", border: "border-orange-700/30", category: "credit" },
  { type: "bot_utilization_manager", icon: Gauge, color: "text-cyan-700", bg: "bg-cyan-700/10", border: "border-cyan-700/30", category: "credit" },
  { type: "bot_inquiry_removal", icon: Eye, color: "text-purple-700", bg: "bg-purple-700/10", border: "border-purple-700/30", category: "credit" },
  { type: "bot_goodwill_negotiator", icon: Handshake, color: "text-teal-700", bg: "bg-teal-700/10", border: "border-teal-700/30", category: "credit" },
  { type: "bot_debt_validator", icon: FileCheck, color: "text-rose-700", bg: "bg-rose-700/10", border: "border-rose-700/30", category: "credit" },
  { type: "bot_bureau_liaison", icon: Building, color: "text-sky-700", bg: "bg-sky-700/10", border: "border-sky-700/30", category: "credit" },
  { type: "bot_identity_monitor", icon: Lock, color: "text-violet-700", bg: "bg-violet-700/10", border: "border-violet-700/30", category: "credit" },
  { type: "bot_intake_processor", icon: Sparkles, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30", category: "client_services" },
  { type: "bot_progress_tracker", icon: BarChart3, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/30", category: "client_services" },
  { type: "bot_satisfaction_monitor", icon: Heart, color: "text-pink-600", bg: "bg-pink-600/10", border: "border-pink-600/30", category: "client_services" },
  { type: "bot_referral_manager", icon: Link, color: "text-indigo-600", bg: "bg-indigo-600/10", border: "border-indigo-600/30", category: "client_services" },
  { type: "bot_retention_specialist", icon: Gem, color: "text-purple-600", bg: "bg-purple-600/10", border: "border-purple-600/30", category: "client_services" },
  { type: "bot_lead_generator", icon: Target, color: "text-green-700", bg: "bg-green-700/10", border: "border-green-700/30", category: "marketing" },
  { type: "bot_email_campaign", icon: Mail, color: "text-blue-600", bg: "bg-blue-600/10", border: "border-blue-600/30", category: "marketing" },
  { type: "bot_social_media", icon: Share2, color: "text-pink-500", bg: "bg-pink-500/10", border: "border-pink-500/30", category: "marketing" },
  { type: "bot_review_manager", icon: Star, color: "text-yellow-600", bg: "bg-yellow-600/10", border: "border-yellow-600/30", category: "marketing" },
  { type: "bot_analytics_engine", icon: PieChart, color: "text-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-500/30", category: "data_analytics" },
  { type: "bot_data_cleanup", icon: Trash2, color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/30", category: "data_analytics" },
  { type: "bot_api_monitor", icon: Globe, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30", category: "development" },
];

type PlaidEnvironment = "sandbox" | "development" | "production";

interface PlaidConfigStatus {
  configured: boolean;
  environment: PlaidEnvironment | "unknown";
  enabled: boolean;
  status: string;
  source: "stored" | "environment" | "none";
  products: string[];
  clientIdMasked: string | null;
  secretMasked: string | null;
  hasClientId: boolean;
  hasSecret: boolean;
}

function parseProducts(value: string) {
  return value
    .split(",")
    .map((product) => product.trim())
    .filter(Boolean);
}

function describeApiError(error: unknown) {
  const message = error instanceof Error ? error.message : "Request failed";
  const json = message.replace(/^\d+:\s*/, "");
  try {
    const parsed = JSON.parse(json);
    return parsed.message || message;
  } catch {
    return message;
  }
}

function BotCommandCenter() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [expandedBot, setExpandedBot] = useState<string | null>(null);

  const { data: rules = [] } = useQuery<any[]>({ queryKey: ["/api/automation/rules"] });
  const { data: runs = [] } = useQuery<any[]>({ queryKey: ["/api/automation/runs"] });
  const { data: stats } = useQuery<any>({ queryKey: ["/api/automation/stats"] });

  const botRules = rules.filter((r: any) => r.workflowType?.startsWith("bot_"));
  const activeBots = botRules.filter((r: any) => r.enabled).length;

  const toggleBot = async (ruleId: string) => {
    try {
      await apiRequest("PATCH", `/api/automation/rules/${ruleId}/toggle`);
      qc.invalidateQueries({ queryKey: ["/api/automation/rules"] });
      toast({ title: "Bot status updated!" });
    } catch { toast({ title: "Failed to toggle bot", variant: "destructive" }); }
  };

  const runBot = async (ruleId: string, name: string) => {
    try {
      toast({ title: `Running ${name}...` });
      await apiRequest("POST", `/api/automation/rules/${ruleId}/execute`);
      qc.invalidateQueries({ queryKey: ["/api/automation/runs"] });
      qc.invalidateQueries({ queryKey: ["/api/automation/rules"] });
      toast({ title: `${name} completed!` });
    } catch { toast({ title: `${name} execution failed`, variant: "destructive" }); }
  };

  const updateFrequency = async (ruleId: string, freq: string) => {
    try {
      await apiRequest("PATCH", `/api/automation/rules/${ruleId}`, { triggerConfig: { frequency: freq } });
      qc.invalidateQueries({ queryKey: ["/api/automation/rules"] });
      toast({ title: `Schedule updated to ${freq}` });
    } catch { toast({ title: "Failed to update schedule", variant: "destructive" }); }
  };

  const filteredBots = botRules.filter((r: any) => {
    if (filter === "all") return true;
    const cfg = BOT_CONFIG.find(b => b.type === r.workflowType);
    return cfg?.category === filter;
  });

  const getLastRun = (ruleId: string) => {
    return runs.find((r: any) => r.ruleId === ruleId);
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "Never";
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <>
      <Card className="glass-panel border-l-4 border-l-primary">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Bot className="w-6 h-6 text-primary" /> AI Bot Command Center
              </CardTitle>
              <CardDescription className="mt-1">
                Configure, schedule, and manage all {BOT_CONFIG.length} AI worker bots. Each bot handles a specialized task — set what they do, when they run, and monitor their activity. Powered by ChatGPT.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={activeBots > 0 ? "border-primary text-primary bg-primary/10" : ""}>
                {activeBots}/{botRules.length} Active
              </Badge>
              <Badge variant="outline" className="border-emerald-500 text-emerald-500">
                <Activity className="w-3 h-3 mr-1" /> {stats?.last30Days?.totalRuns || 0} runs (30d)
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              { val: "all", label: "All Bots" },
              { val: "operations", label: "Operations" },
              { val: "financial", label: "Financial" },
              { val: "legal", label: "Legal" },
              { val: "credit", label: "Credit" },
              { val: "client_services", label: "Client Services" },
              { val: "marketing", label: "Marketing" },
              { val: "data_analytics", label: "Data & Analytics" },
              { val: "development", label: "Development" },
            ].map(f => (
              <Button key={f.val} size="sm" variant={filter === f.val ? "default" : "outline"} onClick={() => setFilter(f.val)} data-testid={`filter-${f.val}`}>
                {f.label}
              </Button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredBots.map((rule: any) => {
              const cfg = BOT_CONFIG.find(b => b.type === rule.workflowType);
              const Icon = cfg?.icon || Bot;
              const lastRun = getLastRun(rule.id);
              const isExpanded = expandedBot === rule.id;
              const freq = rule.triggerConfig?.frequency || "daily";

              return (
                <div key={rule.id} className={`rounded-xl border transition-all ${rule.enabled ? `${cfg?.border || "border-primary/30"} ${cfg?.bg || "bg-primary/5"}` : "border-border bg-muted/30 opacity-70"}`}>
                  <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedBot(isExpanded ? null : rule.id)} data-testid={`bot-card-${rule.workflowType}`}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`p-2.5 rounded-lg ${rule.enabled ? cfg?.bg : "bg-muted"}`}>
                        <Icon className={`w-5 h-5 ${rule.enabled ? cfg?.color : "text-muted-foreground"}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate">{rule.name}</span>
                          <Badge variant="secondary" className="text-[10px] capitalize shrink-0">{freq}</Badge>
                          <Badge variant="outline" className="text-[9px] shrink-0 border-emerald-500/50 text-emerald-600 bg-emerald-500/5">GPT-4o</Badge>
                          {lastRun && (
                            <Badge variant={lastRun.status === "completed" ? "outline" : "destructive"} className="text-[10px] shrink-0">
                              {lastRun.status === "completed" ? <CheckCircle2 className="w-3 h-3 mr-0.5" /> : <XCircle className="w-3 h-3 mr-0.5" />}
                              {formatTime(lastRun.startedAt)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{rule.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); runBot(rule.id, rule.name); }} data-testid={`run-${rule.workflowType}`}>
                        <Play className="w-4 h-4" />
                      </Button>
                      <Switch checked={rule.enabled} onCheckedChange={() => toggleBot(rule.id)} data-testid={`toggle-${rule.workflowType}`} onClick={(e) => e.stopPropagation()} />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t px-4 pb-4 pt-3 space-y-4" onClick={(e) => e.stopPropagation()}>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Schedule (When)</Label>
                          <Select value={freq} onValueChange={(v) => updateFrequency(rule.id, v)}>
                            <SelectTrigger data-testid={`freq-${rule.workflowType}`}><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hourly">Every Hour</SelectItem>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Run Count</Label>
                          <div className="flex items-center gap-2 h-10">
                            <RefreshCw className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-mono">{rule.runCount || 0} total runs</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last Run</Label>
                          <div className="flex items-center gap-2 h-10">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{rule.lastRunAt ? formatTime(rule.lastRunAt) : "Never run"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">What This Bot Does</Label>
                        <div className="p-3 rounded-lg bg-background/80 border text-sm">{rule.description}</div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action Pipeline</Label>
                        <div className="flex flex-wrap gap-2">
                          {(rule.actions || []).map((a: any, i: number) => (
                            <Badge key={i} variant="outline" className="font-mono text-xs capitalize">
                              {i + 1}. {a.type.replace(/_/g, " ")}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {lastRun && (
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last Run Results</Label>
                          <div className="p-3 rounded-lg bg-background/80 border">
                            <div className="flex gap-4 text-sm">
                              <span>Processed: <strong>{lastRun.itemsProcessed}</strong></span>
                              <span className="text-emerald-500">Succeeded: <strong>{lastRun.itemsSucceeded}</strong></span>
                              <span className="text-red-500">Failed: <strong>{lastRun.itemsFailed}</strong></span>
                            </div>
                            {lastRun.results && Object.keys(lastRun.results).length > 0 && (
                              <pre className="mt-2 text-xs font-mono text-muted-foreground overflow-auto max-h-32">{JSON.stringify(lastRun.results, null, 2)}</pre>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button size="sm" onClick={() => runBot(rule.id, rule.name)} data-testid={`run-expanded-${rule.workflowType}`}>
                          <Play className="w-3.5 h-3.5 mr-1.5" /> Run Now
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => toggleBot(rule.id)}>
                          {rule.enabled ? <><XCircle className="w-3.5 h-3.5 mr-1.5" /> Disable</> : <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Enable</>}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredBots.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No bots found for this category. Reseed automation rules to add them.</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t border-border/50 px-6 py-4 flex justify-between items-center">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Settings2 className="w-3.5 h-3.5" />
            Bots run automatically on schedule. Click any bot to expand configuration.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => {
              botRules.forEach((r: any) => { if (!r.enabled) toggleBot(r.id); });
            }} data-testid="button-enable-all-bots">
              <Zap className="w-3.5 h-3.5 mr-1.5" /> Enable All
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
              botRules.forEach((r: any) => runBot(r.id, r.name));
            }} data-testid="button-run-all-bots">
              <Play className="w-3.5 h-3.5 mr-1.5" /> Run All Now
            </Button>
          </div>
        </CardFooter>
      </Card>
    </>
  );
}

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [businessPhone, setBusinessPhone] = useState("(800) 555-0199");
  const [businessEmail, setBusinessEmail] = useState("support@creditrepairpro.com");
  const [businessName, setBusinessName] = useState("CreditRepair Pro LLC");
  const [croaReg, setCroaReg] = useState("CR-2023-8891");
  const [plaidForm, setPlaidForm] = useState({
    clientId: "",
    secret: "",
    environment: "sandbox" as PlaidEnvironment,
    products: "auth,transactions,identity,liabilities",
    enabled: true,
  });

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

  const { data: plaidConfig } = useQuery<PlaidConfigStatus>({
    queryKey: ["/api/plaid/config"],
    enabled: user?.role === "admin",
  });

  useEffect(() => {
    if (!plaidConfig) return;
    setPlaidForm(prev => ({
      ...prev,
      environment: plaidConfig.environment === "unknown" ? prev.environment : plaidConfig.environment,
      products: plaidConfig.products?.length ? plaidConfig.products.join(",") : prev.products,
      enabled: plaidConfig.enabled,
    }));
  }, [plaidConfig]);

  const canReuseStoredPlaidValues = plaidConfig?.source === "stored";
  const canSavePlaid = !!(
    (plaidForm.clientId.trim() || (canReuseStoredPlaidValues && plaidConfig?.hasClientId)) &&
    (plaidForm.secret.trim() || (canReuseStoredPlaidValues && plaidConfig?.hasSecret)) &&
    plaidForm.environment
  );

  const savePlaid = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/plaid/config", {
        clientId: plaidForm.clientId,
        secret: plaidForm.secret,
        environment: plaidForm.environment,
        products: parseProducts(plaidForm.products),
        enabled: plaidForm.enabled,
        status: plaidForm.enabled ? "active" : "disabled",
      });
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["/api/plaid/config"] }),
        qc.invalidateQueries({ queryKey: ["/api/plaid/status"] }),
      ]);
      setPlaidForm(prev => ({ ...prev, clientId: "", secret: "" }));
      toast({ title: "Plaid configuration saved", description: "Credentials were stored securely and will be masked on retrieval." });
    },
    onError: (error) => toast({ title: "Plaid save failed", description: describeApiError(error), variant: "destructive" }),
  });

  const testPlaid = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/plaid/test");
      return response.json();
    },
    onSuccess: (data: any) => toast({ title: "Plaid configuration ready", description: data.message }),
    onError: (error) => toast({ title: "Plaid test failed", description: describeApiError(error), variant: "destructive" }),
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
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2"><Building className="w-5 h-5 text-blue-500" /> Plaid Banking Integration</CardTitle>
                  <Badge variant={plaidConfig?.configured ? "outline" : "secondary"} className={plaidConfig?.configured ? "border-blue-500 text-blue-500" : ""}>
                    {plaidConfig?.configured ? `Configured (${plaidConfig.source})` : "Not configured"}
                  </Badge>
                </div>
                <CardDescription>Connect client bank accounts for identity verification, income analysis, liability tracking, and automated ACH payments.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Plaid Client ID</Label>
                    <Input
                      placeholder={plaidConfig?.clientIdMasked ? `${plaidConfig.source === "stored" ? "Saved" : "Configured"}: ${plaidConfig.clientIdMasked}` : "Enter Plaid Client ID"}
                      data-testid="input-plaid-client-id"
                      value={plaidForm.clientId}
                      onChange={e => setPlaidForm(prev => ({ ...prev, clientId: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Plaid Secret</Label>
                    <Input
                      type="password"
                      placeholder={plaidConfig?.secretMasked ? `${plaidConfig.source === "stored" ? "Saved" : "Configured"}: ${plaidConfig.secretMasked}` : "Enter Plaid Secret"}
                      data-testid="input-plaid-secret"
                      value={plaidForm.secret}
                      onChange={e => setPlaidForm(prev => ({ ...prev, secret: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Environment</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      data-testid="select-plaid-env"
                      value={plaidForm.environment}
                      onChange={e => setPlaidForm(prev => ({ ...prev, environment: e.target.value as PlaidEnvironment }))}
                    >
                      <option value="sandbox">Sandbox (Testing)</option>
                      <option value="development">Development</option>
                      <option value="production">Production</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Products</Label>
                    <Input
                      placeholder="auth,transactions,identity,liabilities"
                      data-testid="input-plaid-products"
                      value={plaidForm.products}
                      onChange={e => setPlaidForm(prev => ({ ...prev, products: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                  <div>
                    <Label className="text-base">Provider Enabled</Label>
                    <p className="text-sm text-muted-foreground">When disabled, Plaid account-linking uses manual mode.</p>
                  </div>
                  <Switch
                    checked={plaidForm.enabled}
                    onCheckedChange={checked => setPlaidForm(prev => ({ ...prev, enabled: checked }))}
                    data-testid="switch-plaid-enabled"
                  />
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
              <CardFooter className="border-t border-border/50 px-6 py-4 flex gap-2">
                <Button
                  onClick={() => savePlaid.mutate()}
                  disabled={!canSavePlaid || savePlaid.isPending}
                  data-testid="button-save-plaid-config"
                >
                  <Save className="w-4 h-4 mr-2" />{savePlaid.isPending ? "Saving..." : "Save Plaid Config"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => testPlaid.mutate()}
                  disabled={!plaidConfig?.configured || testPlaid.isPending}
                  data-testid="button-test-plaid-config"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />{testPlaid.isPending ? "Testing..." : "Test Connection"}
                </Button>
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

          <TabsContent value="ai" className="mt-6 space-y-6">
            <BotCommandCenter />
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
