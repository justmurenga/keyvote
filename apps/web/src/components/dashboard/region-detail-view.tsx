import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  Globe,
  Map,
  MapPin,
  Users,
} from 'lucide-react';

type ChildLevel = 'county' | 'constituency' | 'ward' | 'polling_station';

interface ChildRow {
  id: string;
  name: string;
  registered_voters: number;
  sub_count?: number; // count of children of this child
  sub_label?: string;
}

interface RegionPageProps {
  level: 'national' | 'county' | 'constituency' | 'ward' | 'polling_station';
  id?: string;
}

const LEVEL_META: Record<
  string,
  { label: string; color: string; bg: string; icon: any }
> = {
  national: { label: 'National', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30', icon: Globe },
  county: { label: 'County', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30', icon: Map },
  constituency: { label: 'Constituency', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30', icon: Map },
  ward: { label: 'Ward', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30', icon: Building2 },
  polling_station: { label: 'Polling Station', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30', icon: MapPin },
};

const CHILD_LEVEL: Record<string, ChildLevel | null> = {
  national: 'county',
  county: 'constituency',
  constituency: 'ward',
  ward: 'polling_station',
  polling_station: null,
};

const CHILD_HREF: Record<ChildLevel, (id: string) => string> = {
  county: (id) => `/dashboard/regions/county/${id}`,
  constituency: (id) => `/dashboard/regions/constituency/${id}`,
  ward: (id) => `/dashboard/regions/ward/${id}`,
  polling_station: (id) => `/dashboard/regions/polling-station/${id}`,
};

async function loadRegion(props: RegionPageProps) {
  const supabase = createAdminClient();
  const db = supabase as any;

  let region: {
    id: string | null;
    name: string;
    registered_voters: number;
    parentBreadcrumb: { label: string; href: string }[];
    extra?: Record<string, string | number | null>;
  };

  if (props.level === 'national') {
    const { data: counties } = await db
      .from('counties')
      .select('registered_voters');
    const total = (counties || []).reduce(
      (s: number, c: any) => s + (c.registered_voters || 0),
      0,
    );
    const { count: psCount } = await db
      .from('polling_stations')
      .select('*', { count: 'exact', head: true });
    const { count: wardCount } = await db
      .from('wards')
      .select('*', { count: 'exact', head: true });
    const { count: constCount } = await db
      .from('constituencies')
      .select('*', { count: 'exact', head: true });

    region = {
      id: null,
      name: 'Kenya',
      registered_voters: total,
      parentBreadcrumb: [],
      extra: {
        Counties: counties?.length || 0,
        Constituencies: constCount || 0,
        Wards: wardCount || 0,
        'Polling Stations': psCount || 0,
      },
    };
  } else if (props.level === 'county') {
    const { data: county } = await db
      .from('counties')
      .select('id, name, code, registered_voters')
      .eq('id', props.id)
      .single();
    if (!county) notFound();
    const { count: constCount } = await db
      .from('constituencies')
      .select('*', { count: 'exact', head: true })
      .eq('county_id', county.id);
    const { count: psCount } = await db
      .from('polling_stations')
      .select('*', { count: 'exact', head: true })
      .eq('county_id', county.id);
    region = {
      id: county.id,
      name: county.name,
      registered_voters: county.registered_voters || 0,
      parentBreadcrumb: [{ label: 'Kenya', href: '/dashboard/regions/national' }],
      extra: {
        Code: county.code,
        Constituencies: constCount || 0,
        'Polling Stations': psCount || 0,
      },
    };
  } else if (props.level === 'constituency') {
    const { data: c } = await db
      .from('constituencies')
      .select('id, name, code, registered_voters, county_id, counties(id, name)')
      .eq('id', props.id)
      .single();
    if (!c) notFound();
    const { count: wardCount } = await db
      .from('wards')
      .select('*', { count: 'exact', head: true })
      .eq('constituency_id', c.id);
    const { count: psCount } = await db
      .from('polling_stations')
      .select('*', { count: 'exact', head: true })
      .eq('constituency_id', c.id);
    region = {
      id: c.id,
      name: c.name,
      registered_voters: c.registered_voters || 0,
      parentBreadcrumb: [
        { label: 'Kenya', href: '/dashboard/regions/national' },
        { label: c.counties?.name || 'County', href: `/dashboard/regions/county/${c.county_id}` },
      ],
      extra: {
        Code: c.code,
        Wards: wardCount || 0,
        'Polling Stations': psCount || 0,
      },
    };
  } else if (props.level === 'ward') {
    const { data: w } = await db
      .from('wards')
      .select(
        'id, name, code, registered_voters, constituency_id, constituencies(id, name, county_id, counties(id, name))',
      )
      .eq('id', props.id)
      .single();
    if (!w) notFound();
    const { count: psCount } = await db
      .from('polling_stations')
      .select('*', { count: 'exact', head: true })
      .eq('ward_id', w.id);
    region = {
      id: w.id,
      name: w.name,
      registered_voters: w.registered_voters || 0,
      parentBreadcrumb: [
        { label: 'Kenya', href: '/dashboard/regions/national' },
        {
          label: w.constituencies?.counties?.name || 'County',
          href: `/dashboard/regions/county/${w.constituencies?.county_id}`,
        },
        {
          label: w.constituencies?.name || 'Constituency',
          href: `/dashboard/regions/constituency/${w.constituency_id}`,
        },
      ],
      extra: {
        Code: w.code,
        'Polling Stations': psCount || 0,
      },
    };
  } else {
    // polling_station
    const { data: ps } = await db
      .from('polling_stations')
      .select(
        'id, code, display_name, name, stream, registered_voters, reg_centre_code, reg_centre_name, ward_id, wards(id, name, constituency_id, constituencies(id, name, county_id, counties(id, name)))',
      )
      .eq('id', props.id)
      .single();
    if (!ps) notFound();
    region = {
      id: ps.id,
      name: ps.display_name || ps.name,
      registered_voters: ps.registered_voters || 0,
      parentBreadcrumb: [
        { label: 'Kenya', href: '/dashboard/regions/national' },
        {
          label: ps.wards?.constituencies?.counties?.name || 'County',
          href: `/dashboard/regions/county/${ps.wards?.constituencies?.county_id}`,
        },
        {
          label: ps.wards?.constituencies?.name || 'Constituency',
          href: `/dashboard/regions/constituency/${ps.wards?.constituency_id}`,
        },
        {
          label: ps.wards?.name || 'Ward',
          href: `/dashboard/regions/ward/${ps.ward_id}`,
        },
      ],
      extra: {
        Code: ps.code,
        Stream: ps.stream,
        'Registration Centre': ps.reg_centre_name,
        'Centre Code': ps.reg_centre_code,
      },
    };
  }

  // Load children
  const childLevel = CHILD_LEVEL[props.level];
  let children: ChildRow[] = [];

  if (childLevel === 'county') {
    const { data } = await db
      .from('counties')
      .select('id, name, registered_voters')
      .order('name');
    children = (data || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      registered_voters: c.registered_voters || 0,
    }));
    // Optionally enrich with constituency counts (skipped for performance on national list of 47)
  } else if (childLevel === 'constituency') {
    const { data } = await db
      .from('constituencies')
      .select('id, name, registered_voters')
      .eq('county_id', props.id)
      .order('name');
    children = (data || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      registered_voters: c.registered_voters || 0,
    }));
  } else if (childLevel === 'ward') {
    const { data } = await db
      .from('wards')
      .select('id, name, registered_voters')
      .eq('constituency_id', props.id)
      .order('name');
    children = (data || []).map((w: any) => ({
      id: w.id,
      name: w.name,
      registered_voters: w.registered_voters || 0,
    }));
  } else if (childLevel === 'polling_station') {
    const { data } = await db
      .from('polling_stations')
      .select('id, display_name, name, registered_voters')
      .eq('ward_id', props.id)
      .order('display_name');
    children = (data || []).map((p: any) => ({
      id: p.id,
      name: p.display_name || p.name,
      registered_voters: p.registered_voters || 0,
    }));
  }

  return { region, children, childLevel };
}

export async function RegionDetailView(props: RegionPageProps) {
  const { region, children, childLevel } = await loadRegion(props);
  const meta = LEVEL_META[props.level];
  const Icon = meta.icon;
  const childMeta = childLevel ? LEVEL_META[childLevel] : null;

  const parentHref =
    region.parentBreadcrumb.length > 0
      ? region.parentBreadcrumb[region.parentBreadcrumb.length - 1].href
      : '/dashboard';

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
        <Link href="/dashboard" className="hover:text-foreground">
          Dashboard
        </Link>
        <ChevronRight className="h-3 w-3" />
        {region.parentBreadcrumb.map((b) => (
          <span key={b.href} className="flex items-center gap-1">
            <Link href={b.href} className="hover:text-foreground">
              {b.label}
            </Link>
            <ChevronRight className="h-3 w-3" />
          </span>
        ))}
        <span className="text-foreground font-medium">{region.name}</span>
      </nav>

      {/* Back */}
      <Link
        href={parentHref}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      {/* Header card */}
      <div className={`rounded-lg border ${meta.bg} p-6 shadow-sm`}>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center bg-white dark:bg-gray-900 shadow-sm flex-shrink-0">
            <Icon className={`h-7 w-7 ${meta.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className={`text-xs font-bold uppercase tracking-wider ${meta.color}`}>
              {meta.label}
            </div>
            <h1 className="text-2xl font-bold mt-0.5 truncate">{region.name}</h1>
            <div className="mt-3 flex items-baseline gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-3xl font-bold">
                {region.registered_voters.toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground">registered voters</span>
            </div>
          </div>
        </div>

        {region.extra && Object.keys(region.extra).length > 0 && (
          <div className="mt-5 pt-5 border-t border-black/10 dark:border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(region.extra).map(([k, v]) => (
              <div key={k}>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  {k}
                </div>
                <div className="text-base font-semibold mt-0.5">
                  {typeof v === 'number' ? v.toLocaleString() : v || '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Children list */}
      {childLevel && childMeta && children.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">
              {childMeta.label}s in {region.name}
            </h2>
            <span className="text-sm text-muted-foreground">
              {children.length.toLocaleString()} total
            </span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {children.map((c) => (
              <Link
                key={c.id}
                href={CHILD_HREF[childLevel](c.id)}
                className={`group flex items-center gap-3 rounded-lg border ${childMeta.bg} p-3 hover:shadow-md transition-all hover:-translate-y-0.5`}
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center bg-white dark:bg-gray-900 shadow-sm flex-shrink-0">
                  <childMeta.icon className={`h-4 w-4 ${childMeta.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" title={c.name}>
                    {c.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {c.registered_voters.toLocaleString()}
                    </span>{' '}
                    voters
                  </p>
                </div>
                <ChevronRight
                  className={`h-4 w-4 ${childMeta.color} opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0`}
                />
              </Link>
            ))}
          </div>
        </div>
      )}

      {childLevel && children.length === 0 && (
        <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
          No {childLevel.replace('_', ' ')}s found.
        </div>
      )}

      {!childLevel && (
        <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
          This is the lowest aggregation level — no further drill-down available.
        </div>
      )}
    </div>
  );
}
