'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, MapPin, Users, Loader2, Search, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

interface Region {
  id: string;
  code: string;
  name: string;
  registered_voters?: number;
}

interface PollingStation {
  id: string;
  code: string;
  name: string;
  stream: string | null;
  display_name: string;
  reg_centre_code: string;
  reg_centre_name: string;
  registered_voters: number;
}

interface PollingStationSelectorProps {
  onSelect: (pollingStationId: string, pollingStationName: string) => void;
  selectedId?: string;
  disabled?: boolean;
}

type FetchError = { level: string; message: string } | null;

export function PollingStationSelector({ onSelect, selectedId, disabled }: PollingStationSelectorProps) {
  // State for each level
  const [counties, setCounties] = useState<Region[]>([]);
  const [constituencies, setConstituencies] = useState<Region[]>([]);
  const [wards, setWards] = useState<Region[]>([]);
  const [pollingStations, setPollingStations] = useState<PollingStation[]>([]);

  // Selected values
  const [selectedCounty, setSelectedCounty] = useState('');
  const [selectedConstituency, setSelectedConstituency] = useState('');
  const [selectedWard, setSelectedWard] = useState('');
  const [selectedStation, setSelectedStation] = useState(selectedId || '');

  // Selected names for breadcrumb
  const [selectedCountyName, setSelectedCountyName] = useState('');
  const [selectedConstituencyName, setSelectedConstituencyName] = useState('');
  const [selectedWardName, setSelectedWardName] = useState('');

  // Loading states
  const [loadingCounties, setLoadingCounties] = useState(false);
  const [loadingConstituencies, setLoadingConstituencies] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);
  const [loadingStations, setLoadingStations] = useState(false);

  // Error state
  const [fetchError, setFetchError] = useState<FetchError>(null);

  // Search filter for polling stations
  const [stationSearch, setStationSearch] = useState('');

  // Fetch counties on mount
  useEffect(() => {
    fetchCounties();
  }, []);

  const fetchCounties = async () => {
    setLoadingCounties(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/regions/counties');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCounties(data.counties || []);
    } catch (error) {
      console.error('Failed to fetch counties:', error);
      setFetchError({ level: 'counties', message: 'Failed to load counties. Check your connection and try again.' });
    } finally {
      setLoadingCounties(false);
    }
  };

  // Fetch constituencies when county changes
  const fetchConstituencies = useCallback(async (countyId: string) => {
    if (!countyId) {
      setConstituencies([]);
      return;
    }
    setLoadingConstituencies(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/regions/constituencies?county_id=${countyId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setConstituencies(data.constituencies || []);
    } catch (error) {
      console.error('Failed to fetch constituencies:', error);
      setFetchError({ level: 'constituencies', message: 'Failed to load constituencies. Please try again.' });
    } finally {
      setLoadingConstituencies(false);
    }
  }, []);

  // Fetch wards when constituency changes
  const fetchWards = useCallback(async (constituencyId: string) => {
    if (!constituencyId) {
      setWards([]);
      return;
    }
    setLoadingWards(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/regions/wards?constituency_id=${constituencyId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setWards(data.wards || []);
    } catch (error) {
      console.error('Failed to fetch wards:', error);
      setFetchError({ level: 'wards', message: 'Failed to load wards. Please try again.' });
    } finally {
      setLoadingWards(false);
    }
  }, []);

  // Fetch polling stations when ward changes
  const fetchPollingStations = useCallback(async (wardId: string) => {
    if (!wardId) {
      setPollingStations([]);
      return;
    }
    setLoadingStations(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/regions/polling-stations?ward_id=${wardId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPollingStations(data.polling_stations || []);
    } catch (error) {
      console.error('Failed to fetch polling stations:', error);
      setFetchError({ level: 'polling-stations', message: 'Failed to load polling stations. Please try again.' });
    } finally {
      setLoadingStations(false);
    }
  }, []);

  // Retry handler
  const handleRetry = () => {
    if (!fetchError) return;
    switch (fetchError.level) {
      case 'counties':
        fetchCounties();
        break;
      case 'constituencies':
        fetchConstituencies(selectedCounty);
        break;
      case 'wards':
        fetchWards(selectedConstituency);
        break;
      case 'polling-stations':
        fetchPollingStations(selectedWard);
        break;
    }
  };

  // Handle county selection
  const handleCountyChange = (countyId: string) => {
    setSelectedCounty(countyId);
    setSelectedCountyName(counties.find(c => c.id === countyId)?.name || '');
    setSelectedConstituency('');
    setSelectedConstituencyName('');
    setSelectedWard('');
    setSelectedWardName('');
    setSelectedStation('');
    setConstituencies([]);
    setWards([]);
    setPollingStations([]);
    setStationSearch('');
    setFetchError(null);
    onSelect('', '');
    fetchConstituencies(countyId);
  };

  // Handle constituency selection
  const handleConstituencyChange = (constituencyId: string) => {
    setSelectedConstituency(constituencyId);
    setSelectedConstituencyName(constituencies.find(c => c.id === constituencyId)?.name || '');
    setSelectedWard('');
    setSelectedWardName('');
    setSelectedStation('');
    setWards([]);
    setPollingStations([]);
    setStationSearch('');
    setFetchError(null);
    onSelect('', '');
    fetchWards(constituencyId);
  };

  // Handle ward selection
  const handleWardChange = (wardId: string) => {
    setSelectedWard(wardId);
    setSelectedWardName(wards.find(w => w.id === wardId)?.name || '');
    setSelectedStation('');
    setPollingStations([]);
    setStationSearch('');
    setFetchError(null);
    onSelect('', '');
    fetchPollingStations(wardId);
  };

  // Handle polling station selection
  const handleStationChange = (stationId: string) => {
    setSelectedStation(stationId);
    const station = pollingStations.find(ps => ps.id === stationId);
    if (station) {
      onSelect(stationId, station.display_name);
    }
  };

  // Filter polling stations by search
  const filteredStations = pollingStations.filter(ps =>
    !stationSearch ||
    ps.display_name.toLowerCase().includes(stationSearch.toLowerCase()) ||
    ps.code.includes(stationSearch)
  );

  const formatVoters = (count?: number) => {
    if (!count) return '';
    return count.toLocaleString();
  };

  // Breadcrumb of the current selection path
  const breadcrumbParts = [
    selectedCountyName,
    selectedConstituencyName,
    selectedWardName,
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      {/* Selection Breadcrumb */}
      {breadcrumbParts.length > 0 && (
        <div className="flex items-center flex-wrap gap-1 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
          <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
          {breadcrumbParts.map((part, i) => (
            <span key={i} className="flex items-center">
              {i > 0 && <ChevronRight className="h-3 w-3 mx-1 flex-shrink-0" />}
              <span className={i === breadcrumbParts.length - 1 ? 'font-medium text-foreground' : ''}>
                {part}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Error Alert */}
      {fetchError && (
        <div className="flex items-center justify-between p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
          <div className="flex items-center text-destructive">
            <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{fetchError.message}</span>
          </div>
          <button
            onClick={handleRetry}
            className="flex items-center text-destructive hover:text-destructive/80 ml-3 text-xs font-medium"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </button>
        </div>
      )}

      {/* County Selection */}
      <div>
        <label className="block text-sm font-medium mb-2">
          <MapPin className="inline h-4 w-4 mr-1 text-muted-foreground" />
          County
        </label>
        <div className="relative">
          <select
            value={selectedCounty}
            onChange={(e) => handleCountyChange(e.target.value)}
            disabled={disabled || loadingCounties}
            className="w-full px-4 py-3 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">
              {loadingCounties ? 'Loading counties...' : 'Select your county'}
            </option>
            {counties.map((county) => (
              <option key={county.id} value={county.id}>
                {county.name}
                {county.registered_voters ? ` (${formatVoters(county.registered_voters)} voters)` : ''}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {loadingCounties ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : selectedCounty ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
        {counties.length > 0 && !selectedCounty && (
          <p className="mt-1 text-xs text-muted-foreground">{counties.length} counties available</p>
        )}
      </div>

      {/* Constituency Selection */}
      {selectedCounty && (
        <div className="animate-in slide-in-from-top-2 duration-200">
          <label className="block text-sm font-medium mb-2">
            <MapPin className="inline h-4 w-4 mr-1 text-muted-foreground" />
            Constituency
          </label>
          <div className="relative">
            <select
              value={selectedConstituency}
              onChange={(e) => handleConstituencyChange(e.target.value)}
              disabled={disabled || loadingConstituencies}
              className="w-full px-4 py-3 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {loadingConstituencies ? 'Loading constituencies...' : 'Select your constituency'}
              </option>
              {constituencies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.registered_voters ? ` (${formatVoters(c.registered_voters)} voters)` : ''}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              {loadingConstituencies ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : selectedConstituency ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
          {constituencies.length > 0 && !selectedConstituency && (
            <p className="mt-1 text-xs text-muted-foreground">
              {constituencies.length} constituencies in {selectedCountyName}
            </p>
          )}
        </div>
      )}

      {/* Ward Selection */}
      {selectedConstituency && (
        <div className="animate-in slide-in-from-top-2 duration-200">
          <label className="block text-sm font-medium mb-2">
            <MapPin className="inline h-4 w-4 mr-1 text-muted-foreground" />
            Ward
          </label>
          <div className="relative">
            <select
              value={selectedWard}
              onChange={(e) => handleWardChange(e.target.value)}
              disabled={disabled || loadingWards}
              className="w-full px-4 py-3 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {loadingWards ? 'Loading wards...' : 'Select your ward'}
              </option>
              {wards.map((ward) => (
                <option key={ward.id} value={ward.id}>
                  {ward.name}
                  {ward.registered_voters ? ` (${formatVoters(ward.registered_voters)} voters)` : ''}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              {loadingWards ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : selectedWard ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
          {wards.length > 0 && !selectedWard && (
            <p className="mt-1 text-xs text-muted-foreground">
              {wards.length} wards in {selectedConstituencyName}
            </p>
          )}
        </div>
      )}

      {/* Polling Station Selection */}
      {selectedWard && (
        <div className="animate-in slide-in-from-top-2 duration-200">
          <label className="block text-sm font-medium mb-2">
            <MapPin className="inline h-4 w-4 mr-1 text-muted-foreground" />
            Polling Station
          </label>

          {/* Search filter for stations */}
          {pollingStations.length > 5 && (
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search polling stations..."
                value={stationSearch}
                onChange={(e) => setStationSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              />
            </div>
          )}

          <div className="relative">
            {loadingStations ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading polling stations...
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
                {filteredStations.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    {stationSearch
                      ? 'No stations match your search'
                      : 'No polling stations found in this ward'}
                  </div>
                ) : (
                  filteredStations.map((station) => (
                    <label
                      key={station.id}
                      className={`flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedStation === station.id
                          ? 'bg-primary/5 border-l-2 border-l-primary'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="polling_station"
                          value={station.id}
                          checked={selectedStation === station.id}
                          onChange={() => handleStationChange(station.id)}
                          disabled={disabled}
                          className="h-4 w-4 text-primary focus:ring-primary"
                        />
                        <div>
                          <div className="text-sm font-medium">{station.display_name}</div>
                          <div className="text-xs text-muted-foreground">
                            Code: {station.code}
                            {station.reg_centre_name && ` • ${station.reg_centre_name}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Users className="h-3 w-3 mr-1" />
                        {formatVoters(station.registered_voters)}
                      </div>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          {filteredStations.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {filteredStations.length} polling station{filteredStations.length !== 1 ? 's' : ''} in {selectedWardName}
            </p>
          )}
        </div>
      )}

      {/* Selection Complete Summary */}
      {selectedStation && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-start gap-2 text-sm text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium">
                {pollingStations.find(ps => ps.id === selectedStation)?.display_name}
              </div>
              <div className="text-xs mt-0.5 opacity-80">
                {selectedCountyName} → {selectedConstituencyName} → {selectedWardName}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
