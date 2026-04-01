import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, Loader2, AlertCircle, Lock, Eye, EyeOff, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
    </svg>
  );
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#0A66C2">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <defs><radialGradient id="ig" cx="30%" cy="107%"><stop offset="0%" stopColor="#fdf497"/><stop offset="5%" stopColor="#fdf497"/><stop offset="45%" stopColor="#fd5949"/><stop offset="60%" stopColor="#d6249f"/><stop offset="90%" stopColor="#285AEB"/></radialGradient></defs>
      <path fill="url(#ig)" d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 1 0 0-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 1 1-2.882 0 1.441 1.441 0 0 1 2.882 0z"/>
    </svg>
  );
}

function SnapchatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#FFFC00">
      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24 18.635 24 24 18.633 24 12.013 24 5.393 18.635 0 12.017 0z"/>
    </svg>
  );
}

export default function LoginPage() {
  const { login, register, user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [isFirstUser, setIsFirstUser] = useState(false);
  const [checkingUsers, setCheckingUsers] = useState(true);

  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [regForm, setRegForm] = useState({ username: "", password: "", confirmPassword: "", fullName: "", email: "" });

  const { data: providers } = useQuery<any>({
    queryKey: ["/api/auth/providers"],
    retry: false,
    staleTime: 60000,
    refetchInterval: false,
  });

  useEffect(() => {
    if (user) setLocation("/dashboard");
  }, [user, setLocation]);

  useEffect(() => {
    fetch("/api/auth/has-users")
      .then(r => r.json())
      .then(data => {
        setIsFirstUser(!data.hasUsers);
        setCheckingUsers(false);
      })
      .catch(() => setCheckingUsers(false));
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(loginForm.username, loginForm.password);
      setLocation("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (regForm.password !== regForm.confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    if (regForm.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await register({ username: regForm.username, password: regForm.password, fullName: regForm.fullName, email: regForm.email });
      toast({ title: "Account created! You're now logged in." });
      setLocation("/dashboard");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  if (checkingUsers) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  const socialProviders = [
    { key: "google", name: "Google", icon: GoogleIcon, color: "hover:bg-white/10", url: "/api/auth/google" },
    { key: "facebook", name: "Facebook", icon: FacebookIcon, color: "hover:bg-[#1877F2]/20", url: "/api/auth/facebook" },
    { key: "github", name: "GitHub", icon: GitHubIcon, color: "hover:bg-white/10", url: "/api/auth/github" },
    { key: "twitter", name: "X (Twitter)", icon: TwitterIcon, color: "hover:bg-white/10", url: "/api/auth/twitter" },
    { key: "linkedin", name: "LinkedIn", icon: LinkedInIcon, color: "hover:bg-[#0A66C2]/20", url: "/api/auth/linkedin" },
    { key: "apple", name: "Apple", icon: AppleIcon, color: "hover:bg-white/10", url: "/api/auth/apple" },
    { key: "instagram", name: "Instagram", icon: InstagramIcon, color: "hover:bg-pink-500/20", url: "#" },
    { key: "tiktok", name: "TikTok", icon: TikTokIcon, color: "hover:bg-white/10", url: "#" },
    { key: "snapchat", name: "Snapchat", icon: SnapchatIcon, color: "hover:bg-yellow-500/20", url: "#" },
  ];

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/30 via-transparent to-indigo-950/20 pointer-events-none" />
      <div className="absolute top-20 right-1/3 w-96 h-96 bg-blue-600/8 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <ShieldCheck className="w-8 h-8 text-blue-400" />
            <span className="text-2xl font-bold text-white">CreditRepair <span className="text-blue-400">Pro</span></span>
          </div>
          <p className="text-white/40 text-sm">
            {isFirstUser ? "Create your administrator account to get started" : "Staff Portal — Secure Access"}
          </p>
        </div>

        <Card className="bg-white/[0.04] border-white/10 backdrop-blur-xl shadow-2xl shadow-blue-950/30">
          {isFirstUser ? (
            <form onSubmit={handleRegister}>
              {error && (
                <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-sm text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}
              <CardContent className="space-y-4 pt-6">
                <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-4 py-3 text-sm text-blue-300">
                  <UserPlus className="w-4 h-4 inline mr-2" />
                  First-time setup — this account will be the administrator.
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Full Name</Label>
                  <Input value={regForm.fullName} onChange={e => setRegForm(f => ({ ...f, fullName: e.target.value }))} placeholder="John Doe" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" data-testid="input-setup-fullname" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Email</Label>
                  <Input type="email" value={regForm.email} onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))} placeholder="you@business.com" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" data-testid="input-setup-email" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Username *</Label>
                  <Input data-testid="input-register-username" value={regForm.username} onChange={e => setRegForm(f => ({ ...f, username: e.target.value }))} placeholder="admin" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" autoComplete="username" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Password *</Label>
                  <Input data-testid="input-register-password" type="password" value={regForm.password} onChange={e => setRegForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 8 characters" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" autoComplete="new-password" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Confirm Password *</Label>
                  <Input type="password" value={regForm.confirmPassword} onChange={e => setRegForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="Confirm password" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" autoComplete="new-password" />
                </div>
              </CardContent>
              <CardFooter className="pb-6">
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-5"
                  disabled={loading || !regForm.username || !regForm.password}
                  data-testid="button-register"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  {loading ? "Setting Up..." : "Create Admin Account"}
                </Button>
              </CardFooter>
            </form>
          ) : (
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="w-full grid grid-cols-2 bg-white/[0.04] border-b border-white/10 rounded-none rounded-t-lg">
                <TabsTrigger value="login" className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/[0.06]">Sign In</TabsTrigger>
                <TabsTrigger value="register" className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/[0.06]">Create Account</TabsTrigger>
              </TabsList>
              {error && (
                <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-sm text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}
              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin}>
                  <CardContent className="space-y-4 pt-6">
                    <div className="space-y-2">
                      <Label className="text-white/70">Username</Label>
                      <Input
                        data-testid="input-login-username"
                        value={loginForm.username}
                        onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))}
                        placeholder="Username"
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                        autoComplete="username"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/70">Password</Label>
                      <div className="relative">
                        <Input
                          data-testid="input-login-password"
                          type={showPw ? "text" : "password"}
                          value={loginForm.password}
                          onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                          placeholder="Password"
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pr-10"
                          autoComplete="current-password"
                        />
                        <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                          {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pb-6">
                    <Button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-5"
                      disabled={loading || !loginForm.username || !loginForm.password}
                      data-testid="button-login"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                      {loading ? "Signing in..." : "Sign In"}
                    </Button>
                  </CardFooter>
                </form>
              </TabsContent>
              <TabsContent value="register" className="mt-0">
                <form onSubmit={handleRegister}>
                  <CardContent className="space-y-4 pt-6">
                    <div className="space-y-2">
                      <Label className="text-white/70">Full Name</Label>
                      <Input value={regForm.fullName} onChange={e => setRegForm(f => ({ ...f, fullName: e.target.value }))} placeholder="John Doe" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" data-testid="input-reg-fullname" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/70">Email</Label>
                      <Input type="email" value={regForm.email} onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))} placeholder="you@example.com" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" data-testid="input-reg-email" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/70">Username *</Label>
                      <Input data-testid="input-register-username" value={regForm.username} onChange={e => setRegForm(f => ({ ...f, username: e.target.value }))} placeholder="Choose a username" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" autoComplete="username" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/70">Password *</Label>
                      <Input data-testid="input-register-password" type="password" value={regForm.password} onChange={e => setRegForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 8 characters" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" autoComplete="new-password" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/70">Confirm Password *</Label>
                      <Input type="password" value={regForm.confirmPassword} onChange={e => setRegForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="Confirm password" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" autoComplete="new-password" />
                    </div>
                  </CardContent>
                  <CardFooter className="pb-6">
                    <Button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-5"
                      disabled={loading || !regForm.username || !regForm.password}
                      data-testid="button-register"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                      {loading ? "Creating Account..." : "Create Account"}
                    </Button>
                  </CardFooter>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </Card>

        {providers && socialProviders.some(sp => (providers as any)[sp.key]) && (
          <div className="mt-6">
            <div className="relative mb-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-[#030712] text-white/40">or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {socialProviders.filter(sp => (providers as any)[sp.key]).map((sp) => (
                <a
                  key={sp.key}
                  href={sp.url}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] ${sp.color} transition-all duration-200 group`}
                  data-testid={`button-social-${sp.key}`}
                >
                  <sp.icon className="w-5 h-5" />
                  <span className="text-xs text-white/60 group-hover:text-white/90 hidden sm:inline">{sp.name}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-white/20 text-xs mt-6">
          256-bit encrypted · CROA compliant · SOC2 infrastructure
        </p>
      </div>
    </div>
  );
}
