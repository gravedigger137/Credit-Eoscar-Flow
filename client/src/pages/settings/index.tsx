import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Save, Key, Building, BellRing, Database } from "lucide-react";

export default function Settings() {
  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure integrations, business profile, and application preferences.
          </p>
        </div>

        <Tabs defaultValue="integrations" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="business">Business Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>
          
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

            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-indigo-500" />
                  Credit Report Providers
                </CardTitle>
                <CardDescription>
                  Configure connections to SmartCredit, IdentityIQ, or other report providers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="grid gap-2">
                  <Label>Provider Selection</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    <option>SmartCredit API</option>
                    <option>IdentityIQ Pro</option>
                    <option>MyFICO</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label>Partner Token</Label>
                  <Input type="password" placeholder="Enter provider token" defaultValue="tok_991283" />
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/50 px-6 py-4">
                <Button variant="outline">Update Credentials</Button>
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
                  <div className="grid gap-2 md:col-span-2">
                    <Label>Business Address</Label>
                    <Input defaultValue="123 Financial Way, Suite 400, New York, NY 10001" />
                  </div>
                   <div className="grid gap-2">
                    <Label>Support Phone</Label>
                    <Input defaultValue="(800) 555-0199" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Support Email</Label>
                    <Input defaultValue="support@creditrepairpro.com" />
                  </div>
                </div>
              </CardContent>
               <CardFooter className="border-t border-border/50 px-6 py-4">
                <Button>Save Profile</Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Shell>
  );
}