import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, CreditCard, Filter, ArrowUpRight, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const TRADELINES = [
  {
    id: "TRD-1029",
    client: "Sarah Jenkins",
    cardHolder: "Robert F.",
    institution: "Chase Sapphire Reserve",
    limit: "$35,000",
    history: "8 Years",
    status: "Active",
    reportingDate: "12th of month",
    price: "$850",
  },
  {
    id: "TRD-1030",
    client: "Michael Chang",
    cardHolder: "Emily W.",
    institution: "Amex Platinum",
    limit: "$50,000",
    history: "12 Years",
    status: "Pending Assignment",
    reportingDate: "5th of month",
    price: "$1,200",
  },
  {
    id: "TRD-1031",
    client: "David Roberts",
    cardHolder: "James M.",
    institution: "Discover It",
    limit: "$20,000",
    history: "5 Years",
    status: "Processing",
    reportingDate: "20th of month",
    price: "$600",
  },
];

export default function Tradelines() {
  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tradeline Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage authorized user tradelines and assignments for clients.
            </p>
          </div>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Tradeline Order
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="glass-panel border-t-4 border-t-indigo-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-500" />
                Active Placements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">124</div>
              <p className="text-xs text-muted-foreground mt-1">Currently reporting to bureaus</p>
            </CardContent>
          </Card>
          
          <Card className="glass-panel border-t-4 border-t-warning">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-warning" />
                Pending Assignments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">38</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting cardholder action</p>
            </CardContent>
          </Card>

          <Card className="glass-panel border-t-4 border-t-success">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                Monthly Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$42,500</div>
              <p className="text-xs text-muted-foreground mt-1">+15% from last month</p>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-panel">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Tradeline Orders</CardTitle>
                <CardDescription>Recent requests and active assignments.</CardDescription>
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
                    <TableHead>Order ID</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Institution</TableHead>
                    <TableHead>Limit/History</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TRADELINES.map((tradeline) => (
                    <TableRow key={tradeline.id}>
                      <TableCell className="font-medium text-xs">{tradeline.id}</TableCell>
                      <TableCell>{tradeline.client}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{tradeline.institution}</span>
                          <span className="text-xs text-muted-foreground">Reports {tradeline.reportingDate}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{tradeline.limit}</span>
                          <span className="text-xs text-muted-foreground">{tradeline.history}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            tradeline.status === 'Active' ? 'default' : 
                            tradeline.status === 'Pending Assignment' ? 'secondary' : 'outline'
                          }
                          className={
                            tradeline.status === 'Active' ? 'bg-success hover:bg-success/90' : 
                            tradeline.status === 'Pending Assignment' ? 'bg-warning text-warning-foreground hover:bg-warning/90' : ''
                          }
                        >
                          {tradeline.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-8">
                          View Details <ArrowUpRight className="ml-2 h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}