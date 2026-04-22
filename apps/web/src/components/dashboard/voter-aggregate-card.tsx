'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  MapPin,
  Building2,
  Map,
  Globe,
  Loader2,
  ChevronRight,
} from 'lucide-react';

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
  borderColor: string;
  ringColor: string;
  subLabel: string;
  drillLabel: string;
  href: (id: string | null) => string;
}> = {
  national: {
    label: 'National',
    icon: Globe,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-900',
    ringColor: 'group-hover:ring-red-300',
    subLabel: 'counties',
    drillLabel: 'View all counties',
    href: () => '/dashboard/regions/national',
  },
  county: {
    label: 'County',
    icon: Map,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-200 dark:border-orange-900',
    ringColor: 'group-hover:ring-orange-300',
    subLabel: 'constituencies',
    drillLabel: 'View constituencies',
    href: (id) => `/dashboard/regions/county/${id}`,
  },
  constituency: {
    label: 'Constituency',
    icon: Map,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    borderColor: 'border-purple-200 dark:border-purple-900',
    ringColor: 'group-hover:ring-purple-300',
    subLabel: 'wards',
    drillLabel: 'View wards',
    href: (id) => `/dashboard/regions/constituency/${id}`,
  },
  ward: {
    label: 'Ward',
    icon: Building2,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-200 dark:border-emerald-900',
    ringColor: 'group-hover:ring-emerald-300',
    subLabel: 'polling stations',
    drillLabel: 'View polling stations',
    href: (id) => `/dashboard/regions/ward/${id}`,
  },
  polling_station: {
    label: 'Polling Station',
    icon: MapPin,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-900',
    ringColor: 'group-hover:ring-blue-300',
    subLabel: '',
    drillLabel: 'View station details',
    href: (id) => `/dashboard/regions/polling-station/${id}`,
  },
};

// Order high → low (national first, polling station last)
const LEVEL_ORDER = ['national', 'county', 'constituency', 'ward', 'polling_station'];

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

  const Header = (
    <div>
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Registered Voters in Your Region</h2>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Drill down from national to your polling station — click any card for finer statistics
      </p>
    </div>
  );

  if (loading) {
    return (
      <section className="space-y-3">
        {Header}
        <div className="rounded-lg border bg-card shadow-sm p-6 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading voter statistics...
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-3">
        {Header}
        <div className="rounded-lg border bg-card shadow-sm p-6 text-center">
          <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Link
            href="/dashboard/regions/national"
            className="text-sm text-primary hover:underline mt-2 inline-block"
          >
            Browse national voter statistics →
          </Link>
        </div>
      </section>
    );
  }

  if (aggregates.length === 0) return null;

  // Sort high → low (national first)
  const sorted = [...aggregates].sort(
    (a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level),
  );

  return (
    <section className="space-y-3">
      {Header}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {sorted.map((agg) => {
          const config = LEVEL_CONFIG[agg.level] || LEVEL_CONFIG.national;
          const Icon = config.icon;
          const href = config.href(agg.region_id);

          return (
            <Link
              key={agg.level}
              href={href}
              className={`group relative rounded-lg border ${config.borderColor} ${config.bgColor} p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 ring-0 ring-offset-2 ${config.ringColor} hover:ring-2`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-gray-900 shadow-sm">
                  <Icon className={`h-5 w-5 ${config.color}`} />
                </div>
                <ChevronRight
                  className={`h-4 w-4 ${config.color} opacity-0 group-hover:opacity-100 transition-opacity`}
                />
              </div>

              <div className={`text-[10px] font-bold uppercase tracking-wider ${config.color}`}>
                {config.label}
              </div>
              <p
                className="text-sm font-semibold truncate mt-0.5"
                title={agg.region_name}
              >
                {agg.region_name}
              </p>

              <div className="mt-3">
                <p className="text-2xl font-bold leading-none">
                  {agg.registered_voters.toLocaleString()}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  registered voters
                </p>
              </div>

              {/* Finer stats */}
              <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5 space-y-0.5">
                {agg.sub_region_count > 0 && config.subLabel && (
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {agg.sub_region_count.toLocaleString()}
                    </span>{' '}
                    {config.subLabel}
                  </p>
                )}
                {agg.polling_station_count > 0 &&
                  agg.level !== 'ward' &&
                  agg.level !== 'polling_station' && (
                    <p className="text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {agg.polling_station_count.toLocaleString()}
                      </span>{' '}
                      polling stations
                    </p>
                  )}
                {agg.level === 'polling_station' && (
                  <p className="text-[11px] text-muted-foreground">
                    Your assigned station
                  </p>
                )}
                <p
                  className={`text-[11px] font-medium ${config.color} pt-1 flex items-center gap-1`}
                >
                  {config.drillLabel}
                  <ChevronRight className="h-3 w-3" />
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
