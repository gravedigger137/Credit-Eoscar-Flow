import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, FileCheck, Scale, AlertTriangle, ExternalLink, Phone, MapPin } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminBypassBanner } from "@/components/admin-bypass-banner";

const COMPLIANCE_CHECKS = [
  { name: "CROA Compliance Audit", status: "Passed", date: "Oct 01, 2023", nextDue: "Jan 01, 2024" },
  { name: "FCRA Letter Template Review", status: "Passed", date: "Sep 15, 2023", nextDue: "Dec 15, 2023" },
  { name: "e-OSCAR Metro 2 Format", status: "Action Required", date: "Aug 10, 2023", nextDue: "Now" },
  { name: "FDCPA Notice Requirements", status: "Passed", date: "Oct 10, 2023", nextDue: "Jan 10, 2024" },
];

export default function Compliance() {
  const { data: bureaus = [] } = useQuery<any[]>({ queryKey: ["/api/bureaus"] });

  return (
    <Shell>
      <div className="space-y-6">
        <AdminBypassBanner configKey="admin_bypass_compliance_checks" label="Compliance checks bypassed for admin operations" />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Compliance & Regulations</h1>
            <p className="text-muted-foreground mt-1">Ensure adherence to CROA, FCRA, FDCPA, and e-OSCAR guidelines.</p>
          </div>
          <Button variant="outline">
            <FileCheck className="w-4 h-4 mr-2" /> Generate Compliance Report
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="glass-panel border-l-4 border-l-success">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-success" />CROA Status</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-success">Compliant</div><p className="text-xs text-muted-foreground mt-1">All contracts meet federal requirements</p></CardContent>
          </Card>
          <Card className="glass-panel border-l-4 border-l-success">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Scale className="w-4 h-4 text-success" />FCRA Templates</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">Verified</div><p className="text-xs text-muted-foreground mt-1">Last legal review: Sep 15, 2023</p></CardContent>
          </Card>
          <Card className="glass-panel border-l-4 border-l-amber-500">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" />e-OSCAR Metro 2</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-amber-500">Update Needed</div><p className="text-xs text-muted-foreground mt-1">New schema requirements pending</p></CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Compliance Audit Log</CardTitle>
              <CardDescription>Tracking CROA, FCRA, and e-OSCAR regulatory requirements.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Audit Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Next Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {COMPLIANCE_CHECKS.map((audit, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{audit.name}</TableCell>
                      <TableCell>
                        <Badge variant={audit.status === 'Passed' ? 'default' : 'destructive'}
                          className={audit.status === 'Passed' ? 'bg-success hover:bg-success/90' : ''}>
                          {audit.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{audit.nextDue}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>All Credit Reporting Bureaus</CardTitle>
              <CardDescription>Live contact and dispute address reference — powered by the API.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-96 overflow-y-auto">
              {bureaus.map((b: any) => (
                <div key={b.id} className="p-3 bg-background/50 rounded-lg border border-border/50">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-sm">{b.name}</h4>
                    <div className="flex gap-1">
                      {b.eoscarSupported && <Badge variant="outline" className="text-[9px] h-4 border-blue-500 text-blue-600">e-OSCAR</Badge>}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-start gap-1 mb-1">
                    <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" /> {b.disputeAddress}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {b.phone}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </Shell>
  );
}