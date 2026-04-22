'use client';

import { useParams } from 'next/navigation';
import { AgentInvitationView } from '@/components/agents/agent-invitation-view';

/**
 * In-app (dashboard-shell) version of the agent invitation acceptance page.
 * The dashboard layout already provides the authenticated header & sidebar,
 * so we render the invitation view in `embedded` mode (no public site nav).
 */
export default function DashboardAcceptAgentInvitationPage() {
  const params = useParams();
  const token = params?.token as string;

  return (
    <AgentInvitationView
      token={token}
      isAuthenticated={true}
      authLoading={false}
      embedded
    />
  );
}
