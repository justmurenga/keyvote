'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Power,
  PowerOff,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Users as UsersIcon,
  Facebook,
  Twitter,
  Instagram,
  Globe,
  FileText,
  Video,
  X,
  User as UserIcon,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { PermissionGuard } from '@/components/auth/permission-guard';

interface Candidate {
  id: string;
  user_id: string;
  position: string;
  is_verified: boolean;
  is_active: boolean;
  is_independent: boolean;
  campaign_slogan: string | null;
  manifesto_text: string | null;
  manifesto_pdf_url: string | null;
  campaign_video_url: string | null;
  facebook_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  verification_status: string | null;
  verified_at: string | null;
  verification_notes: string | null;
  follower_count: number;
  created_at: string;
  user: {
    full_name: string;
    phone: string;
    email: string | null;
    profile_photo_url: string | null;
    bio: string | null;
    gender: string | null;
    age_bracket: string | null;
    created_at: string;
  };
  party: {
    id: string;
    name: string;
    abbreviation: string;
    symbol_url: string | null;
    primary_color: string | null;
    secondary_color: string | null;
  } | null;
  county: { name: string } | null;
  constituency: { name: string } | null;
  ward: { name: string } | null;
}

const positions = [
  { value: '', label: 'All Positions' },
  { value: 'president', label: 'President' },
  { value: 'governor', label: 'Governor' },
  { value: 'senator', label: 'Senator' },
  { value: 'women_rep', label: 'Women Rep' },
  { value: 'mp', label: 'Member of Parliament' },
  { value: 'mca', label: 'MCA' },
];

function getPositionColor(pos: string) {
  const colors: Record<string, string> = {
    president: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    governor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    senator: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    women_rep: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    mp: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    mca: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  };
  return colors[pos] || 'bg-gray-100 text-gray-800';
}

