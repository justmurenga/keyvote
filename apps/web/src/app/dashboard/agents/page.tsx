'use client';

import { useState } from 'react';
import {
  Shield,
  Users,
  UserCheck,
  Clock,
  Ban,
  AlertTriangle,
  Search,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAgents } from '@/hooks/use-agents';
import { AgentInviteDialog, AgentCard } from '@/components/agents';

export default function DashboardAgentsPage() {
  const { agents, isLoading, error, stats, refresh, inviteAgent, revokeAgent, updateAgent, deleteAgent } = useAgents();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Filter agents by search and tab
  const filteredAgents = agents.filter((agent) => {
    const matchesSearch = !searchQuery ||
      agent.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.phone_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.invited_phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.region_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTab = activeTab === 'all' || agent.status === activeTab;

    return matchesSearch && matchesTab;
  });

  if (error && agents.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Agents</h1>
            <p className="text-muted-foreground">Manage your polling station agents</p>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Unable to load agents</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={refresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agents</h1>
          <p className="text-muted-foreground">
            Manage your polling station agents and invitations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={refresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <AgentInviteDialog onInvite={inviteAgent} />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              Total
            </CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <UserCheck className="h-3.5 w-3.5 text-green-600" />
              Active
            </CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats.active}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-yellow-600" />
              Pending
            </CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{stats.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Ban className="h-3.5 w-3.5 text-orange-600" />
              Suspended
            </CardDescription>
            <CardTitle className="text-3xl text-orange-600">{stats.suspended}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
              Revoked
            </CardDescription>
            <CardTitle className="text-3xl text-red-600">{stats.revoked}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Agents List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Agent Roster</CardTitle>
              <CardDescription>All agents assigned to your campaign</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search agents..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">
                All ({stats.total})
              </TabsTrigger>
              <TabsTrigger value="active">
                Active ({stats.active})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({stats.pending})
              </TabsTrigger>
              <TabsTrigger value="suspended">
                Suspended ({stats.suspended})
              </TabsTrigger>
              <TabsTrigger value="revoked">
                Revoked ({stats.revoked})
              </TabsTrigger>
            </TabsList>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredAgents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Shield className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-1">
                  {searchQuery ? 'No agents match your search' : 'No agents yet'}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {searchQuery
                    ? 'Try adjusting your search query'
                    : 'Invite your first agent to get started with field operations'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAgents.map((agent) => (
                  <AgentCard
                    key={agent.agent_id}
                    agent={agent}
                    onRevoke={revokeAgent}
                    onUpdate={updateAgent}
                    onDelete={deleteAgent}
                  />
                ))}
              </div>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
