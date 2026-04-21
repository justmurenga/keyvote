'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface FollowButtonProps {
  candidateId: string;
  initialIsFollowing?: boolean;
  followerCount?: number;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showCount?: boolean;
  className?: string;
  onFollowChange?: (isFollowing: boolean) => void;
  /**
   * If set, navigate to this URL after a successful FOLLOW (not unfollow).
   * Used by the candidates listing page to take voters to their following list.
   */
  redirectAfterFollow?: string;
}

export function FollowButton({
  candidateId,
  initialIsFollowing = false,
  followerCount = 0,
  variant = 'default',
  size = 'default',
  showCount = false,
  className,
  onFollowChange,
  redirectAfterFollow,
}: FollowButtonProps) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);
  const [count, setCount] = useState(followerCount);
  const { toast } = useToast();

  const handleFollow = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/candidates/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          candidateId, 
          action: isFollowing ? 'unfollow' : 'follow' 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          toast({
            variant: 'destructive',
            title: 'Please log in',
            description: 'You need to be logged in to follow candidates.',
          });
          return;
        }
        throw new Error(data.error || 'Failed to update follow status');
      }

      const newIsFollowing = !isFollowing;
      setIsFollowing(newIsFollowing);
      setCount(prev => newIsFollowing ? prev + 1 : Math.max(0, prev - 1));
      
      toast({
        title: newIsFollowing ? 'Following!' : 'Unfollowed',
        description: newIsFollowing 
          ? 'You will receive updates about this candidate.'
          : 'You will no longer receive updates about this candidate.',
      });

      onFollowChange?.(newIsFollowing);

      // After a successful FOLLOW (not unfollow), optionally navigate the
      // voter to their following list so they can see the candidate they
      // just followed (and the action feels persistent).
      if (newIsFollowing && redirectAfterFollow) {
        router.push(redirectAfterFollow);
        router.refresh();
      }
    } catch (error) {
      console.error('Follow error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update follow status',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={isFollowing ? 'outline' : variant}
      size={size}
      onClick={handleFollow}
      disabled={isLoading}
      className={cn(
        isFollowing && 'border-primary text-primary hover:bg-primary/10',
        className
      )}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <Heart 
            className={cn(
              'h-4 w-4',
              size !== 'icon' && 'mr-2',
              isFollowing && 'fill-current'
            )} 
          />
          {size !== 'icon' && (
            <>
              {isFollowing ? 'Following' : 'Follow'}
              {showCount && count > 0 && (
                <span className="ml-2 text-muted-foreground">
                  ({count.toLocaleString()})
                </span>
              )}
            </>
          )}
        </>
      )}
    </Button>
  );
}
