import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Download, Plus, Filter, Search, TrendingUp, DollarSign, ArrowUpRight } from "lucide-react";
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
  },
  {
    id: "TXN-9828",
    client: "Thomas Wright",
    type: "Revolving Credit Setup",
    product: "Primary Secured Line",
    amount: "$150.00",
    date: "Oct 22, 2023",
    status: "Completed",
  },
  {
    id: "TXN-9827",
    client: "Amanda Smith",
    type: "Credit Repair Retainer",
    product: "Monthly Service (Oct)",
    amount: "$99.00",
    date: "Oct 20, 2023",
    status: "Pending",
  },
  {
    id: "TXN-9826",
    client: "Michael Chang",
    type: "Tradeline Placement",
    product: "Amex Platinum",
    amount: "$1,200.00",
    date: "Oct 15, 2023",
    status: "Completed",
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
              Manage client invoices, subscription plans, and tradeline revenue.
            </p>
          </div>
          <div className="flex gap-2">
             <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="glass-panel border-l-4 border-l-success">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-success" />
                Total Revenue (YTD)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$184,250</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-success" />
                <span className="text-success">+24%</span> vs last year
              </p>
            </CardContent>
          </Card>
          
          <Card className="glass-panel border-l-4 border-l-indigo-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-500" />
                Tradeline Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$42,500</div>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </CardContent>
          </Card>

          <Card className="glass-panel border-l-4 border-l-emerald-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                Revolving Lines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$8,450</div>
              <p className="text-xs text-muted-foreground mt-1">Setup fees this month</p>
            </CardContent>
          </Card>

          <Card className="glass-panel border-l-4 border-l-warning">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-warning" />
                Pending Receivables
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$4,200</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting client payment</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="transactions" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="payouts">Vendor Payouts</TabsTrigger>
          </TabsList>
          
          <TabsContent value="transactions" className="mt-6">
            <Card className="glass-panel">
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle>Recent Transactions</CardTitle>
                    <CardDescription>All incoming payments from clients.</CardDescription>
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
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Date</TableHead>
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
                          <TableCell className="font-medium text-xs text-muted-foreground">{txn.id}</TableCell>
                          <TableCell>{txn.date}</TableCell>
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
                              variant={txn.status === 'Completed' ? 'default' : 'secondary'}
                              className={txn.status === 'Completed' ? 'bg-success hover:bg-success/90' : 'bg-warning text-warning-foreground'}
                            >
                              {txn.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="h-8">
                              Receipt <ArrowUpRight className="ml-2 h-4 w-4" />
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
                <CardTitle>Active Subscriptions</CardTitle>
                <CardDescription>Monthly credit repair service retainers.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-10 text-muted-foreground">
                  <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>Subscription management interface loads here.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
           <TabsContent value="payouts" className="mt-6">
             <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Cardholder Payouts</CardTitle>
                <CardDescription>Manage payments to authorized user cardholders.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-10 text-muted-foreground">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>Payout management interface loads here.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Shell>
  );
}