'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Shield,
  MapPin,
  User,
  CheckCircle2,
  XCircle,
  Loader2,
  LogIn,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';

interface InvitationData {
  id: string;
  invitedName: string;
  invitedPhone: string;
  regionType: string;
  regionName: string;
  invitedAt: string;
  candidate: {
    id: string;
    position: string;
    users: {
      full_name: string;
      profile_photo_url: string | null;
    };
  };
}

const POSITION_LABELS: Record<string, string> = {
  president: 'President',
  governor: 'Governor',
  senator: 'Senator',
  women_rep: "Women's Representative",
  mp: 'Member of Parliament',
  mca: 'Member of County Assembly',
};

const REGION_TYPE_LABELS: Record<string, string> = {
  national: 'National',
  county: 'County',
  constituency: 'Constituency',
  ward: 'Ward',
  polling_station: 'Polling Station',
};

export default function AcceptAgentInvitationPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  // Fetch invitation details
  useEffect(() => {
    async function fetchInvitation() {
      try {
        const res = await fetch(`/api/agents/invitation/${token}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Invalid invitation');
          return;
        }

        setInvitation(data.invitation);
      } catch {
        setError('Failed to load invitation details');
      } finally {
        setIsLoading(false);
      }
    }

    if (token) {
      fetchInvitation();
    }
  }, [token]);

  const handleAccept = async () => {
    setIsAccepting(true);
    setError(null);

    try {
      const res = await fetch(`/api/agents/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to accept invitation');
        return;
      }

      setAccepted(true);
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsAccepting(false);
    }
  };

  // Loading state
  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <XCircle className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Invalid Invitation</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => router.push('/')} variant="outline">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Welcome, Agent!</h2>
            <p className="text-muted-foreground mb-2">
              You&apos;ve successfully accepted the invitation.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              You are now an agent for{' '}
              <strong>{invitation?.candidate?.users?.full_name}</strong>.
              Head to your dashboard to get started.
            </p>
            <Button onClick={() => router.push('/dashboard')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invitation display
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-xl">Agent Invitation</CardTitle>
          <CardDescription>
            You&apos;ve been invited to be a polling agent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Candidate Info */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Candidate</span>
            </div>
            <p className="font-medium text-lg">
              {invitation?.candidate?.users?.full_name}
            </p>
            <Badge variant="secondary">
              {POSITION_LABELS[invitation?.candidate?.position || ''] || invitation?.candidate?.position}
            </Badge>
          </div>

          {/* Assignment Info */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Assigned Region</span>
            </div>
            <p className="font-medium">{invitation?.regionName}</p>
            <Badge variant="outline">
              {REGION_TYPE_LABELS[invitation?.regionType || ''] || invitation?.regionType}
            </Badge>
          </div>

          {/* Invitee Info */}
          <div className="text-sm text-muted-foreground text-center">
            <p>
              Invited as: <strong>{invitation?.invitedName}</strong>
            </p>
            <p>Phone: {invitation?.invitedPhone}</p>
          </div>

          {/* Action Buttons */}
          {!isAuthenticated ? (
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                You need to log in or create an account to accept this invitation.
              </p>
              <Button
                className="w-full"
                onClick={() => router.push(`/auth/login?redirect=/agents/accept/${token}`)}
              >
                <LogIn className="h-4 w-4 mr-2" />
                Log In to Accept
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/auth/register?redirect=/agents/accept/${token}`)}
              >
                Create Account
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                className="w-full"
                onClick={handleAccept}
                disabled={isAccepting}
              >
                {isAccepting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Accept Invitation
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push('/')}
              >
                Decline
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
