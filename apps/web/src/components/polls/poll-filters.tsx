'use client';

import { Button } from '@/components/ui/button';
import { POSITION_FILTERS } from './types';

interface PollFiltersProps {
  positionFilter: string;
  statusFilter: string;
  onPositionChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  statusOptions?: { value: string; label: string }[];
}

const DEFAULT_STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
];

export function PollFilters({
  positionFilter,
  statusFilter,
  onPositionChange,
  onStatusChange,
  statusOptions = DEFAULT_STATUS_OPTIONS,
}: PollFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Position Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
        {POSITION_FILTERS.map((pos) => (
          <Button
            key={pos.value}
            variant={positionFilter === pos.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPositionChange(pos.value)}
          >
            {pos.label}
          </Button>
        ))}
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 sm:ml-auto">
        {statusOptions.map((s) => (
          <Button
            key={s.value}
            variant={statusFilter === s.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onStatusChange(s.value)}
          >
            {s.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
