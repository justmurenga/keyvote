'use client';

import { useState } from 'react';
import { Shield, Plus, MapPin, Phone, MoreVertical, Loader2, UserCheck, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Agent {
  id: string;
  name: string;
  phone: string;
  station: string;
  status: 'active' | 'pending' | 'suspended';
  reportsSubmitted: number;
  lastActive: string;
}

const DEMO_AGENTS: Agent[] = [
  {
    id: '1',
    name: 'James Mwangi',
    phone: '+254 712 345 678',
    station: 'Westlands Primary School',
    status: 'active',
    reportsSubmitted: 15,
    lastActive: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Grace Wanjiku',
    phone: '+254 723 456 789',
    station: 'Kibera Social Hall',
    status: 'active',
    reportsSubmitted: 12,
    lastActive: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '3',
    name: 'Peter Ochieng',
    phone: '+254 734 567 890',
    station: 'Langata DCC Office',
    status: 'pending',
    reportsSubmitted: 0,
    lastActive: new Date(Date.now() - 86400000).toISOString(),
  },
];

export default function DashboardAgentsPage() {
  const [agents] = useState<Agent[]>(DEMO_AGENTS);

  const activeCount = agents.filter(a => a.status === 'active').length;
  const pendingCount = agents.filter(a => a.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agents</h1>
          <p className="text-muted-foreground">
            Manage your polling station agents
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Agent
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Agents</CardDescription>
            <CardTitle className="text-3xl">{agents.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-3xl text-green-600">{activeCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Approval</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{pendingCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Agents List */}
      <Card>
        <CardHeader>
          <CardTitle>All Agents</CardTitle>
          <CardDescription>Agents assigned to your polling stations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {agents.map((agent) => (
              <div key={agent.id} className="flex items-center gap-4 p-4 border rounded-lg">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>
                    {agent.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{agent.name}</p>
                    <Badge variant={
                      agent.status === 'active' ? 'success' :
                      agent.status === 'pending' ? 'warning' :
                      'destructive'
                    }>
                      {agent.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {agent.phone}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {agent.station}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{agent.reportsSubmitted}</p>
                  <p className="text-sm text-muted-foreground">reports</p>
                </div>
                <div className="flex gap-2">
                  {agent.status === 'pending' && (
                    <>
                      <Button variant="outline" size="icon" className="text-green-600">
                        <UserCheck className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="text-red-600">
                        <UserX className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
