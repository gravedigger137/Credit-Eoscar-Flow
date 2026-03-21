import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Filter, FileText, UserCheck, Phone, Mail, AlertTriangle, ShieldAlert } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

const CLIENTS = [
  {
    id: "CLT-001",
    name: "Sarah Jenkins",
    email: "sarah.j@example.com",
    phone: "(555) 123-4567",
    status: "Active",
    onboardingProgress: 100,
    disputesActive: 4,
    scoreChange: "+45",
  },
  {
    id: "CLT-002",
    name: "Michael Chang",
    email: "m.chang@example.com",
    phone: "(555) 987-6543",
    status: "Onboarding",
    onboardingProgress: 60,
    disputesActive: 0,
    scoreChange: "0",
  },
  {
    id: "CLT-003",
    name: "Amanda Smith",
    email: "asmith@example.com",
    phone: "(555) 456-7890",
    status: "Action Needed",
    onboardingProgress: 80,
    disputesActive: 2,
    scoreChange: "+12",
  },
];

export default function Clients() {
  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Client Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage client files, onboarding, and document collection.
            </p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            Add New Client
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="glass-panel border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-primary" />
                Active Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">142</div>
            </CardContent>
          </Card>
          
          <Card className="glass-panel border-l-4 border-l-warning">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                Missing Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">18</div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-l-4 border-l-destructive">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-destructive" />
                ID Verification Failed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">5</div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-l-4 border-l-success">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-success" />
                Ready for Disputes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">45</div>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-panel">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Client Roster</CardTitle>
                <CardDescription>All clients and their current credit repair progress.</CardDescription>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search clients..." className="pl-8 bg-background" />
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
                    <TableHead>Client</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Onboarding</TableHead>
                    <TableHead>Active Disputes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {CLIENTS.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{client.name}</span>
                          <span className="text-xs text-muted-foreground">{client.id}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3"/> {client.email}</span>
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3"/> {client.phone}</span>
                        </div>
                      </TableCell>
                      <TableCell className="w-[200px]">
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={client.onboardingProgress} 
                            className="h-2" 
                            indicatorClassName={client.onboardingProgress === 100 ? "bg-success" : "bg-primary"}
                          />
                          <span className="text-xs text-muted-foreground w-8">{client.onboardingProgress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{client.disputesActive}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={
                            client.status === 'Active' ? 'border-success text-success' : 
                            client.status === 'Action Needed' ? 'border-destructive text-destructive' : 'border-warning text-warning-foreground'
                          }
                        >
                          {client.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          Manage File
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