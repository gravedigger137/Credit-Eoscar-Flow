import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Save, Key, Building, Database, Bot, ShieldCheck, Lock, Bell, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function Settings() {
  const { toast } = useToast();
  const [businessPhone, setBusinessPhone] = useState("(800) 555-0199");
  const [businessEmail, setBusinessEmail] = useState("support@creditrepairpro.com");
  const [businessName, setBusinessName] = useState("CreditRepair Pro LLC");
  const [croaReg, setCroaReg] = useState("CR-2023-8891");

  const saveConfig = useMutation({
    mutationFn: (data: { key: string; value: string }) => apiRequest("POST", "/api/config", data),
    onSuccess: () => toast({ title: "Configuration saved!" }),
    onError: () => toast({ title: "Error saving config", variant: "destructive" }),
  });

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground mt-1">Configure AI automation, cybersecurity, integrations, and business profile.</p>
        </div>

        <Tabs defaultValue="business" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto">
            <TabsTrigger value="business" className="flex items-center gap-1"><Building className="w-4 h-4" /> Business</TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-1"><Database className="w-4 h-4" /> Integrations</TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-1"><Bot className="w-4 h-4" /> AI Automation</TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> Security</TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-1"><Bell className="w-4 h-4" /> Notifications</TabsTrigger>
          </TabsList>

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
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Database className="w-5 h-5 text-primary" /> e-OSCAR API</CardTitle>
                <CardDescription>Automate dispute submissions directly to credit bureaus.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label>Company ID</Label><Input placeholder="CRP-98211" /></div>
                <div className="space-y-2"><Label>API Key</Label><Input type="password" placeholder="••••••••••••••••" /></div>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                  <div><Label className="text-base">Production Mode</Label><p className="text-sm text-muted-foreground">Disable to use sandbox/test mode.</p></div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/50 px-6 py-4">
                <Button><Save className="w-4 h-4 mr-2" />Save e-OSCAR Config</Button>
              </CardFooter>
            </Card>

            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-indigo-500" /> Stripe Integration</CardTitle>
                <CardDescription>Enable live payment processing for tradelines and credit products.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label>Publishable Key</Label><Input placeholder="pk_live_..." /></div>
                <div className="space-y-2"><Label>Secret Key</Label><Input type="password" placeholder="sk_live_..." /></div>
                <div className="space-y-2"><Label>Webhook Secret</Label><Input type="password" placeholder="whsec_..." /></div>
              </CardContent>
              <CardFooter className="border-t border-border/50 px-6 py-4">
                <Button><Save className="w-4 h-4 mr-2" />Save Stripe Keys</Button>
              </CardFooter>
            </Card>

            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Key className="w-5 h-5" /> Credit Report Providers</CardTitle>
                <CardDescription>Pull credit reports automatically via SmartCredit, IdentityIQ, or similar.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option>SmartCredit API</option>
                    <option>IdentityIQ Pro</option>
                    <option>MyFICO</option>
                    <option>Experian Connect</option>
                  </select>
                </div>
                <div className="space-y-2"><Label>Partner Token</Label><Input type="password" placeholder="Enter provider token" /></div>
              </CardContent>
              <CardFooter className="border-t border-border/50 px-6 py-4">
                <Button>Save Provider</Button>
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