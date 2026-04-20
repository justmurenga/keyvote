import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BarChart3, Vote, Wallet, Heart, UserPlus, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { VoterAggregateCard } from '@/components/dashboard/voter-aggregate-card';
import { ProfileCompletionBanner } from '@/components/dashboard/profile-completion-banner';

export default async function DashboardPage() {
  const supabase = await createClient();
  const cookieStore = await cookies();

  // Get current user (Supabase auth or custom OTP session)
  const { data: { user } } = await supabase.auth.getUser();
  
  let currentUserId: string | null = user?.id ?? null;

  // Fallback to custom session cookie (OTP login)
  if (!currentUserId) {
    const sessionCookie = cookieStore.get('myvote-session')?.value;
    if (sessionCookie) {
      try {
        const session = JSON.parse(sessionCookie);
        if (session.expiresAt > Date.now()) {
          currentUserId = session.userId;
        }
      } catch (e) {
        // Invalid session cookie
      }
    }
  }

  // Get following count for current user
  let followingCount = 0;
  let userRole = 'voter';
  if (currentUserId) {
    const { count } = await supabase
      .from('followers')
      .select('*', { count: 'exact', head: true })
      .eq('voter_id', currentUserId)
      .eq('is_following', true);
    followingCount = count || 0;

    // Get user role
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', currentUserId)
      .single();
    userRole = userProfile?.role || 'voter';
  }

  // Get active polls count
  const { count: activePollsCount } = await supabase
    .from('polls')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  // Get total candidates count
  const { count: candidatesCount } = await supabase
    .from('candidates')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  const stats = [
    {
      title: 'Following',
      value: followingCount,
      description: 'Candidates you follow',
      icon: Heart,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      href: '/dashboard/following',
    },
    {
      title: 'Active Polls',
      value: activePollsCount || 0,
      description: 'Polls you can vote in',
      icon: BarChart3,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      href: '/polls',
    },
    {
      title: 'Candidates',
      value: candidatesCount || 0,
      description: 'Running for office',
      icon: Vote,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      href: '/candidates',
    },
    {
      title: 'Wallet Balance',
      value: 'KES 0',
      description: 'Available balance',
      icon: Wallet,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      href: '/dashboard/wallet',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold">
          Welcome to myVote Kenya!
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s what&apos;s happening in Kenya&apos;s electoral space
        </p>
      </div>

      {/* Profile Completion Banner */}
      <ProfileCompletionBanner />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="stats-card cursor-pointer hover:shadow-md transition-shadow">
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

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/candidates">
          <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Browse Candidates</h3>
                  <p className="text-sm text-muted-foreground">
                    Find and follow candidates across Kenya
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/polls">
          <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <BarChart3 className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Vote in Polls</h3>
                  <p className="text-sm text-muted-foreground">
                    Participate in active opinion polls
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/results">
          <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-purple-500/10">
                  <Vote className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <h3 className="font-semibold">View Results</h3>
                  <p className="text-sm text-muted-foreground">
                    Track election results live
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Become a Candidate CTA (non-candidates) or Candidate Dashboard link */}
      {userRole !== 'candidate' && (
        <Link href="/dashboard/become-candidate">
          <Card className="cursor-pointer hover:shadow-md transition-shadow border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/20">
                  <UserPlus className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Become a Candidate</h3>
                  <p className="text-sm text-muted-foreground">
                    Register as a political candidate and start building your campaign on myVote Kenya
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}
      {userRole === 'candidate' && (
        <Link href="/dashboard/candidate">
          <Card className="cursor-pointer hover:shadow-md transition-shadow border-green-300/50 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-500/20">
                  <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Candidate Dashboard</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage your campaign, view analytics, coordinate agents, and track results
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Voter Aggregates - Regional Stats */}
      <VoterAggregateCard />
    </div>
  );
}
