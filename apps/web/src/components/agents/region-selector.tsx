'use client';

import { useState } from 'react';
import { MapPin, ChevronDown, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRegions } from '@/hooks/use-regions';

const REGION_TYPES = [
  { value: 'national', label: 'National' },
  { value: 'county', label: 'County' },
  { value: 'constituency', label: 'Constituency' },
  { value: 'ward', label: 'Ward' },
  { value: 'polling_station', label: 'Polling Station' },
] as const;

interface RegionSelectorProps {
  regionType: string;
  onRegionTypeChange: (type: string) => void;
  countyId?: string;
  onCountyChange: (id: string) => void;
  constituencyId?: string;
  onConstituencyChange: (id: string) => void;
  wardId?: string;
  onWardChange: (id: string) => void;
  pollingStationId?: string;
  onPollingStationChange: (id: string) => void;
}

export function RegionSelector({
  regionType,
  onRegionTypeChange,
  countyId,
  onCountyChange,
  constituencyId,
  onConstituencyChange,
  wardId,
  onWardChange,
  pollingStationId,
  onPollingStationChange,
}: RegionSelectorProps) {
  const {
    counties,
    constituencies,
    wards,
    pollingStations,
    isLoading,
    loadConstituencies,
    loadWards,
    loadPollingStations,
  } = useRegions();

  const handleCountyChange = (id: string) => {
    onCountyChange(id);
    onConstituencyChange('');
    onWardChange('');
    onPollingStationChange('');
    loadConstituencies(id);
  };

  const handleConstituencyChange = (id: string) => {
    onConstituencyChange(id);
    onWardChange('');
    onPollingStationChange('');
    loadWards(id);
  };

  const handleWardChange = (id: string) => {
    onWardChange(id);
    onPollingStationChange('');
    loadPollingStations(id);
  };

  const showCounty = ['county', 'constituency', 'ward', 'polling_station'].includes(regionType);
  const showConstituency = ['constituency', 'ward', 'polling_station'].includes(regionType);
  const showWard = ['ward', 'polling_station'].includes(regionType);
  const showPollingStation = regionType === 'polling_station';

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Assignment Level</Label>
        <Select value={regionType} onValueChange={onRegionTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select assignment level" />
          </SelectTrigger>
          <SelectContent>
            {REGION_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <span className="flex items-center gap-2">
                  <MapPin className="h-3 w-3" />
                  {type.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showCounty && (
        <div className="space-y-2">
          <Label>County</Label>
          <Select value={countyId || ''} onValueChange={handleCountyChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select county" />
            </SelectTrigger>
            <SelectContent>
              {counties.map((county) => (
                <SelectItem key={county.id} value={county.id}>
                  {county.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showConstituency && countyId && (
        <div className="space-y-2">
          <Label>Constituency</Label>
          {isLoading && constituencies.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading constituencies...
            </div>
          ) : (
            <Select value={constituencyId || ''} onValueChange={handleConstituencyChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select constituency" />
              </SelectTrigger>
              <SelectContent>
                {constituencies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {showWard && constituencyId && (
        <div className="space-y-2">
          <Label>Ward</Label>
          {isLoading && wards.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading wards...
            </div>
          ) : (
            <Select value={wardId || ''} onValueChange={handleWardChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select ward" />
              </SelectTrigger>
              <SelectContent>
                {wards.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {showPollingStation && wardId && (
        <div className="space-y-2">
          <Label>Polling Station</Label>
          {isLoading && pollingStations.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading polling stations...
            </div>
          ) : (
            <Select value={pollingStationId || ''} onValueChange={onPollingStationChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select polling station" />
              </SelectTrigger>
              <SelectContent>
                {pollingStations.map((ps) => (
                  <SelectItem key={ps.id} value={ps.id}>
                    {ps.name || ps.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  );
}
