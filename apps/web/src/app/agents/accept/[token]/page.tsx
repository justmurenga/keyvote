'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { SiteHeader } from '@/components/layout/site-header';
import { useAuth } from '@/hooks/use-auth';
import { AgentInvitationView } from '@/components/agents/agent-invitation-view';

/**
 * Public agent-invitation acceptance page.
 *
 * - Unauthenticated visitors see the public site header + invitation details
 *   and are prompted to log in / register.
 * - Authenticated visitors are redirected into the in-app dashboard route
 *   (`/dashboard/agents/accept/[token]`) so the request opens *inside the
 *   system* with the dashboard chrome instead of the public marketing nav.
 */
export default function AcceptAgentInvitationPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && isAuthenticated && token) {
      router.replace(`/dashboard/agents/accept/${token}`);
    }
  }, [authLoading, isAuthenticated, token, router]);

  // While we know the user is authenticated, show a thin spinner instead of
  // briefly flashing the public layout.
  if (!authLoading && isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <SiteHeader />
      <main className="flex-1">
        <AgentInvitationView
          token={token}
          isAuthenticated={false}
          authLoading={authLoading}
          embedded={false}
        />
      </main>
    </div>
  );
}
