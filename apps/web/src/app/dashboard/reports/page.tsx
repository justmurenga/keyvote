'use client';

import { useState } from 'react';
import { FileText, Download, Filter, Calendar, MapPin, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Report {
  id: string;
  type: 'results' | 'incident' | 'update';
  title: string;
  station: string;
  agentName: string;
  status: 'pending' | 'verified' | 'rejected';
  createdAt: string;
}

const DEMO_REPORTS: Report[] = [
  {
    id: '1',
    type: 'results',
    title: 'Presidential Results Submission',
    station: 'Westlands Primary School',
    agentName: 'James Mwangi',
    status: 'verified',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    type: 'incident',
    title: 'Voter Intimidation Reported',
    station: 'Kibera Social Hall',
    agentName: 'Grace Wanjiku',
    status: 'pending',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '3',
    type: 'update',
    title: 'Station Opening Confirmed',
    station: 'Langata DCC Office',
    agentName: 'Peter Ochieng',
    status: 'verified',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

export default function DashboardReportsPage() {
  const [reports] = useState<Report[]>(DEMO_REPORTS);
  const [filter, setFilter] = useState('all');

  const filteredReports = filter === 'all' 
    ? reports 
    : reports.filter(r => r.type === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            View reports from your agents
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export All
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Reports</CardDescription>
            <CardTitle className="text-3xl">{reports.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Results</CardDescription>
            <CardTitle className="text-3xl">{reports.filter(r => r.type === 'results').length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Incidents</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{reports.filter(r => r.type === 'incident').length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Review</CardDescription>
            <CardTitle className="text-3xl text-blue-600">{reports.filter(r => r.status === 'pending').length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'results', 'incident', 'update'].map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <div key={report.id} className="flex items-start gap-4 p-4 border rounded-lg">
                <div className={`p-2 rounded-lg ${
                  report.type === 'results' ? 'bg-green-500/10' :
                  report.type === 'incident' ? 'bg-yellow-500/10' :
                  'bg-blue-500/10'
                }`}>
                  {report.type === 'results' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : report.type === 'incident' ? (
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <FileText className="h-5 w-5 text-blue-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{report.title}</p>
                    <Badge variant={
                      report.status === 'verified' ? 'success' :
                      report.status === 'pending' ? 'outline' :
                      'destructive'
                    }>
                      {report.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {report.station}
                    </span>
                    <span>by {report.agentName}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(report.createdAt).toLocaleDateString('en-KE', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
                <Button variant="outline" size="sm">View Details</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
