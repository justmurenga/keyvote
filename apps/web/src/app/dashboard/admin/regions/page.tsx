'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MapPin,
  Building,
  Map,
  Landmark,
  RefreshCw,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type RegionLevel = 'counties' | 'constituencies' | 'wards' | 'polling_stations';

interface RegionStats {
  counties: number;
  constituencies: number;
  wards: number;
  pollingStations: number;
  totalVoters: number;
}

interface Region {
  id: string;
  code: string;
  name: string;
  registered_voters?: number;
  // Relations
  county_id?: string;
  constituency_id?: string;
  ward_id?: string;
  county?: { name: string };
  constituency?: { name: string };
  ward?: { name: string };
  // Polling station specific
  stream?: string;
  display_name?: string;
  reg_centre_code?: string;
  reg_centre_name?: string;
  // Counts
  _count?: {
    constituencies?: number;
    wards?: number;
    polling_stations?: number;
  };
}

const levelConfig: Record<RegionLevel, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  counties: { label: 'Counties', icon: Building, color: 'text-blue-500' },
  constituencies: { label: 'Constituencies', icon: Map, color: 'text-green-500' },
  wards: { label: 'Wards', icon: Landmark, color: 'text-purple-500' },
  polling_stations: { label: 'Polling Stations', icon: MapPin, color: 'text-red-500' },
};

