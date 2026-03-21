import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Filter, AlertCircle, FileText, Send, Building2, Calendar } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DISPUTES = [
  {
    id: "DSP-8992",
    client: "Sarah Jenkins",
    bureau: "Equifax",
    bureauAddress: "P.O. Box 740256, Atlanta, GA 30374",
    phone: "1-800-685-1111",
    account: "Bank of America - XXXX1234",
    reason: "Not my account",
    status: "Sent to e-OSCAR",
    sentDate: "Oct 12, 2023",
    dueDate: "Nov 11, 2023",
  },
  {
    id: "DSP-8993",
    client: "Sarah Jenkins",
    bureau: "Experian",
    bureauAddress: "P.O. Box 4500, Allen, TX 75013",
    phone: "1-888-397-3742",
    account: "Capital One - XXXX5678",
    reason: "Late payment incorrect",
    status: "Validation Received",
    sentDate: "Oct 05, 2023",
    dueDate: "Nov 04, 2023",
  },
  {
    id: "DSP-8994",
    client: "Michael Chang",
    bureau: "TransUnion",
    bureauAddress: "P.O. Box 2000, Chester, PA 19016",
    phone: "1-800-916-8800",
    account: "Midland Credit - XXXX9012",
    reason: "Account closed/paid",
    status: "Deleted",
    sentDate: "Sep 20, 2023",
    dueDate: "Oct 20, 2023",
  },
  {
    id: "DSP-8995",
    client: "Amanda Smith",
    bureau: "Equifax",
    bureauAddress: "P.O. Box 740256, Atlanta, GA 30374",
    phone: "1-800-685-1111",
    account: "Verizon - XXXX3456",
    reason: "Incorrect balance",
    status: "Preparing",
    sentDate: "-",
    dueDate: "-",
  }
];

export default function Disputes() {
  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">e-OSCAR Disputes</h1>
            <p className="text-muted-foreground mt-1">
              Manage dispute letters, e-OSCAR API submissions, and bureau responses.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Send className="w-4 h-4 mr-2" />
              Batch Send to e-OSCAR
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Dispute
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
           <Card className="glass-panel border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                Active Disputes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">186</div>
              <p className="text-xs text-muted-foreground mt-1">Across all bureaus</p>
            </CardContent>
          </Card>
          
          <Card className="glass-panel border-l-4 border-l-warning">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-warning" />
                Approaching 30 Days
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-muted-foreground mt-1">Require immediate follow-up</p>
            </CardContent>
          </Card>

          <Card className="glass-panel border-l-4 border-l-success">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4 text-success" />
                Recent Deletions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">45</div>
              <p className="text-xs text-muted-foreground mt-1">Successfully removed this month</p>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-panel">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <Tabs defaultValue="all" className="w-[400px]">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="equifax">Equifax</TabsTrigger>
                  <TabsTrigger value="experian">Experian</TabsTrigger>
                  <TabsTrigger value="transunion">TransUnion</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search ID or client..." className="pl-8 bg-background" />
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
                    <TableHead>Dispute Info</TableHead>
                    <TableHead>Bureau & Contact</TableHead>
                    <TableHead>Account Details</TableHead>
                    <TableHead>Timeline</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {DISPUTES.map((dispute) => (
                    <TableRow key={dispute.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{dispute.client}</span>
                          <span className="text-xs text-muted-foreground">{dispute.id}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <Badge variant="outline" className="w-fit mb-1">{dispute.bureau}</Badge>
                          <span className="text-[10px] text-muted-foreground max-w-[150px] truncate" title={dispute.bureauAddress}>{dispute.bureauAddress}</span>
                          <span className="text-[10px] text-muted-foreground">{dispute.phone}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                         <div className="flex flex-col">
                          <span className="font-medium text-sm">{dispute.account}</span>
                          <span className="text-xs text-muted-foreground">Reason: {dispute.reason}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> Sent: {dispute.sentDate}</span>
                          <span className="flex items-center gap-1 text-muted-foreground">Due: {dispute.dueDate}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            dispute.status === 'Deleted' ? 'default' : 
                            dispute.status === 'Sent to e-OSCAR' ? 'secondary' : 
                            dispute.status === 'Preparing' ? 'outline' : 'destructive'
                          }
                          className={
                            dispute.status === 'Deleted' ? 'bg-success hover:bg-success/90' : 
                            dispute.status === 'Sent to e-OSCAR' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' : ''
                          }
                        >
                          {dispute.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                         <div className="flex justify-end gap-2">
                           <Button variant="outline" size="sm" className="text-xs">
                            Update
                           </Button>
                         </div>
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