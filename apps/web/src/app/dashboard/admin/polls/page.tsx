'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Loader2, 
  BarChart3, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Edit, 
  Trash2,
  Eye,
  Calendar,
  MapPin,
  Users,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PollStatusBadge, POSITION_LABELS } from '@/components/polls';

interface Poll {
  id: string;
  title: string;
  description: string | null;
  position: string;
  positionLabel: string;
  status: 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled';
  start_time: string;
  end_time: string;
  total_votes: number;
  county?: { id: string; name: string } | null;
  constituency?: { id: string; name: string } | null;
  ward?: { id: string; name: string } | null;
  party?: { id: string; name: string; abbreviation: string } | null;
  is_party_nomination: boolean;
  created_at: string;
  creator?: { id: string; full_name: string } | null;
}



const POSITIONS = [
  { value: 'president', label: 'President' },
  { value: 'governor', label: 'Governor' },
  { value: 'senator', label: 'Senator' },
  { value: 'women_rep', label: 'Women Representative' },
  { value: 'mp', label: 'Member of Parliament' },
  { value: 'mca', label: 'MCA' },
];



interface CreatePollFormData {
  title: string;
  description: string;
  position: string;
  county_id: string;
  constituency_id: string;
  ward_id: string;
  start_time: string;
  end_time: string;
  is_party_nomination: boolean;
  party_id: string;
  status: string;
}