export default function AdminRegionsPage() {
  const [activeLevel, setActiveLevel] = useState<RegionLevel>('counties');
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<RegionStats | null>(null);
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null);
  const [childRegions, setChildRegions] = useState<Region[]>([]);
  const [childLoading, setChildLoading] = useState(false);

  // Drill-down filters
  const [selectedCounty, setSelectedCounty] = useState('');
  const [selectedConstituency, setSelectedConstituency] = useState('');
  const [selectedWard, setSelectedWard] = useState('');
  const [counties, setCounties] = useState<{ id: string; name: string }[]>([]);
  const [constituencies, setConstituencies] = useState<{ id: string; name: string }[]>([]);
  const [wards, setWards] = useState<{ id: string; name: string }[]>([]);

  // Fetch filter options
  useEffect(() => {
    fetch('/api/regions/counties').then(r => r.json()).then(d => setCounties(d.counties || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedCounty) {
      fetch(`/api/regions/constituencies?county_id=${selectedCounty}`).then(r => r.json()).then(d => setConstituencies(d.constituencies || [])).catch(() => {});
    } else {
      setConstituencies([]);
      setSelectedConstituency('');
    }
  }, [selectedCounty]);

  useEffect(() => {
    if (selectedConstituency) {
      fetch(`/api/regions/wards?constituency_id=${selectedConstituency}`).then(r => r.json()).then(d => setWards(d.wards || [])).catch(() => {});
    } else {
      setWards([]);
      setSelectedWard('');
    }
  }, [selectedConstituency]);

  const fetchRegions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '25', level: activeLevel });
      if (search) params.set('search', search);
      if (selectedCounty && activeLevel !== 'counties') params.set('county_id', selectedCounty);
      if (selectedConstituency && (activeLevel === 'wards' || activeLevel === 'polling_stations')) params.set('constituency_id', selectedConstituency);
      if (selectedWard && activeLevel === 'polling_stations') params.set('ward_id', selectedWard);

      const res = await fetch(`/api/admin/regions?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRegions(data.regions || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.total || 0);
        if (data.stats) setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch regions:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search, activeLevel, selectedCounty, selectedConstituency, selectedWard]);

  useEffect(() => { fetchRegions(); }, [fetchRegions]);

  const fetchChildren = async (regionId: string) => {
    if (expandedRegion === regionId) {
      setExpandedRegion(null);
      setChildRegions([]);
      return;
    }
    setExpandedRegion(regionId);
    setChildLoading(true);
    try {
      let childLevel: string;
      let parentParam: string;
      switch (activeLevel) {
        case 'counties': childLevel = 'constituencies'; parentParam = `county_id=${regionId}`; break;
        case 'constituencies': childLevel = 'wards'; parentParam = `constituency_id=${regionId}`; break;
        case 'wards': childLevel = 'polling_stations'; parentParam = `ward_id=${regionId}`; break;
        default: return;
      }
      const res = await fetch(`/api/admin/regions?level=${childLevel}&${parentParam}&limit=100`);
      if (res.ok) {
        const data = await res.json();
        setChildRegions(data.regions || []);
      }
    } catch (error) {
      console.error('Failed to fetch children:', error);
    } finally {
      setChildLoading(false);
    }
  };

  const handleLevelChange = (level: RegionLevel) => {
    setActiveLevel(level);
    setPage(1);
    setSearch('');
    setExpandedRegion(null);
    setChildRegions([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Electoral Regions</h1>
          <p className="text-muted-foreground mt-1">Manage the electoral hierarchy</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRegions}>
          <RefreshCw className="h-4 w-4 mr-2" />Refresh
        </Button>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
          {[
            { label: 'Counties', value: stats.counties, icon: Building },
            { label: 'Constituencies', value: stats.constituencies, icon: Map },
            { label: 'Wards', value: stats.wards, icon: Landmark },
            { label: 'Polling Stations', value: stats.pollingStations, icon: MapPin },
            { label: 'Registered Voters', value: stats.totalVoters, icon: Users },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2">
                  <s.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
                <p className="text-xl font-bold mt-1">{s.value.toLocaleString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Level Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {(Object.keys(levelConfig) as RegionLevel[]).map((level) => {
          const config = levelConfig[level];
          const Icon = config.icon;
          return (
            <button
              key={level}
              onClick={() => handleLevelChange(level)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                activeLevel === level
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{config.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={`Search ${levelConfig[activeLevel].label.toLowerCase()}...`} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
            </div>
            {activeLevel !== 'counties' && (
              <select value={selectedCounty} onChange={(e) => { setSelectedCounty(e.target.value); setPage(1); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">All Counties</option>
                {counties.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            {(activeLevel === 'wards' || activeLevel === 'polling_stations') && selectedCounty && (
              <select value={selectedConstituency} onChange={(e) => { setSelectedConstituency(e.target.value); setPage(1); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">All Constituencies</option>
                {constituencies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            {activeLevel === 'polling_stations' && selectedConstituency && (
              <select value={selectedWard} onChange={(e) => { setSelectedWard(e.target.value); setPage(1); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">All Wards</option>
                {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Regions Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium w-8"></th>
                  <th className="text-left p-4 font-medium">Code</th>
                  <th className="text-left p-4 font-medium">Name</th>
                  {activeLevel === 'polling_stations' && <th className="text-left p-4 font-medium">Stream</th>}
                  {activeLevel !== 'counties' && <th className="text-left p-4 font-medium">Parent</th>}
                  <th className="text-right p-4 font-medium">Registered Voters</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(10)].map((_, i) => (
                    <tr key={i} className="border-b">
                      {[...Array(activeLevel === 'polling_stations' ? 6 : activeLevel === 'counties' ? 4 : 5)].map((_, j) => (
                        <td key={j} className="p-4"><div className="h-4 bg-muted rounded animate-pulse w-20" /></td>
                      ))}
                    </tr>
                  ))
                ) : regions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">No regions found</td>
                  </tr>
                ) : (
                  regions.map((region) => (
                    <>
                      <tr key={region.id} className="border-b hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => activeLevel !== 'polling_stations' && fetchChildren(region.id)}>
                        <td className="p-4">
                          {activeLevel !== 'polling_stations' && (
                            expandedRegion === region.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className="font-mono text-xs">{region.code}</Badge>
                        </td>
                        <td className="p-4">
                          <span className="font-medium">{region.display_name || region.name}</span>
                          {region.stream && <span className="text-xs text-muted-foreground ml-2">Stream {region.stream}</span>}
                        </td>
                        {activeLevel === 'polling_stations' && <td className="p-4 text-muted-foreground">{region.stream || '-'}</td>}
                        {activeLevel !== 'counties' && (
                          <td className="p-4 text-muted-foreground">
                            {region.county?.name || region.constituency?.name || region.ward?.name || '-'}
                          </td>
                        )}
                        <td className="p-4 text-right font-medium">
                          {(region.registered_voters || 0).toLocaleString()}
                        </td>
                      </tr>
                      {expandedRegion === region.id && activeLevel !== 'polling_stations' && (
                        <tr key={`${region.id}-children`}>
                          <td colSpan={6} className="p-0">
                            <div className="bg-muted/20 border-y px-8 py-3">
                              {childLoading ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Loading...
                                </div>
                              ) : childRegions.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-2">No sub-regions found</p>
                              ) : (
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground font-medium mb-2">
                                    {childRegions.length} {activeLevel === 'counties' ? 'constituencies' : activeLevel === 'constituencies' ? 'wards' : 'polling stations'}
                                  </p>
                                  {childRegions.slice(0, 20).map((child) => (
                                    <div key={child.id} className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-muted/50">
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="font-mono text-[10px]">{child.code}</Badge>
                                        <span>{child.display_name || child.name}</span>
                                      </div>
                                      <span className="text-muted-foreground">{(child.registered_voters || 0).toLocaleString()} voters</span>
                                    </div>
                                  ))}
                                  {childRegions.length > 20 && (
                                    <p className="text-xs text-muted-foreground text-center pt-1">
                                      ... and {childRegions.length - 20} more
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages} ({totalCount} total)</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
