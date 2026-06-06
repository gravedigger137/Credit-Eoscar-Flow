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
import { useState, useRef, useEffect } from "react";
import {
  Bot, Send, FileText, BarChart3, CheckCircle2,
  Copy, Download, Loader2, Sparkles, MessageSquare,
  User, AlertTriangle, Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BUREAUS = [
  { value: "equifax", label: "Equifax" },
  { value: "experian", label: "Experian" },
  { value: "transunion", label: "TransUnion" },
  { value: "innovis", label: "Innovis" },
  { value: "chexsystems", label: "ChexSystems" },
  { value: "lexisnexis", label: "LexisNexis" },
];
const DISPUTE_TYPES = [
  "Collection Account", "Late Payment", "Charge-off", "Bankruptcy",
  "Inquiry (Hard)", "Identity Theft / Fraud", "Incorrect Balance",
  "Incorrect Personal Info", "Repossession", "Judgement / Lien",
  "Student Loan", "Medical Debt",
];
const DISPUTE_REASONS = [
  "Not mine / Never had this account",
  "Account paid in full but showing balance",
  "Incorrect payment history",
  "Account past statute of limitations",
  "Duplicate account reporting",
  "Incorrect account status",
  "Identity theft / fraudulent account",
  "Already discharged in bankruptcy",
  "Settled — should show $0 balance",
  "Incorrect dates (opened, last activity)",
];

function CopyBtn({ text }: { text: string }) {
  const { toast } = useToast();
  return (
    <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(text); toast({ title: "Copied!" }); }}>
      <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy
    </Button>
  );
}

function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Markdown-ish renderer ───────────────────────────────────────────────────
function AIText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) return <h3 key={i} className="font-bold text-base mt-3 first:mt-0">{line.slice(3)}</h3>;
        if (line.startsWith("# ")) return <h2 key={i} className="font-bold text-lg mt-3 first:mt-0">{line.slice(2)}</h2>;
        if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-semibold">{line.slice(2, -2)}</p>;
        if (line.startsWith("- ") || line.startsWith("• ")) return <li key={i} className="ml-4 list-disc">{line.slice(2)}</li>;
        if (line.match(/^\d+\./)) return <li key={i} className="ml-4 list-decimal">{line.replace(/^\d+\.\s*/, "")}</li>;
        if (line.trim() === "") return <div key={i} className="h-1" />;
        // bold inline
        const boldParts = line.split(/\*\*(.*?)\*\*/g);
        if (boldParts.length > 1) {
          return (
            <p key={i}>
              {boldParts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
            </p>
          );
        }
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}

