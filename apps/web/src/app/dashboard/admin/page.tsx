'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Vote,
  ClipboardList,
  Building2,
  MapPin,
  Wallet,
  TrendingUp,
  UserCheck,
  AlertTriangle,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';
import { usePermissions } from '@/hooks/use-permissions';

interface SystemStats {
  users: { total: number; active: number; verified: number; byRole: Record<string, number> };
  polls: { total: number; active: number; completed: number; draft: number };
  candidates: { total: number; active: number; verified: number };
  parties: { total: number; verified: number };
  regions: { counties: number; constituencies: number; wards: number; pollingStations: number };
  wallets: { total: number; totalBalance: number; frozen: number };
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { role } = usePermissions();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.users.total || 0,
      subtitle: `${stats?.users.active || 0} active`,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      href: '/dashboard/admin/users',
    },
    {
      title: 'Active Polls',
      value: stats?.polls.active || 0,
      subtitle: `${stats?.polls.total || 0} total`,
      icon: ClipboardList,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      href: '/dashboard/admin/polls',
    },
    {
      title: 'Candidates',
      value: stats?.candidates.total || 0,
      subtitle: `${stats?.candidates.verified || 0} verified`,
      icon: UserCheck,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      href: '/dashboard/admin/candidates',
    },
    {
      title: 'Political Parties',
      value: stats?.parties.total || 0,
      subtitle: `${stats?.parties.verified || 0} verified`,
      icon: Building2,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      href: '/dashboard/admin/parties',
    },
    {
      title: 'Polling Stations',
      value: stats?.regions.pollingStations || 0,
      subtitle: `${stats?.regions.counties || 0} counties`,
      icon: MapPin,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      href: '/dashboard/admin/regions',
    },
    {
      title: 'Wallets',
      value: stats?.wallets.total || 0,
      subtitle: `KES ${(stats?.wallets.totalBalance || 0).toLocaleString()}`,
      icon: Wallet,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      href: '/dashboard/admin/wallets',
    },
  ];

  const quickActions = [
    { label: 'Create Poll', href: '/dashboard/admin/polls', icon: ClipboardList },
    { label: 'Add User', href: '/dashboard/admin/users', icon: Users },
    { label: 'Verify Candidate', href: '/dashboard/admin/candidates', icon: UserCheck },
    { label: 'Manage Parties', href: '/dashboard/admin/parties', icon: Building2 },
    { label: 'View Results', href: '/dashboard/admin/results', icon: Vote },
    { label: 'System Settings', href: '/dashboard/admin/settings', icon: Activity },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Loading system overview...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-24" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16 mb-2" />
                <div className="h-3 bg-muted rounded w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            System overview and management
          </p>
        </div>
        <Badge variant="destructive" className="text-sm px-3 py-1">
          {role === 'system_admin' ? 'System Admin' : 'Admin'}
        </Badge>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="cursor-pointer hover:shadow-md transition-shadow group">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      {stat.value.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Role Distribution & Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Role Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              User Distribution by Role
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.users.byRole &&
                Object.entries(stats.users.byRole)
                  .sort(([, a], [, b]) => b - a)
                  .map(([roleName, count]) => (
                    <div key={roleName} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize text-xs">
                          {roleName.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{
                              width: `${Math.max(
                                5,
                                (count / (stats?.users.total || 1)) * 100
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">
                          {count}
                        </span>
                      </div>
                    </div>
                  ))}
              {!stats?.users.byRole && (
                <p className="text-sm text-muted-foreground">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <Link key={action.label} href={action.href}>
                  <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors cursor-pointer">
                    <action.icon className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">{action.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            System Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats?.candidates && stats.candidates.total - stats.candidates.verified > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm">
                    {stats.candidates.total - stats.candidates.verified} candidates pending
                    verification
                  </span>
                </div>
                <Link
                  href="/dashboard/admin/candidates"
                  className="text-sm text-primary hover:underline"
                >
                  Review
                </Link>
              </div>
            )}
            {stats?.wallets && stats.wallets.frozen > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-red-600" />
                  <span className="text-sm">
                    {stats.wallets.frozen} frozen wallets need attention
                  </span>
                </div>
                <Link
                  href="/dashboard/admin/wallets"
                  className="text-sm text-primary hover:underline"
                >
                  View
                </Link>
              </div>
            )}
            {stats?.polls && stats.polls.draft > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">
                    {stats.polls.draft} polls in draft status
                  </span>
                </div>
                <Link
                  href="/dashboard/admin/polls"
                  className="text-sm text-primary hover:underline"
                >
                  Manage
                </Link>
              </div>
            )}
            {(!stats?.candidates || stats.candidates.total === stats.candidates.verified) &&
              (!stats?.wallets || stats.wallets.frozen === 0) &&
              (!stats?.polls || stats.polls.draft === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  ✅ No alerts — everything looks good!
                </p>
              )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
