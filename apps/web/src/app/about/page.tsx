import Link from 'next/link';
import { Vote, Users, Shield, BarChart3, Bell, Smartphone, CheckCircle, Target, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SiteHeader, SiteFooter } from '@/components/layout';

const TEAM_MEMBERS = [
  {
    name: 'Dr. Wanjiku Kamau',
    role: 'Founder & CEO',
    bio: 'Former IEBC commissioner with 15+ years in electoral systems',
    image: null,
  },
  {
    name: 'John Ochieng',
    role: 'Chief Technology Officer',
    bio: 'Tech entrepreneur, former lead engineer at Safaricom',
    image: null,
  },
  {
    name: 'Mary Nyambura',
    role: 'Head of Operations',
    bio: 'Operations expert with experience in NGO management',
    image: null,
  },
  {
    name: 'Peter Mutua',
    role: 'Lead Developer',
    bio: 'Full-stack developer specializing in scalable systems',
    image: null,
  },
];

const VALUES = [
  {
    icon: Shield,
    title: 'Transparency',
    description: 'We believe in open and transparent electoral processes. Every vote and result is verifiable.',
  },
  {
    icon: Users,
    title: 'Inclusivity',
    description: 'Our platform is accessible to all Kenyans, regardless of location or technical capability.',
  },
  {
    icon: CheckCircle,
    title: 'Integrity',
    description: 'We maintain the highest standards of data accuracy and electoral integrity.',
  },
  {
    icon: Target,
    title: 'Innovation',
    description: 'We leverage technology to make civic participation easier and more engaging.',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-b from-primary/5 to-background">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-6">
                <Vote className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-4xl font-bold mb-4">About myVote Kenya</h1>
              <p className="text-lg text-muted-foreground">
                Empowering Kenyans to participate actively in democracy through technology. 
                We&apos;re building the future of civic engagement in Kenya.
              </p>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16 border-t">
          <div className="container">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
                <p className="text-muted-foreground mb-6">
                  myVote Kenya was founded with a simple but powerful mission: to make 
                  electoral information accessible to every Kenyan citizen. We believe 
                  that informed voters make better decisions, and better decisions lead 
                  to better governance.
                </p>
                <p className="text-muted-foreground mb-6">
                  Through our platform, we connect voters with candidates, provide 
                  real-time election results, and facilitate meaningful civic engagement 
                  through opinion polls and community discussions.
                </p>
                <p className="text-muted-foreground">
                  Whether you&apos;re in Nairobi or a remote village in Turkana, myVote 
                  Kenya ensures you have access to the same electoral information through 
                  our web platform, USSD services, and SMS alerts.
                </p>
              </div>
              <div className="grid gap-4 grid-cols-2">
                <Card className="p-6 text-center">
                  <div className="text-3xl font-bold text-primary mb-2">47</div>
                  <div className="text-sm text-muted-foreground">Counties Covered</div>
                </Card>
                <Card className="p-6 text-center">
                  <div className="text-3xl font-bold text-primary mb-2">290</div>
                  <div className="text-sm text-muted-foreground">Constituencies</div>
                </Card>
                <Card className="p-6 text-center">
                  <div className="text-3xl font-bold text-primary mb-2">46K+</div>
                  <div className="text-sm text-muted-foreground">Polling Stations</div>
                </Card>
                <Card className="p-6 text-center">
                  <div className="text-3xl font-bold text-primary mb-2">22M+</div>
                  <div className="text-sm text-muted-foreground">Registered Voters</div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-16 bg-muted/30 border-t">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Our Values</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                These core values guide everything we do at myVote Kenya
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {VALUES.map((value) => (
                <Card key={value.title} className="text-center p-6">
                  <div className="inline-flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 mb-4">
                    <value.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 border-t">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">What We Offer</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                A comprehensive platform for all your electoral information needs
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              <div className="flex gap-4">
                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Candidate Profiles</h3>
                  <p className="text-sm text-muted-foreground">
                    Detailed profiles of candidates including manifestos, party affiliations, and contact information.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Heart className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Follow Candidates</h3>
                  <p className="text-sm text-muted-foreground">
                    Subscribe to candidates and receive updates about their campaigns via SMS or WhatsApp.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Opinion Polls</h3>
                  <p className="text-sm text-muted-foreground">
                    Participate in polls and see what other voters in your area think about candidates.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Vote className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Live Results</h3>
                  <p className="text-sm text-muted-foreground">
                    Real-time election results from polling stations across the country.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">SMS & WhatsApp Alerts</h3>
                  <p className="text-sm text-muted-foreground">
                    Get instant notifications about results and candidate updates on your phone.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">USSD Access</h3>
                  <p className="text-sm text-muted-foreground">
                    Access key features via USSD code *384*VOTE# on any mobile phone.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-16 bg-muted/30 border-t">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Our Team</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Meet the passionate team behind myVote Kenya
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {TEAM_MEMBERS.map((member) => (
                <Card key={member.name} className="text-center p-6">
                  <div className="h-20 w-20 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <h3 className="font-semibold">{member.name}</h3>
                  <p className="text-sm text-primary mb-2">{member.role}</p>
                  <p className="text-sm text-muted-foreground">{member.bio}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
              Join thousands of Kenyans who are using myVote Kenya to stay informed 
              about candidates, participate in polls, and track election results.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register">
                <Button size="lg" variant="secondary">
                  Create Free Account
                </Button>
              </Link>
              <Link href="/candidates">
                <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                  Browse Candidates
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
