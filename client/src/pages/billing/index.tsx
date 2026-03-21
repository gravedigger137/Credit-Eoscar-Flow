import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Download, Plus, Filter, Search, TrendingUp, DollarSign, ArrowUpRight, CheckCircle2, AlertTriangle, Wallet } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const TRANSACTIONS = [
  {
    id: "TXN-9829",
    client: "Sarah Jenkins",
    type: "Tradeline Placement",
    product: "Chase Sapphire Reserve",
    amount: "$850.00",
    date: "Oct 24, 2023",
    status: "Completed",
    stripeId: "ch_3N1x..."
  },
  {
    id: "TXN-9828",
    client: "Thomas Wright",
    type: "Revolving Credit Setup",
    product: "Primary Secured Line",
    amount: "$150.00",
    date: "Oct 22, 2023",
    status: "Completed",
    stripeId: "ch_3N2y..."
  },
  {
    id: "TXN-9827",
    client: "Amanda Smith",
    type: "Credit Repair Retainer",
    product: "Monthly Service (Oct)",
    amount: "$99.00",
    date: "Oct 20, 2023",
    status: "Failed",
    stripeId: "ch_3N3z..."
  },
  {
    id: "TXN-9826",
    client: "Michael Chang",
    type: "Tradeline Placement",
    product: "Amex Platinum",
    amount: "$1,200.00",
    date: "Oct 15, 2023",
    status: "Completed",
    stripeId: "ch_3N4a..."
  }
];

export default function Billing() {
  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Billing & Revenue</h1>
            <p className="text-muted-foreground mt-1">
              Manage Stripe payments, client invoices, and tradeline revenue.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-400 dark:hover:bg-indigo-950/50">
              <Wallet className="w-4 h-4 mr-2" />
              Stripe Dashboard
            </Button>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Create Payment Link
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="glass-panel border-l-4 border-l-success">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-success" />
                Stripe Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$12,450.00</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                Next payout: Oct 26
              </p>
            </CardContent>
          </Card>
          
          <Card className="glass-panel border-l-4 border-l-indigo-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-500" />
                Tradeline Sales (MTD)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$42,500</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                 <TrendingUp className="w-3 h-3 text-success" />
                <span className="text-success">+15%</span> vs last month
              </p>
            </CardContent>
          </Card>

          <Card className="glass-panel border-l-4 border-l-emerald-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Active Subs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">112</div>
              <p className="text-xs text-muted-foreground mt-1">MRR: $11,088</p>
            </CardContent>
          </Card>

          <Card className="glass-panel border-l-4 border-l-destructive">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                Failed Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4</div>
              <p className="text-xs text-muted-foreground mt-1 text-destructive">Requires action</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="transactions" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
            <TabsTrigger value="transactions">Stripe Charges</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="payouts">Vendor Payouts</TabsTrigger>
            <TabsTrigger value="settings">Stripe Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="transactions" className="mt-6">
            <Card className="glass-panel">
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle>Recent Transactions</CardTitle>
                    <CardDescription>Live payments synced from Stripe.</CardDescription>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search client or ID..." className="pl-8 bg-background" />
                    </div>
                    <Button variant="outline" size="icon">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border bg-background/50">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Stripe ID / Date</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {TRANSACTIONS.map((txn) => (
                        <TableRow key={txn.id}>
                          <TableCell>
                             <div className="flex flex-col">
                              <span className="font-medium text-xs font-mono">{txn.stripeId}</span>
                              <span className="text-xs text-muted-foreground">{txn.date}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{txn.client}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{txn.type}</span>
                              <span className="text-xs text-muted-foreground">{txn.product}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-bold">{txn.amount}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={txn.status === 'Completed' ? 'default' : 'destructive'}
                              className={txn.status === 'Completed' ? 'bg-success hover:bg-success/90' : ''}
                            >
                              {txn.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="h-8">
                              Refund/Details <ArrowUpRight className="ml-2 h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions" className="mt-6">
             <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Stripe Billing Subscriptions</CardTitle>
                <CardDescription>Manage active monthly retainers and automated billing cycles.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { plan: "Premium Credit Repair", amount: "$99.00/mo", clients: 84, status: "Active" },
                    { plan: "Tradeline Maintenance", amount: "$45.00/mo", clients: 28, status: "Active" },
                  ].map((sub, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg bg-background/50">
                      <div>
                        <p className="font-bold">{sub.plan}</p>
                        <p className="text-sm text-muted-foreground">{sub.amount}</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-lg">{sub.clients}</p>
                        <p className="text-xs text-muted-foreground">Subscribers</p>
                      </div>
                      <Button variant="outline" size="sm">Manage Plan</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
           <TabsContent value="settings" className="mt-6">
             <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-500" />
                  Stripe API Configuration
                </CardTitle>
                <CardDescription>Configure webhook endpoints and API keys for payment processing.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="grid gap-2">
                  <Label>Publishable Key</Label>
                  <Input type="text" placeholder="pk_test_..." defaultValue="pk_test_51Nx8..." />
                </div>
                <div className="grid gap-2">
                  <Label>Secret Key</Label>
                  <Input type="password" placeholder="sk_test_..." defaultValue="sk_test_51Nx8..." />
                </div>
                <div className="grid gap-2">
                  <Label>Webhook Secret</Label>
                  <Input type="password" placeholder="whsec_..." defaultValue="whsec_89asd..." />
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/50 px-6 py-4">
                <Button className="bg-primary text-primary-foreground">Save Configuration</Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Shell>
  );
}