import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import {
  Shield, Search, UserCheck, FileText, Fingerprint, MapPin, Phone,
  Mail, Building, AlertTriangle, CheckCircle2, Copy, Download,
  Printer, Zap, Clock, Globe, Eye, Lock, Brain, Loader2, Crown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdminBypassMulti } from "@/components/admin-bypass-banner";

export default function Tools() {
  const { toast } = useToast();

  const [ssnInput, setSsnInput] = useState("");
  const [ssnFirst, setSsnFirst] = useState("");
  const [ssnLast, setSsnLast] = useState("");
  const [ssnResult, setSsnResult] = useState<any>(null);

  const [skipFirst, setSkipFirst] = useState("");
  const [skipLast, setSkipLast] = useState("");
  const [skipEmail, setSkipEmail] = useState("");
  const [skipPhone, setSkipPhone] = useState("");
  const [skipAddress, setSkipAddress] = useState("");
  const [skipCity, setSkipCity] = useState("");
  const [skipState, setSkipState] = useState("");
  const [skipZip, setSkipZip] = useState("");
  const [skipResult, setSkipResult] = useState<any>(null);

  const [checkClientId, setCheckClientId] = useState("");
  const [creditResult, setCreditResult] = useState<any>(null);

  const [paperClientId, setPaperClientId] = useState("");
  const [paperDocType, setPaperDocType] = useState("");
  const [paperInstructions, setPaperInstructions] = useState("");
  const [paperResult, setPaperResult] = useState<any>(null);

  const { data: clients = [] } = useQuery<any[]>({ queryKey: ["/api/clients"] });
  const { data: paperTypes = [] } = useQuery<any[]>({ queryKey: ["/api/paperwork/types"] });

  const ssnMutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/verify/ssn", {
        ssn: ssnInput, firstName: ssnFirst, lastName: ssnLast,
      });
      return r.json();
    },
    onSuccess: (data) => { setSsnResult(data); toast({ title: "SSN Verified" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const skipMutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/skip-trace", {
        firstName: skipFirst, lastName: skipLast, email: skipEmail,
        phone: skipPhone, address: skipAddress, city: skipCity,
        state: skipState, zip: skipZip,
      });
      return r.json();
    },
    onSuccess: (data) => { setSkipResult(data); toast({ title: "Skip Trace Complete" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const creditMutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/credit-check", {
        clientId: checkClientId, checkType: "soft",
      });
      return r.json();
    },
    onSuccess: (data) => { setCreditResult(data); toast({ title: "Credit Check Complete" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const paperMutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/paperwork/generate", {
        clientId: paperClientId, documentType: paperDocType,
        customInstructions: paperInstructions,
      });
      return r.json();
    },
    onSuccess: (data) => { setPaperResult(data); toast({ title: "Document Generated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const grouped = paperTypes.reduce((acc: Record<string, any[]>, t: any) => {
    (acc[t.category] = acc[t.category] || []).push(t);
    return acc;
  }, {});

  return (
    <Shell title="Tools & Automation" subtitle="SSN verification, skip tracing, credit checks, and AI-powered paperwork automation">
      <AdminBypassMulti bypasses={[
        { key: "admin_bypass_compliance_checks", label: "Compliance checks bypassed" },
        { key: "admin_bypass_staff_restrictions", label: "Staff restrictions bypassed" },
      ]} />

      <Tabs defaultValue="ssn" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="ssn" data-testid="tab-ssn"><Fingerprint className="w-4 h-4 mr-1" /> SSN Verify</TabsTrigger>
          <TabsTrigger value="skip" data-testid="tab-skip"><Search className="w-4 h-4 mr-1" /> Skip Trace</TabsTrigger>
          <TabsTrigger value="credit" data-testid="tab-credit"><Shield className="w-4 h-4 mr-1" /> Credit Check</TabsTrigger>
          <TabsTrigger value="paperwork" data-testid="tab-paperwork"><FileText className="w-4 h-4 mr-1" /> Paperwork</TabsTrigger>
        </TabsList>

        <TabsContent value="ssn" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Fingerprint className="w-5 h-5" /> SSN Verification</CardTitle>
                <CardDescription>Validate Social Security Number format, detect ITINs, and identify invalid/test numbers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Social Security Number</Label>
                  <Input
                    type="password"
                    placeholder="XXX-XX-XXXX"
                    value={ssnInput}
                    onChange={e => setSsnInput(e.target.value)}
                    data-testid="input-ssn"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>First Name (optional)</Label>
                    <Input value={ssnFirst} onChange={e => setSsnFirst(e.target.value)} placeholder="John" />
                  </div>
                  <div>
                    <Label>Last Name (optional)</Label>
                    <Input value={ssnLast} onChange={e => setSsnLast(e.target.value)} placeholder="Smith" />
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => ssnMutation.mutate()}
                  disabled={!ssnInput || ssnMutation.isPending}
                  data-testid="btn-verify-ssn"
                >
                  {ssnMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</> : <><Shield className="w-4 h-4 mr-2" /> Verify SSN</>}
                </Button>

                <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                  <p className="flex items-center gap-1"><Lock className="w-3 h-3" /> SSN data is never stored — validated in-memory only</p>
                  <p className="flex items-center gap-1"><Shield className="w-3 h-3" /> Checks: format validation, area/group/serial rules, ITIN detection, test SSN detection</p>
                </div>
              </CardContent>
            </Card>

            {ssnResult ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {ssnResult.valid ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <AlertTriangle className="w-5 h-5 text-red-500" />}
                    Verification Result
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className={`p-4 rounded-lg ${ssnResult.valid ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
                    <div className={`text-lg font-bold ${ssnResult.valid ? "text-green-500" : "text-red-500"}`}>
                      {ssnResult.valid ? "VALID SSN FORMAT" : "INVALID SSN FORMAT"}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Formatted:</span><span className="font-mono font-medium">***-**-{ssnResult.last4}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Last 4:</span><span className="font-medium">{ssnResult.last4}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Issue Era:</span><Badge variant="outline">{ssnResult.issueEra}</Badge></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">ITIN:</span><Badge variant={ssnResult.itin ? "destructive" : "secondary"}>{ssnResult.itin ? "Yes" : "No"}</Badge></div>
                  </div>

                  {ssnResult.warnings.length > 0 && (
                    <div className="space-y-2">
                      {ssnResult.warnings.map((w: string, i: number) => (
                        <div key={i} className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          {w}
                        </div>
                      ))}
                    </div>
                  )}

                  {ssnResult.nameMatch && (
                    <div className="text-sm text-muted-foreground">
                      Name provided: <span className="font-medium">{ssnResult.nameMatch.provided}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="flex items-center justify-center min-h-[300px]">
                <div className="text-center text-muted-foreground">
                  <Fingerprint className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Enter an SSN to verify</p>
                  <p className="text-sm">Results appear here</p>
                </div>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="skip" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Search className="w-5 h-5" /> Skip Tracing</CardTitle>
                <CardDescription>AI-powered skip tracing to locate people and verify contact information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>First Name *</Label><Input value={skipFirst} onChange={e => setSkipFirst(e.target.value)} placeholder="John" data-testid="input-skip-first" /></div>
                  <div><Label>Last Name *</Label><Input value={skipLast} onChange={e => setSkipLast(e.target.value)} placeholder="Smith" data-testid="input-skip-last" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Email</Label><Input type="email" value={skipEmail} onChange={e => setSkipEmail(e.target.value)} placeholder="email@example.com" /></div>
                  <div><Label>Phone</Label><Input type="tel" value={skipPhone} onChange={e => setSkipPhone(e.target.value)} placeholder="(555) 000-0000" /></div>
                </div>
                <div><Label>Street Address</Label><Input value={skipAddress} onChange={e => setSkipAddress(e.target.value)} placeholder="123 Main St" /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>City</Label><Input value={skipCity} onChange={e => setSkipCity(e.target.value)} placeholder="City" /></div>
                  <div><Label>State</Label><Input value={skipState} onChange={e => setSkipState(e.target.value)} placeholder="CA" maxLength={2} /></div>
                  <div><Label>ZIP</Label><Input value={skipZip} onChange={e => setSkipZip(e.target.value)} placeholder="90210" maxLength={5} /></div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => skipMutation.mutate()}
                  disabled={!skipFirst || !skipLast || skipMutation.isPending}
                  data-testid="btn-skip-trace"
                >
                  {skipMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Running Skip Trace...</> : <><Search className="w-4 h-4 mr-2" /> Run Skip Trace</>}
                </Button>
              </CardContent>
            </Card>

            {skipResult ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><UserCheck className="w-5 h-5 text-green-500" /> Skip Trace Report</CardTitle>
                  <CardDescription>Generated {new Date(skipResult.timestamp).toLocaleString()}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/30 rounded-lg p-4 max-h-[500px] overflow-y-auto">
                    <pre className="text-sm whitespace-pre-wrap font-mono">{skipResult.report}</pre>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(skipResult.report); toast({ title: "Copied to clipboard" }); }}>
                      <Copy className="w-4 h-4 mr-1" /> Copy
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.print()}>
                      <Printer className="w-4 h-4 mr-1" /> Print
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="flex items-center justify-center min-h-[300px]">
                <div className="text-center text-muted-foreground">
                  <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Enter subject info to run a skip trace</p>
                  <p className="text-sm">AI will generate a comprehensive report</p>
                </div>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="credit" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Credit Check</CardTitle>
                <CardDescription>Run a soft credit check on any client — scores, risk level, AI analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Select Client</Label>
                  <Select value={checkClientId} onValueChange={setCheckClientId}>
                    <SelectTrigger data-testid="select-credit-check-client"><SelectValue placeholder="Choose a client" /></SelectTrigger>
                    <SelectContent>
                      {clients.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full"
                  onClick={() => creditMutation.mutate()}
                  disabled={!checkClientId || creditMutation.isPending}
                  data-testid="btn-run-credit-check"
                >
                  {creditMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking...</> : <><Eye className="w-4 h-4 mr-2" /> Run Credit Check</>}
                </Button>
              </CardContent>
            </Card>

            {creditResult ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><UserCheck className="w-5 h-5" /> {creditResult.client.name}</CardTitle>
                  <CardDescription>Credit check as of {new Date(creditResult.timestamp).toLocaleString()}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {Object.entries(creditResult.scores).map(([bureau, score]: [string, any]) => (
                      <div key={bureau} className={`rounded-lg p-3 text-center ${score ? (score >= 670 ? "bg-green-500/10" : score >= 580 ? "bg-yellow-500/10" : "bg-red-500/10") : "bg-muted/50"}`}>
                        <div className="text-xs text-muted-foreground capitalize">{bureau}</div>
                        <div className={`text-2xl font-bold ${score ? (score >= 670 ? "text-green-500" : score >= 580 ? "text-yellow-500" : "text-red-500") : ""}`}>
                          {score || "N/A"}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex justify-between text-sm p-2 bg-muted/30 rounded"><span>Average Score</span><span className="font-bold">{creditResult.averageScore}</span></div>
                    <div className="flex justify-between text-sm p-2 bg-muted/30 rounded"><span>Risk Level</span>
                      <Badge variant={creditResult.riskLevel === "low" ? "default" : creditResult.riskLevel === "medium" ? "secondary" : "destructive"} className="capitalize">{creditResult.riskLevel}</Badge>
                    </div>
                    <div className="flex justify-between text-sm p-2 bg-muted/30 rounded"><span>Creditworthy</span>
                      <Badge variant={creditResult.creditworthy ? "default" : "destructive"}>{creditResult.creditworthy ? "Yes" : "No"}</Badge>
                    </div>
                    <div className="flex justify-between text-sm p-2 bg-muted/30 rounded"><span>Open Disputes</span><span className="font-medium">{creditResult.openDisputes}</span></div>
                    <div className="flex justify-between text-sm p-2 bg-muted/30 rounded"><span>Active Tradelines</span><span className="font-medium">{creditResult.activeTradelines}</span></div>
                    <div className="flex justify-between text-sm p-2 bg-muted/30 rounded"><span>Reports On File</span><span className="font-medium">{creditResult.reportsOnFile}</span></div>
                  </div>

                  {creditResult.aiAnalysis && (
                    <div className="border-t pt-4">
                      <div className="flex items-center gap-2 mb-2"><Brain className="w-4 h-4 text-primary" /><span className="font-medium text-sm">AI Analysis</span></div>
                      <div className="bg-muted/30 rounded-lg p-3 max-h-[200px] overflow-y-auto">
                        <pre className="text-xs whitespace-pre-wrap">{creditResult.aiAnalysis}</pre>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="flex items-center justify-center min-h-[300px]">
                <div className="text-center text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Select a client to run a credit check</p>
                  <p className="text-sm">Includes scores, risk assessment, and AI analysis</p>
                </div>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="paperwork" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> Paperwork Automation Worker</CardTitle>
                <CardDescription>AI-powered legal document generation — FCRA, FDCPA, CROA compliant letters, contracts, and reports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Client</Label>
                  <Select value={paperClientId} onValueChange={setPaperClientId}>
                    <SelectTrigger data-testid="select-paper-client"><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>
                      {clients.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Document Type</Label>
                  <Select value={paperDocType} onValueChange={setPaperDocType}>
                    <SelectTrigger data-testid="select-paper-type"><SelectValue placeholder="Choose document type" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(grouped).map(([cat, types]: [string, any]) => (
                        <div key={cat}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">{cat}</div>
                          {types.map((t: any) => (
                            <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Custom Instructions (optional)</Label>
                  <Textarea
                    value={paperInstructions}
                    onChange={e => setPaperInstructions(e.target.value)}
                    placeholder="Any specific details, account numbers, or instructions for this document..."
                    rows={3}
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={() => paperMutation.mutate()}
                  disabled={!paperClientId || !paperDocType || paperMutation.isPending}
                  data-testid="btn-generate-paper"
                >
                  {paperMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating Document...</> : <><Zap className="w-4 h-4 mr-2" /> Generate Document</>}
                </Button>

                <div className="border-t pt-3">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Available Document Types ({paperTypes.length})</div>
                  <div className="flex flex-wrap gap-1">
                    {paperTypes.map((t: any) => (
                      <Badge key={t.key} variant="outline" className="text-[10px] cursor-pointer hover:bg-primary/10"
                        onClick={() => setPaperDocType(t.key)}>
                        {t.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {paperResult ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-500" /> {paperResult.documentTitle}</CardTitle>
                  <CardDescription>For: {paperResult.clientName} — Generated {new Date(paperResult.generatedAt).toLocaleString()}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-white dark:bg-zinc-900 border rounded-lg p-6 max-h-[500px] overflow-y-auto shadow-inner">
                    <pre className="text-sm whitespace-pre-wrap font-serif leading-relaxed">{paperResult.content}</pre>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(paperResult.content); toast({ title: "Copied to clipboard" }); }} data-testid="btn-copy-paper">
                      <Copy className="w-4 h-4 mr-1" /> Copy
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.print()} data-testid="btn-print-paper">
                      <Printer className="w-4 h-4 mr-1" /> Print
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      const blob = new Blob([paperResult.content], { type: "text/plain" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${paperResult.documentType}_${paperResult.clientName.replace(/\s/g, "_")}.txt`;
                      a.click();
                    }} data-testid="btn-download-paper">
                      <Download className="w-4 h-4 mr-1" /> Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="flex items-center justify-center min-h-[300px]">
                <div className="text-center text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Select a client and document type</p>
                  <p className="text-sm">AI will generate a complete, legally-compliant document</p>
                </div>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </Shell>
  );
}