function formatPosition(pos: string) {
  return pos.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString('en-KE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
}

function formatRegion(c: Candidate) {
  const parts = [c.ward?.name, c.constituency?.name, c.county?.name].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'National';
}

function Avatar({ name, photo, size = 32 }: { name: string; photo: string | null; size?: number }) {
  const initial = (name || '?').charAt(0).toUpperCase();
  if (photo) {
    return (
      <div
        className="relative rounded-full overflow-hidden bg-muted ring-1 ring-border shrink-0"
        style={{ width: size, height: size }}
      >
        <Image src={photo} alt={name} fill sizes={`${size}px`} className="object-cover" />
      </div>
    );
  }
  return (
    <div
      className="rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}

export default function AdminCandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState('');
  const [verification, setVerification] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const searchRef = useRef(search);
  searchRef.current = search;

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (searchRef.current) params.set('search', searchRef.current);
      if (position) params.set('position', position);
      if (verification) params.set('verification', verification);

      const res = await fetch(`/api/admin/candidates?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.candidates || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch candidates:', error);
    } finally {
      setLoading(false);
    }
  }, [page, position, verification]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCandidates();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleVerify = async (candidateId: string, verify: boolean) => {
    setActionLoading(candidateId);
    try {
      const res = await fetch(`/api/admin/candidates/${candidateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_verified: verify }),
      });
      if (res.ok) {
        fetchCandidates();
        if (selectedCandidate?.id === candidateId) {
          setSelectedCandidate((prev) => (prev ? { ...prev, is_verified: verify } : null));
        }
      }
    } catch (error) {
      console.error('Failed to update candidate:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (candidateId: string, active: boolean) => {
    setActionLoading(candidateId);
    try {
      const res = await fetch(`/api/admin/candidates/${candidateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: active }),
      });
      if (res.ok) {
        fetchCandidates();
        if (selectedCandidate?.id === candidateId) {
          setSelectedCandidate((prev) => (prev ? { ...prev, is_active: active } : null));
        }
      }
    } catch (error) {
      console.error('Failed to toggle candidate status:', error);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <PermissionGuard
      permission="candidates:edit"
      fallback={
        <div className="text-center py-12">
          <p className="text-muted-foreground">You don&apos;t have permission to manage candidates.</p>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Candidate Management</h1>
            <p className="text-muted-foreground mt-1">
              {totalCount} candidate{totalCount !== 1 ? 's' : ''} registered
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchCandidates}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <select
                value={position}
                onChange={(e) => {
                  setPosition(e.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {positions.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              <select
                value={verification}
                onChange={(e) => {
                  setVerification(e.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">All Status</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Candidate Detail Modal */}
        {selectedCandidate && (
          <CandidateDetailModal
            candidate={selectedCandidate}
            actionLoading={actionLoading === selectedCandidate.id}
            onClose={() => setSelectedCandidate(null)}
            onVerify={(v) => handleVerify(selectedCandidate.id, v)}
            onToggleActive={(a) => handleToggleActive(selectedCandidate.id, a)}
          />
        )}

        {/* Candidates Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Candidate</th>
                    <th className="text-left p-4 font-medium">Position</th>
                    <th className="text-left p-4 font-medium">Party</th>
                    <th className="text-left p-4 font-medium">Region</th>
                    <th className="text-left p-4 font-medium">Followers</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className="border-b">
                        {[...Array(7)].map((_, j) => (
                          <td key={j} className="p-4">
                            <div className="h-4 bg-muted rounded animate-pulse w-20" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : candidates.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No candidates found
                      </td>
                    </tr>
                  ) : (
                    candidates.map((candidate) => (
                      <tr key={candidate.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar
                              name={candidate.user.full_name}
                              photo={candidate.user.profile_photo_url}
                              size={36}
                            />
                            <div className="min-w-0">
                              <p className="font-medium truncate">{candidate.user.full_name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {candidate.user.phone}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getPositionColor(
                              candidate.position
                            )}`}
                          >
                            {candidate.position.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4">
                          {candidate.is_independent ? (
                            <Badge variant="outline" className="text-xs">
                              Independent
                            </Badge>
                          ) : (
                            <div className="flex items-center gap-2">
                              {candidate.party?.symbol_url && (
                                <div className="relative h-5 w-5 rounded-sm overflow-hidden bg-muted">
                                  <Image
                                    src={candidate.party.symbol_url}
                                    alt={candidate.party.abbreviation}
                                    fill
                                    sizes="20px"
                                    className="object-contain"
                                  />
                                </div>
                              )}
                              <span className="text-sm font-medium">
                                {candidate.party?.abbreviation || '-'}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="text-sm">{formatRegion(candidate)}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-medium">{candidate.follower_count}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {candidate.is_verified ? (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                Unverified
                              </Badge>
                            )}
                            {!candidate.is_active && (
                              <Badge variant="destructive" className="text-xs">
                                Inactive
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedCandidate(candidate)}
                              title="View full details"
                              aria-label="View full details"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              <span className="hidden lg:inline">View</span>
                            </Button>
                            {!candidate.is_verified ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                                onClick={() => handleVerify(candidate.id, true)}
                                disabled={actionLoading === candidate.id}
                                title="Verify candidate"
                                aria-label="Verify candidate"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                <span className="hidden lg:inline">Verify</span>
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950"
                                onClick={() => handleVerify(candidate.id, false)}
                                disabled={actionLoading === candidate.id}
                                title="Revoke verification"
                                aria-label="Revoke verification"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                <span className="hidden lg:inline">Revoke</span>
                              </Button>
                            )}
                            {candidate.is_active ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                onClick={() => handleToggleActive(candidate.id, false)}
                                disabled={actionLoading === candidate.id}
                                title="Deactivate candidate"
                                aria-label="Deactivate candidate"
                              >
                                <PowerOff className="h-4 w-4 mr-1" />
                                <span className="hidden lg:inline">Deactivate</span>
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                                onClick={() => handleToggleActive(candidate.id, true)}
                                disabled={actionLoading === candidate.id}
                                title="Activate candidate"
                                aria-label="Activate candidate"
                              >
                                <Power className="h-4 w-4 mr-1" />
                                <span className="hidden lg:inline">Activate</span>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} ({totalCount} total)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}

/* -------------------------------------------------------------------------- */
/*  Candidate Detail Modal                                                    */
/* -------------------------------------------------------------------------- */

function CandidateDetailModal({
  candidate,
  actionLoading,
  onClose,
  onVerify,
  onToggleActive,
}: {
  candidate: Candidate;
  actionLoading: boolean;
  onClose: () => void;
  onVerify: (verify: boolean) => void;
  onToggleActive: (active: boolean) => void;
}) {
  const socials = [
    { url: candidate.facebook_url, label: 'Facebook', Icon: Facebook },
    { url: candidate.twitter_url, label: 'Twitter / X', Icon: Twitter },
    { url: candidate.instagram_url, label: 'Instagram', Icon: Instagram },
    { url: candidate.tiktok_url, label: 'TikTok', Icon: Globe },
  ].filter((s) => !!s.url);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto pointer-events-none">
        <div className="relative my-8 w-full max-w-3xl rounded-xl border bg-background shadow-2xl pointer-events-auto">
          {/* Header banner */}
          <div
            className="relative h-32 rounded-t-xl"
            style={{
              background: candidate.party?.primary_color
                ? `linear-gradient(135deg, ${candidate.party.primary_color}, ${
                    candidate.party.secondary_color || candidate.party.primary_color
                  })`
                : 'linear-gradient(135deg, #16a34a, #15803d)',
            }}
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 pb-6">
            {/* Avatar + name overlapping banner */}
            <div className="-mt-12 flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="ring-4 ring-background rounded-full">
                <Avatar
                  name={candidate.user.full_name}
                  photo={candidate.user.profile_photo_url}
                  size={96}
                />
              </div>
              <div className="flex-1 min-w-0 sm:pb-2">
                <h2 className="text-2xl font-bold truncate">{candidate.user.full_name}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${getPositionColor(
                      candidate.position
                    )}`}
                  >
                    {formatPosition(candidate.position)}
                  </span>
                  {candidate.is_verified ? (
                    <Badge className="bg-green-100 text-green-800 text-xs gap-1">
                      <ShieldCheck className="h-3 w-3" /> Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      Unverified
                    </Badge>
                  )}
                  {!candidate.is_active && (
                    <Badge variant="destructive" className="text-xs">
                      Inactive
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {candidate.campaign_slogan && (
              <p className="mt-4 italic text-muted-foreground border-l-2 border-primary pl-3">
                &ldquo;{candidate.campaign_slogan}&rdquo;
              </p>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
              <StatTile
                icon={<UsersIcon className="h-4 w-4" />}
                label="Followers"
                value={candidate.follower_count.toLocaleString()}
              />
              <StatTile
                icon={<Building2 className="h-4 w-4" />}
                label="Party"
                value={
                  candidate.is_independent ? 'Independent' : candidate.party?.abbreviation || '-'
                }
              />
              <StatTile
                icon={<MapPin className="h-4 w-4" />}
                label="Region"
                value={formatRegion(candidate)}
              />
              <StatTile
                icon={<Calendar className="h-4 w-4" />}
                label="Joined"
                value={formatDate(candidate.created_at)}
              />
            </div>

            {/* Sections */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal */}
              <Section title="Personal Information" icon={<UserIcon className="h-4 w-4" />}>
                <DetailRow
                  icon={<Phone className="h-3.5 w-3.5" />}
                  label="Phone"
                  value={candidate.user.phone}
                />
                <DetailRow
                  icon={<Mail className="h-3.5 w-3.5" />}
                  label="Email"
                  value={candidate.user.email || '-'}
                />
                <DetailRow label="Gender" value={candidate.user.gender || '-'} capitalize />
                <DetailRow label="Age bracket" value={candidate.user.age_bracket || '-'} />
                {candidate.user.bio && (
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground mb-1">Bio</p>
                    <p className="text-sm whitespace-pre-wrap">{candidate.user.bio}</p>
                  </div>
                )}
              </Section>

              {/* Electoral */}
              <Section title="Electoral Details" icon={<MapPin className="h-4 w-4" />}>
                <DetailRow label="Position" value={formatPosition(candidate.position)} />
                <DetailRow label="County" value={candidate.county?.name || '-'} />
                <DetailRow label="Constituency" value={candidate.constituency?.name || '-'} />
                <DetailRow label="Ward" value={candidate.ward?.name || '-'} />
              </Section>

              {/* Party */}
              <Section title="Party Affiliation" icon={<Building2 className="h-4 w-4" />}>
                {candidate.is_independent ? (
                  <p className="text-sm text-muted-foreground">
                    Running as Independent candidate
                  </p>
                ) : candidate.party ? (
                  <div className="flex items-center gap-3">
                    {candidate.party.symbol_url ? (
                      <div className="relative h-12 w-12 rounded-md overflow-hidden bg-muted ring-1 ring-border">
                        <Image
                          src={candidate.party.symbol_url}
                          alt={candidate.party.name}
                          fill
                          sizes="48px"
                          className="object-contain"
                        />
                      </div>
                    ) : (
                      <div
                        className="h-12 w-12 rounded-md flex items-center justify-center font-bold text-white text-sm"
                        style={{ background: candidate.party.primary_color || '#16a34a' }}
                      >
                        {candidate.party.abbreviation}
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{candidate.party.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {candidate.party.abbreviation}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No party assigned</p>
                )}
              </Section>

              {/* Verification */}
              <Section title="Verification" icon={<ShieldCheck className="h-4 w-4" />}>
                <DetailRow
                  label="Status"
                  value={
                    candidate.verification_status ||
                    (candidate.is_verified ? 'verified' : 'pending')
                  }
                  capitalize
                />
                <DetailRow label="Verified on" value={formatDate(candidate.verified_at)} />
                {candidate.verification_notes && (
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{candidate.verification_notes}</p>
                  </div>
                )}
              </Section>
            </div>

            {/* Manifesto */}
            {(candidate.manifesto_text ||
              candidate.manifesto_pdf_url ||
              candidate.campaign_video_url) && (
              <Section title="Campaign" icon={<FileText className="h-4 w-4" />} className="mt-6">
                {candidate.manifesto_text && (
                  <p className="text-sm whitespace-pre-wrap">{candidate.manifesto_text}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  {candidate.manifesto_pdf_url && (
                    <a
                      href={candidate.manifesto_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border bg-background hover:bg-muted transition-colors"
                    >
                      <FileText className="h-3.5 w-3.5" /> Manifesto PDF
                    </a>
                  )}
                  {candidate.campaign_video_url && (
                    <a
                      href={candidate.campaign_video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border bg-background hover:bg-muted transition-colors"
                    >
                      <Video className="h-3.5 w-3.5" /> Campaign Video
                    </a>
                  )}
                </div>
              </Section>
            )}

            {/* Socials */}
            {socials.length > 0 && (
              <Section title="Social Media" icon={<Globe className="h-4 w-4" />} className="mt-6">
                <div className="flex flex-wrap gap-2">
                  {socials.map(({ url, label, Icon }) => (
                    <a
                      key={label}
                      href={url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border bg-background hover:bg-muted transition-colors"
                    >
                      <Icon className="h-3.5 w-3.5" /> {label}
                    </a>
                  ))}
                </div>
              </Section>
            )}

            {/* Action footer */}
            <div className="mt-8 pt-4 border-t flex flex-wrap gap-2 justify-end">
              {!candidate.is_verified ? (
                <Button onClick={() => onVerify(true)} disabled={actionLoading}>
                  <CheckCircle2 className="h-4 w-4 mr-1.5" /> Verify Candidate
                </Button>
              ) : (
                <Button variant="outline" onClick={() => onVerify(false)} disabled={actionLoading}>
                  <XCircle className="h-4 w-4 mr-1.5" /> Revoke Verification
                </Button>
              )}
              {candidate.is_active ? (
                <Button
                  variant="destructive"
                  onClick={() => onToggleActive(false)}
                  disabled={actionLoading}
                >
                  <PowerOff className="h-4 w-4 mr-1.5" /> Deactivate
                </Button>
              ) : (
                <Button onClick={() => onToggleActive(true)} disabled={actionLoading}>
                  <Power className="h-4 w-4 mr-1.5" /> Activate
                </Button>
              )}
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
        {icon}
        <span>{label}</span>
      </div>
      <p className="font-semibold text-sm mt-0.5 truncate" title={value}>
        {value}
      </p>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
  className = '',
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border bg-card p-4 ${className}`}>
      <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-3 text-foreground">
        {icon}
        {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  capitalize = false,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
        {icon}
        {label}
      </span>
      <span
        className={`font-medium truncate text-right ${capitalize ? 'capitalize' : ''}`}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}
