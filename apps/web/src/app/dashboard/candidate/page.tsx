'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  BarChart3,
  Shield,
  TrendingUp,
  MessageSquare,
  FileText,
  Vote,
  Edit,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Eye,
} from 'lucide-react';

interface CandidateData {
  candidate: {
    id: string;
    position: string;
    campaign_slogan: string | null;
    manifesto_text: string | null;
    is_verified: boolean;
    verification_status: string;
    is_active: boolean;
    follower_count: number;
    created_at: string;
    user: {
      full_name: string;
      phone: string;
      profile_photo_url: string | null;
    };
    party: {
      name: string;
      abbreviation: string;
    } | null;
    county: { name: string } | null;
    constituency: { name: string } | null;
    ward: { name: string } | null;
  };
  stats: {
    followerCount: number;
    agentCount: number;
    activePollCount: number;
    recentVotes: number;
  };
  demographics: {
    gender: Record<string, number>;
    age: Record<string, number>;
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

export default function CandidateDashboardPage() {
  const [data, setData] = useState<CandidateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCandidateProfile();
  }, []);

  const fetchCandidateProfile = async () => {
    try {
      const res = await fetch('/api/candidates/me');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else if (res.status === 404) {
        setError('not_candidate');
      } else {
        setError('Failed to load profile');
      }
    } catch (e) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error === 'not_candidate') {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-4">
        <Vote className="h-16 w-16 mx-auto text-muted-foreground" />
        <h2 className="text-2xl font-bold">You&apos;re Not a Candidate Yet</h2>
        <p className="text-muted-foreground">
          Register as a candidate to access campaign management tools, voter analytics, and more.
        </p>
        <Link href="/dashboard/become-candidate">
          <Button size="lg">
            <Users className="h-5 w-5 mr-2" />
            Become a Candidate
          </Button>
        </Link>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
        <p className="text-destructive">{error || 'Something went wrong'}</p>
        <Button variant="outline" className="mt-4" onClick={fetchCandidateProfile}>
          Try Again
        </Button>
      </div>
    );
  }

  const { candidate, stats, demographics } = data;
  const region =
    candidate.county?.name ||
    candidate.constituency?.name ||
    candidate.ward?.name ||
    'National';

  const statCards = [
    {
      title: 'Followers',
      value: stats.followerCount,
      description: 'Voters following you',
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      href: '/dashboard/candidate/analytics',
    },
    {
      title: 'Agents',
      value: stats.agentCount,
      description: 'Active campaign agents',
      icon: Shield,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      href: '/dashboard/candidate/agents',
    },
    {
      title: 'Active Polls',
      value: stats.activePollCount,
      description: 'Polls in your region',
      icon: BarChart3,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      href: '/dashboard/candidate/results',
    },
    {
      title: 'Poll Votes',
      value: stats.recentVotes,
      description: 'Recent votes received',
      icon: TrendingUp,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      href: '/dashboard/candidate/results',
    },
  ];

  const quickActions = [
    { label: 'Edit Profile', href: '/dashboard/candidate/profile', icon: Edit },
    { label: 'View Analytics', href: '/dashboard/candidate/analytics', icon: BarChart3 },
    { label: 'Manage Agents', href: '/dashboard/candidate/agents', icon: Shield },
    { label: 'Messages', href: '/dashboard/candidate/messages', icon: MessageSquare },
    { label: 'View Results', href: '/dashboard/candidate/results', icon: Vote },
    { label: 'Public Profile', href: `/candidates/${candidate.id}`, icon: Eye },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Candidate Dashboard</h1>
          <p className="text-muted-foreground">
            {POSITION_LABELS[candidate.position] || candidate.position} — {region}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {candidate.is_verified ? (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          ) : (
            <Badge variant="outline" className="text-yellow-700 border-yellow-300">
              <Clock className="h-3 w-3 mr-1" />
              Pending Verification
            </Badge>
          )}
          {candidate.party ? (
            <Badge variant="secondary">{candidate.party.abbreviation}</Badge>
          ) : (
            <Badge variant="outline">Independent</Badge>
          )}
        </div>
      </div>

      {/* Verification Banner */}
      {!candidate.is_verified && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400 shrink-0" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                Profile Pending Verification
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Your candidate profile is being reviewed by our admin team.
                You can still set up your campaign while waiting.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Campaign Slogan */}
      {candidate.campaign_slogan && (
        <Card>
          <CardContent className="py-4">
            <p className="text-lg italic text-center text-muted-foreground">
              &ldquo;{candidate.campaign_slogan}&rdquo;
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions + Demographics */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <Link key={action.label} href={action.href}>
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto py-3"
                  >
                    <action.icon className="h-4 w-4 mr-2 shrink-0" />
                    {action.label}
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Follower Demographics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Follower Demographics</CardTitle>
            <CardDescription>Gender breakdown of your followers</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.followerCount === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No followers yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(demographics.gender).map(([gender, count]) => (
                  <div key={gender} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize">{gender.replace('_', ' ')}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${(count / stats.followerCount) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}

                {Object.keys(demographics.age).length > 0 && (
                  <>
                    <hr className="my-4" />
                    <p className="text-sm font-medium text-muted-foreground">Age Breakdown</p>
                    {Object.entries(demographics.age).map(([bracket, count]) => (
                      <div key={bracket} className="flex items-center justify-between text-sm">
                        <span>{bracket}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Profile Completeness */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profile Completeness</CardTitle>
          <CardDescription>Complete your profile to attract more followers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: 'Campaign Slogan', done: !!candidate.campaign_slogan },
              { label: 'Manifesto', done: !!candidate.manifesto_text },
              { label: 'Campaign Video', done: !!candidate.campaign_slogan },
              { label: 'Profile Verified', done: candidate.is_verified },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                {item.done ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                )}
                <span className={item.done ? 'text-foreground' : 'text-muted-foreground'}>
                  {item.label}
                </span>
              </div>
            ))}
            <Link href="/dashboard/candidate/profile">
              <Button variant="outline" size="sm" className="mt-2">
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
