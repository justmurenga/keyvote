'use client';

import { useState, useEffect, useCallback } from 'react';

export interface AgentData {
  agent_id: string;
  user_id: string;
  full_name: string;
  phone_number: string;
  profile_photo_url: string | null;
  assigned_region_type: string;
  region_name: string;
  mpesa_number: string | null;
  status: 'pending' | 'active' | 'suspended' | 'revoked';
  invited_phone: string | null;
  invited_name: string | null;
  invitation_token: string | null;
  total_reports: number;
  total_results_submitted: number;
  total_payments_received: number;
  invited_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  revoke_reason: string | null;
  created_at: string;
}

export interface InviteAgentPayload {
  userId?: string;
  phone?: string;
  name?: string;
  regionType: string;
  pollingStationId?: string;
  wardId?: string;
  constituencyId?: string;
  countyId?: string;
  mpesaNumber?: string;
}

interface UseAgentsReturn {
  agents: AgentData[];
  isLoading: boolean;
  error: string | null;
  candidateId: string | null;
  stats: {
    total: number;
    active: number;
    pending: number;
    suspended: number;
    revoked: number;
  };
  refresh: () => Promise<void>;
  inviteAgent: (payload: InviteAgentPayload) => Promise<{ success: boolean; error?: string; acceptUrl?: string; notified?: boolean }>;
  revokeAgent: (agentId: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  updateAgent: (agentId: string, data: Record<string, any>) => Promise<{ success: boolean; error?: string }>;
  deleteAgent: (agentId: string) => Promise<{ success: boolean; error?: string }>;
}

export function useAgents(statusFilter?: string): UseAgentsReturn {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [candidateId, setCandidateId] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/agents?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to fetch agents');
        return;
      }

      setAgents(data.agents || []);
      setCandidateId(data.candidateId || null);
    } catch (err) {
      setError('Failed to fetch agents');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const stats = {
    total: agents.length,
    active: agents.filter(a => a.status === 'active').length,
    pending: agents.filter(a => a.status === 'pending').length,
    suspended: agents.filter(a => a.status === 'suspended').length,
    revoked: agents.filter(a => a.status === 'revoked').length,
  };

  const inviteAgent = useCallback(async (payload: InviteAgentPayload) => {
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to invite agent' };
      }

      // Refresh the agent list
      await fetchAgents();

      return { success: true, acceptUrl: data.acceptUrl, notified: data.notified };
    } catch {
      return { success: false, error: 'Failed to invite agent' };
    }
  }, [fetchAgents]);

  const revokeAgent = useCallback(async (agentId: string, reason?: string) => {
    try {
      const res = await fetch(`/api/agents/${agentId}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to revoke agent' };
      }

      await fetchAgents();
      return { success: true };
    } catch {
      return { success: false, error: 'Failed to revoke agent' };
    }
  }, [fetchAgents]);

  const updateAgent = useCallback(async (agentId: string, updateData: Record<string, any>) => {
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to update agent' };
      }

      await fetchAgents();
      return { success: true };
    } catch {
      return { success: false, error: 'Failed to update agent' };
    }
  }, [fetchAgents]);

  const deleteAgent = useCallback(async (agentId: string) => {
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to delete agent' };
      }

      await fetchAgents();
      return { success: true };
    } catch {
      return { success: false, error: 'Failed to delete agent' };
    }
  }, [fetchAgents]);

  return {
    agents,
    isLoading,
    error,
    candidateId,
    stats,
    refresh: fetchAgents,
    inviteAgent,
    revokeAgent,
    updateAgent,
    deleteAgent,
  };
}
