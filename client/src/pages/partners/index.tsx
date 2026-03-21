import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, CreditCard, Users, DollarSign, Calendar, Building,
  Pencil, Trash2, Phone, Mail, Banknote, CheckCircle2, AlertCircle,
  TrendingUp, Clock, Star, ExternalLink, Globe, Shield, Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  paypalEmail: "",
  bankName: "",
  cardName: "",
  creditLimit: "",
  currentBalance: "",
  historyYears: "",
  reportingDay: "",
  totalSlots: "3",
  usedSlots: "0",
  pricePerSlot: "",
  payoutPerSlot: "",
  reportingBureaus: ["equifax", "experian", "transunion"],
  status: "active",
  notes: "",
};

const BUREAU_OPTIONS = ["equifax", "experian", "transunion", "innovis"];

const WHOLESALE_SUPPLIERS = [
  {
    name: "TradelineSupply.com",
    website: "https://www.tradelinesupply.com",
    type: "Wholesale & Reseller",
    description: "One of the largest AU tradeline companies. Offers a reseller program with competitive wholesale pricing, a large inventory of aged tradelines (2-25+ years), and a broker dashboard for tracking orders.",
    features: ["Reseller program with markup control", "Aged lines up to 25+ years", "Broker portal", "All 3 bureaus"],
    priceRange: "$150-$1,500+ wholesale",
    contact: "support@tradelinesupply.com",
  },
  {
    name: "BoostCredit101",
    website: "https://www.boostcredit101.com",
    type: "Wholesale Broker",
    description: "Major wholesale tradeline supplier with a large cardholder network. Popular among credit repair businesses for volume pricing and reliability. Offers a partner/affiliate program.",
    features: ["Volume wholesale pricing", "Fast posting times", "Partner program", "Money-back guarantee"],
    priceRange: "$200-$1,200+ wholesale",
    contact: "Via website contact form",
  },
  {
    name: "GFS Group",
    website: "https://www.gfsgroup.com",
    type: "Wholesale Supplier",
    description: "Established tradeline supplier with wholesale and reseller programs. Known for high-limit, well-aged cards and consistent bureau reporting. Offers CPN/SCN alternatives.",
    features: ["High-limit inventory ($20K-$100K+)", "10-25 year aged lines", "Reseller dashboard", "Priority support"],
    priceRange: "$250-$2,000+ wholesale",
    contact: "info@gfsgroup.com",
  },
  {
    name: "Superior Tradelines",
    website: "https://www.superiortradelines.com",
    type: "Retail & Wholesale",
    description: "Full-service tradeline company offering both direct-to-consumer and wholesale programs. Transparent pricing and a wide selection of tradelines across multiple banks.",
    features: ["Transparent pricing", "Wide bank variety", "Wholesale for brokers", "Fast turnaround"],
    priceRange: "$300-$1,500+",
    contact: "Via website",
  },
  {
    name: "Personal Tradelines",
    website: "https://www.personaltradelines.com",
    type: "Wholesale & Retail",
    description: "Tradeline provider focused on quality over quantity. Offers aged AU tradelines with verified reporting to all three bureaus. Has a reseller program for credit repair companies.",
    features: ["Verified 3-bureau reporting", "Reseller program", "Quality-focused inventory", "Dedicated account manager"],
    priceRange: "$200-$1,800+",
    contact: "Via website",
  },
  {
    name: "Wholesale Tradelines",
    website: "https://www.wholesaletradelines.com",
    type: "Wholesale Only",
    description: "Bulk wholesale tradeline supplier designed specifically for credit repair businesses. Lowest wholesale pricing in the industry with a minimum order structure.",
    features: ["Lowest wholesale pricing", "Bulk order discounts", "Credit repair business focused", "Fast processing"],
    priceRange: "$100-$900 wholesale",
    contact: "Via website",
  },
];

function dollars(cents: number | null | undefined) {
  if (!cents) return "$0";
  return `$${(cents / 100).toLocaleString()}`;
}

function utilPct(balance: number, limit: number) {
  if (!limit) return 0;
  return Math.round((balance / limit) * 100);
}

