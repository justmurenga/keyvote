'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Users, MapPin, TrendingUp } from 'lucide-react';
import type { PollResultsByRegion } from './types';

interface PollResultsChartProps {
  title: string;
  regions: PollResultsByRegion[];
  totalVotes: number;
  onRegionClick?: (regionId: string, regionName: string) => void;
  emptyMessage?: string;
}

export function PollResultsChart({
  title,
  regions,
  totalVotes,
  onRegionClick,
  emptyMessage = 'No results data available',
}: PollResultsChartProps) {
  if (regions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{emptyMessage}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {regions.map((region) => (
          <div
            key={region.regionId}
            className={`rounded-lg border p-4 space-y-3 ${
              onRegionClick ? 'cursor-pointer hover:border-primary/50 transition-colors' : ''
            }`}
            onClick={() => onRegionClick?.(region.regionId, region.regionName)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">{region.regionName}</h4>
                {onRegionClick && (
                  <Badge variant="outline" className="text-xs">Click to drill down</Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                {region.totalVotes.toLocaleString()} votes
              </div>
            </div>
            <div className="space-y-2">
              {region.candidates.slice(0, 5).map((candidate, index) => (
                <div key={candidate.candidateId} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-5 text-center text-muted-foreground font-medium text-xs">
                        {index + 1}
                      </span>
                      <span className={index === 0 ? 'font-semibold' : ''}>
                        {candidate.name}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        ({candidate.party})
                      </span>
                      {index === 0 && (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      )}
                    </div>
                    <span className="text-muted-foreground">
                      {candidate.percentage.toFixed(1)}% ({candidate.votes.toLocaleString()})
                    </span>
                  </div>
                  <Progress value={candidate.percentage} className="h-1.5" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

interface DemographicBreakdownProps {
  title: string;
  data: { label: string; votes: number; percentage: number }[];
  totalVotes: number;
  icon?: React.ReactNode;
}

export function DemographicBreakdown({
  title,
  data,
  totalVotes,
  icon,
}: DemographicBreakdownProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          {icon ? <>{icon}</> : <BarChart3 className="h-5 w-5" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.length === 0 ? (
          <p className="text-center py-4 text-muted-foreground text-sm">
            No demographic data available
          </p>
        ) : (
          data.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="capitalize font-medium">{item.label}</span>
                <span className="text-muted-foreground">
                  {item.percentage.toFixed(1)}% ({item.votes.toLocaleString()})
                </span>
              </div>
              <Progress value={item.percentage} className="h-2" />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
