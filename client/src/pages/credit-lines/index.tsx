import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Wallet, Filter, ArrowUpRight, CheckCircle2, UserPlus, FileCheck } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

const CREDIT_LINES = [
  {
    id: "CL-8821",
    client: "Jessica Alba",
    product: "Primary Secured Line",
    provider: "BuildCredit Bank",
    amount: "$1,500",
    status: "Approved",
    progress: 100,
    date: "Oct 12, 2023",
  },
  {
    id: "CL-8822",
    client: "Thomas Wright",
    product: "Revolving Builder Account",
    provider: "CreditStrong",
    amount: "$2,500",
    status: "Awaiting Signatures",
    progress: 60,
    date: "Oct 15, 2023",
  },
  {
    id: "CL-8823",
    client: "Amanda Smith",
    product: "Primary Installment Loan",
    provider: "Self Lender",
    amount: "$1,000",
    status: "Reviewing Application",
    progress: 30,
    date: "Oct 18, 2023",
  },
];

export default function CreditLines() {
  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Revolving Credit Lines</h1>
            <p className="text-muted-foreground mt-1">
              Manage primary credit building accounts and revolving credit applications.
            </p>
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Application
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="glass-panel border-t-4 border-t-emerald-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-500" />
                Active Accounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">342</div>
              <p className="text-xs text-muted-foreground mt-1">Clients building credit</p>
            </CardContent>
          </Card>
          
          <Card className="glass-panel border-t-4 border-t-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-blue-500" />
                In Underwriting
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">45</div>
              <p className="text-xs text-muted-foreground mt-1">Applications processing</p>
            </CardContent>
          </Card>

          <Card className="glass-panel border-t-4 border-t-purple-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-purple-500" />
                Eligible Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">89</div>
              <p className="text-xs text-muted-foreground mt-1">Ready for primary lines</p>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-panel">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Credit Line Applications</CardTitle>
                <CardDescription>Track client progress through application and approval.</CardDescription>
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
                    <TableHead>App ID</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {CREDIT_LINES.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-medium text-xs">{app.id}</TableCell>
                      <TableCell>{app.client}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{app.product}</span>
                          <span className="text-xs text-muted-foreground">{app.provider} - {app.amount}</span>
                        </div>
                      </TableCell>
                      <TableCell className="w-[200px]">
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={app.progress} 
                            className="h-2" 
                            indicatorClassName={app.progress === 100 ? "bg-emerald-500" : "bg-blue-500"}
                          />
                          <span className="text-xs text-muted-foreground w-8">{app.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={
                            app.status === 'Approved' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 
                            app.status === 'Awaiting Signatures' ? 'border-warning text-warning-foreground' : 'border-blue-500 text-blue-600 dark:text-blue-400'
                          }
                        >
                          {app.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-8">
                          Manage <ArrowUpRight className="ml-2 h-4 w-4" />
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