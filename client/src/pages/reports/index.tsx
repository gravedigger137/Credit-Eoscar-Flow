import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Activity, TrendingUp, AlertTriangle, Download, RefreshCw } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

const REPORTS = [
  {
    id: "REP-2023-10-12",
    client: "Sarah Jenkins",
    pullDate: "Oct 12, 2023",
    equifax: { score: 642, change: "+12", status: "improved" },
    experian: { score: 638, change: "+15", status: "improved" },
    transunion: { score: 645, change: "+8", status: "improved" },
    negativeItems: 4,
    status: "Analyzed",
  },
  {
    id: "REP-2023-10-10",
    client: "Michael Chang",
    pullDate: "Oct 10, 2023",
    equifax: { score: 580, change: "0", status: "neutral" },
    experian: { score: 575, change: "-5", status: "declined" },
    transunion: { score: 582, change: "0", status: "neutral" },
    negativeItems: 8,
    status: "Needs Review",
  },
  {
    id: "REP-2023-10-08",
    client: "Amanda Smith",
    pullDate: "Oct 08, 2023",
    equifax: { score: 710, change: "+45", status: "improved" },
    experian: { score: 705, change: "+42", status: "improved" },
    transunion: { score: 715, change: "+50", status: "improved" },
    negativeItems: 1,
    status: "Analyzed",
  }
];

export default function Reports() {
  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Credit Reports</h1>
            <p className="text-muted-foreground mt-1">
              Analyze imported reports, track score changes, and identify negative items.
            </p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <RefreshCw className="w-4 h-4 mr-2" />
            Import New Report
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="glass-panel border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Reports Analyzed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">842</div>
              <p className="text-xs text-muted-foreground mt-1">Total reports in system</p>
            </CardContent>
          </Card>
          
          <Card className="glass-panel border-l-4 border-l-success">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-success" />
                Average Score Increase
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+42 pts</div>
              <p className="text-xs text-muted-foreground mt-1">Across all active clients (6mo)</p>
            </CardContent>
          </Card>

          <Card className="glass-panel border-l-4 border-l-warning">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                Pending Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground mt-1">Newly imported reports</p>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-panel">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Recent Credit Reports</CardTitle>
                <CardDescription>Latest report pulls and score summaries.</CardDescription>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search client..." className="pl-8 bg-background" />
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
                    <TableHead>Client & Date</TableHead>
                    <TableHead>Equifax</TableHead>
                    <TableHead>Experian</TableHead>
                    <TableHead>TransUnion</TableHead>
                    <TableHead>Negative Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {REPORTS.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{report.client}</span>
                          <span className="text-xs text-muted-foreground">{report.pullDate}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold">{report.equifax.score}</span>
                          <span className={`text-xs ${report.equifax.status === 'improved' ? 'text-success' : report.equifax.status === 'declined' ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {report.equifax.change} pts
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                         <div className="flex flex-col">
                          <span className="font-bold">{report.experian.score}</span>
                          <span className={`text-xs ${report.experian.status === 'improved' ? 'text-success' : report.experian.status === 'declined' ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {report.experian.change} pts
                          </span>
                        </div>
                      </TableCell>
                       <TableCell>
                         <div className="flex flex-col">
                          <span className="font-bold">{report.transunion.score}</span>
                          <span className={`text-xs ${report.transunion.status === 'improved' ? 'text-success' : report.transunion.status === 'declined' ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {report.transunion.change} pts
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {report.negativeItems}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={report.status === 'Analyzed' ? 'default' : 'secondary'}
                          className={report.status === 'Analyzed' ? 'bg-success hover:bg-success/90' : 'bg-warning text-warning-foreground'}
                        >
                          {report.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                         <Button variant="ghost" size="sm" className="h-8">
                          <Download className="w-4 h-4 mr-2" />
                          View PDF
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