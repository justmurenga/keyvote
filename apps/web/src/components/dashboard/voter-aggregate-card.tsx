'use client';

import { useState, useEffect } from 'react';
import { Users, MapPin, Building2, Map, Globe, Loader2 } from 'lucide-react';

interface VoterAggregate {
  level: string;
  region_id: string | null;
  region_name: string;
  registered_voters: number;
  polling_station_count: number;
  sub_region_count: number;
}

const LEVEL_CONFIG: Record<string, {
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  subLabel: string;
}> = {
  polling_station: {
    label: 'Polling Station',
    icon: MapPin,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    subLabel: '',
  },
  ward: {
    label: 'Ward',
    icon: Building2,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    subLabel: 'polling stations',
  },
  constituency: {
    label: 'Constituency',
    icon: Map,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    subLabel: 'wards',
  },
  county: {
    label: 'County',
    icon: Map,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    subLabel: 'constituencies',
  },
  national: {
    label: 'National',
    icon: Globe,
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    subLabel: 'counties',
  },
};

export function VoterAggregateCard() {
  const [aggregates, setAggregates] = useState<VoterAggregate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAggregates = async () => {
      try {
        const res = await fetch('/api/regions/voter-aggregates');
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to load voter data');
          return;
        }

        if (data.message && (!data.aggregates || data.aggregates.length === 0)) {
          setError(data.message);
          return;
        }

        setAggregates(data.aggregates || []);
      } catch (err) {
        console.error('Failed to fetch voter aggregates:', err);
        setError('Failed to load voter statistics');
      } finally {
        setLoading(false);
      }
    };
    fetchAggregates();
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border bg-card shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Registered Voters in Your Region</h3>
        </div>
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading voter statistics...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border bg-card shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Registered Voters in Your Region</h3>
        </div>
        <div className="text-center py-6">
          <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <a href="/dashboard/settings" className="text-sm text-primary hover:underline mt-2 inline-block">
            Update your polling station →
          </a>
        </div>
      </div>
    );
  }

  if (aggregates.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm p-6">
      <div className="flex items-center gap-2 mb-1">
        <Users className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Registered Voters in Your Region</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Aggregate registered voter counts from your polling station to national level
      </p>

      <div className="space-y-2">
        {aggregates.map((agg, index) => {
          const config = LEVEL_CONFIG[agg.level] || LEVEL_CONFIG.national;
          const Icon = config.icon;
          const isLast = index === aggregates.length - 1;

          return (
            <div key={agg.level} className="relative">
              {/* Connector line */}
              {!isLast && (
                <div className="absolute left-[19px] top-[44px] bottom-[-8px] w-px bg-border" />
              )}

              <div className={`flex items-center gap-3 p-3 rounded-lg ${config.bgColor} transition-colors`}>
                {/* Icon */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-gray-800 shadow-sm`}>
                  <Icon className={`h-5 w-5 ${config.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`text-xs font-medium uppercase tracking-wide ${config.color}`}>
                        {config.label}
                      </span>
                      <p className="text-sm font-semibold truncate">{agg.region_name}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-lg font-bold">{agg.registered_voters.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">voters</p>
                    </div>
                  </div>

                  {/* Sub stats */}
                  {agg.sub_region_count > 0 && config.subLabel && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {agg.sub_region_count} {config.subLabel}
                      {agg.polling_station_count > 0 && agg.level !== 'ward'
                        ? ` • ${agg.polling_station_count.toLocaleString()} polling stations`
                        : ''
                      }
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
