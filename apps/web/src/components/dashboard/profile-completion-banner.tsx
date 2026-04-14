'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, CheckCircle2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface ProfileCompletion {
  percentage: number;
  completedFields: number;
  totalFields: number;
  missingFields: string[];
  isComplete: boolean;
}

const FIELD_LABELS: Record<string, string> = {
  full_name: 'Full Name',
  phone: 'Phone Number',
  gender: 'Gender',
  age_bracket: 'Age Bracket',
  polling_station_id: 'Polling Station',
  email: 'Email',
  bio: 'Bio',
};

export function ProfileCompletionBanner() {
  const [completion, setCompletion] = useState<ProfileCompletion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const fetchCompletion = async () => {
      try {
        const res = await fetch('/api/profile', { credentials: 'same-origin' });
        if (res.ok) {
          const data = await res.json();
          setCompletion(data.completion);
        }
      } catch {
        // Silently fail — the banner is not critical
      } finally {
        setIsLoading(false);
      }
    };
    fetchCompletion();
  }, []);

  // Don't render if loading, dismissed, no data, or already complete
  if (isLoading || dismissed || !completion || completion.isComplete) {
    return null;
  }

  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30 shrink-0">
              <User className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-amber-900 dark:text-amber-200">
                  Complete your profile
                </p>
                <Badge
                  variant="outline"
                  className="text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                >
                  {completion.percentage}%
                </Badge>
              </div>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                Add your{' '}
                {completion.missingFields
                  .slice(0, 3)
                  .map((f) => FIELD_LABELS[f] || f)
                  .join(', ')}
                {completion.missingFields.length > 3 &&
                  ` and ${completion.missingFields.length - 3} more`}{' '}
                to improve your experience.
              </p>
              <Progress value={completion.percentage} className="h-1.5 mt-2 max-w-xs" />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/dashboard/profile">
              <Button size="sm">
                Complete Profile
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setDismissed(true)}
            >
              Later
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