export default function AdminPollsPage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [positionFilter, setPositionFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Create poll form state
  const [formData, setFormData] = useState<CreatePollFormData>({
    title: '',
    description: '',
    position: 'president',
    county_id: '',
    constituency_id: '',
    ward_id: '',
    start_time: '',
    end_time: '',
    is_party_nomination: false,
    party_id: '',
    status: 'draft',
  });

  // Region data
  const [counties, setCounties] = useState<{ id: string; name: string }[]>([]);
  const [constituencies, setConstituencies] = useState<{ id: string; name: string }[]>([]);
  const [wards, setWards] = useState<{ id: string; name: string }[]>([]);
  const [parties, setParties] = useState<{ id: string; name: string; abbreviation: string }[]>([]);

  useEffect(() => {
    fetchPolls();
    fetchRegionData();
  }, [statusFilter, positionFilter]);

  const fetchPolls = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (positionFilter !== 'all') params.set('position', positionFilter);

      const response = await fetch(`/api/admin/polls?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        setPolls(data.polls || []);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to fetch polls');
      }
    } catch (error) {
      console.error('Failed to fetch polls:', error);
      setError('Failed to fetch polls');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRegionData = async () => {
    try {
      // Fetch counties
      const countiesRes = await fetch('/api/regions/counties');
      if (countiesRes.ok) {
        const data = await countiesRes.json();
        setCounties(data.counties || []);
      }

      // Fetch parties
      const partiesRes = await fetch('/api/parties');
      if (partiesRes.ok) {
        const data = await partiesRes.json();
        setParties(data.parties || []);
      }
    } catch (error) {
      console.error('Failed to fetch region data:', error);
    }
  };

  const fetchConstituencies = async (countyId: string) => {
    try {
      const response = await fetch(`/api/regions/constituencies?county_id=${countyId}`);
      if (response.ok) {
        const data = await response.json();
        setConstituencies(data.constituencies || []);
      }
    } catch (error) {
      console.error('Failed to fetch constituencies:', error);
    }
  };

  const fetchWards = async (constituencyId: string) => {
    try {
      const response = await fetch(`/api/regions/wards?constituency_id=${constituencyId}`);
      if (response.ok) {
        const data = await response.json();
        setWards(data.wards || []);
      }
    } catch (error) {
      console.error('Failed to fetch wards:', error);
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Client-side time validation. <input type="datetime-local"> emits a
    // string like "2026-04-22T08:30" in the *browser's* local timezone with
    // no offset. We must parse it as local and serialise to ISO (UTC) before
    // sending so the server doesn't reinterpret it in its own timezone.
    const startLocal = formData.start_time ? new Date(formData.start_time) : null;
    const endLocal = formData.end_time ? new Date(formData.end_time) : null;

    if (!startLocal || !endLocal || isNaN(startLocal.getTime()) || isNaN(endLocal.getTime())) {
      setError('Please choose a valid start and end time');
      setIsSubmitting(false);
      return;
    }

    const durationMs = endLocal.getTime() - startLocal.getTime();
    if (durationMs < 5 * 60 * 1000) {
      setError('Poll must run for at least 5 minutes');
      setIsSubmitting(false);
      return;
    }

    if (formData.status === 'scheduled' && startLocal.getTime() < Date.now() - 60_000) {
      setError('Scheduled polls must start in the future');
      setIsSubmitting(false);
      return;
    }

    const payload = {
      ...formData,
      title: formData.title.trim(),
      description: formData.description.trim(),
      start_time: startLocal.toISOString(),
      end_time: endLocal.toISOString(),
    };

    try {
      const response = await fetch('/api/admin/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Poll created successfully!');
        setIsCreateDialogOpen(false);
        fetchPolls();
        resetForm();
      } else {
        setError(data.error || 'Failed to create poll');
      }
    } catch (error) {
      console.error('Failed to create poll:', error);
      setError('Failed to create poll');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (pollId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/polls/${pollId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setSuccess(`Poll status updated to ${newStatus}`);
        fetchPolls();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update poll status');
      }
    } catch (error) {
      console.error('Failed to update poll status:', error);
      setError('Failed to update poll status');
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    if (!confirm('Are you sure you want to delete this poll?')) return;

    try {
      const response = await fetch(`/api/admin/polls/${pollId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Poll deleted successfully');
        fetchPolls();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete poll');
      }
    } catch (error) {
      console.error('Failed to delete poll:', error);
      setError('Failed to delete poll');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      position: 'president',
      county_id: '',
      constituency_id: '',
      ward_id: '',
      start_time: '',
      end_time: '',
      is_party_nomination: false,
      party_id: '',
      status: 'draft',
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-KE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  // Format a Date as the value expected by <input type="datetime-local">
  // ("YYYY-MM-DDTHH:mm") in the *browser's local* timezone — NOT UTC.
  const toLocalInputValue = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return (
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
      `T${pad(d.getHours())}:${pad(d.getMinutes())}`
    );
  };

  // Round a date up to the next 30-minute boundary for cleaner defaults.
  const roundUpToHalfHour = (d: Date) => {
    const rounded = new Date(d);
    rounded.setSeconds(0, 0);
    const minutes = rounded.getMinutes();
    rounded.setMinutes(minutes + ((30 - (minutes % 30)) % 30 || 30));
    return rounded;
  };

  // Set default dates for new poll: starts tomorrow at 09:00 local, ends a
  // week later at the same time.
  const getDefaultDates = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const start = tomorrow;
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

    return {
      start: toLocalInputValue(start),
      end: toLocalInputValue(end),
    };
  };

  // Minimum value allowed for the start-time picker (now, rounded up).
  const minStartValue = toLocalInputValue(roundUpToHalfHour(new Date()));

  // Friendly duration string for the currently selected window.
  const durationLabel = (() => {
    if (!formData.start_time || !formData.end_time) return null;
    const s = new Date(formData.start_time).getTime();
    const e = new Date(formData.end_time).getTime();
    if (isNaN(s) || isNaN(e) || e <= s) return null;
    const totalMinutes = Math.round((e - s) / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;
    const parts: string[] = [];
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    return parts.join(' ') || '0m';
  })();

  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    if (isCreateDialogOpen && !formData.start_time) {
      const defaults = getDefaultDates();
      setFormData(prev => ({
        ...prev,
        start_time: defaults.start,
        end_time: defaults.end,
      }));
    }
  }, [isCreateDialogOpen]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Poll Management</h1>
          <p className="text-muted-foreground">
            Create and manage opinion polls for electoral positions
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Poll
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Poll</DialogTitle>
              <DialogDescription>
                Create a new opinion poll for voters to participate in
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreatePoll}>
              <div className="space-y-4 py-4">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Poll Title *</Label>
                  <Input
                    id="title"
                    placeholder="Who would you vote for as President in 2027?"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm"
                    placeholder="Share your opinion on who should lead Kenya..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                {/* Position */}
                <div className="space-y-2">
                  <Label htmlFor="position">Electoral Position *</Label>
                  <select
                    id="position"
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    value={formData.position}
                    onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                    required
                  >
                    {POSITIONS.map(pos => (
                      <option key={pos.value} value={pos.value}>{pos.label}</option>
                    ))}
                  </select>
                </div>

                {/* Regional Scope */}
                {formData.position !== 'president' && (
                  <div className="space-y-4 p-4 bg-muted rounded-lg">
                    <h4 className="font-medium text-sm">Regional Scope (Optional)</h4>
                    <p className="text-xs text-muted-foreground">
                      Leave empty for national scope
                    </p>
                    
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="county">County</Label>
                        <select
                          id="county"
                          className="w-full px-3 py-2 border rounded-md text-sm"
                          value={formData.county_id}
                          onChange={(e) => {
                            setFormData(prev => ({ 
                              ...prev, 
                              county_id: e.target.value,
                              constituency_id: '',
                              ward_id: '',
                            }));
                            if (e.target.value) {
                              fetchConstituencies(e.target.value);
                            } else {
                              setConstituencies([]);
                            }
                          }}
                        >
                          <option value="">All Counties</option>
                          {counties.map(county => (
                            <option key={county.id} value={county.id}>{county.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="constituency">Constituency</Label>
                        <select
                          id="constituency"
                          className="w-full px-3 py-2 border rounded-md text-sm"
                          value={formData.constituency_id}
                          onChange={(e) => {
                            setFormData(prev => ({ 
                              ...prev, 
                              constituency_id: e.target.value,
                              ward_id: '',
                            }));
                            if (e.target.value) {
                              fetchWards(e.target.value);
                            } else {
                              setWards([]);
                            }
                          }}
                          disabled={!formData.county_id}
                        >
                          <option value="">All Constituencies</option>
                          {constituencies.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ward">Ward</Label>
                        <select
                          id="ward"
                          className="w-full px-3 py-2 border rounded-md text-sm"
                          value={formData.ward_id}
                          onChange={(e) => setFormData(prev => ({ ...prev, ward_id: e.target.value }))}
                          disabled={!formData.constituency_id}
                        >
                          <option value="">All Wards</option>
                          {wards.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Party Nomination */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_party_nomination"
                    checked={formData.is_party_nomination}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      is_party_nomination: e.target.checked,
                      party_id: e.target.checked ? prev.party_id : '',
                    }))}
                  />
                  <Label htmlFor="is_party_nomination">This is a party nomination poll</Label>
                </div>

                {formData.is_party_nomination && (
                  <div className="space-y-2">
                    <Label htmlFor="party">Select Party *</Label>
                    <select
                      id="party"
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      value={formData.party_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, party_id: e.target.value }))}
                      required={formData.is_party_nomination}
                    >
                      <option value="">Select a party</option>
                      {parties.map(party => (
                        <option key={party.id} value={party.id}>
                          {party.name} ({party.abbreviation})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Schedule */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Schedule *</Label>
                    <span className="text-xs text-muted-foreground">
                      Times shown in <strong>{browserTz}</strong>
                    </span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="start_time" className="text-xs text-muted-foreground">
                        Start
                      </Label>
                      <Input
                        id="start_time"
                        type="datetime-local"
                        min={formData.status === 'scheduled' ? minStartValue : undefined}
                        step={300}
                        value={formData.start_time}
                        onChange={(e) => {
                          const newStart = e.target.value;
                          setFormData(prev => {
                            // If the new start is after the current end, push the
                            // end forward by 7 days from the new start so the
                            // window stays valid.
                            const startMs = new Date(newStart).getTime();
                            const endMs = prev.end_time ? new Date(prev.end_time).getTime() : 0;
                            const next = { ...prev, start_time: newStart };
                            if (!isNaN(startMs) && (!endMs || endMs <= startMs)) {
                              next.end_time = toLocalInputValue(
                                new Date(startMs + 7 * 24 * 60 * 60 * 1000)
                              );
                            }
                            return next;
                          });
                        }}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="end_time" className="text-xs text-muted-foreground">
                        End
                      </Label>
                      <Input
                        id="end_time"
                        type="datetime-local"
                        min={formData.start_time || minStartValue}
                        step={300}
                        value={formData.end_time}
                        onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  {/* Quick duration presets */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-xs text-muted-foreground mr-1">Quick set:</span>
                    {[
                      { label: '1 hour', ms: 60 * 60 * 1000 },
                      { label: '1 day', ms: 24 * 60 * 60 * 1000 },
                      { label: '3 days', ms: 3 * 24 * 60 * 60 * 1000 },
                      { label: '1 week', ms: 7 * 24 * 60 * 60 * 1000 },
                      { label: '1 month', ms: 30 * 24 * 60 * 60 * 1000 },
                    ].map(preset => (
                      <Button
                        key={preset.label}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          const start = formData.start_time
                            ? new Date(formData.start_time)
                            : roundUpToHalfHour(new Date());
                          const end = new Date(start.getTime() + preset.ms);
                          setFormData(prev => ({
                            ...prev,
                            start_time: toLocalInputValue(start),
                            end_time: toLocalInputValue(end),
                          }));
                        }}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>

                  {durationLabel && (
                    <p className="text-xs text-muted-foreground">
                      Duration: <strong>{durationLabel}</strong>
                    </p>
                  )}
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label htmlFor="status">Initial Status</Label>
                  <select
                    id="status"
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="draft">Draft (not visible)</option>
                    <option value="scheduled">Scheduled (will activate at start time)</option>
                    <option value="active">Active (start immediately)</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                  {error}
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Poll'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alerts */}
      {success && (
        <div className="p-3 bg-green-500/10 text-green-600 rounded-md text-sm flex items-center justify-between">
          {success}
          <Button variant="ghost" size="sm" onClick={() => setSuccess(null)}>
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="flex-1">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2">
          <select
            className="px-3 py-2 border rounded-md text-sm"
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
          >
            <option value="all">All Positions</option>
            {POSITIONS.map(pos => (
              <option key={pos.value} value={pos.value}>{pos.label}</option>
            ))}
          </select>
          <Button variant="outline" size="icon" onClick={fetchPolls}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Polls List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : polls.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <BarChart3 className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No polls found</h3>
            <p className="text-muted-foreground mb-4">
              {statusFilter !== 'all' || positionFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first poll to get started'}
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Poll
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {polls.map((poll) => {
            return (
              <Card key={poll.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{POSITION_LABELS[poll.position]}</Badge>
                        <PollStatusBadge status={poll.status} />
                        {poll.is_party_nomination && poll.party && (
                          <Badge variant="secondary">{poll.party.abbreviation} Nomination</Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg">{poll.title}</CardTitle>
                      {poll.description && (
                        <CardDescription>{poll.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {poll.status === 'draft' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(poll.id, 'scheduled')}
                          >
                            <Calendar className="h-4 w-4 mr-1" />
                            Schedule
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeletePoll(poll.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {poll.status === 'scheduled' && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleStatusChange(poll.id, 'active')}
                          >
                            Activate Now
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(poll.id, 'cancelled')}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                      {poll.status === 'active' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(poll.id, 'completed')}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          End Poll
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" asChild>
                        <a href={`/dashboard/admin/polls/${poll.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          View Results
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid gap-4 sm:grid-cols-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(poll.start_time)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Until {formatDate(poll.end_time)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{poll.total_votes?.toLocaleString() || 0} votes</span>
                    </div>
                    {(poll.county || poll.constituency || poll.ward) && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {poll.ward?.name || poll.constituency?.name || poll.county?.name || 'National'}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
