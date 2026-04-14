import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Users, CheckCircle, Building2 } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FollowButton } from './follow-button';
import { cn } from '@/lib/utils';

export interface CandidateCardProps {
  id: string;
  name: string;
  position: string;
  positionLabel: string;
  photoUrl?: string | null;
  partyName?: string | null;
  partyAbbreviation?: string | null;
  partyColor?: string | null;
  isIndependent?: boolean;
  isVerified?: boolean;
  followerCount?: number;
  isFollowing?: boolean;
  location?: string;
  slogan?: string;
  className?: string;
}

const positionColors: Record<string, string> = {
  president: 'bg-purple-500',
  governor: 'bg-blue-500',
  senator: 'bg-green-500',
  women_rep: 'bg-pink-500',
  mp: 'bg-orange-500',
  mca: 'bg-teal-500',
};

export function CandidateCard({
  id,
  name,
  position,
  positionLabel,
  photoUrl,
  partyName,
  partyAbbreviation,
  partyColor,
  isIndependent,
  isVerified,
  followerCount = 0,
  isFollowing = false,
  location,
  slogan,
  className,
}: CandidateCardProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className={cn('overflow-hidden hover:shadow-lg transition-shadow', className)}>
      <Link href={`/candidates/${id}`}>
        <div className="relative h-48 bg-gradient-to-br from-primary/20 to-primary/5">
          {/* Position badge */}
          <Badge 
            className={cn(
              'absolute top-3 left-3 text-white',
              positionColors[position] || 'bg-gray-500'
            )}
          >
            {positionLabel}
          </Badge>

          {/* Photo */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
            <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
              <AvatarImage src={photoUrl || undefined} alt={name} />
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </Link>

      <CardContent className="pt-14 pb-4 text-center">
        <Link href={`/candidates/${id}`}>
          <h3 className="font-semibold text-lg flex items-center justify-center gap-1.5">
            {name}
            {isVerified && (
              <CheckCircle className="h-4 w-4 text-blue-500 fill-blue-500" />
            )}
          </h3>
        </Link>

        {/* Party */}
        <div className="mt-2 flex items-center justify-center gap-2">
          {isIndependent ? (
            <Badge variant="outline">Independent</Badge>
          ) : partyName ? (
            <Badge 
              variant="outline" 
              style={{ 
                borderColor: partyColor || undefined,
                color: partyColor || undefined,
              }}
            >
              <Building2 className="h-3 w-3 mr-1" />
              {partyAbbreviation || partyName}
            </Badge>
          ) : null}
        </div>

        {/* Location */}
        {location && (
          <p className="mt-2 text-sm text-muted-foreground flex items-center justify-center">
            <MapPin className="h-3 w-3 mr-1" />
            {location}
          </p>
        )}

        {/* Slogan */}
        {slogan && (
          <p className="mt-2 text-sm italic text-muted-foreground line-clamp-2">
            &ldquo;{slogan}&rdquo;
          </p>
        )}

        {/* Followers */}
        <div className="mt-3 flex items-center justify-center text-sm text-muted-foreground">
          <Users className="h-4 w-4 mr-1" />
          {followerCount.toLocaleString()} followers
        </div>
      </CardContent>

      <CardFooter className="pt-0 pb-4">
        <FollowButton
          candidateId={id}
          initialIsFollowing={isFollowing}
          followerCount={followerCount}
          className="w-full"
        />
      </CardFooter>
    </Card>
  );
}
