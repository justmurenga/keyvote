'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield,
  MapPin,
  CheckCircle2,
  XCircle,
  Loader2,
  LogIn,
  Users,
  Vote,
  Building2,
  BadgeCheck,
  ExternalLink,
  Facebook,
  Twitter,
  Instagram,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface InvitationData {
  id: string;
  invitedName: string;
  invitedPhone: string;
  regionType: string;
  regionName: string;
  parentRegionName?: string | null;
  invitedAt: string;
  candidate: {
    id: string;
    position: string;
    slogan?: string | null;
    bio?: string | null;
    followerCount: number;
    isVerified: boolean;
    isIndependent: boolean;
    location?: string;
    users: {
      full_name: string;
      profile_photo_url: string | null;
    };
    party: {
      id: string;
      name: string;
      abbreviation?: string | null;
      primaryColor?: string | null;
      symbolUrl?: string | null;
    } | null;
    socialLinks: {
      facebook: string | null;
      twitter: string | null;
      instagram: string | null;
      tiktok: string | null;
    };
  } | null;
  regionStats: {
    registeredVoters: number;
    pollingStationCount: number;
    subRegionCount: number;
    subRegionLabel: string;
  };
}

const POSITION_LABELS: Record<string, string> = {
  president: 'President',
  governor: 'Governor',
  senator: 'Senator',
  women_rep: "Women's Representative",
  mp: 'Member of Parliament',
  mca: 'Member of County Assembly',
};

const REGION_TYPE_LABELS: Record<string, string> = {
  national: 'National',
  county: 'County',
  constituency: 'Constituency',
  ward: 'Ward',
  polling_station: 'Polling Station',
};

function getInitials(name?: string | null) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatNumber(n: number | undefined | null) {
  return (n || 0).toLocaleString();
}

export interface AgentInvitationViewProps {
  token: string;
  /** Whether the viewer is authenticated. */
  isAuthenticated: boolean;
  /** Whether the auth state is still loading. */
  authLoading?: boolean;
  /**
   * If true, the view assumes it is rendered inside the dashboard shell
   * (so it omits its own min-h-screen / background wrappers).
   */
  embedded?: boolean;
}

/**
 * Reusable agent-invitation view used by both the public
 * `/agents/accept/[token]` page and the in-app dashboard
 * `/dashboard/agents/accept/[token]` page.
 */
