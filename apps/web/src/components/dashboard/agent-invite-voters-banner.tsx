'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, UserPlus, X, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AgentInfo {
  candidateId: string | null;
  candidateName: string | null;
}

/**
 * Banner shown to logged-in agents on the main dashboard, reminding them to
 * keep inviting voters to follow their candidate. Visually mirrors the
 * `ProfileCompletionBanner` so the experience feels consistent.
 *
 * Only renders when:
 *  - the user role is 'agent' (passed in by the server component)
 *  - we successfully resolve the candidate they're agenting for
 */
export function AgentInviteVotersBanner({ role }: { role: string | null | undefined }) {
  const [info, setInfo] = useState<AgentInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role !== 'agent') {
      setLoading(false);
      return;
    }
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch('/api/agents/me', { credentials: 'same-origin' });
        if (res.ok && alive) {
          const json = await res.json();
          // Tolerant to multiple response shapes from /api/agents/me
          const agent = json.agent || json.agents?.[0] || json;
          setInfo({
            candidateId: agent?.candidate_id || agent?.candidate?.id || null,
            candidateName:
              agent?.candidate?.user?.full_name ||
              agent?.candidate?.full_name ||
              agent?.candidate_name ||
              null,
          });
        }
      } catch {
        // non-critical
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [role]);

  if (role !== 'agent' || loading || dismissed) return null;

  const candidateName = info?.candidateName || 'your candidate';
  const inviteHref = info?.candidateId
    ? `/candidates/${info.candidateId}?invite=1`
    : '/candidates';

  return (
    <Card className="border-sky-300 dark:border-sky-700 bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-sky-900/20 dark:to-indigo-900/20">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-full bg-sky-100 dark:bg-sky-900/40 shrink-0">
              <Megaphone className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sky-900 dark:text-sky-100">
                  Keep inviting voters to follow {candidateName}
                </p>
                <Badge
                  variant="outline"
                  className="text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700"
                >
                  Agent action
                </Badge>
              </div>
              <p className="text-sm text-sky-700 dark:text-sky-300 mt-1">
                Every follower expands the campaign&apos;s reach. Share an invite
                link or send SMS invites to friends, family and neighbours.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href={inviteHref}>
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-1" />
                Invite voters
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