export default function Partners() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [search, setSearch] = useState("");

  const { data: partners = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/partners"] });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const method = editId ? "PUT" : "POST";
      const url = editId ? `/api/partners/${editId}` : "/api/partners";
      const res = await apiRequest(method, url, {
        ...data,
        creditLimit: Math.round(parseFloat(data.creditLimit || "0") * 100),
        currentBalance: Math.round(parseFloat(data.currentBalance || "0") * 100),
        historyYears: parseInt(data.historyYears || "0"),
        reportingDay: data.reportingDay ? parseInt(data.reportingDay) : null,
        totalSlots: parseInt(data.totalSlots || "3"),
        usedSlots: parseInt(data.usedSlots || "0"),
        pricePerSlot: data.pricePerSlot ? Math.round(parseFloat(data.pricePerSlot) * 100) : null,
        payoutPerSlot: data.payoutPerSlot ? Math.round(parseFloat(data.payoutPerSlot) * 100) : null,
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/partners"] });
      setOpen(false);
      setEditId(null);
      setForm({ ...EMPTY_FORM });
      toast({ title: editId ? "Partner updated!" : "Partner added!" });
    },
    onError: () => toast({ title: "Failed to save partner", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/partners/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/partners"] });
      setDeleteId(null);
      toast({ title: "Partner removed" });
    },
    onError: () => toast({ title: "Failed to delete partner", variant: "destructive" }),
  });

  function openEdit(p: any) {
    setEditId(p.id);
    setForm({
      name: p.name ?? "",
      email: p.email ?? "",
      phone: p.phone ?? "",
      paypalEmail: p.paypalEmail ?? "",
      bankName: p.bankName ?? "",
      cardName: p.cardName ?? "",
      creditLimit: p.creditLimit ? String(p.creditLimit / 100) : "",
      currentBalance: p.currentBalance ? String(p.currentBalance / 100) : "",
      historyYears: String(p.historyYears ?? ""),
      reportingDay: p.reportingDay ? String(p.reportingDay) : "",
      totalSlots: String(p.totalSlots ?? "3"),
      usedSlots: String(p.usedSlots ?? "0"),
      pricePerSlot: p.pricePerSlot ? String(p.pricePerSlot / 100) : "",
      payoutPerSlot: p.payoutPerSlot ? String(p.payoutPerSlot / 100) : "",
      reportingBureaus: p.reportingBureaus ?? ["equifax", "experian", "transunion"],
      status: p.status ?? "active",
      notes: p.notes ?? "",
    });
    setOpen(true);
  }

  function toggleBureau(b: string) {
    setForm(f => ({
      ...f,
      reportingBureaus: (f.reportingBureaus as string[]).includes(b)
        ? (f.reportingBureaus as string[]).filter(x => x !== b)
        : [...(f.reportingBureaus as string[]), b],
    }));
  }

  const filtered = (partners as any[]).filter((p: any) =>
    !search || `${p.name} ${p.bankName} ${p.cardName}`.toLowerCase().includes(search.toLowerCase())
  );

  const totalSlots = (partners as any[]).reduce((a: number, p: any) => a + (p.totalSlots ?? 0), 0);
  const usedSlots = (partners as any[]).reduce((a: number, p: any) => a + (p.usedSlots ?? 0), 0);
  const availableSlots = totalSlots - usedSlots;
  const totalInventory = (partners as any[]).reduce((a: number, p: any) => a + (p.creditLimit ?? 0), 0);

  return (
    <Shell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AU Partners & Suppliers</h1>
            <p className="text-muted-foreground mt-1">
              Manage your cardholder partners and browse wholesale tradeline suppliers.
            </p>
          </div>
          <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setEditId(null); setForm({ ...EMPTY_FORM }); } }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-partner">
                <Plus className="w-4 h-4 mr-2" /> Add Partner
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editId ? "Edit Partner" : "Add Cardholder Partner"}</DialogTitle>
                <DialogDescription>
                  Add an authorized user tradeline supplier to your inventory.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-2">
                <div className="col-span-2 space-y-2">
                  <Label>Full Name *</Label>
                  <Input data-testid="input-partner-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Smith" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="partner@email.com" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 000-0000" />
                </div>
                <div className="space-y-2">
                  <Label>PayPal Email (for payouts)</Label>
                  <Input value={form.paypalEmail} onChange={e => setForm(f => ({ ...f, paypalEmail: e.target.value }))} placeholder="paypal@email.com" />
                </div>
                <div className="space-y-2">
                  <Label>Bank / Issuer *</Label>
                  <Input data-testid="input-bank-name" value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} placeholder="Chase, Capital One, Amex..." />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Card Name *</Label>
                  <Input value={form.cardName} onChange={e => setForm(f => ({ ...f, cardName: e.target.value }))} placeholder="Chase Sapphire Reserve, Amex Gold..." />
                </div>
                <div className="space-y-2">
                  <Label>Credit Limit ($) *</Label>
                  <Input type="number" value={form.creditLimit} onChange={e => setForm(f => ({ ...f, creditLimit: e.target.value }))} placeholder="25000" />
                </div>
                <div className="space-y-2">
                  <Label>Current Balance ($)</Label>
                  <Input type="number" value={form.currentBalance} onChange={e => setForm(f => ({ ...f, currentBalance: e.target.value }))} placeholder="500" />
                </div>
                <div className="space-y-2">
                  <Label>Account Age (Years) *</Label>
                  <Input type="number" value={form.historyYears} onChange={e => setForm(f => ({ ...f, historyYears: e.target.value }))} placeholder="12" />
                </div>
                <div className="space-y-2">
                  <Label>Statement Closing Day</Label>
                  <Input type="number" min="1" max="31" value={form.reportingDay} onChange={e => setForm(f => ({ ...f, reportingDay: e.target.value }))} placeholder="15" />
                </div>
                <div className="space-y-2">
                  <Label>Total AU Slots</Label>
                  <Input type="number" value={form.totalSlots} onChange={e => setForm(f => ({ ...f, totalSlots: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Slots Currently Used</Label>
                  <Input type="number" value={form.usedSlots} onChange={e => setForm(f => ({ ...f, usedSlots: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Price Per Slot (charge client $)</Label>
                  <Input type="number" value={form.pricePerSlot} onChange={e => setForm(f => ({ ...f, pricePerSlot: e.target.value }))} placeholder="300" />
                </div>
                <div className="space-y-2">
                  <Label>Payout Per Slot (pay partner $)</Label>
                  <Input type="number" value={form.payoutPerSlot} onChange={e => setForm(f => ({ ...f, payoutPerSlot: e.target.value }))} placeholder="150" />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Reporting Bureaus</Label>
                  <div className="flex gap-2 flex-wrap">
                    {BUREAU_OPTIONS.map(b => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => toggleBureau(b)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
                          (form.reportingBureaus as string[]).includes(b)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any special notes about this partner..." rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.name || !form.bankName || !form.cardName || !form.creditLimit || !form.historyYears}>
                  {saveMutation.isPending ? "Saving..." : editId ? "Update Partner" : "Add Partner"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="my-partners" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="my-partners" data-testid="tab-my-partners">My Partners</TabsTrigger>
            <TabsTrigger value="suppliers" data-testid="tab-suppliers">Supplier Directory</TabsTrigger>
          </TabsList>

          <TabsContent value="my-partners" className="space-y-6 mt-4">
        {/* Summary Stats */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {[
            { label: "Total Partners", value: (partners as any[]).length, icon: Users, color: "text-blue-500" },
            { label: "Total Slots", value: totalSlots, icon: CreditCard, color: "text-indigo-500" },
            { label: "Available Slots", value: availableSlots, icon: CheckCircle2, color: "text-emerald-500" },
            { label: "Total Inventory", value: dollars(totalInventory), icon: DollarSign, color: "text-amber-500" },
          ].map((s, i) => (
            <Card key={i} className="glass-panel">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <p className="text-2xl font-bold">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <Input
          data-testid="input-search-partners"
          placeholder="Search by name, bank, or card..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-md"
        />

        {/* Partner Cards */}
        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Loading partners...</div>
        ) : filtered.length === 0 ? (
          <Card className="glass-panel">
            <CardContent className="py-16 text-center">
              <CreditCard className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="font-medium text-muted-foreground mb-2">No cardholder partners yet</p>
              <p className="text-sm text-muted-foreground">Add your first AU tradeline supplier to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p: any) => {
              const util = utilPct(p.currentBalance ?? 0, p.creditLimit ?? 1);
              const slotsLeft = (p.totalSlots ?? 0) - (p.usedSlots ?? 0);
              const margin = (p.pricePerSlot ?? 0) - (p.payoutPerSlot ?? 0);
              return (
                <Card key={p.id} data-testid={`card-partner-${p.id}`} className="glass-panel flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{p.name}</CardTitle>
                        <CardDescription className="mt-0.5 flex items-center gap-1">
                          <Building className="w-3 h-3" /> {p.bankName}
                        </CardDescription>
                      </div>
                      <Badge
                        variant="outline"
                        className={p.status === "active" ? "border-emerald-500 text-emerald-600" : "border-amber-500 text-amber-600"}
                      >
                        {p.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-4 pb-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{p.cardName}</p>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-semibold text-lg">{dollars(p.creditLimit)}</span>
                        <span className="text-muted-foreground text-xs">Limit</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                        <span>Balance: {dollars(p.currentBalance)}</span>
                        <span className={util > 30 ? "text-amber-500" : "text-emerald-500"}>{util}% util</span>
                      </div>
                      <Progress value={util} className="h-1.5" />
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-muted/40 rounded-lg p-2">
                        <p className="text-xs text-muted-foreground">History</p>
                        <p className="font-bold text-sm">{p.historyYears}y</p>
                      </div>
                      <div className={`rounded-lg p-2 ${slotsLeft > 0 ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                        <p className="text-xs text-muted-foreground">Slots</p>
                        <p className={`font-bold text-sm ${slotsLeft > 0 ? "text-emerald-600" : "text-red-500"}`}>
                          {slotsLeft}/{p.totalSlots}
                        </p>
                      </div>
                      <div className="bg-muted/40 rounded-lg p-2">
                        <p className="text-xs text-muted-foreground">Margin</p>
                        <p className="font-bold text-sm text-primary">{dollars(margin)}</p>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      {p.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3 h-3" /> {p.email}
                        </div>
                      )}
                      {p.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3" /> {p.phone}
                        </div>
                      )}
                      {p.paypalEmail && (
                        <div className="flex items-center gap-2">
                          <Banknote className="w-3 h-3" /> PayPal: {p.paypalEmail}
                        </div>
                      )}
                      {p.reportingDay && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3" /> Closes day {p.reportingDay} of month
                        </div>
                      )}
                    </div>

                    {p.reportingBureaus && p.reportingBureaus.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {p.reportingBureaus.map((b: string) => (
                          <Badge key={b} variant="secondary" className="text-[10px] capitalize">{b}</Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Price/slot</span>
                      <span className="font-semibold">{dollars(p.pricePerSlot)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Payout/slot</span>
                      <span className="font-semibold">{dollars(p.payoutPerSlot)}</span>
                    </div>

                    {p.notes && (
                      <p className="text-xs text-muted-foreground italic border-t border-border/50 pt-2">{p.notes}</p>
                    )}
                  </CardContent>
                  <CardFooter className="border-t border-border/50 pt-3 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(p)}>
                      <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-destructive/30 text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteId(p.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
          </TabsContent>

          <TabsContent value="suppliers" className="space-y-6 mt-4">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  Wholesale Tradeline Suppliers
                </CardTitle>
                <CardDescription>
                  These are established AU tradeline companies that offer wholesale and reseller programs for credit repair businesses.
                  Contact them to set up a reseller account, then add your inventory to the "My Partners" tab.
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {WHOLESALE_SUPPLIERS.map((s, i) => (
                <Card key={i} data-testid={`card-supplier-${i}`} className="glass-panel flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{s.name}</CardTitle>
                        <CardDescription className="mt-0.5">{s.type}</CardDescription>
                      </div>
                      <Badge variant="outline" className="border-primary/50 text-primary">
                        <Shield className="w-3 h-3 mr-1" /> Verified
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-4 pb-3">
                    <p className="text-sm text-muted-foreground">{s.description}</p>

                    <div className="space-y-2">
                      {s.features.map((f, fi) => (
                        <div key={fi} className="flex items-center gap-2 text-xs">
                          <Zap className="w-3 h-3 text-primary shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>

                    <div className="bg-muted/40 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Price Range</span>
                        <span className="font-semibold">{s.priceRange}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Contact</span>
                        <span className="font-medium">{s.contact}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-border/50 pt-3">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open(s.website, "_blank", "noopener,noreferrer")}
                      data-testid={`button-visit-supplier-${i}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-2" />
                      Visit Website
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>

            <Card className="glass-panel border-primary/20">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium mb-1">How to Get Started</p>
                    <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Visit a supplier's website and sign up for their reseller/broker program</li>
                      <li>Browse their available tradeline inventory (limits, ages, banks)</li>
                      <li>When you find lines to offer your clients, order them through the supplier</li>
                      <li>Track your orders and cardholder details in the "My Partners" tab</li>
                      <li>Mark up the wholesale price and bill your clients through Stripe</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Partner?</DialogTitle>
            <DialogDescription>This will permanently remove this cardholder partner from your roster.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Removing..." : "Remove Partner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
