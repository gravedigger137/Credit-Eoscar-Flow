import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Save, Key, Building, Database, Bot, ShieldCheck, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Settings() {
  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure AI automation, cybersecurity policies, and API integrations.
          </p>
        </div>

        <Tabs defaultValue="ai" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 lg:w-[800px]">
            <TabsTrigger value="ai" className="flex items-center gap-1"><Bot className="w-4 h-4"/> AI Automation</TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-1"><ShieldCheck className="w-4 h-4"/> Security</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="business">Business Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>
          
          <TabsContent value="ai" className="mt-6 space-y-6">
             <Card className="glass-panel border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary" />
                  AI Dispute Automation Engine
                </CardTitle>
                <CardDescription>
                  Configure how the AI automatically analyzes reports and challenges negative items.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="space-y-0.5">
                    <Label className="text-base">Auto-Import & Analyze</Label>
                    <p className="text-sm text-muted-foreground">
                      AI will automatically pull credit reports monthly and identify negative items.
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="space-y-0.5">
                    <Label className="text-base">Auto-Draft Disputes</Label>
                    <p className="text-sm text-muted-foreground">
                      AI generates factual dispute letters based on FCRA and FDCPA laws automatically.
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="space-y-0.5">
                    <Label className="text-base">Auto-Submit to e-OSCAR</Label>
                    <p className="text-sm text-muted-foreground">
                      Requires no human intervention. AI batches and pushes disputes directly to bureaus.
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
               <CardFooter className="border-t border-border/50 px-6 py-4">
                <Button className="bg-primary text-primary-foreground">
                  <Save className="w-4 h-4 mr-2" />
                  Save AI Settings
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="mt-6 space-y-6">
             <Card className="glass-panel border-l-4 border-l-emerald-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-emerald-500" />
                  Cybersecurity & Data Protection
                </CardTitle>
                <CardDescription>
                  Military-grade encryption and compliance standards for PII and financial data.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                   <div className="p-4 bg-background/50 rounded-lg border border-border">
                     <h4 className="font-bold text-sm mb-1 flex items-center gap-2">
                       <ShieldCheck className="w-4 h-4 text-emerald-500"/> Data Encryption
                     </h4>
                     <p className="text-xs text-muted-foreground mb-3">All PII, SSNs, and credit reports are encrypted at rest (AES-256) and in transit (TLS 1.3).</p>
                     <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Active</Badge>
                   </div>
                   <div className="p-4 bg-background/50 rounded-lg border border-border">
                     <h4 className="font-bold text-sm mb-1 flex items-center gap-2">
                       <Key className="w-4 h-4 text-emerald-500"/> Multi-Factor Authentication (MFA)
                     </h4>
                     <p className="text-xs text-muted-foreground mb-3">Require staff to use SMS or Authenticator apps to access client records.</p>
                     <Switch defaultChecked className="mt-1"/>
                   </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="space-y-0.5">
                    <Label className="text-base">Strict IP Allowlisting</Label>
                    <p className="text-sm text-muted-foreground">
                      Only allow logins from designated office IP addresses.
                    </p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
               <CardFooter className="border-t border-border/50 px-6 py-4 flex justify-between">
                <p className="text-xs text-muted-foreground">SOC2 and PCI-DSS Compliant Infrastructure</p>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Run Security Audit
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="mt-6 space-y-6">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  e-OSCAR API Configuration
                </CardTitle>
                <CardDescription>
                  Connect to e-OSCAR for automated dispute processing and status updates.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="eoscar-id">Company ID</Label>
                  <Input id="eoscar-id" placeholder="Enter your e-OSCAR Company ID" defaultValue="CRP-98211" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="eoscar-key">API Key</Label>
                  <Input id="eoscar-key" type="password" placeholder="••••••••••••••••••••••••" defaultValue="sk_test_12345" />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border mt-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">Production Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Send actual disputes. Keep off for testing.
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/50 px-6 py-4">
                <Button className="bg-primary text-primary-foreground">
                  <Save className="w-4 h-4 mr-2" />
                  Save Configuration
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="business" className="mt-6">
             <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Company Details
                </CardTitle>
                <CardDescription>
                  This information appears on generated dispute letters to the bureaus.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Company Legal Name</Label>
                    <Input defaultValue="CreditRepair Pro LLC" />
                  </div>
                  <div className="grid gap-2">
                    <Label>CROA Registration #</Label>
                    <Input defaultValue="CR-2023-8891" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Shell>
  );
}