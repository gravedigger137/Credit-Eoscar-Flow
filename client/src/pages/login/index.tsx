import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, Loader2, AlertCircle, Lock, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const { login, register } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [regForm, setRegForm] = useState({ username: "", password: "", confirmPassword: "", fullName: "", email: "" });

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
          <p className="text-white/40 text-sm">Staff Portal — Secure Access</p>
        </div>

        <Card className="bg-white/[0.04] border-white/10 backdrop-blur-xl shadow-2xl shadow-blue-950/30">
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 bg-white/5 mx-0 rounded-b-none">
              <TabsTrigger value="login" className="text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">Sign In</TabsTrigger>
              <TabsTrigger value="register" className="text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">Register</TabsTrigger>
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
                      placeholder="admin"
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
                        placeholder="••••••••"
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
                    <Input value={regForm.fullName} onChange={e => setRegForm(f => ({ ...f, fullName: e.target.value }))} placeholder="John Doe" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">Email</Label>
                    <Input type="email" value={regForm.email} onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))} placeholder="you@business.com" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
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
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {loading ? "Creating Account..." : "Create Account & Sign In"}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        <p className="text-center text-white/20 text-xs mt-6">
          256-bit encrypted · CROA compliant · SOC2 infrastructure
        </p>
      </div>
    </div>
  );
}
