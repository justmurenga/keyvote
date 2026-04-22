'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Megaphone,
  Shield,
  Users,
  X,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface CandidateMe {
  candidate?: {
    id: string;
    is_verified: boolean;
    verification_status: string | null;
  } | null;
  stats?: {
    followerCount?: number;
    agentCount?: number;
  } | null;
}

/**
 * Shown to verified candidates as a persistent (dismissible) banner urging
 * them to keep engaging voters, lobbying supporters and inviting agents.
 * Mirrors the layout of `ProfileCompletionBanner` for visual consistency.
 */
export function CandidateEngagementBanner() {
  const [data, setData] = useState<CandidateMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/candidates/me', { credentials: 'same-origin' });
        if (res.ok) setData(await res.json());
      } catch {
        // non-critical
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading || dismissed || !data?.candidate) return null;
  // Only show once approved/verified — pending candidates already see a
  // separate "pending verification" notice on the candidate dashboard.
  if (!data.candidate.is_verified) return null;

  const followers = data.stats?.followerCount ?? 0;
  const agents = data.stats?.agentCount ?? 0;

  return (
    <Card className="border-emerald-300 dark:border-emerald-700 bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-900/20 dark:via-green-900/20 dark:to-teal-900/20">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/40 shrink-0">
              <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-emerald-900 dark:text-emerald-100">
                  Keep your campaign moving
                </p>
                <Badge
                  variant="outline"
                  className="text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                >
                  {followers.toLocaleString()} followers · {agents} agents
                </Badge>
              </div>
              <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                Engage voters, lobby supporters and invite more campaign agents
                to grow your reach across the ground.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Link href="/dashboard/candidate/messages">
                  <Button size="sm" variant="outline" className="bg-white/60 dark:bg-emerald-950/40">
                    <Megaphone className="h-3.5 w-3.5 mr-1" />
                    Engage voters
                  </Button>
                </Link>
                <Link href="/dashboard/candidate/agents">
                  <Button size="sm" variant="outline" className="bg-white/60 dark:bg-emerald-950/40">
                    <Shield className="h-3.5 w-3.5 mr-1" />
                    Invite agents
                  </Button>
                </Link>
                <Link href="/dashboard/following">
                  <Button size="sm" variant="outline" className="bg-white/60 dark:bg-emerald-950/40">
                    <Users className="h-3.5 w-3.5 mr-1" />
                    Lobby supporters
                  </Button>
                </Link>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/dashboard/candidate">
              <Button size="sm">
                Open dashboard
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setDismissed(true)}
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
