'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  Heart,
  Loader2,
  Bell,
  TrendingUp,
  Trophy,
  Send,
  UserPlus,
  Wallet,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { FollowButton } from '@/components/candidates';

interface FollowedCandidate {
  id: string;
  name: string;
  position: string;
  positionLabel: string;
  photoUrl?: string;
  partyName?: string;
  partyAbbreviation?: string;
  partyColor?: string;
  isIndependent: boolean;
  isVerified: boolean;
  followerCount: number;
  location: string;
  slogan?: string;
  followedAt: string;
  smsNotifications: boolean;
  whatsappNotifications: boolean;
}

interface CandidateAnalytics {
  candidateId: string;
  name: string;
  followers: number;
  followerRank: number | null;
  peerCount: number;
  raceAverageFollowers: number;
  leader: { name: string; followers: number } | null;
  poll: { votes: number; total: number; sharePct: number };
}

const PER_INVITE_SMS_PRICE = 2;

const positionColors: Record<string, string> = {
  president: 'bg-purple-500',
  governor: 'bg-blue-500',
  senator: 'bg-green-500',
  women_rep: 'bg-pink-500',
  mp: 'bg-orange-500',
  mca: 'bg-teal-500',
};

function FollowedCandidateCard({
  candidate,
  analytics,
  onUnfollow,
  onInvite,
}: {
  candidate: FollowedCandidate;
  analytics?: CandidateAnalytics;
  onUnfollow: (id: string) => void;
  onInvite: (candidate: FollowedCandidate) => void;
}) {
  const initials = candidate.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-4">
          <Link href={`/candidates/${candidate.id}`}>
            <Avatar className="h-14 w-14 border-2 border-primary/20">
              <AvatarImage src={candidate.photoUrl} alt={candidate.name} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                className={`text-white text-xs ${positionColors[candidate.position] || 'bg-gray-500'}`}
              >
                {candidate.positionLabel}
              </Badge>
              {candidate.isVerified && (
                <Badge variant="outline" className="text-xs border-blue-500 text-blue-500">
                  Verified
                </Badge>
              )}
            </div>

            <Link href={`/candidates/${candidate.id}`} className="hover:underline">
              <h3 className="font-semibold truncate">{candidate.name}</h3>
            </Link>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {candidate.partyAbbreviation && (
                <span
                  className="font-medium"
                  style={{ color: candidate.partyColor || 'inherit' }}
                >
                  {candidate.partyAbbreviation}
                </span>
              )}
              {candidate.isIndependent && (
                <span className="text-muted-foreground">Independent</span>
              )}
              <span>•</span>
              <span>{candidate.location}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 items-end">
            <FollowButton
              candidateId={candidate.id}
              initialIsFollowing={true}
              followerCount={candidate.followerCount}
              size="sm"
              onFollowChange={(isFollowing) => {
                if (!isFollowing) onUnfollow(candidate.id);
              }}
            />
            {candidate.smsNotifications && (
              <Badge variant="outline" className="text-xs">
                <Bell className="h-3 w-3 mr-1" /> SMS
              </Badge>
            )}
          </div>
        </div>

        {/* Analytics block */}
        {analytics && (
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-3 text-center">
            <div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Users className="h-3 w-3" />
                Followers
              </div>
              <div className="font-semibold">
                {analytics.followers.toLocaleString()}
              </div>
              <div className="text-[10px] text-muted-foreground">
                avg {analytics.raceAverageFollowers.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Trophy className="h-3 w-3" />
                Rank
              </div>
              <div className="font-semibold">
                {analytics.followerRank
                  ? `#${analytics.followerRank}`
                  : '—'}
                <span className="text-xs text-muted-foreground">
                  {' '}
                  / {analytics.peerCount || 1}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                {analytics.leader
                  ? `Leader: ${analytics.leader.name}`
                  : 'Leading the race'}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Poll share
              </div>
              <div className="font-semibold">
                {analytics.poll.sharePct.toFixed(1)}%
              </div>
              <div className="text-[10px] text-muted-foreground">
                {analytics.poll.votes}/{analytics.poll.total} votes
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Following since{' '}
            {new Date(candidate.followedAt).toLocaleDateString('en-KE', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          <Button
            size="sm"
            onClick={() => onInvite(candidate)}
            className="gap-1.5 bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md focus-visible:ring-green-500 transition-all"
          >
            <UserPlus className="h-4 w-4" />
            Invite friends
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function InviteFriendsDialog({
  open,
  onOpenChange,
  candidate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  candidate: FollowedCandidate | null;
}) {
  const { toast } = useToast();
  const [phonesText, setPhonesText] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const phones = phonesText
    .split(/[\s,;\n]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const recipientCount = phones.length;
  const totalCost = recipientCount * PER_INVITE_SMS_PRICE;

  const reset = () => {
    setPhonesText('');
    setPersonalMessage('');
    setSubmitting(false);
  };

  const handleSend = async () => {
    if (!candidate) return;
    if (recipientCount === 0) {
      toast({ title: 'Add at least one phone number', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/following/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: candidate.id,
          phones,
          personalMessage,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) {
          toast({
            title: 'Insufficient wallet balance',
            description: `Need KES ${data.required?.toFixed?.(2) ?? totalCost.toFixed(2)}, you have KES ${data.available?.toFixed?.(2) ?? '0.00'}. Top up your wallet to continue.`,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Could not send invites',
            description: data.error || 'Please try again',
            variant: 'destructive',
          });
        }
        return;
      }
      toast({
        title: 'Invitations sent',
        description: `${data.sent} sent, ${data.failed || 0} failed. KES ${data.charged} charged from your wallet.`,
      });
      onOpenChange(false);
      reset();
    } catch (err) {
      toast({
        title: 'Network error',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Invite friends to follow{' '}
            {candidate ? candidate.name : 'this candidate'}
          </DialogTitle>
          <DialogDescription>
            We&apos;ll send a single SMS to each friend from the myVote sender
            ID inviting them to sign up or log in and follow{' '}
            {candidate?.name ?? 'the candidate'}. Each SMS costs{' '}
            <strong>KES {PER_INVITE_SMS_PRICE}</strong> from your wallet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="phones">Phone numbers</Label>
            <Textarea
              id="phones"
              placeholder="0712345678, 0723456789, 0734…"
              value={phonesText}
              onChange={(e) => setPhonesText(e.target.value)}
              className="min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Separate with commas, spaces or new lines. Max 25 per send.
            </p>
          </div>

          <div>
            <Label htmlFor="note">Personal note (optional)</Label>
            <Input
              id="note"
              maxLength={80}
              placeholder="e.g. Check out my candidate!"
              value={personalMessage}
              onChange={(e) => setPersonalMessage(e.target.value)}
            />
          </div>

          <div className="rounded-md bg-muted/40 p-3 text-sm flex items-center justify-between">
            <div>
              <div className="font-medium">{recipientCount} recipient(s)</div>
              <div className="text-xs text-muted-foreground">
                @ KES {PER_INVITE_SMS_PRICE} per SMS
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-lg font-bold">KES {totalCost}</div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/wallet">
              <Wallet className="h-4 w-4 mr-2" />
              Top up wallet
            </Link>
          </Button>
          <Button
            onClick={handleSend}
            disabled={submitting || recipientCount === 0}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send invites
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function FollowingPage() {
  const [candidates, setCandidates] = useState<FollowedCandidate[]>([]);
  const [analytics, setAnalytics] = useState<Record<string, CandidateAnalytics>>(
    {},
  );
  const [isLoading, setIsLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteCandidate, setInviteCandidate] =
    useState<FollowedCandidate | null>(null);
  const { toast } = useToast();

  const fetchFollowing = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/candidates/follow', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        setCandidates(data.following || []);
      } else if (response.status === 401) {
        setCandidates([]);
      } else {
        console.warn(
          `Failed to load following list (status ${response.status})`,
        );
        setCandidates([]);
      }
    } catch (error) {
      console.warn('Could not reach follow API:', error);
      setCandidates([]);
      toast({
        title: 'Connection issue',
        description:
          'Could not load the candidates you are following. Please check your connection and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Load analytics in parallel
  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch('/api/following/analytics', {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      const map: Record<string, CandidateAnalytics> = {};
      for (const a of data.analytics || []) map[a.candidateId] = a;
      setAnalytics(map);
    } catch {
      /* analytics is best-effort */
    }
  }, []);

  useEffect(() => {
    fetchFollowing();
  }, [fetchFollowing]);

  useEffect(() => {
    if (candidates.length > 0) fetchAnalytics();
  }, [candidates.length, fetchAnalytics]);

  const handleUnfollow = (candidateId: string) => {
    setCandidates((prev) => prev.filter((c) => c.id !== candidateId));
  };

  const handleOpenInvite = (c: FollowedCandidate) => {
    setInviteCandidate(c);
    setInviteOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Following</h1>
          <p className="text-muted-foreground">
            Track your candidates&apos; analytics and invite friends to join
            them.
          </p>
        </div>
        <Link href="/dashboard/candidates">
          <Button variant="outline">
            <Users className="h-4 w-4 mr-2" />
            Browse Candidates
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : candidates.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Heart className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">
              No candidates followed yet
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Start following candidates to track their analytics, see how
              they fare against rivals and invite friends to follow them too.
            </p>
            <Link href="/dashboard/candidates">
              <Button>
                <Users className="h-4 w-4 mr-2" />
                Browse Candidates
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Following {candidates.length} candidate
            {candidates.length !== 1 ? 's' : ''}. Tap{' '}
            <strong>Invite friends</strong> on any card to grow their support
            base via SMS (charged from your wallet).
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            {candidates.map((candidate) => (
              <FollowedCandidateCard
                key={candidate.id}
                candidate={candidate}
                analytics={analytics[candidate.id]}
                onUnfollow={handleUnfollow}
                onInvite={handleOpenInvite}
              />
            ))}
          </div>
        </div>
      )}

      <InviteFriendsDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        candidate={inviteCandidate}
      />
    </div>
  );
}
