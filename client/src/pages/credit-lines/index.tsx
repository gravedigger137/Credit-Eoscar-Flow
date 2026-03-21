import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Filter, ArrowUpRight, TrendingUp, CheckCircle2, Lock, Smartphone, PieChart } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function CreditLines() {
  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Credit Building Products</h1>
            <p className="text-muted-foreground mt-1">
              Manage client enrollments in Self, Kikoff, and Credit Strong style credit builder accounts.
            </p>
          </div>
          <Button className="bg-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            New Enrollment
          </Button>
        </div>

        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="products">Our Products</TabsTrigger>
            <TabsTrigger value="active">Active Enrollments</TabsTrigger>
            <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="products" className="mt-6">
            <div className="grid gap-6 md:grid-cols-3">
              {/* Product 1: Installment Loan Builder (Self Clone) */}
              <Card className="glass-panel border-t-4 border-t-blue-500 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">POPULAR</div>
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-4">
                    <Lock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle>Credit Builder Loan</CardTitle>
                  <CardDescription>Installment account that forces savings while building credit.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Monthly Payment</span>
                      <span className="font-bold">$25 - $150</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Term Length</span>
                      <span className="font-bold">12 - 24 months</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Setup Fee</span>
                      <span className="font-bold">$9</span>
                    </div>
                  </div>
                  <div className="p-3 bg-muted rounded-md text-xs text-muted-foreground">
                    Client pays monthly. Money is locked in a CD. At the end of the term, they get their money back (minus fees) and a paid-off installment loan on their credit report.
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" variant="outline">View Details</Button>
                </CardFooter>
              </Card>

              {/* Product 2: Revolving Line (Kikoff Clone) */}
              <Card className="glass-panel border-t-4 border-t-emerald-500">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mb-4">
                    <Smartphone className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <CardTitle>Revolving Store Line</CardTitle>
                  <CardDescription>Instant $750 credit line with 0% utilization.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Credit Limit</span>
                      <span className="font-bold">$750</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Monthly Fee</span>
                      <span className="font-bold">$5/mo</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Setup Fee</span>
                      <span className="font-bold">$0</span>
                    </div>
                  </div>
                  <div className="p-3 bg-muted rounded-md text-xs text-muted-foreground">
                    Client gets a $750 store credit line that reports to bureaus. High limit and low usage instantly boosts their available credit and lowers utilization ratio.
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" variant="outline">View Details</Button>
                </CardFooter>
              </Card>

              {/* Product 3: High Limit Builder (Credit Strong Clone) */}
              <Card className="glass-panel border-t-4 border-t-purple-500">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center mb-4">
                    <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <CardTitle>Magnum Builder Line</CardTitle>
                  <CardDescription>High-limit installment accounts up to $10,000.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Reported Limit</span>
                      <span className="font-bold">$5k - $10k</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Monthly Payment</span>
                      <span className="font-bold">$55 - $110</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Setup Fee</span>
                      <span className="font-bold">$25</span>
                    </div>
                  </div>
                  <div className="p-3 bg-muted rounded-md text-xs text-muted-foreground">
                    Similar to the basic builder, but reports a massive installment amount to radically improve credit mix and high-credit markers.
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" variant="outline">View Details</Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="active" className="mt-6">
            <Card className="glass-panel">
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle>Active Client Enrollments</CardTitle>
                    <CardDescription>Track monthly payments and reporting status.</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative w-64">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search client..." className="pl-8 bg-background" />
                    </div>
                    <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: "Sarah Jenkins", product: "Credit Builder Loan ($25/mo)", progress: 45, status: "Active", nextPayment: "Nov 15" },
                    { name: "Michael Chang", product: "Revolving Store Line ($750)", progress: 100, status: "Active", nextPayment: "Auto-pay" },
                    { name: "David Roberts", product: "Magnum Builder ($5k)", progress: 10, status: "Missed Payment", nextPayment: "Overdue" },
                  ].map((enrollment, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg bg-background/50">
                      <div className="flex items-center gap-4 w-1/3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-sm">
                          {enrollment.name.split(' ').map(n=>n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-medium">{enrollment.name}</p>
                          <p className="text-xs text-muted-foreground">{enrollment.product}</p>
                        </div>
                      </div>
                      <div className="w-1/3 px-4">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Term Progress</span>
                          <span>{enrollment.progress}%</span>
                        </div>
                        <Progress value={enrollment.progress} className="h-2" indicatorClassName={enrollment.status === 'Missed Payment' ? 'bg-destructive' : 'bg-primary'} />
                      </div>
                      <div className="w-1/3 flex justify-end items-center gap-4">
                        <div className="text-right">
                          <Badge variant={enrollment.status === 'Active' ? 'outline' : 'destructive'} className={enrollment.status === 'Active' ? 'border-success text-success' : ''}>
                            {enrollment.status}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">Next: {enrollment.nextPayment}</p>
                        </div>
                        <Button variant="ghost" size="sm">Manage</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Shell>
  );
}