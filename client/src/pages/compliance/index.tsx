import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, FileCheck, Scale, AlertTriangle, ExternalLink } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const COMPLIANCE_CHECKS = [
  {
    id: "AUD-2023-10",
    name: "CROA Compliance Audit",
    status: "Passed",
    date: "Oct 01, 2023",
    nextDue: "Jan 01, 2024",
  },
  {
    id: "AUD-2023-09",
    name: "FCRA Letter Review",
    status: "Passed",
    date: "Sep 15, 2023",
    nextDue: "Dec 15, 2023",
  },
  {
    id: "AUD-2023-08",
    name: "e-OSCAR Data Security",
    status: "Action Required",
    date: "Aug 10, 2023",
    nextDue: "Immediately",
  }
];

export default function Compliance() {
  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Compliance & Regulations</h1>
            <p className="text-muted-foreground mt-1">
              Ensure adherence to CROA, FCRA, and e-OSCAR data furnisher guidelines.
            </p>
          </div>
          <Button variant="outline">
            <FileCheck className="w-4 h-4 mr-2" />
            Generate Compliance Report
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="glass-panel border-l-4 border-l-success">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-success" />
                CROA Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">Compliant</div>
              <p className="text-xs text-muted-foreground mt-1">All contracts meet state/federal reqs.</p>
            </CardContent>
          </Card>
          
          <Card className="glass-panel border-l-4 border-l-success">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Scale className="w-4 h-4 text-success" />
                FCRA Letter Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Verified</div>
              <p className="text-xs text-muted-foreground mt-1">Last reviewed by legal: Sep 15, 2023</p>
            </CardContent>
          </Card>

          <Card className="glass-panel border-l-4 border-l-warning">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                e-OSCAR Metro 2
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">Updates Needed</div>
              <p className="text-xs text-muted-foreground mt-1">New schema requirements by Nov 1</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Recent Compliance Audits</CardTitle>
              <CardDescription>Automated system checks and manual reviews.</CardDescription>
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
                  {COMPLIANCE_CHECKS.map((audit) => (
                    <TableRow key={audit.id}>
                      <TableCell className="font-medium">{audit.name}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={audit.status === 'Passed' ? 'default' : 'destructive'}
                          className={audit.status === 'Passed' ? 'bg-success hover:bg-success/90' : ''}
                        >
                          {audit.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {audit.nextDue}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="glass-panel bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle>Bureau Contact Reference</CardTitle>
              <CardDescription>Verified addresses for certified mail disputes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 p-3 bg-background/50 rounded-lg border border-border/50">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-primary">Equifax Information Services LLC</h4>
                  <Badge variant="outline">Verified</Badge>
                </div>
                <p className="text-sm">P.O. Box 740256<br/>Atlanta, GA 30374-0256</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><ExternalLink className="w-3 h-3"/> 1-800-685-1111</p>
              </div>

              <div className="space-y-2 p-3 bg-background/50 rounded-lg border border-border/50">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-primary">Experian</h4>
                  <Badge variant="outline">Verified</Badge>
                </div>
                <p className="text-sm">P.O. Box 4500<br/>Allen, TX 75013</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><ExternalLink className="w-3 h-3"/> 1-888-397-3742</p>
              </div>

               <div className="space-y-2 p-3 bg-background/50 rounded-lg border border-border/50">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-primary">TransUnion LLC</h4>
                  <Badge variant="outline">Verified</Badge>
                </div>
                <p className="text-sm">Consumer Dispute Center<br/>P.O. Box 2000<br/>Chester, PA 19016</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><ExternalLink className="w-3 h-3"/> 1-800-916-8800</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Shell>
  );
}