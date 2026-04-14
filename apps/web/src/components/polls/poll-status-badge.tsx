'use client';

import { Badge } from '@/components/ui/badge';
import { STATUS_STYLES } from './types';

interface PollStatusBadgeProps {
  status: string;
  className?: string;
}

export function PollStatusBadge({ status, className }: PollStatusBadgeProps) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.draft;
  return (
    <Badge className={`${style.bg} text-white ${className || ''}`}>
      {style.label}
    </Badge>
  );
}
