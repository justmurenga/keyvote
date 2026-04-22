'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, ClipboardCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PendingCounts {
  candidates: number;
  parties: number;
  agentReports: number;
  smsSenderIds: number;
}

interface PendingTasksResponse {
  total: number;
  counts: PendingCounts;
}

const ITEM_LABELS: { key: keyof PendingCounts; label: string; href: string }[] = [
  { key: 'candidates', label: 'candidate', href: '/dashboard/admin/candidates' },
  { key: 'parties', label: 'party', href: '/dashboard/admin/parties' },
  { key: 'agentReports', label: 'agent report', href: '/dashboard/admin/reports' },
  { key: 'smsSenderIds', label: 'SMS sender ID', href: '/dashboard/admin/sms' },
];

function plural(label: string, count: number): string {
  if (count === 1) return `${count} ${label}`;
  // Crude pluralization (handles "party" -> "parties", default add 's')
  if (label === 'party') return `${count} parties`;
  return `${count} ${label}s`;
}

export function AdminPendingTasksBanner() {
  const [data, setData] = useState<PendingTasksResponse | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const fetchTasks = async () => {
      try {
        const res = await fetch('/api/admin/pending-tasks', {
          credentials: 'same-origin',
        });
        if (res.ok && alive) {
          setData(await res.json());
        }
      } catch {
        // non-critical
      } finally {
        if (alive) setLoading(false);
      }
    };
    fetchTasks();
    const interval = setInterval(fetchTasks, 60_000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  if (loading || dismissed || !data || data.total === 0) return null;

  const items = ITEM_LABELS.filter((i) => data.counts[i.key] > 0);
  const primary = items[0];

  return (
    <Card className="border-amber-300 dark:border-amber-700 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/10">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/40 shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-amber-900 dark:text-amber-200">
                  {data.total} pending task{data.total === 1 ? '' : 's'} need your attention
                </p>
                <Badge
                  variant="outline"
                  className="text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                >
                  Action Required
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {items.map((item) => (
                  <Link key={item.key} href={item.href}>
                    <Badge
                      variant="secondary"
                      className="cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-800/50"
                    >
                      <ClipboardCheck className="h-3 w-3 mr-1" />
                      {plural(item.label, data.counts[item.key])} pending
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {primary && (
              <Link href={primary.href}>
                <Button size="sm">
                  Review now
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            )}
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
