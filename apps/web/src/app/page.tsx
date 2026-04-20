import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Users, BarChart3, Bell, Shield, Smartphone, Vote, ArrowRight, TrendingUp } from 'lucide-react';
import { SiteHeader, SiteFooter } from '@/components/layout';
import { createClient } from '@/lib/supabase/server';

// Featured candidates component
async function FeaturedCandidates() {
  const supabase = await createClient();
  
  const { data: candidates } = await supabase
    .from('candidates')
    .select(`
      id,
      position,
      follower_count,
      users!inner(full_name, profile_photo_url),
      political_parties(name, symbol_url, abbreviation)
    `)
    .order('follower_count', { ascending: false })
    .limit(6);

  if (!candidates || candidates.length === 0) {
    return null;
  }

  // Flatten the users relation (array from join) to a single object
  const flatCandidates = candidates.map((c) => ({
    ...c,
    user: Array.isArray(c.users) ? c.users[0] : c.users,
    party: Array.isArray(c.political_parties) ? c.political_parties[0] : c.political_parties,
  }));

  const positionLabels: Record<string, string> = {
    president: 'Presidential',
    governor: 'Governor',
    senator: 'Senate',
    mp: 'Member of Parliament',
    mca: 'MCA',
    woman_rep: 'Women Rep',
  };

  return (
    <section className="py-20 border-t">
      <div className="container">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold mb-2">Trending Candidates</h2>
            <p className="text-muted-foreground">Most followed candidates this week</p>
          </div>
          <Link href="/candidates">
            <Button variant="outline">
              View All <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {flatCandidates.map((candidate) => (
            <Link 
              key={candidate.id} 
              href={`/candidates/${candidate.id}`}
              className="group"
            >
              <div className="rounded-lg border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/50">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-full bg-muted overflow-hidden flex-shrink-0">
                    {candidate.user?.profile_photo_url ? (
                      <img 
                        src={candidate.user.profile_photo_url} 
                        alt={candidate.user?.full_name || 'Candidate'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-2xl font-bold text-muted-foreground">
                        {candidate.user?.full_name?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold group-hover:text-primary transition-colors truncate">
                      {candidate.user?.full_name || 'Unknown Candidate'}
                    </h3>
                    <p className="text-sm text-primary">
                      {positionLabels[candidate.position] || candidate.position}
                    </p>
                    {candidate.party && (
                      <p className="text-sm text-muted-foreground truncate">
                        {candidate.party.name}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="mr-1 h-4 w-4" />
                    {candidate.follower_count?.toLocaleString() || 0} followers
                  </div>
                  <div className="flex items-center text-sm text-green-600">
                    <TrendingUp className="mr-1 h-4 w-4" />
                    Trending
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default async function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center rounded-full border px-4 py-1.5 text-sm">
              <span className="mr-2">🇰🇪</span>
              Kenya&apos;s Premier Election Platform
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Your Voice,{' '}
              <span className="text-primary">Your Vote</span>,{' '}
              Your Future
            </h1>
            <p className="mb-10 text-lg text-muted-foreground sm:text-xl">
              Follow your favorite candidates, participate in opinion polls, 
              track election results in real-time, and stay informed about 
              electoral activities in your constituency.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/register">
                <Button size="lg" className="w-full sm:w-auto">
                  Create Free Account
                </Button>
              </Link>
              <Link href="/candidates">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Explore Candidates
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t bg-muted/50 py-20">
        <div className="container">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold">
              Everything You Need to Stay Informed
            </h2>
            <p className="text-muted-foreground">
              From following candidates to tracking results, myVote Kenya has you covered.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="rounded-lg border bg-card p-6 shadow-sm stats-card">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Follow Candidates</h3>
              <p className="text-muted-foreground">
                Subscribe to candidates across all electoral positions - 
                from President to MCA. Get updates on their campaigns and activities.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-lg border bg-card p-6 shadow-sm stats-card">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Opinion Polls</h3>
              <p className="text-muted-foreground">
                Participate in opinion polls and see what voters in your 
                constituency think. Voice your opinion and see real-time results.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-lg border bg-card p-6 shadow-sm stats-card">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Vote className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Live Results</h3>
              <p className="text-muted-foreground">
                Track election results in real-time from your polling station 
                up to the national level. See tallies as they come in.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="rounded-lg border bg-card p-6 shadow-sm stats-card">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Bell className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">SMS & WhatsApp Alerts</h3>
              <p className="text-muted-foreground">
                Receive instant notifications via SMS or WhatsApp about candidates, 
                polls, and results. Stay connected even without internet.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="rounded-lg border bg-card p-6 shadow-sm stats-card">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Agent Management</h3>
              <p className="text-muted-foreground">
                Candidates can assign agents to polling stations, track their 
                activities, and manage communications securely.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="rounded-lg border bg-card p-6 shadow-sm stats-card">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Smartphone className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">USSD Access</h3>
              <p className="text-muted-foreground">
                Access key features via USSD on any phone. No smartphone or 
                internet required. Perfect for rural areas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="container">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="text-center">
              <div className="mb-2 text-4xl font-bold text-primary">47</div>
              <div className="text-muted-foreground">Counties</div>
            </div>
            <div className="text-center">
              <div className="mb-2 text-4xl font-bold text-primary">290</div>
              <div className="text-muted-foreground">Constituencies</div>
            </div>
            <div className="text-center">
              <div className="mb-2 text-4xl font-bold text-primary">1,450</div>
              <div className="text-muted-foreground">Wards</div>
            </div>
            <div className="text-center">
              <div className="mb-2 text-4xl font-bold text-primary">46,000+</div>
              <div className="text-muted-foreground">Polling Stations</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Candidates */}
      <FeaturedCandidates />

      {/* CTA Section */}
      <section className="border-t bg-primary py-16">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center text-primary-foreground">
            <h2 className="mb-4 text-3xl font-bold">
              Ready to Make Your Voice Heard?
            </h2>
            <p className="mb-8 text-primary-foreground/80">
              Join thousands of Kenyans who are actively participating in our 
              democracy through myVote Kenya.
            </p>
            <Link href="/auth/register">
              <Button size="lg" variant="secondary">
                Get Started for Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
