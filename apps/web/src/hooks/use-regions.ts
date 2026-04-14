'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Region {
  id: string;
  name: string;
  code?: string;
  display_name?: string;
}

interface UseRegionsReturn {
  counties: Region[];
  constituencies: Region[];
  wards: Region[];
  pollingStations: Region[];
  isLoading: boolean;
  loadConstituencies: (countyId: string) => Promise<void>;
  loadWards: (constituencyId: string) => Promise<void>;
  loadPollingStations: (wardId: string) => Promise<void>;
  searchRegions: (type: string, search: string, parentId?: string) => Promise<Region[]>;
}

export function useRegions(): UseRegionsReturn {
  const [counties, setCounties] = useState<Region[]>([]);
  const [constituencies, setConstituencies] = useState<Region[]>([]);
  const [wards, setWards] = useState<Region[]>([]);
  const [pollingStations, setPollingStations] = useState<Region[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load counties on mount
  useEffect(() => {
    async function loadCounties() {
      try {
        const res = await fetch('/api/regions?type=counties');
        const data = await res.json();
        if (data.success) {
          setCounties(data.regions);
        }
      } catch {
        console.error('Failed to load counties');
      }
    }
    loadCounties();
  }, []);

  const loadConstituencies = useCallback(async (countyId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/regions?type=constituencies&parentId=${countyId}`);
      const data = await res.json();
      if (data.success) {
        setConstituencies(data.regions);
        setWards([]);
        setPollingStations([]);
      }
    } catch {
      console.error('Failed to load constituencies');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadWards = useCallback(async (constituencyId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/regions?type=wards&parentId=${constituencyId}`);
      const data = await res.json();
      if (data.success) {
        setWards(data.regions);
        setPollingStations([]);
      }
    } catch {
      console.error('Failed to load wards');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadPollingStations = useCallback(async (wardId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/regions?type=polling_stations&parentId=${wardId}`);
      const data = await res.json();
      if (data.success) {
        setPollingStations(
          data.regions.map((r: any) => ({ ...r, name: r.display_name || r.name }))
        );
      }
    } catch {
      console.error('Failed to load polling stations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchRegions = useCallback(async (type: string, search: string, parentId?: string) => {
    try {
      const params = new URLSearchParams({ type, search });
      if (parentId) params.set('parentId', parentId);
      const res = await fetch(`/api/regions?${params.toString()}`);
      const data = await res.json();
      return data.success ? data.regions : [];
    } catch {
      return [];
    }
  }, []);

  return {
    counties,
    constituencies,
    wards,
    pollingStations,
    isLoading,
    loadConstituencies,
    loadWards,
    loadPollingStations,
    searchRegions,
  };
}
