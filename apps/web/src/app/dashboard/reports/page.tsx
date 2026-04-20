'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, MapPin, Users, Calendar, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';

interface Report {
  id: string;
  report_type: string;
  title: string;
  description: string | null;
  photos: string[];
  location_name: string | null;
  people_reached: number;
  status: string;
  activity_date: string;
  created_at: string;
  agents: { id: string; users: { full_name: string; phone: string } } | null;
  reviewer: { full_name: string } | null;
  review_notes: string | null;
}

const REPORT_TYPES = [
  { value: 'rally', label: 'Rally/Event' },
  { value: 'door_to_door', label: 'Door-to-Door' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'voter_registration', label: 'Voter Registration' },
  { value: 'other', label: 'Other' },
];

export default function ReportsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');

  const [reportType, setReportType] = useState('rally');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [peopleReached, setPeopleReached] = useState('0');
  const [activityDate, setActivityDate] = useState(new Date().toISOString().split('T')[0]);

  const isAgent = user?.role === 'agent';
  const isCandidate = user?.role === 'candidate';
  const isAdmin = user?.role === 'admin' || user?.role === 'system_admin';

  const fetchReports = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/reports?${params}`);
      const data = await res.json();
      setReports(data.reports || []);
    } catch {} finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType, title: title.trim(), description: description || null, locationName: locationName || null, peopleReached: parseInt(peopleReached) || 0, activityDate }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      setSuccess('Report submitted!');
      setShowForm(false);
      setTitle(''); setDescription(''); setLocationName(''); setPeopleReached('0');
      fetchReports();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) { alert(e.message); } finally { setSubmitting(false); }
  };

  const handleReview = async (reportId: string, status: 'approved' | 'rejected') => {
    const notes = status === 'rejected' ? prompt('Rejection reason (optional):') : null;
    await fetch('/api/reports', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reportId, status, reviewNotes: notes }) });
    fetchReports();
  };

  const statusBadge = (status: string) => {
    if (status === 'approved') return <Badge className="bg-green-100 text-green-800 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
    if (status === 'rejected') return <Badge className="bg-red-100 text-red-800 text-xs"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-800 text-xs"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Activity Reports</h1>
          <p className="text-muted-foreground">{isAgent ? 'Submit daily activity reports' : 'Review agent activity reports'}</p>
        </div>
        <div className="flex items-center gap-2">
          {success && <Badge className="bg-green-100 text-green-800 gap-1 px-3 py-1"><CheckCircle2 className="h-3.5 w-3.5" /> {success}</Badge>}
          {isAgent && <Button onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4 mr-2" /> New Report</Button>}
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submit Activity Report</CardTitle>
            <CardDescription>Record your daily campaign activity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Report Type</Label>
                <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm mt-1">
                  {REPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <Label>Activity Date</Label>
                <Input type="date" value={activityDate} onChange={(e) => setActivityDate(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Ward rally at Karura grounds" className="mt-1" /></div>
            <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the activity..." rows={4} className="mt-1" /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Location</Label><Input value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="Location name" className="mt-1" /></div>
              <div><Label>People Reached</Label><Input type="number" value={peopleReached} onChange={(e) => setPeopleReached(e.target.value)} min="0" className="mt-1" /></div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={submitting || !title.trim()}>
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                {submitting ? 'Submitting...' : 'Submit Report'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        {['', 'pending', 'approved', 'rejected'].map(s => (
          <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(s)}>
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : reports.length === 0 ? (
        <Card><CardContent className="py-16 text-center"><FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" /><p className="text-muted-foreground">No reports found</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <Card key={r.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {statusBadge(r.status)}
                      <Badge variant="outline" className="text-xs">{REPORT_TYPES.find(t => t.value === r.report_type)?.label || r.report_type}</Badge>
                    </div>
                    <h3 className="font-medium">{r.title}</h3>
                    {r.description && <p className="text-sm text-muted-foreground mt-1">{r.description}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {r.agents?.users && <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {r.agents.users.full_name}</span>}
                      {r.location_name && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {r.location_name}</span>}
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {r.activity_date}</span>
                      {r.people_reached > 0 && <span>{r.people_reached} people reached</span>}
                    </div>
                    {r.review_notes && <p className="text-xs mt-2 p-2 bg-muted rounded"><span className="font-medium">Review: </span>{r.review_notes}</p>}
                  </div>
                  {(isCandidate || isAdmin) && r.status === 'pending' && (
                    <div className="flex gap-1 shrink-0 ml-4">
                      <Button size="sm" variant="outline" className="h-8 text-xs text-green-700" onClick={() => handleReview(r.id, 'approved')}>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 text-xs text-red-700" onClick={() => handleReview(r.id, 'rejected')}>
                        <XCircle className="h-3 w-3 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
