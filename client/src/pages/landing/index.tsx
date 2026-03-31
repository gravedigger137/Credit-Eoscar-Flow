import { Link } from "wouter";
import { ShieldCheck, TrendingUp, FileText, CreditCard, Wallet, CheckCircle2, Star, ArrowRight, Phone, Mail, MapPin, Lock, Zap, Users, BarChart3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export default function Landing() {
  const [bookName, setBookName] = useState("");
  const [bookPhone, setBookPhone] = useState("");
  const [bookEmail, setBookEmail] = useState("");
  const [bookSubmitted, setBookSubmitted] = useState(false);
  const [bookLoading, setBookLoading] = useState(false);

  const handleBookCall = async () => {
    if (!bookName || !bookPhone) return;
    setBookLoading(true);
    try {
      await fetch("/api/book-consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: bookName, phone: bookPhone, email: bookEmail }),
      });
    } catch {}
    setBookLoading(false);
    setBookSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#030712] text-white font-sans">

      {/* ── NAV ── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#030712]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <ShieldCheck className="w-6 h-6 text-blue-400" />
            <span className="text-white">CreditRepair <span className="text-blue-400">Pro</span></span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-white/70">
            <a href="#services" className="hover:text-white transition-colors">Services</a>
            <a href="#how" className="hover:text-white transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#contact" className="hover:text-white transition-colors">Contact</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-white/70 hover:text-white border border-white/10 hover:border-white/30">
                Staff Login
              </Button>
            </Link>
            <Link href="/login">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold" data-testid="button-get-started">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/40 via-transparent to-indigo-950/30 pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-5xl mx-auto text-center relative">
          <Badge className="mb-6 bg-blue-900/60 text-blue-300 border-blue-700/50 hover:bg-blue-900/60 text-sm px-4 py-1.5">
            🏆 #1 Rated Credit Repair Service
          </Badge>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight mb-6">
            Repair Your Credit.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              Rebuild Your Future.
            </span>
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
            Professional credit repair, authorized user tradelines, and credit builder accounts — all under one roof. We fight the bureaus so you don't have to.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-base px-8 py-6 rounded-xl shadow-lg shadow-blue-900/40" data-testid="button-start-consultation">
                Start Your Free Consultation <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <a href="#how">
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/5 font-semibold text-base px-8 py-6 rounded-xl">
                See How It Works
              </Button>
            </a>
          </div>
          <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-white/50">
            {["No upfront fees", "CROA compliant", "30–45 day results", "Cancel anytime"].map((t, i) => (
              <span key={i} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="border-y border-white/5 bg-white/[0.02] py-12 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "2,400+", label: "Clients Served" },
            { value: "98,000+", label: "Negative Items Removed" },
            { value: "120 pts", label: "Avg Score Increase" },
            { value: "30 Days", label: "First Results" },
          ].map((s, i) => (
            <div key={i}>
              <p className="text-3xl md:text-4xl font-extrabold text-blue-400">{s.value}</p>
              <p className="text-sm text-white/50 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section id="services" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-900/40 text-blue-300 border-blue-800/50">Our Services</Badge>
            <h2 className="text-4xl font-extrabold mb-4">Everything You Need to Fix Your Credit</h2>
            <p className="text-white/50 max-w-xl mx-auto">A full-stack credit repair solution — from disputing negatives to building new positive accounts.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: FileText,
                color: "text-blue-400",
                bg: "bg-blue-900/30",
                border: "border-blue-800/40",
                title: "Bureau Disputes",
                desc: "We file professionally crafted dispute letters with Equifax, Experian, and TransUnion via e-OSCAR. Bankruptcies, collections, late payments, charge-offs — all challenged.",
                items: ["All 3 bureaus + ChexSystems", "Metro 2 compliant letters", "e-OSCAR submissions", "FCRA § 611 investigations"],
              },
              {
                icon: CreditCard,
                color: "text-indigo-400",
                bg: "bg-indigo-900/30",
                border: "border-indigo-800/40",
                title: "Authorized User Tradelines",
                desc: "Get added to aged, high-limit credit cards as an authorized user. Your credit file inherits the full history — this alone can jump scores 50–150 points.",
                items: ["$10k–$50k credit limits", "8–25 year account history", "Reports to all 3 bureaus", "30–45 day reporting cycle"],
              },
              {
                icon: Wallet,
                color: "text-emerald-400",
                bg: "bg-emerald-900/30",
                border: "border-emerald-800/40",
                title: "Credit Builder Accounts",
                desc: "Enroll in credit builder loans and revolving lines that report monthly — adding positive payment history, improving credit mix, and lowering utilization.",
                items: ["Credit builder loans (Self-style)", "Revolving store lines (Kikoff-style)", "$500–$10,000 reported limits", "Reports all 3 bureaus monthly"],
              },
            ].map((s, i) => (
              <div key={i} className={`rounded-2xl border ${s.border} bg-white/[0.03] p-7 flex flex-col gap-4 hover:bg-white/[0.06] transition-colors`}>
                <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-6 h-6 ${s.color}`} />
                </div>
                <h3 className="text-xl font-bold">{s.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{s.desc}</p>
                <ul className="space-y-2 mt-2">
                  {s.items.map((item, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-white/70">
                      <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${s.color}`} /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="py-24 px-6 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-900/40 text-blue-300 border-blue-800/50">The Process</Badge>
            <h2 className="text-4xl font-extrabold mb-4">How It Works</h2>
            <p className="text-white/50 max-w-xl mx-auto">Simple, fast, and completely handled for you.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "01", icon: Users, title: "Free Consultation", desc: "We pull and review all 3 credit reports to identify every negative item and opportunity." },
              { step: "02", icon: FileText, title: "We File Disputes", desc: "Our team submits FCRA/e-OSCAR disputes for every qualifying negative item." },
              { step: "03", icon: CreditCard, title: "We Add Positives", desc: "We place tradelines and enroll you in credit builder accounts to boost your score." },
              { step: "04", icon: BarChart3, title: "Scores Improve", desc: "Within 30–90 days, deletions post and scores climb. We track every point gained." },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-900/40 border border-blue-800/40 flex items-center justify-center mx-auto mb-4">
                  <s.icon className="w-6 h-6 text-blue-400" />
                </div>
                <p className="text-blue-500 text-xs font-bold mb-2">STEP {s.step}</p>
                <h3 className="font-bold mb-2">{s.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-900/40 text-blue-300 border-blue-800/50">Simple Pricing</Badge>
            <h2 className="text-4xl font-extrabold mb-4">Invest in Your Score</h2>
            <p className="text-white/50 max-w-xl mx-auto">Transparent pricing, no hidden fees. Cancel anytime.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Starter",
                price: "$99",
                period: "/mo",
                desc: "Perfect for a few negative items",
                features: ["3-bureau dispute filing", "Up to 10 items/month", "Monthly progress reports", "Client portal access"],
                cta: "Get Started",
                highlight: false,
              },
              {
                name: "Pro",
                price: "$199",
                period: "/mo",
                desc: "Best for severe credit damage",
                features: ["Unlimited dispute filing", "1 tradeline included", "Credit builder enrollment", "Priority case management", "Score monitoring"],
                cta: "Most Popular",
                highlight: true,
              },
              {
                name: "Elite",
                price: "$399",
                period: "/mo",
                desc: "Maximum results, fastest speed",
                features: ["Everything in Pro", "3 premium tradelines", "Magnum builder account", "Dedicated specialist", "Weekly reporting", "Goal-score guarantee"],
                cta: "Get Elite",
                highlight: false,
              },
            ].map((p, i) => (
              <div key={i} className={`rounded-2xl border p-8 flex flex-col gap-5 ${p.highlight ? "border-blue-500 bg-blue-900/20 shadow-lg shadow-blue-900/30" : "border-white/10 bg-white/[0.03]"}`}>
                {p.highlight && <Badge className="w-fit bg-blue-600 text-white text-xs">Most Popular</Badge>}
                <div>
                  <h3 className="text-xl font-bold mb-1">{p.name}</h3>
                  <p className="text-white/50 text-sm">{p.desc}</p>
                </div>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-extrabold">{p.price}</span>
                  <span className="text-white/50 mb-1">{p.period}</span>
                </div>
                <ul className="space-y-2.5 flex-1">
                  {p.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-white/70">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <a href="#contact">
                  <Button className={`w-full font-semibold mt-2 ${p.highlight ? "bg-blue-600 hover:bg-blue-700 text-white" : "border border-white/20 bg-transparent hover:bg-white/5 text-white"}`}>
                    {p.cta} <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 px-6 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-900/40 text-blue-300 border-blue-800/50">Results</Badge>
            <h2 className="text-4xl font-extrabold mb-4">Real People. Real Results.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Marcus T.", score: "+148 pts", time: "63 days", quote: "I went from a 512 to a 660 in just two months. Got approved for my first car loan right after. These people are the real deal." },
              { name: "Latrice B.", score: "+112 pts", time: "45 days", quote: "Had 3 collections and 2 late payments deleted. The tradeline alone bumped me 60 points. The process was smooth and they kept me informed the whole time." },
              { name: "David R.", score: "+89 pts", time: "30 days", quote: "Started at 580 and needed to qualify for a mortgage. Now I'm at 720 and closing on my house next month. Couldn't have done it without CreditRepair Pro." },
            ].map((t, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-7">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}
                </div>
                <p className="text-white/70 text-sm leading-relaxed mb-5">"{t.quote}"</p>
                <div className="flex justify-between items-center border-t border-white/10 pt-4">
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-white/40 text-xs">{t.time}</p>
                  </div>
                  <Badge className="bg-emerald-900/40 text-emerald-400 border-emerald-800/40">{t.score}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT / CTA ── */}
      <section id="contact" className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-3xl border border-blue-800/30 bg-gradient-to-br from-blue-950/60 to-indigo-950/40 p-12 text-center">
            <Badge className="mb-6 bg-blue-800/60 text-blue-300 border-blue-700/40">Free Consultation</Badge>
            <h2 className="text-4xl font-extrabold mb-4">Ready to Fix Your Credit?</h2>
            <p className="text-white/60 text-lg mb-10 max-w-xl mx-auto">Get a free credit analysis and strategy session. No obligation. No upfront payment.</p>
            {bookSubmitted ? (
              <div className="mb-10 py-8 px-6 rounded-2xl bg-emerald-900/30 border border-emerald-700/40">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">You're Booked!</h3>
                <p className="text-white/60">We'll call you at <span className="text-white font-semibold">{bookPhone}</span> within 24 hours to start your free credit analysis.</p>
                <p className="text-white/40 text-sm mt-2">Check your phone for a confirmation text from (888) 976-7280</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4 items-center mb-10">
                <div className="flex flex-col md:flex-row gap-4 justify-center w-full max-w-2xl">
                  <input
                    type="text"
                    placeholder="Your Name"
                    value={bookName}
                    onChange={(e) => setBookName(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:border-blue-500"
                    data-testid="input-book-name"
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={bookPhone}
                    onChange={(e) => setBookPhone(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:border-blue-500"
                    data-testid="input-book-phone"
                  />
                </div>
                <input
                  type="email"
                  placeholder="Email (optional)"
                  value={bookEmail}
                  onChange={(e) => setBookEmail(e.target.value)}
                  className="w-full max-w-2xl px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:border-blue-500"
                  data-testid="input-book-email"
                />
                <Button
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-10 py-6 text-base disabled:opacity-50"
                  onClick={handleBookCall}
                  disabled={!bookName || !bookPhone || bookLoading}
                  data-testid="button-book-call"
                >
                  {bookLoading ? <><Loader2 className="mr-2 w-5 h-5 animate-spin" /> Booking...</> : <>Book Free Call <ArrowRight className="ml-2 w-4 h-4" /></>}
                </Button>
                <p className="text-white/30 text-xs">No credit card required. We'll reach out within 24 hours.</p>
              </div>
            )}
            <div className="grid md:grid-cols-3 gap-6 text-sm">
              {[
                { icon: Phone, label: "Call Us", value: "(888) 976-7280", href: "tel:+18889767280" },
                { icon: Mail, label: "Email Us", value: "support@infinitearcadia.com", href: "mailto:support@infinitearcadia.com" },
                { icon: MapPin, label: "Location", value: "Nationwide (Remote)", href: null },
              ].map((c, i) => (
                <div key={i} className="flex items-center gap-3 justify-center text-white/60">
                  <c.icon className="w-4 h-4 text-blue-400" />
                  <span className="text-white/40">{c.label}:</span>
                  {c.href ? (
                    <a href={c.href} className="hover:text-white transition-colors underline" data-testid={`link-contact-${c.label.toLowerCase().replace(/\s/g, "-")}`}>{c.value}</a>
                  ) : (
                    <span>{c.value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-white/30">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-500" />
            <span className="font-bold text-white/60">CreditRepair Pro LLC</span>
          </div>
          <p className="text-center max-w-xl text-xs leading-relaxed">
            Results vary. Individual outcomes depend on credit history, bureau response, and market conditions. We are a credit repair organization as defined under the Credit Repair Organizations Act (CROA). You have the right to dispute inaccurate information directly with the bureaus at no charge.
          </p>
          <div className="flex items-center gap-4 text-white/40">
            <Lock className="w-3 h-3" />
            <span>Privacy Policy</span>
            <span>·</span>
            <span>Terms</span>
            <span>·</span>
            <Link href="/login" className="text-blue-500 hover:text-blue-400">Staff Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