export function AgentInvitationView({
  token,
  isAuthenticated,
  authLoading = false,
  embedded = false,
}: AgentInvitationViewProps) {
  const router = useRouter();

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchInvitation() {
      try {
        const res = await fetch(`/api/agents/invitation/${token}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || 'Invalid invitation');
          return;
        }
        setInvitation(data.invitation);
      } catch {
        if (!cancelled) setError('Failed to load invitation details');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    if (token) fetchInvitation();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleAccept = async () => {
    setIsAccepting(true);
    setError(null);
    try {
      const res = await fetch(`/api/agents/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to accept invitation');
        return;
      }
      setAccepted(true);
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsAccepting(false);
    }
  };

  // ---- Loading ----
  if (isLoading || authLoading) {
    return (
      <Centered embedded={embedded}>
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading invitation...</p>
          </CardContent>
        </Card>
      </Centered>
    );
  }

  // ---- Error ----
  if (error && !invitation) {
    return (
      <Centered embedded={embedded}>
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <XCircle className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Invalid Invitation</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => router.push(embedded ? '/dashboard' : '/')} variant="outline">
              {embedded ? 'Go to Dashboard' : 'Go Home'}
            </Button>
          </CardContent>
        </Card>
      </Centered>
    );
  }

  // ---- Accepted ----
  if (accepted) {
    return (
      <Centered embedded={embedded}>
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Welcome, Agent!</h2>
            <p className="text-muted-foreground mb-2">
              You&apos;ve successfully accepted the invitation.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              You are now an agent for{' '}
              <strong>{invitation?.candidate?.users?.full_name}</strong>. Head to
              your dashboard to get started.
            </p>
            <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </Centered>
    );
  }

  const c = invitation?.candidate;
  const stats = invitation?.regionStats;
  const regionTypeLabel =
    REGION_TYPE_LABELS[invitation?.regionType || ''] || invitation?.regionType;

  const body = (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {/* Hero */}
      <Card>
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-3">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-7 w-7 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Campaign Agent Invitation</CardTitle>
          <CardDescription>
            You&apos;ve been invited to be a polling agent for the candidate below.
            Please review the details before accepting.
          </CardDescription>
        </CardHeader>
      </Card>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Candidate profile */}
      {c && (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-5">
              <Avatar className="h-24 w-24 border-2 border-primary/20 mx-auto sm:mx-0">
                <AvatarImage src={c.users.profile_photo_url || undefined} alt={c.users.full_name} />
                <AvatarFallback className="text-xl bg-primary/10 text-primary">
                  {getInitials(c.users.full_name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <h2 className="text-xl font-bold">{c.users.full_name}</h2>
                  {c.isVerified && (
                    <BadgeCheck className="h-5 w-5 text-blue-500" aria-label="Verified" />
                  )}
                </div>

                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap mt-2">
                  <Badge variant="secondary">
                    {POSITION_LABELS[c.position] || c.position}
                  </Badge>
                  {c.party ? (
                    <Badge
                      variant="outline"
                      className="gap-1.5"
                      style={
                        c.party.primaryColor
                          ? { borderColor: c.party.primaryColor, color: c.party.primaryColor }
                          : undefined
                      }
                    >
                      {c.party.symbolUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.party.symbolUrl} alt="" className="h-3 w-3 rounded-sm object-cover" />
                      )}
                      {c.party.abbreviation || c.party.name}
                    </Badge>
                  ) : c.isIndependent ? (
                    <Badge variant="outline">Independent</Badge>
                  ) : null}
                  {c.location && (
                    <Badge variant="outline" className="gap-1">
                      <MapPin className="h-3 w-3" />
                      {c.location}
                    </Badge>
                  )}
                </div>

                {c.slogan && (
                  <p className="mt-3 text-sm italic text-muted-foreground">
                    &ldquo;{c.slogan}&rdquo;
                  </p>
                )}

                {c.bio && (
                  <p className="mt-3 text-sm text-foreground/80 line-clamp-4">{c.bio}</p>
                )}

                <div className="mt-4 flex items-center justify-center sm:justify-start gap-4 text-sm flex-wrap">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>
                      <strong className="text-foreground">{formatNumber(c.followerCount)}</strong>{' '}
                      followers
                    </span>
                  </div>
                  <Link
                    href={`/candidates/${c.id}`}
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    View full profile <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>

                {(c.socialLinks.facebook ||
                  c.socialLinks.twitter ||
                  c.socialLinks.instagram) && (
                  <div className="mt-3 flex items-center justify-center sm:justify-start gap-3 text-muted-foreground">
                    {c.socialLinks.facebook && (
                      <a
                        href={c.socialLinks.facebook}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Facebook"
                        className="hover:text-foreground"
                      >
                        <Facebook className="h-4 w-4" />
                      </a>
                    )}
                    {c.socialLinks.twitter && (
                      <a
                        href={c.socialLinks.twitter}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Twitter / X"
                        className="hover:text-foreground"
                      >
                        <Twitter className="h-4 w-4" />
                      </a>
                    )}
                    {c.socialLinks.instagram && (
                      <a
                        href={c.socialLinks.instagram}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Instagram"
                        className="hover:text-foreground"
                      >
                        <Instagram className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assigned region + stats */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Your Assigned Region</CardTitle>
          </div>
          <CardDescription>
            You&apos;ll be responsible for monitoring polling activities in this area.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-2xl font-bold">{invitation?.regionName}</p>
            <Badge variant="secondary">{regionTypeLabel}</Badge>
            {invitation?.parentRegionName && (
              <span className="text-sm text-muted-foreground">
                in {invitation.parentRegionName}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatTile
              icon={<Vote className="h-5 w-5" />}
              label="Registered Voters"
              value={formatNumber(stats?.registeredVoters)}
            />
            <StatTile
              icon={<Building2 className="h-5 w-5" />}
              label="Polling Stations"
              value={formatNumber(stats?.pollingStationCount)}
            />
            {stats && stats.subRegionCount > 0 && stats.subRegionLabel ? (
              <StatTile
                icon={<MapPin className="h-5 w-5" />}
                label={stats.subRegionLabel}
                value={formatNumber(stats.subRegionCount)}
              />
            ) : (
              <StatTile
                icon={<Shield className="h-5 w-5" />}
                label="Coverage"
                value={regionTypeLabel || '—'}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invitee + actions */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="text-sm text-muted-foreground text-center">
            <p>
              Invited as: <strong className="text-foreground">{invitation?.invitedName}</strong>
            </p>
            {invitation?.invitedPhone && (
              <p>Phone: <span className="text-foreground">{invitation.invitedPhone}</span></p>
            )}
          </div>

          {!isAuthenticated ? (
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                You need to log in or create an account to accept this invitation.
              </p>
              <Button
                className="w-full"
                onClick={() => router.push(`/auth/login?redirect=/agents/accept/${token}`)}
              >
                <LogIn className="h-4 w-4 mr-2" />
                Log In to Accept
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/auth/register?redirect=/agents/accept/${token}`)}
              >
                Create Account
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button onClick={handleAccept} disabled={isAccepting} className="w-full">
                {isAccepting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Accept Invitation
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(embedded ? '/dashboard' : '/')}
              >
                Decline
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  if (embedded) return body;
  return <div className="py-8 px-4">{body}</div>;
}

function Centered({ children, embedded }: { children: React.ReactNode; embedded: boolean }) {
  if (embedded) {
    return <div className="flex items-center justify-center py-12">{children}</div>;
  }
  return <div className="flex-1 flex items-center justify-center p-4">{children}</div>;
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
    <div className="rounded-lg border bg-muted/40 p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}