export default function AIPage() {
  const { toast } = useToast();
  const { data: clients = [] } = useQuery<any[]>({ queryKey: ["/api/clients"] });

  // ── Chat state ──
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "Hi! I'm your Credit-Eoscar AI assistant. I can help with dispute strategies, FCRA law, Metro 2 questions, tradeline tactics, bureau procedures, and anything else credit-related. What do you need?" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const chatMutation = useMutation({
    mutationFn: async (messages: typeof chatMessages) => {
      const res = await apiRequest("POST", "/api/ai/chat", { messages: messages.filter(m => m.role !== "assistant" || messages.indexOf(m) > 0) });
      return res.json();
    },
    onSuccess: (data) => {
      setChatMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    },
    onError: () => toast({ title: "AI error — check OpenAI key", variant: "destructive" }),
  });

  function sendChat() {
    if (!chatInput.trim()) return;
    const newMessages = [...chatMessages, { role: "user" as const, content: chatInput.trim() }];
    setChatMessages(newMessages);
    setChatInput("");
    chatMutation.mutate(newMessages);
  }

  // ── Dispute Letter state ──
  const [letterForm, setLetterForm] = useState({
    clientId: "", bureau: "equifax", accountName: "", accountNumber: "",
    type: "Collection Account", reason: "Not mine / Never had this account",
  });
  const [generatedLetter, setGeneratedLetter] = useState("");

  const letterMutation = useMutation({
    mutationFn: async () => {
      const client = (clients as any[]).find((c: any) => c.id === letterForm.clientId);
      const clientName = client ? `${client.firstName} ${client.lastName}` : "Client Name";
      const res = await apiRequest("POST", "/api/ai/dispute-letter", { ...letterForm, clientName });
      return res.json();
    },
    onSuccess: (data) => setGeneratedLetter(data.letter),
    onError: () => toast({ title: "Failed to generate letter", variant: "destructive" }),
  });

  // ── Analysis state ──
  const [analysisForm, setAnalysisForm] = useState({
    clientId: "", efx: "", exp: "", tu: "", goal: "",
    negativeItems: "",
  });
  const [analysis, setAnalysis] = useState("");

  const analysisMutation = useMutation({
    mutationFn: async () => {
      const client = (clients as any[]).find((c: any) => c.id === analysisForm.clientId);
      const clientName = client ? `${client.firstName} ${client.lastName}` : "Client";
      const scores: any = {};
      if (analysisForm.efx) scores.equifax = parseInt(analysisForm.efx);
      if (analysisForm.exp) scores.experian = parseInt(analysisForm.exp);
      if (analysisForm.tu) scores.transunion = parseInt(analysisForm.tu);
      const negativeItems = analysisForm.negativeItems.split("\n").map(s => s.trim()).filter(Boolean);
      const res = await apiRequest("POST", "/api/ai/analyze-client", { clientName, scores, negativeItems, goal: analysisForm.goal });
      return res.json();
    },
    onSuccess: (data) => setAnalysis(data.analysis),
    onError: () => toast({ title: "Analysis failed", variant: "destructive" }),
  });

  // ── Metro 2 Validator state ──
  const [metro2Record, setMetro2Record] = useState("");
  const [metro2Result, setMetro2Result] = useState("");

  const metro2Mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/validate-metro2", { record: metro2Record });
      return res.json();
    },
    onSuccess: (data) => setMetro2Result(data.result),
    onError: () => toast({ title: "Validation failed", variant: "destructive" }),
  });

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="w-7 h-7 text-primary" /> AI Command Center
            </h1>
            <p className="text-muted-foreground mt-1">
              GPT-4o powered tools — dispute letters, client analysis, Metro 2 validation, and live assistant.
            </p>
          </div>
          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs px-3 py-1.5">
            GPT-4o Connected
          </Badge>
        </div>

        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
            <TabsTrigger value="chat" className="flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4" /> AI Assistant
            </TabsTrigger>
            <TabsTrigger value="letters" className="flex items-center gap-1.5">
              <FileText className="w-4 h-4" /> Dispute Letters
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4" /> Client Analysis
            </TabsTrigger>
            <TabsTrigger value="metro2" className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Metro 2 Check
            </TabsTrigger>
          </TabsList>

          {/* ── CHAT TAB ── */}
          <TabsContent value="chat" className="mt-6">
            <Card className="glass-panel flex flex-col" style={{ height: "calc(100vh - 280px)", minHeight: "500px" }}>
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bot className="w-5 h-5 text-primary" /> Credit-Eoscar AI Assistant
                </CardTitle>
                <CardDescription className="text-xs">
                  Ask anything — FCRA law, bureau strategies, dispute tactics, Metro 2 codes, tradeline questions, and more.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted/60 border border-border/50 rounded-tl-sm"}`}>
                      {msg.role === "assistant" ? <AIText text={msg.content} /> : <p className="text-sm">{msg.content}</p>}
                    </div>
                    {msg.role === "user" && (
                      <div className="w-8 h-8 rounded-full bg-muted/60 border border-border/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}
                {chatMutation.isPending && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div className="bg-muted/60 border border-border/50 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </CardContent>
              <CardFooter className="border-t border-border/50 pt-4">
                <div className="flex gap-2 w-full">
                  <Input
                    data-testid="input-chat"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendChat()}
                    placeholder="Ask about FCRA, dispute strategy, Metro 2 codes, bureaus..."
                    className="flex-1"
                    disabled={chatMutation.isPending}
                  />
                  <Button onClick={sendChat} disabled={chatMutation.isPending || !chatInput.trim()} data-testid="button-send-chat">
                    {chatMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3 w-full">
                  {["What ECOA code for AU tradelines?", "How long does e-OSCAR take?", "Best disputes for collections?", "Metro 2 account status 13 meaning"].map((q, i) => (
                    <button key={i} onClick={() => setChatInput(q)} className="text-xs px-2.5 py-1 rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* ── DISPUTE LETTERS TAB ── */}
          <TabsContent value="letters" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" /> Generate FCRA Dispute Letter
                  </CardTitle>
                  <CardDescription>AI drafts a professional, legally-sound dispute letter in seconds.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Client</Label>
                    <Select value={letterForm.clientId} onValueChange={v => setLetterForm(f => ({ ...f, clientId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select client (optional)..." /></SelectTrigger>
                      <SelectContent>
                        {(clients as any[]).map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Credit Bureau *</Label>
                    <Select value={letterForm.bureau} onValueChange={v => setLetterForm(f => ({ ...f, bureau: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BUREAUS.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Account / Item Name *</Label>
                    <Input value={letterForm.accountName} onChange={e => setLetterForm(f => ({ ...f, accountName: e.target.value }))} placeholder="e.g. Capital One, LVNV Funding, Midland Credit" />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Number (optional)</Label>
                    <Input value={letterForm.accountNumber} onChange={e => setLetterForm(f => ({ ...f, accountNumber: e.target.value }))} placeholder="****1234" />
                  </div>
                  <div className="space-y-2">
                    <Label>Item Type *</Label>
                    <Select value={letterForm.type} onValueChange={v => setLetterForm(f => ({ ...f, type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DISPUTE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Dispute Reason *</Label>
                    <Select value={letterForm.reason} onValueChange={v => setLetterForm(f => ({ ...f, reason: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DISPUTE_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
                <CardFooter className="border-t border-border/50 pt-4">
                  <Button
                    className="w-full"
                    onClick={() => letterMutation.mutate()}
                    disabled={letterMutation.isPending || !letterForm.bureau || !letterForm.accountName || !letterForm.type}
                    data-testid="button-generate-letter"
                  >
                    {letterMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4 mr-2" /> Generate Letter</>}
                  </Button>
                </CardFooter>
              </Card>

              <Card className="glass-panel flex flex-col">
                <CardHeader className="pb-3 flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-base">Generated Letter</CardTitle>
                    <CardDescription className="text-xs mt-0.5">Ready to copy, print, or attach to a dispute file</CardDescription>
                  </div>
                  {generatedLetter && (
                    <div className="flex gap-2 flex-shrink-0">
                      <CopyBtn text={generatedLetter} />
                      <Button variant="outline" size="sm" onClick={() => downloadText(generatedLetter, `dispute_letter_${letterForm.bureau}_${Date.now()}.txt`)}>
                        <Download className="w-3.5 h-3.5 mr-1.5" /> Download
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="flex-1">
                  {letterMutation.isPending ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-sm">Drafting FCRA-compliant letter...</p>
                    </div>
                  ) : generatedLetter ? (
                    <div className="bg-muted/30 border border-border/50 rounded-xl p-4 overflow-auto max-h-[520px]">
                      <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/90 leading-relaxed">{generatedLetter}</pre>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground/40">
                      <FileText className="w-10 h-10" />
                      <p className="text-sm">Fill in the form and click Generate Letter</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── ANALYSIS TAB ── */}
          <TabsContent value="analysis" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-500" /> Client Credit Analysis
                  </CardTitle>
                  <CardDescription>AI generates a full action plan — disputes, tradelines, timeline, and strategy.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Client</Label>
                    <Select value={analysisForm.clientId} onValueChange={v => setAnalysisForm(f => ({ ...f, clientId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select client (optional)..." /></SelectTrigger>
                      <SelectContent>
                        {(clients as any[]).map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Equifax Score</Label>
                      <Input type="number" min="300" max="850" value={analysisForm.efx} onChange={e => setAnalysisForm(f => ({ ...f, efx: e.target.value }))} placeholder="580" />
                    </div>
                    <div className="space-y-2">
                      <Label>Experian Score</Label>
                      <Input type="number" min="300" max="850" value={analysisForm.exp} onChange={e => setAnalysisForm(f => ({ ...f, exp: e.target.value }))} placeholder="572" />
                    </div>
                    <div className="space-y-2">
                      <Label>TransUnion Score</Label>
                      <Input type="number" min="300" max="850" value={analysisForm.tu} onChange={e => setAnalysisForm(f => ({ ...f, tu: e.target.value }))} placeholder="561" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Score Goal (optional)</Label>
                    <Input value={analysisForm.goal} onChange={e => setAnalysisForm(f => ({ ...f, goal: e.target.value }))} placeholder="e.g. 720+ for mortgage qualification" />
                  </div>
                  <div className="space-y-2">
                    <Label>Negative Items (one per line)</Label>
                    <Textarea
                      value={analysisForm.negativeItems}
                      onChange={e => setAnalysisForm(f => ({ ...f, negativeItems: e.target.value }))}
                      placeholder={`LVNV Funding collection - $1,200 (2022)\nCapital One late payments (3x 30-day)\nMidland Credit Management charge-off\nBankruptcy Chapter 7 (2021)`}
                      rows={6}
                    />
                  </div>
                </CardContent>
                <CardFooter className="border-t border-border/50 pt-4">
                  <Button
                    className="w-full"
                    onClick={() => analysisMutation.mutate()}
                    disabled={analysisMutation.isPending}
                    data-testid="button-analyze-client"
                  >
                    {analysisMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> : <><Sparkles className="w-4 h-4 mr-2" /> Generate Action Plan</>}
                  </Button>
                </CardFooter>
              </Card>

              <Card className="glass-panel flex flex-col">
                <CardHeader className="pb-3 flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-base">AI Action Plan</CardTitle>
                    <CardDescription className="text-xs mt-0.5">Strategy, priorities, timeline, and tradeline recommendations</CardDescription>
                  </div>
                  {analysis && (
                    <div className="flex gap-2 flex-shrink-0">
                      <CopyBtn text={analysis} />
                      <Button variant="outline" size="sm" onClick={() => downloadText(analysis, `credit_analysis_${Date.now()}.txt`)}>
                        <Download className="w-3.5 h-3.5 mr-1.5" /> Download
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="flex-1 overflow-auto max-h-[580px]">
                  {analysisMutation.isPending ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-sm">Analyzing credit profile...</p>
                    </div>
                  ) : analysis ? (
                    <div className="bg-muted/30 border border-border/50 rounded-xl p-5">
                      <AIText text={analysis} />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground/40">
                      <BarChart3 className="w-10 h-10" />
                      <p className="text-sm">Enter client data and click Generate Action Plan</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── METRO 2 VALIDATOR TAB ── */}
          <TabsContent value="metro2" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Metro 2 Record Validator
                  </CardTitle>
                  <CardDescription>
                    Paste a Metro 2 record and AI checks it against CDIA spec — field positions, codes, dates, and compliance.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Metro 2 Record (paste raw .DAT content)</Label>
                    <Textarea
                      value={metro2Record}
                      onChange={e => setMetro2Record(e.target.value)}
                      placeholder="Paste the 426-character Metro 2 base segment here..."
                      rows={10}
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      Tip: Generate a Metro 2 file from the Bureau Uploads page, then paste the base segment here to validate it before submitting to bureaus.
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="border-t border-border/50 pt-4">
                  <Button
                    className="w-full"
                    onClick={() => metro2Mutation.mutate()}
                    disabled={metro2Mutation.isPending || !metro2Record.trim()}
                    data-testid="button-validate-metro2"
                  >
                    {metro2Mutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Validating...</> : <><CheckCircle2 className="w-4 h-4 mr-2" /> Validate Record</>}
                  </Button>
                </CardFooter>
              </Card>

              <Card className="glass-panel flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Validation Report</CardTitle>
                  <CardDescription className="text-xs mt-0.5">CDIA Metro 2 compliance check results</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  {metro2Mutation.isPending ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-sm">Checking against CDIA Metro 2 spec...</p>
                    </div>
                  ) : metro2Result ? (
                    <div className={`rounded-xl p-5 border ${metro2Result.startsWith("VALID") ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                      <div className="flex items-center gap-2 mb-3">
                        {metro2Result.startsWith("VALID") ? (
                          <><CheckCircle2 className="w-5 h-5 text-emerald-500" /><span className="font-bold text-emerald-600">VALID</span></>
                        ) : (
                          <><AlertTriangle className="w-5 h-5 text-red-500" /><span className="font-bold text-red-600">ISSUES FOUND</span></>
                        )}
                      </div>
                      <AIText text={metro2Result} />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground/40">
                      <CheckCircle2 className="w-10 h-10" />
                      <p className="text-sm">Paste a Metro 2 record to validate</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Shell>
  );
}
