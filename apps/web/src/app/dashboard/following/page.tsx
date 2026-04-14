'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Heart, Loader2, Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { FollowButton } from '@/components/candidates';

interface FollowedCandidate {
  id: string;
  name: string;
  position: string;
  positionLabel: string;
  photoUrl?: string;
  partyName?: string;
  partyAbbreviation?: string;
  partyColor?: string;
  isIndependent: boolean;
  isVerified: boolean;
  followerCount: number;
  location: string;
  slogan?: string;
  followedAt: string;
  smsNotifications: boolean;
  whatsappNotifications: boolean;
}

const positionColors: Record<string, string> = {
  president: 'bg-purple-500',
  governor: 'bg-blue-500',
  senator: 'bg-green-500',
  women_rep: 'bg-pink-500',
  mp: 'bg-orange-500',
  mca: 'bg-teal-500',
};

function FollowedCandidateCard({ 
  candidate, 
  onUnfollow 
}: { 
  candidate: FollowedCandidate;
  onUnfollow: (id: string) => void;
}) {
  const initials = candidate.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Link href={`/candidates/${candidate.id}`}>
            <Avatar className="h-14 w-14 border-2 border-primary/20">
              <AvatarImage src={candidate.photoUrl} alt={candidate.name} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Link>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge 
                className={`text-white text-xs ${positionColors[candidate.position] || 'bg-gray-500'}`}
              >
                {candidate.positionLabel}
              </Badge>
              {candidate.isVerified && (
                <Badge variant="outline" className="text-xs border-blue-500 text-blue-500">
                  Verified
                </Badge>
              )}
            </div>
            
            <Link 
              href={`/candidates/${candidate.id}`}
              className="hover:underline"
            >
              <h3 className="font-semibold truncate">{candidate.name}</h3>
            </Link>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {candidate.partyAbbreviation && (
                <span 
                  className="font-medium"
                  style={{ color: candidate.partyColor || 'inherit' }}
                >
                  {candidate.partyAbbreviation}
                </span>
              )}
              {candidate.isIndependent && (
                <span className="text-muted-foreground">Independent</span>
              )}
              <span>•</span>
              <span>{candidate.location}</span>
            </div>

            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>{candidate.followerCount.toLocaleString()} followers</span>
              <span>•</span>
              <span>
                Following since {new Date(candidate.followedAt).toLocaleDateString('en-KE', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <FollowButton
              candidateId={candidate.id}
              initialIsFollowing={true}
              followerCount={candidate.followerCount}
              size="sm"
              onFollowChange={(isFollowing) => {
                if (!isFollowing) {
                  onUnfollow(candidate.id);
                }
              }}
            />
            <div className="flex items-center gap-1">
              {candidate.smsNotifications ? (
                <Badge variant="outline" className="text-xs">
                  <Bell className="h-3 w-3 mr-1" />
                  SMS
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FollowingPage() {
  const [candidates, setCandidates] = useState<FollowedCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchFollowing();
  }, []);

  const fetchFollowing = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/candidates/follow');
      
      if (response.ok) {
        const data = await response.json();
        setCandidates(data.following || []);
      } else if (response.status === 401) {
        // Not authenticated
        setCandidates([]);
      }
    } catch (error) {
      console.error('Failed to fetch following:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnfollow = (candidateId: string) => {
    setCandidates(prev => prev.filter(c => c.id !== candidateId));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Following</h1>
          <p className="text-muted-foreground">
            Candidates you&apos;re following and receiving updates from
          </p>
        </div>
        <Link href="/candidates">
          <Button>
            <Users className="h-4 w-4 mr-2" />
            Browse Candidates
          </Button>
        </Link>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : candidates.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Heart className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">No candidates followed yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Start following candidates to receive updates about their campaigns, 
              polls, and election results.
            </p>
            <Link href="/candidates">
              <Button>
                <Users className="h-4 w-4 mr-2" />
                Browse Candidates
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Following {candidates.length} candidate{candidates.length !== 1 ? 's' : ''}
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            {candidates.map((candidate) => (
              <FollowedCandidateCard 
                key={candidate.id} 
                candidate={candidate}
                onUnfollow={handleUnfollow}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
